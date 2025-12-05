from sqlalchemy import text
from app.database import SessionLocal
from app.models import Category
from slugify import slugify # pip install python-slugify

def migrate_slugs():
    db = SessionLocal()
    print("🐌 Genererar slugs för kategorier...")
    
    try:
        # 1. Lägg till kolumnen om den saknas
        db.execute(text("ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug VARCHAR;"))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories (slug);"))
        db.commit()
        
        # 2. Hämta alla kategorier och skapa slugs
        categories = db.query(Category).all()
        for cat in categories:
            # Skapa en url-vänlig version av namnet
            # "Skönhet & Hälsa" -> "skonhet-och-halsa"
            new_slug = slugify(cat.name, separator="-")
            
            # Hantera dubbletter (väldigt ovanligt i ditt fall men bra safety)
            cat.slug = new_slug
            print(f"   -> {cat.name} = {cat.slug}")
            
        db.commit()
        
        # Sätt constraint efter att data är på plats
        # (Kommentera bort denna om du får fel för att slugs inte är unika än)
        # db.execute(text("ALTER TABLE categories ADD CONSTRAINT uq_categories_slug UNIQUE (slug);"))
        
        print("✅ Klart! URL:er är genererade.")
        
    except Exception as e:
        print(f"❌ Något gick fel: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_slugs()