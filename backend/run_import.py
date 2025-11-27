from app.database import SessionLocal
from app.services.feed_engine import process_feed_bulk
import sys
import os

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Användning: python run_import.py <fil.csv> <Butiksnamn>")
        print("Exempel: python run_import.py feeds/lyko.csv Lyko")
        sys.exit(1)

    file_path = sys.argv[1]
    store_name = sys.argv[2]

    if not os.path.exists(file_path):
        print(f"❌ Filen finns inte: {file_path}")
        sys.exit(1)

    db = SessionLocal()
    try:
        process_feed_bulk(file_path, store_name, db)
    except Exception as e:
        print(f"Ett fel uppstod: {e}")
    finally:
        db.close()