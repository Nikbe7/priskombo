from app.database import SessionLocal
from app.models import Category

def seed_categories():
    db = SessionLocal()
    
    # Våra huvudkategorier
    categories = [
        "Hårvård",
        "Ansiktsvård",
        "Kroppsvård",
        "Smink",
        "Parfym",
        "Hälsa & Apotek",
        "Manligt"
    ]

    print("🌱 Planterar kategorier...")
    
    for cat_name in categories:
        # Kolla om den redan finns
        exists = db.query(Category).filter(Category.name == cat_name).first()
        if not exists:
            print(f"Skapar: {cat_name}")
            new_cat = Category(name=cat_name)
            db.add(new_cat)
        else:
            print(f"Fanns redan: {cat_name}")

    db.commit()
    db.close()
    print("✅ Klart!")

if __name__ == "__main__":
    seed_categories()