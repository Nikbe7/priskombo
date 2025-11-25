import pandas as pd
from sqlalchemy.orm import Session
from app.models import Product, ProductPrice, Store
from datetime import datetime

def import_csv_feed(file_path: str, store_name: str, db: Session):
    print(f"🚀 Startar import för {store_name}...")
    
    # 1. Hitta eller skapa butiken
    store = db.query(Store).filter(Store.name == store_name).first()
    if not store:
        print(f"Skapar ny butik: {store_name}")
        # Här sätter vi default fraktregler, du får ändra dessa manuellt i DB sen
        store = Store(name=store_name, base_shipping=49, free_shipping_limit=499)
        db.add(store)
        db.commit()
        db.refresh(store)

    # 2. Läs filen (Pandas är supersnabbt)
    # OBS: I verkligheten varierar formatet (sep=';' eller ',')
    try:
        df = pd.read_csv(file_path, sep=';', dtype={'EAN': str})
    except:
        # Testa med komma om semikolon misslyckas
        df = pd.read_csv(file_path, sep=',', dtype={'EAN': str})

    # Rensa data (ta bort rader utan EAN eller Pris)
    df = df.dropna(subset=['EAN', 'Pris'])
    
    count_new = 0
    count_updated = 0

    # 3. Loopa igenom och uppdatera
    # För prestanda: Hämta alla existerande EANs i minnet först
    existing_products = {p.ean: p for p in db.query(Product).all()}
    
    for index, row in df.iterrows():
        ean = str(row['EAN']).strip()
        name = row['Produktnamn']
        price = float(str(row['Pris']).replace(',', '.')) # Fixa "99,50" till 99.50
        url = row['Länk']
        image = row.get('Bildlänk', None) # Om det finns bild i filen

        # A. Hantera PRODUKTEN (Master)
        product = existing_products.get(ean)
        
        if not product:
            # Skapa ny
            product = Product(ean=ean, name=name, image_url=image)
            db.add(product)
            db.flush() # Få ett ID utan att committa allt än
            existing_products[ean] = product # Lägg till i vårt lokala minne
            count_new += 1
        
        # B. Hantera PRISET (Relationen)
        # Kolla om vi redan har ett pris för denna produkt + butik
        price_entry = db.query(ProductPrice).filter(
            ProductPrice.product_id == product.id,
            ProductPrice.store_id == store.id
        ).first()

        if price_entry:
            # Uppdatera pris
            price_entry.price = price
            price_entry.url = url
            price_entry.updated_at = datetime.now()
            count_updated += 1
        else:
            # Skapa nytt pris
            new_price = ProductPrice(
                product_id=product.id,
                store_id=store.id,
                price=price,
                url=url
            )
            db.add(new_price)
            count_updated += 1

    db.commit()
    print(f"✅ Klar! {count_new} nya produkter, {count_updated} priser uppdaterade.")