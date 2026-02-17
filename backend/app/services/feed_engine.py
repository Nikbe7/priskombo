import pandas as pd
import os
import json
import time
import google.generativeai as genai
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from app.models import Product, ProductPrice, Store
from app.core.logging import get_logger

logger = get_logger("feed_engine")

# Läs API-nyckel för AI-brand detektion
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_AI_MODEL = os.getenv("GOOGLE_AI_MODEL", "gemini-2.0-flash")

def process_feed_bulk(file_path: str, store_name: str, db: Session):
    logger.info(f"🚀 Startar Bulk-import för {store_name}...")
    
    # 1. Hämta eller skapa Butiken
    store = db.query(Store).filter(Store.name == store_name).first()
    if not store:
        store = Store(name=store_name, base_shipping=49, free_shipping_limit=500)
        db.add(store)
        db.commit()
        db.refresh(store)

    # 2. Läs CSV-filen med Pandas
    try:
        df = pd.read_csv(file_path, sep=None, engine='python', dtype={'EAN': str})
    except Exception as e:
        logger.error(f"❌ Kunde inte läsa filen: {e}")
        return

    df.columns = [c.lower() for c in df.columns]
    
    # --- FÖRSÖK #1: Mappa kända kolumner (Brand/Manufacturer) ---
    column_map = {
        'produktnamn': 'name', 'product name': 'name',
        'pris': 'price', 'price': 'price',
        'ordinarie pris': 'regular_price', 'regular price': 'regular_price',
        'länk': 'url', 'product url': 'url', 'deeplink': 'url',
        'bildlänk': 'image_url', 'image url': 'image_url',
        'ean': 'ean', 'gtin': 'ean',
        # Kolla om vi har en varumärkeskolumn
        'varumärke': 'brand', 'brand': 'brand', 'manufacturer': 'brand', 'tillverkare': 'brand'
    }
    df = df.rename(columns=column_map)

    # Rensa och tvätta data
    df = df.dropna(subset=['ean', 'price'])
    df['ean'] = df['ean'].str.strip()
    
    # Fixa priser
    for col in ['price', 'regular_price']:
        if col in df.columns:
            df[col] = df[col].astype(str).str.replace(',', '.', regex=False).str.replace(' kr', '', regex=False)
            df[col] = pd.to_numeric(df[col], errors='coerce')
    
    df = df.dropna(subset=['price']) # Pris är obligatoriskt

    # --- FÖRSÖK #2: Gissnings-algoritm (Fallback) ---
    # Om kolumnen 'brand' saknas eller är tom, gissa första ordet i namnet.
    if 'brand' not in df.columns:
        df['brand'] = None

    # Fyll i saknade varumärken med första ordet i produktnamnet
    # Ex: "L'Oreal Schampo" -> "L'Oreal"
    mask_missing_brand = df['brand'].isna() | (df['brand'] == '')
    df.loc[mask_missing_brand, 'brand'] = df.loc[mask_missing_brand, 'name'].apply(
        lambda x: str(x).split(' ')[0] if pd.notna(x) else None
    )

    # --- FÖRSÖK #3: AI-förfining (Om vi har nyckel) ---
    # Vi kör detta för att städa upp gissningarna.
    # T.ex. om gissningen blev "The" (från "The Ordinary"), ska AI fixa det till "The Ordinary".
    if GOOGLE_API_KEY:
        logger.info("🤖 Kör AI för att tvätta varumärken...")
        df = refine_brands_with_ai(df)
    else:
        logger.warning("⚠️ Ingen API-nyckel. Hoppar över AI-tvätt av varumärken.")

    logger.info(f"📥 Bearbetar {len(df)} rader...")

    # ---------------------------------------------------------
    # FAS 1: UPSERT PRODUKTER (Master Catalog)
    # ---------------------------------------------------------
    products_data = []
    for _, row in df.iterrows():
        products_data.append({
            "ean": row['ean'],
            "name": row['name'],
            "brand": str(row.get('brand', '')).strip(), # Spara det tvättade varumärket
            "image_url": row.get('image_url', None),
        })

    batch_size = 1000
    for i in range(0, len(products_data), batch_size):
        batch = products_data[i:i+batch_size]
        stmt = insert(Product).values(batch)
        stmt = stmt.on_conflict_do_update(
            index_elements=['ean'],
            set_={
                'name': stmt.excluded.name, 
                'image_url': stmt.excluded.image_url,
                'brand': stmt.excluded.brand # Uppdatera brand om vi hittat ett bättre
            }
        )
        db.execute(stmt)
        db.commit()
    
    logger.info("✅ Produkter synkade.")

    # ---------------------------------------------------------
    # FAS 2: UPSERT PRISER
    # ---------------------------------------------------------
    # Hämta IDn för EAN
    all_eans = df['ean'].unique().tolist()
    ean_map = {}
    
    # Hämta i batchar för att undvika gigantiska SQL-frågor
    for i in range(0, len(all_eans), batch_size):
        ean_batch = all_eans[i:i+batch_size]
        res = db.query(Product.ean, Product.id).filter(Product.ean.in_(ean_batch)).all()
        for r in res:
            ean_map[r.ean] = r.id

    prices_data = []
    for _, row in df.iterrows():
        pid = ean_map.get(row['ean'])
        if pid:
            price = float(row['price'])
            reg_price = row.get('regular_price')
            reg_price = float(reg_price) if pd.notna(reg_price) else None
            
            # RÄKNA UT RABATTEN DIREKT VID IMPORT
            discount = 0
            if reg_price and reg_price > price:
                discount = int(((reg_price - price) / reg_price) * 100)

            prices_data.append({
                "product_id": pid,
                "store_id": store.id,
                "price": price,
                "regular_price": reg_price,
                "discount_percent": discount, # <-- LÄGG TILL DENNA
                "url": row['url']
            })
    
    # Bulk insert priser (med delete/insert strategi för säkerhet)
    for i in range(0, len(prices_data), batch_size):
        batch = prices_data[i:i+batch_size]
        pids_in_batch = [x['product_id'] for x in batch]
        
        db.query(ProductPrice).filter(
            ProductPrice.store_id == store.id,
            ProductPrice.product_id.in_(pids_in_batch)
        ).delete(synchronize_session=False)
        
        db.bulk_insert_mappings(ProductPrice, batch)
        db.commit()

    logger.info(f"✅ Priser uppdaterade för {len(prices_data)} varor.")

def refine_brands_with_ai(df):
    """
    Tar unika varumärkes-gissningar och ber AI tvätta dem.
    Detta är mycket snabbare än att köra AI per rad.
    """
    try:
        genai.configure(api_key=GOOGLE_API_KEY)
        model = genai.GenerativeModel(GOOGLE_AI_MODEL, generation_config={"response_mime_type": "application/json"})
        
        # Hämta alla unika "gissningar"
        unique_brands = df['brand'].unique().tolist()
        
        # Filtrera bort sånt som ser bra ut (för att spara tokens)
        # T.ex. om det är 1 ord och längre än 3 bokstäver kanske vi litar på det?
        # Här skickar vi allt för säkerhets skull, men i batchar.
        
        # Vi kör batchar om 500 märken
        BATCH_SIZE = 500
        corrections = {}

        for i in range(0, len(unique_brands), BATCH_SIZE):
            batch = unique_brands[i:i+BATCH_SIZE]
            
            # Exempel på namn för att ge AI kontext
            # Vi skickar med 1 produktnamn per varumärke som exempel
            examples = []
            for b in batch:
                example_prod = df[df['brand'] == b]['name'].iloc[0]
                examples.append({"current_brand": str(b), "product_name": str(example_prod)})

            prompt = f"""
            Du är en expert på att städa produktdata.
            Här är en lista med gissade varumärken (från första ordet i produktnamnet) och produktens fullständiga namn.
            
            Uppgift: Identifiera det KORREKTA varumärket.
            - Om "current_brand" är rätt, behåll det.
            - Om det är fel (t.ex. "The" istället för "The Ordinary"), rätta det.
            - Om varumärket står längre in i namnet, extrahera det.
            
            Returnera en JSON-lista: [{{ "original": "The", "corrected": "The Ordinary" }}]
            
            Data:
            {json.dumps(examples, ensure_ascii=False)}
            """
            
            try:
                response = model.generate_content(prompt)
                matches = json.loads(response.text)
                
                for m in matches:
                    if m.get('corrected'):
                        corrections[m['original']] = m['corrected']
                
                time.sleep(1) # Rate limit paus

            except Exception as e:
                logger.warning(f"⚠️ AI Brand cleaning error (batch {i}): {e}")
                continue

        # Applicera rättningarna på dataframen
        if corrections:
            logger.info(f"✨ AI rättade {len(corrections)} varumärken.")
            df['brand'] = df['brand'].map(lambda x: corrections.get(str(x), x))
            
    except Exception as e:
        logger.warning(f"⚠️ Kunde inte köra AI-tvätt: {e}")
    
    return df