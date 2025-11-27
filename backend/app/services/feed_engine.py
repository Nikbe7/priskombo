import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from app.models import Product, ProductPrice, Store, Category

# VIKTIGT: Ingen rad här som heter "from app.services.feed_engine import process_feed_bulk"

def process_feed_bulk(file_path: str, store_name: str, db: Session):
    print(f"🚀 Startar Bulk-import för {store_name}...")
    
    # 1. Hämta eller skapa Butiken
    store = db.query(Store).filter(Store.name == store_name).first()
    if not store:
        # Default värden, ändra i DB sen vid behov
        store = Store(name=store_name, base_shipping=49, free_shipping_limit=500)
        db.add(store)
        db.commit()
        db.refresh(store)

    # 3. Läs CSV-filen med Pandas
    try:
        # dtype={'EAN': str} är kritiskt så att inte '00123' blir '123'
        df = pd.read_csv(file_path, sep=None, engine='python', dtype={'EAN': str})
    except Exception as e:
        print(f"❌ Kunde inte läsa filen: {e}")
        return

    # Normalisera kolumnnamn (gör alla till gemener)
    df.columns = [c.lower() for c in df.columns]
    
    # Mappa vanliga kolumnnamn till våra
    column_map = {
        'produktnamn': 'name',
        'product name': 'name',
        'pris': 'price',
        'price': 'price',
        'länk': 'url',
        'product url': 'url',
        'deeplink': 'url',
        'bildlänk': 'image_url',
        'image url': 'image_url',
        'ean': 'ean',
        'gtin': 'ean'
    }
    df = df.rename(columns=column_map)

    # Rensa skräp
    df = df.dropna(subset=['ean', 'price']) # Måste ha EAN och Pris
    df['ean'] = df['ean'].str.strip()
    
    # Fixa priser (byt komma till punkt, ta bort "kr")
    df['price'] = df['price'].astype(str).str.replace(',', '.', regex=False).str.replace(' kr', '', regex=False)
    df['price'] = pd.to_numeric(df['price'], errors='coerce')
    df = df.dropna(subset=['price']) # Ta bort om priset blev fel (NaN)

    print(f"📥 Läste in {len(df)} rader. Startar databas-operationer...")

    # ---------------------------------------------------------
    # FAS 1: UPSERT PRODUKTER (Master Catalog)
    # ---------------------------------------------------------
    products_data = []
    for _, row in df.iterrows():
        products_data.append({
            "ean": row['ean'],
            "name": row['name'],
            "image_url": row.get('image_url', None),
        })

    # Skicka i batchar om 1000 för att inte döda minnet
    batch_size = 1000
    for i in range(0, len(products_data), batch_size):
        batch = products_data[i:i+batch_size]
        
        # Postgres-specifik magi: INSERT ... ON CONFLICT DO UPDATE
        stmt = insert(Product).values(batch)
        stmt = stmt.on_conflict_do_update(
            index_elements=['ean'], # Om EAN krockar...
            set_={
                'name': stmt.excluded.name,
                'image_url': stmt.excluded.image_url
            }
        )
        db.execute(stmt)
        db.commit()
    
    print("✅ Produkter synkade.")

    # ---------------------------------------------------------
    # FAS 2: UPSERT PRISER
    # ---------------------------------------------------------
    all_eans = df['ean'].unique().tolist()
    
    # Hämta IDn från databasen
    ean_map = {}
    for i in range(0, len(all_eans), batch_size):
        ean_batch = all_eans[i:i+batch_size]
        res = db.query(Product.ean, Product.id).filter(Product.ean.in_(ean_batch)).all()
        for r in res:
            ean_map[r.ean] = r.id

    prices_data = []
    for _, row in df.iterrows():
        pid = ean_map.get(row['ean'])
        if pid:
            prices_data.append({
                "product_id": pid,
                "store_id": store.id,
                "price": row['price'],
                "url": row['url']
            })
    
    # Bulk insert priser
    for i in range(0, len(prices_data), batch_size):
        batch = prices_data[i:i+batch_size]
        
        # Ta bort gamla priser för dessa produkter i denna butik
        pids_in_batch = [x['product_id'] for x in batch]
        
        db.query(ProductPrice).filter(
            ProductPrice.store_id == store.id,
            ProductPrice.product_id.in_(pids_in_batch)
        ).delete(synchronize_session=False)
        
        # Sätt in nya
        db.bulk_insert_mappings(ProductPrice, batch)
        db.commit()

    print(f"✅ Priser uppdaterade för {len(prices_data)} varor.")