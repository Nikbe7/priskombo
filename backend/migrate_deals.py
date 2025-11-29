from sqlalchemy import text
from app.database import SessionLocal

def add_regular_price_column():
    db = SessionLocal()
    print("🛠️  Lägger till kolumnen 'regular_price' i databasen...")
    
    try:
        # SQL-kommando för att lägga till kolumnen om den saknas
        db.execute(text("ALTER TABLE product_prices ADD COLUMN IF NOT EXISTS regular_price FLOAT;"))
        db.commit()
        print("✅ Klart! Databasen är redo för deals.")
    except Exception as e:
        print(f"❌ Något gick fel: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_regular_price_column()