import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models import Product, ProductPrice, Store, Category
from app.core.logging import get_logger

logger = get_logger("dev_tools")

def generate_fake_data(db: Session, amount: int = 50):
    """Genererar testprodukter med märken, butiker och kampanjpriser."""
    logger.info(f"🧪 Genererar {amount} avancerade fake-produkter...")

    # 1. Hämta löv-kategorier (de längst ner i trädet)
    categories = db.query(Category).filter(Category.parent_id != None).all()
    if not categories:
        logger.error("❌ Inga underkategorier hittades. Kör 'python manage.py seed' först.")
        return

    # 2. Skapa eller hämta butiker
    store_data = [
        {"name": "NetOnNet", "shipping": 0, "limit": 0},
        {"name": "Elgiganten", "shipping": 49, "limit": 500},
        {"name": "Apotea", "shipping": 0, "limit": 199},
        {"name": "Webhallen", "shipping": 39, "limit": 0},
        {"name": "Lyko", "shipping": 29, "limit": 300}
    ]
    
    stores = []
    for s_data in store_data:
        store = db.query(Store).filter(Store.name == s_data["name"]).first()
        if not store:
            store = Store(
                name=s_data["name"], 
                base_shipping=s_data["shipping"],
                free_shipping_limit=s_data["limit"]
            )
            db.add(store)
            db.flush()
        stores.append(store)

    # 3. Data för generering
    brands = {
        "Elektronik": ["Sony", "Samsung", "Apple", "LG", "Philips", "Asus"],
        "Skönhet": ["Nivea", "L'Oréal", "The Ordinary", "Dior", "IsaDora"],
        "Sport": ["Nike", "Adidas", "Puma", "Reebok", "Salomon"],
        "Hem": ["IKEA", "Bosch", "Electrolux", "Fiskars", "Tefal"],
        "Annat": ["Generic", "SuperBrand", "LuxuryCo", "BudgetFix"]
    }
    
    adjectives = ["Pro", "Ultra", "Slim", "Max", "Original", "Gaming", "Wireless"]
    nouns = ["X1000", "3000", "Lite", "Edition", "Series 5", "V2"]

    count = 0
    for _ in range(amount):
        cat = random.choice(categories)
        
        # Hitta passande märke baserat på kategorinamn (enkelt hack)
        cat_key = "Annat"
        if "dator" in cat.name.lower() or "mobil" in cat.name.lower() or "ljud" in cat.name.lower():
            cat_key = "Elektronik"
        elif "hud" in cat.name.lower() or "smink" in cat.name.lower() or "parfym" in cat.name.lower():
            cat_key = "Skönhet"
        elif "träning" in cat.name.lower() or "sko" in cat.name.lower():
            cat_key = "Sport"
            
        brand = random.choice(brands.get(cat_key, brands["Annat"]))
        
        # Skapa produktnamn: "Sony Hörlurar Pro X1000"
        product_name = f"{brand} {cat.name.rstrip('s')} {random.choice(adjectives)} {random.choice(nouns)}"
        
        # Skapa EAN (måste vara unik)
        ean = str(random.randint(7300000000000, 7399999999999))
        while db.query(Product).filter(Product.ean == ean).first():
            ean = str(random.randint(7300000000000, 7399999999999))

        # Bild med text (så man ser vad det är)
        encoded_text = product_name.replace(" ", "+")
        image_url = f"https://placehold.co/400x400/png?text={encoded_text}"

        product = Product(
            name=product_name,
            ean=ean,
            brand=brand,  # <--- HÄR LÄGGER VI TILL MÄRKET
            category_id=cat.id,
            image_url=image_url,
            rating=round(random.uniform(2.5, 5.0), 1),
            popularity_score=random.randint(0, 100),
            created_at=datetime.utcnow() - timedelta(days=random.randint(0, 365))
        )
        db.add(product)
        db.flush() # Få ID

        # 4. Skapa priser (1 till 4 butiker säljer varan)
        chosen_stores = random.sample(stores, k=random.randint(1, min(4, len(stores))))
        
        # Baspris för produkten (t.ex. 500 kr)
        base_price = random.randint(100, 5000)
        
        for store in chosen_stores:
            # Varje butik varierar priset lite (+- 10%)
            price_variation = random.uniform(0.9, 1.1)
            current_price = round(base_price * price_variation)
            
            # Kampanj? (20% chans)
            is_campaign = random.random() < 0.2
            regular_price = None
            discount_percent = 0
            
            if is_campaign:
                regular_price = round(current_price * 1.3) # Ordinarie var 30% högre
                discount_percent = int((1 - (current_price / regular_price)) * 100)
            
            price_entry = ProductPrice(
                product_id=product.id,
                store_id=store.id,
                price=current_price,
                regular_price=regular_price,
                discount_percent=discount_percent,
                url=f"https://www.{store.name.lower()}.se/produkt/{ean}",
                updated_at=datetime.utcnow()
            )
            db.add(price_entry)

        count += 1

    db.commit()
    logger.info(f"✅ Skapade {count} produkter med märken och priser.")