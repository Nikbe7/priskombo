from sqlalchemy import text
from app.database import SessionLocal
from app.models import Product

def migrate_filters():
    db = SessionLocal()
    print("🛠️  Uppgraderar databasen med varumärken...")
    
    try:
        # 1. Lägg till kolumnen
        db.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR;"))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_products_brand ON products (brand);"))
        db.commit()
        
        # 2. Populera varumärken från befintliga namn
        # (Vår testdata är genererad som "Brand Adjective Product", så första ordet är brand)
        print("🏷️  Gissar varumärken från produktnamn...")
        products = db.query(Product).filter(Product.brand == None).all()
        
        count = 0
        for p in products:
            if p.name:
                # Ta första ordet som brand
                guessed_brand = p.name.split(' ')[0]
                p.brand = guessed_brand
                count += 1
        
        db.commit()
        print(f"✅ Klart! Uppdaterade {count} produkter med varumärke.")
        
    except Exception as e:
        print(f"❌ Något gick fel: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_filters()