import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from app.models import Product, ProductPrice, Store, Category

def process_feed_bulk(file_path: str, store_name: str, db: Session):
    print(f"🚀 Startar Bulk-import för {store_name}...")
    
    store = db.query(Store).filter(Store.name == store_name).first()
    if not store:
        store = Store(name=store_name, base_shipping=49, free_shipping_limit=500)
        db.add(store)
        db.commit()
        db.refresh(store)

    try:
        df = pd.read_csv(file_path, sep=None, engine='python', dtype={'EAN': str})
    except Exception as e:
        print(f"❌ Kunde inte läsa filen: {e}")
        return

    df.columns = [c.lower() for c in df.columns]
    
    # UPPDATERAD MAPP: Lägg till ordinarie pris
    column_map = {
        'produktnamn': 'name',
        'product name': 'name',
        'pris': 'price',
        'price': 'price',
        'ordinarie pris': 'regular_price', # <-- Ny
        'regular price': 'regular_price', # <-- Ny
        'länk': 'url',
        'product url': 'url',
        'deeplink': 'url',
        'bildlänk': 'image_url',
        'image url': 'image_url',
        'ean': 'ean',
        'gtin': 'ean'
    }
    df = df.rename(columns=column_map)

    # Om regular_price saknas i filen, fyll med NaN (tomt)
    if 'regular_price' not in df.columns:
        df['regular_price'] = None

    df = df.dropna(subset=['ean', 'price'])
    df['ean'] = df['ean'].str.strip()
    
    # Fixa priser (Price)
    df['price'] = df['price'].astype(str).str.replace(',', '.', regex=False).str.replace(' kr', '', regex=False)
    df['price'] = pd.to_numeric(df['price'], errors='coerce')
    
    # Fixa priser (Regular Price) - Samma logik
    df['regular_price'] = df['regular_price'].astype(str).str.replace(',', '.', regex=False).str.replace(' kr', '', regex=False)
    df['regular_price'] = pd.to_numeric(df['regular_price'], errors='coerce')

    df = df.dropna(subset=['price'])

    print(f"📥 Läste in {len(df)} rader. Startar databas-operationer...")

    # FAS 1: PRODUKTER (Oförändrad)
    products_data = []
    for _, row in df.iterrows():
        products_data.append({
            "ean": row['ean'],
            "name": row['name'],
            "image_url": row.get('image_url', None),
        })

    batch_size = 1000
    for i in range(0, len(products_data), batch_size):
        batch = products_data[i:i+batch_size]
        stmt = insert(Product).values(batch)
        stmt = stmt.on_conflict_do_update(
            index_elements=['ean'],
            set_={'name': stmt.excluded.name, 'image_url': stmt.excluded.image_url}
        )
        db.execute(stmt)
        db.commit()
    
    print("✅ Produkter synkade.")

    # FAS 2: PRISER (Uppdaterad med regular_price)
    all_eans = df['ean'].unique().tolist()
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
            # HÄR SKICKAR VI MED REGULAR_PRICE
            prices_data.append({
                "product_id": pid,
                "store_id": store.id,
                "price": row['price'],
                "regular_price": row['regular_price'] if pd.notna(row['regular_price']) else None, # <-- Ny
                "url": row['url']
            })
    
    for i in range(0, len(prices_data), batch_size):
        batch = prices_data[i:i+batch_size]
        pids_in_batch = [x['product_id'] for x in batch]
        
        db.query(ProductPrice).filter(
            ProductPrice.store_id == store.id,
            ProductPrice.product_id.in_(pids_in_batch)
        ).delete(synchronize_session=False)
        
        db.bulk_insert_mappings(ProductPrice, batch)
        db.commit()

    print(f"✅ Priser uppdaterade för {len(prices_data)} varor.")