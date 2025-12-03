from sqlalchemy import text
from app.database import SessionLocal

def migrate_hierarchy():
    db = SessionLocal()
    print("🛠️  Uppgraderar kategorier med hierarki...")
    
    try:
        # Lägg till parent_id om den saknas
        db.execute(text("ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES categories(id);"))
        
        # Lägg till coming_soon om den saknas
        db.execute(text("ALTER TABLE categories ADD COLUMN IF NOT EXISTS coming_soon BOOLEAN DEFAULT FALSE;"))
        
        db.commit()
        print("✅ Klart! Databasen stödjer nu underkategorier.")
    except Exception as e:
        print(f"❌ Något gick fel (kanske fanns kolumnerna redan?): {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_hierarchy()