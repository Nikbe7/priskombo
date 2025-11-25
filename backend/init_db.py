from app.database import engine, Base, SessionLocal
from app.models import Product, ProductPrice, Store

# 1. Skapa alla tabeller (detta gör magin som SQL-koden gjorde förut)
print("🔨 Skapar tabeller...")
Base.metadata.drop_all(bind=engine) # VARNING: Rensar gammal data!
Base.metadata.create_all(bind=engine)

# 2. Skapa session
db = SessionLocal()

# 3. Lägg till Butiker
print("🏪 Lägger till butiker...")
apotea = Store(name="Apotea", base_shipping=49, free_shipping_limit=299)
lyko = Store(name="Lyko", base_shipping=39, free_shipping_limit=199)
db.add_all([apotea, lyko])
db.commit()

# 4. Lägg till Produkter
print("🧴 Lägger till produkter...")
p1 = Product(ean="5011321360826", name="Head & Shoulders Classic Clean 250ml")
p2 = Product(ean="4005808195627", name="Nivea Creme 150ml")
db.add_all([p1, p2])
db.commit()

# 5. Lägg till Priser (Kopplingen)
print("💰 Sätter priser...")
# H&S priser (Apotea billigast)
price1 = ProductPrice(product_id=p1.id, store_id=apotea.id, price=40.00, url="...") 
price2 = ProductPrice(product_id=p1.id, store_id=lyko.id, price=90.00, url="...")

# Nivea priser (Lyko billigast)
price3 = ProductPrice(product_id=p2.id, store_id=apotea.id, price=100.00, url="...")
price4 = ProductPrice(product_id=p2.id, store_id=lyko.id, price=50.00, url="...")

db.add_all([price1, price2, price3, price4])
db.commit()

print("✅ Klart! Databasen är fylld med testdata.")
db.close()