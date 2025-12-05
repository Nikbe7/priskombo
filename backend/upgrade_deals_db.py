import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

# Se till att denna pekar på din PROD-databas när du kör scriptet!
DATABASE_URL = os.getenv("DATABASE_URL")

def upgrade_database():
    if not DATABASE_URL:
        print("❌ Ingen DATABASE_URL hittades.")
        return

    print(f"🔌 Ansluter till databas...")
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        conn.execution_options(isolation_level="AUTOCOMMIT")
        
        print("🛠️ 1. Lägger till kolumnen 'discount_percent'...")
        try:
            conn.execute(text("ALTER TABLE product_prices ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0"))
            print("   ✅ Kolumn tillagd.")
        except Exception as e:
            print(f"   ⚠️ Kunde inte lägga till kolumn (kanske finns?): {e}")

        print("🧮 2. Beräknar rabatter för existerande priser (detta kan ta en stund)...")
        # Beräkna bara om regular_price är giltigt och högre än price
        conn.execute(text("""
            UPDATE product_prices 
            SET discount_percent = CAST(((regular_price - price) / regular_price * 100) AS INTEGER)
            WHERE regular_price > price AND regular_price > 0
        """))
        print("   ✅ Rabatter beräknade.")

        print("🚀 3. Skapar index för blixtsnabb sortering...")
        try:
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_price_discount ON product_prices (discount_percent DESC)"))
            print("   ✅ Index skapat.")
        except Exception as e:
            print(f"   ⚠️ Kunde inte skapa index: {e}")

    print("✨ Klart! Databasen är optimerad för Deals.")

if __name__ == "__main__":
    upgrade_database()