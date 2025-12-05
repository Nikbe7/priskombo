import sqlite3 # Eller din specifika DB-driver (t.ex. psycopg2 för Postgres)
import unicodedata
import re

# Funktion för att skapa en slug (t.ex. "Skönhet & Hälsa" -> "skonhet-halsa")
def slugify(text):
    # Normalisera text (hantera å, ä, ö etc)
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    text = text.lower()
    # Ta bort allt som inte är ord eller siffror och ersätt med bindestreck
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text).strip('-')
    return text

def reseed_database():
    print("Reseeding categories...")
    
    # Exempel på kategorier
    categories_data = [
        "Skönhet & Hälsa",
        "Elektronik",
        "Sport & Fritid",
        "Heminredning",
        "Kläder & Mode"
    ]

    # Simulera DB-uppkoppling (byt ut mot din riktiga connection string)
    conn = sqlite3.connect('my_database.db')
    cursor = conn.cursor()

    # 1. Se till att tabellen har en slug-kolumn
    # I en riktig migration skulle du göra: ALTER TABLE categories ADD COLUMN slug TEXT UNIQUE;
    try:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL
            )
        ''')
    except Exception as e:
        print(f"Tabell-info: {e}")

    # Rensa gamla data (Valfritt)
    cursor.execute("DELETE FROM categories")

    # 2. Sätt in data med genererade slugs
    for name in categories_data:
        slug = slugify(name)
        print(f"Creating category: {name} -> {slug}")
        
        cursor.execute(
            "INSERT INTO categories (name, slug) VALUES (?, ?)",
            (name, slug)
        )

    conn.commit()
    conn.close()
    print("Database reseeded successfully with slugs!")

if __name__ == "__main__":
    reseed_database()