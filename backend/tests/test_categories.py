from app.models import Category

def test_get_categories(client, db):
    # 1. Skapa kategoriträd
    parent = Category(name="Elektronik", slug="elektronik")
    db.add(parent)
    db.commit()

    child = Category(name="Mobil", slug="mobil", parent_id=parent.id)
    db.add(child)
    db.commit()

    # 2. Anropa API
    response = client.get("/categories/")
    
    # 3. Verifiera
    assert response.status_code == 200
    data = response.json()
    
    assert len(data) == 2
    
    # Hitta elektronikkategorin
    elektronik = next(c for c in data if c["name"] == "Elektronik")
    assert elektronik["slug"] == "elektronik"

    # Hitta mobilkategorin
    mobil = next(c for c in data if c["name"] == "Mobil")
    assert mobil["slug"] == "mobil"