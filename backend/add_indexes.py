from sqlalchemy import text
from app.database import SessionLocal

def add_search_indexes():
    db = SessionLocal()
    print("🚀 Optimerar databasen för snabb sökning...")

    try:
        # 1. Aktivera tillägget pg_trgm (krävs för smart textsökning)
        print("   -> Aktiverar pg_trgm extension...")
        db.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm;"))
        
        # 2. Skapa index på produktnamn
        # GIN-index gör att LIKE '%niv%' går blixtsnabbt
        print("   -> Skapar GIN-index på produktnamn...")
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_products_name_trgm 
            ON products 
            USING gin (name gin_trgm_ops);
        """))
        
        # 3. Skapa index på EAN (för snabb import/matchning)
        print("   -> Skapar index på EAN...")
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_products_ean 
            ON products (ean);
        """))

        db.commit()
        print("✅ Databasen är nu indexerad och snabb!")
        
    except Exception as e:
        print(f"❌ Fel vid indexering: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_search_indexes()