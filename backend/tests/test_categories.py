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
    response = client.get("/api/v1/categories/")
    
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

def test_empty_categories(client, db):
    """Testar att tom databas ger tom lista."""
    response = client.get("/api/v1/categories/")
    assert response.status_code == 200
    data = response.json()
    assert data == []

def test_category_parent_id(client, db):
    """Testar att parent_id returneras korrekt."""
    parent = Category(name="Parent", slug="parent")
    db.add(parent)
    db.commit()

    child = Category(name="Child", slug="child", parent_id=parent.id)
    db.add(child)
    db.commit()

    response = client.get("/api/v1/categories/")
    assert response.status_code == 200
    data = response.json()

    child_data = next(c for c in data if c["name"] == "Child")
    assert child_data["parent_id"] == parent.id

    parent_data = next(c for c in data if c["name"] == "Parent")
    assert parent_data["parent_id"] is None