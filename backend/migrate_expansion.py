from sqlalchemy import text
from app.database import SessionLocal
import random

def migrate_expansion():
    db = SessionLocal()
    print("🛠️  Uppgraderar databasen med nya sorterings-kolumner...")
    
    try:
        # Lägg till kolumner om de saknas
        db.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS popularity_score INTEGER DEFAULT 0;"))
        db.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS rating FLOAT DEFAULT 0.0;"))
        db.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();"))
        
        # Generera lite "fake" data så sorteringen fungerar direkt (för test)
        # I framtiden ska detta baseras på riktig data
        print("🎲 Genererar test-data för popularitet och betyg...")
        db.execute(text("UPDATE products SET popularity_score = floor(random() * 1000);"))
        db.execute(text("UPDATE products SET rating = (floor(random() * 20) + 30) / 10.0;")) # Betyg mellan 3.0 och 5.0
        
        db.commit()
        print("✅ Klart! Databasen är redo för avancerad sortering.")
    except Exception as e:
        print(f"❌ Något gick fel: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_expansion()