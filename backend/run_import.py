from app.database import SessionLocal
from app.services.importer import import_csv_feed
import sys

# Kör så här: python run_import.py filnamn.csv "Butiksnamn"

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Användning: python run_import.py <fil.csv> <Butiksnamn>")
        sys.exit(1)

    file_path = sys.argv[1]
    store_name = sys.argv[2]

    db = SessionLocal()
    try:
        import_csv_feed(file_path, store_name, db)
    finally:
        db.close()