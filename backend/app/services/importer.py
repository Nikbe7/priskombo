import pandas as pd
from sqlalchemy.orm import Session
from app.models import Product, ProductPrice, Store
from datetime import datetime
from app.core.logging import get_logger

logger = get_logger("importer")

def import_csv_feed(file_path: str, store_name: str, db: Session):
    """
    Importerar produkter minneseffektivt genom att bearbeta dem i 'chunks'.
    """
    logger.info(f"🚀 Startar import för {store_name} från {file_path}...")
    
    # 1. Hitta eller skapa butiken
    store = db.query(Store).filter(Store.name == store_name).first()
    if not store:
        logger.info(f"🏪 Skapar ny butik: {store_name}")
        store = Store(name=store_name, base_shipping=49, free_shipping_limit=499)
        db.add(store)
        db.commit()
        db.refresh(store)

    # Konstanter för batch-storlek
    CHUNK_SIZE = 1000
    total_processed = 0
    
    # Bestäm separator (enkel logik, läser första raden)
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            first_line = f.readline()
            sep = ';' if ';' in first_line else ','
    except:
        logger.error(f"❌ Kunde inte läsa filen: {e}")
        return

    # 3. Skapa en iterator som läser filen i chunks
    try:
        csv_iterator = pd.read_csv(
            file_path, 
            sep=sep, 
            dtype={'EAN': str}, 
            chunksize=CHUNK_SIZE
        )
    except Exception as e:
        logger.error(f"❌ Pandas kunde inte läsa CSV: {e}")
        return

    for chunk_index, df in enumerate(csv_iterator):
        # Rensa data i denna chunk
        df = df.dropna(subset=['EAN', 'Pris'])
        
        # Hämta EANs BARA för denna chunk
        eans_in_chunk = [str(e).strip() for e in df['EAN'].tolist()]
        
        # Hämta existerande produkter från DB som matchar EANs i denna chunk
        existing_products_query = db.query(Product).filter(Product.ean.in_(eans_in_chunk)).all()
        existing_products_map = {p.ean: p for p in existing_products_query}
        
        for index, row in df.iterrows():
            try:
                ean = str(row['EAN']).strip()
                name = row['Produktnamn']
                
                # Hantera priser
                raw_price = str(row['Pris']).replace(',', '.').replace(' ', '')
                price = float(raw_price)

                url = row['Länk']
                image = row.get('Bildlänk', None)
                if pd.isna(image): image = None

                # A. Hantera PRODUKTEN
                product = existing_products_map.get(ean)
                
                if not product:
                    slug = name.lower().replace(" ", "-").replace("å","a").replace("ä","a").replace("ö","o")
                    slug = "".join([c for c in slug if c.isalnum() or c == "-"])

                    product = Product(ean=ean, name=name, image_url=image, slug=slug)
                    db.add(product)
                    db.flush() 
                    existing_products_map[ean] = product
                else:
                    if image and not product.image_url:
                        product.image_url = image

                # B. Hantera PRISET
                price_entry = db.query(ProductPrice).filter(
                    ProductPrice.product_id == product.id,
                    ProductPrice.store_id == store.id
                ).first()

                if price_entry:
                    price_entry.price = price
                    price_entry.url = url
                    price_entry.updated_at = datetime.utcnow()
                else:
                    new_price = ProductPrice(
                        product_id=product.id,
                        store_id=store.id,
                        price=price,
                        url=url
                    )
                    db.add(new_price)
            
            except Exception as row_error:
                # Logga fel på rad-nivå men fortsätt med nästa
                # Använd debug om du har många fel, annars warning
                logger.debug(f"⚠️  Fel på rad {index} i chunk {chunk_index}: {row_error}")
                continue

        # Commit efter varje chunk (sparar minne och transaktionslogg)
        db.commit()
        total_processed += len(df)
        logger.info(f"   Processed chunk {chunk_index + 1} ({total_processed} items total)...")

    logger.info(f"✅ Import klar för {store_name}! Totalt {total_processed} rader.")