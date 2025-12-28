import re
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Category, Product

# Vi behåller listan för att bygga strukturen, men bryr oss inte om "active"-flaggan längre
CATEGORY_DATA = {
    "Skönhet & Hälsa": ["Hårvård", "Ansiktsvård", "Kroppsvård", "Smink", "Parfym", "Apotek & Hälsa", "Manligt", "Tandvård", "Solskydd"],
    "Kläder & Accessoarer": ["Damkläder", "Herrkläder", "Skor", "Väskor", "Smycken", "Klockor", "Underkläder", "Glasögon"],
    "Hem & Hushåll": ["Städ & Tvätt", "Kök & Matlagning", "Inredning", "Belysning", "Badrum", "Sängkläder", "Organisering"],
    "Teknik & Datorer": ["Datorer & Surfplattor", "Mobiler & Tillbehör", "Ljud & Bild", "Gaming", "Smart Hem", "Foto & Video", "Nätverk"],
    "Barn & Familj": ["Blöjor & Vård", "Leksaker", "Barnvagnar & Bilbarnstolar", "Barnkläder & Skor", "Graviditet", "Barnrum"],
    "Sport & Fritid": ["Träningskläder", "Kosttillskott", "Utrustning", "Friluftsliv", "Cykling", "Vintersport", "Bollsport"],
    "Bygg & Trädgård": ["Verktyg", "El & VVS", "Måleri", "Trädgårdsskötsel", "Byggmaterial", "Arbetskläder", "Säkerhet"],
    "Husdjur": ["Hund", "Katt", "Smådjur", "Akvarium", "Häst", "Fågel"],
    "Fordon & Tillbehör": ["Bilvård", "Reservdelar", "Däck & Fälg", "MC-utrustning", "Biltillbehör", "Olja & Vätskor"],
    "Mat & Dryck": ["Skafferi", "Dryck", "Godis & Snacks", "Kaffe & Te", "Kryddor"],
    "Kontor & Företag": ["Kontorsmaterial", "Skrivare & Bläck", "Emballage", "Kontorsmöbler", "Pennor & Block"],
    "Begagnade produkter": ["Begagnat Mode", "Begagnad Elektronik", "Möbler & Inredning", "Samlarsaker", "Media & Böcker"]
}

def make_slug(text: str) -> str:
    text = text.lower()
    text = text.replace("å", "a").replace("ä", "a").replace("ö", "o")
    text = text.replace("&", "")
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'\s+', '-', text).strip("-")
    return text

def seed_categories(db: Session):
    """Skapar grundkategorier (alla sätts till coming_soon=True som default)."""
    print("🌱 Synkroniserar kategoriträd...")
    
    for cat_name, subs in CATEGORY_DATA.items():
        parent_slug = make_slug(cat_name)
        # Skapa huvudkategori (alltid coming_soon=True tills vi kör update-funktionen)
        parent = check_or_create(db, cat_name, parent_slug, None)
        
        for sub_name in subs:
            sub_slug = make_slug(sub_name)
            check_or_create(db, sub_name, sub_slug, parent.id)
            
    db.commit()
    print(f"✅ Kategoristruktur klar.")

def check_or_create(db: Session, name: str, slug: str, parent_id: int = None):
    category = db.query(Category).filter(Category.slug == slug).first()
    if not category:
        category = Category(
            name=name, 
            slug=slug, 
            parent_id=parent_id,
            coming_soon=True  # Default: True. Ändras dynamiskt senare.
        )
        db.add(category)
        db.flush()
        print(f"   + Skapade: {name}")
    return category

def update_coming_soon_status(db: Session):
    """
    Kollar vilka kategorier som faktiskt har produkter och låser upp dem.
    """
    print("🔄 Uppdaterar kategori-status baserat på lagersaldo...")
    
    # 1. Återställ allt till TRUE (pessimistisk start)
    db.query(Category).update({Category.coming_soon: True})
    
    # 2. Hitta ID på alla kategorier som har MINST EN produkt
    # SQL: SELECT DISTINCT category_id FROM products;
    active_category_ids = [
        r[0] for r in db.query(Product.category_id).distinct().all() 
        if r[0] is not None
    ]
    
    if not active_category_ids:
        print("   ⚠️ Inga produkter hittades. Alla kategorier är 'Coming Soon'.")
        db.commit()
        return

    # 3. Sätt dessa till active (coming_soon = False)
    db.query(Category).filter(Category.id.in_(active_category_ids)).update(
        {Category.coming_soon: False}, 
        synchronize_session=False
    )
    
    # 4. Uppdatera HUVUDKATEGORIER (Parents)
    # Om en underkategori är aktiv, ska föräldern också vara aktiv.
    # Vi hämtar alla parents som har aktiva barn.
    active_parents = db.query(Category.parent_id)\
        .filter(Category.id.in_(active_category_ids))\
        .distinct().all()
        
    active_parent_ids = [r[0] for r in active_parents if r[0] is not None]
    
    if active_parent_ids:
        db.query(Category).filter(Category.id.in_(active_parent_ids)).update(
            {Category.coming_soon: False},
            synchronize_session=False
        )

    db.commit()
    
    # Räkna hur många som är aktiva nu
    active_count = db.query(Category).filter(Category.coming_soon == False).count()
    print(f"✅ Status uppdaterad! {active_count} kategorier är nu aktiva (har produkter).")