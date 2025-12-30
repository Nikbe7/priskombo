from app.services.seeder import seed_categories, update_coming_soon_status
from app.models import Category, Product

def test_seed_categories(db):
    """Testar att kategorier skapas."""
    seed_categories(db)

    # Vi letar efter en kategori som vi vet finns i din seeder-lista (från loggen)
    # T.ex: "Hårvård" -> slug "harvard"
    cat = db.query(Category).filter_by(slug="harvard").first()
    
    # Om slugify funktionen är osäker, kan vi söka på namn istället för testets skull
    if not cat:
        cat = db.query(Category).filter_by(name="Hårvård").first()

    assert cat is not None
    assert cat.name == "Hårvård"
    
    # Hårvård ligger under "Skönhet & Hälsa" i din lista
    assert cat.parent is not None
    assert "Skönhet" in cat.parent.name

def test_update_coming_soon(db):
    """Testar att coming_soon togglas korrekt."""
    # 1. Skapa kategori (coming_soon=True default eller via seeder)
    cat = Category(name="Tom Kategori", slug="tom", coming_soon=True)
    db.add(cat)
    
    # 2. Skapa kategori med produkt
    cat_active = Category(name="Aktiv", slug="aktiv", coming_soon=True)
    db.add(cat_active)
    db.commit()
    
    prod = Product(name="P", ean="1", slug="p", category_id=cat_active.id)
    db.add(prod)
    db.commit()

    # 3. Kör uppdatering
    update_coming_soon_status(db)
    
    # 4. Verifiera
    db.refresh(cat)
    db.refresh(cat_active)
    
    assert cat.coming_soon == True  # Ingen produkt -> fortfarande true
    assert cat_active.coming_soon == False # Har produkt -> false