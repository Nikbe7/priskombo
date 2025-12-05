import os
import re
import unicodedata
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# ---------------------------------------------------------
# KONFIGURATION
# ---------------------------------------------------------
# Laddar variabler från .env filen
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("Hittade ingen DATABASE_URL i .env filen. Kontrollera att den är satt.")

print(f"Använder databas: {DATABASE_URL.split('@')[-1]}") # Visar bara db-namnet av säkerhetsskäl
# ---------------------------------------------------------

def slugify(text_content):
    """Skapar en URL-vänlig slug (t.ex. 'Skönhet & Hälsa' -> 'skonhet-halsa')"""
    if not text_content:
        return ""
    text_content = unicodedata.normalize('NFKD', text_content).encode('ascii', 'ignore').decode('utf-8')
    text_content = text_content.lower()
    text_content = re.sub(r'[^\w\s-]', '', text_content)
    text_content = re.sub(r'[-\s]+', '-', text_content).strip('-')
    return text_content

def fix_database():
    print(f"Ansluter till databasen...")
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        # 1. Lägg till kolumnen om den saknas
        print("Kontrollerar om kolumnen 'slug' finns...")
        try:
            conn.execute(text("ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug VARCHAR(255)"))
            conn.commit()
            print("Kolumnen 'slug' är säkerställd.")
        except Exception as e:
            print(f"Kunde inte lägga till kolumn (den kanske redan finns?): {e}")

        # 2. Hämta alla kategorier
        result = conn.execute(text("SELECT id, name FROM categories"))
        categories = result.fetchall()
        
        print(f"Hittade {len(categories)} kategorier. Uppdaterar slugs...")

        # 3. Uppdatera slugs
        for cat in categories:
            cat_id = cat[0]
            name = cat[1]
            new_slug = slugify(name)
            
            # Säkerhetsåtgärd: Om slug blir tom eller dubblett, lägg på ID
            if not new_slug:
                new_slug = f"category-{cat_id}"
            
            print(f"  Uppdaterar ID {cat_id}: {name} -> {new_slug}")
            
            # Uppdatera raden
            conn.execute(
                text("UPDATE categories SET slug = :slug WHERE id = :id"),
                {"slug": new_slug, "id": cat_id}
            )
        
        # 4. Sätt NOT NULL constraint (valfritt, men bra praxis)
        # Avkommentera nedan om du vill tvinga att slug alltid måste finnas framöver
        # try:
        #     conn.execute(text("ALTER TABLE categories ALTER COLUMN slug SET NOT NULL"))
        #     conn.execute(text("CREATE UNIQUE INDEX idx_categories_slug ON categories(slug)"))
        #     conn.commit()
        # except Exception as e:
        #     print(f"Kunde inte sätta constraints: {e}")

        conn.commit()
        print("Klart! Databasen är uppdaterad.")

if __name__ == "__main__":
    fix_database()