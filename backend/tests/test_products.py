from app.models import Product, ProductPrice, Store, Category

def test_get_products_list_structure(client, db):
    # 1. Förbered data
    store = Store(name="Test Store")
    db.add(store)
    db.commit()

    # Skapa en kategori för att testa att den följer med i listan
    cat = Category(name="Testkategori", slug="testkategori")
    db.add(cat)
    db.commit()

    prod = Product(name="Produkt A", ean="111", slug="produkt-a", category_id=cat.id)
    db.add(prod)
    db.commit()

    price = ProductPrice(product_id=prod.id, store_id=store.id, price=100.0, url="http://url")
    db.add(price)
    db.commit()

    # 2. Anropa API
    response = client.get("/products?limit=10")
    
    # 3. Verifiera
    assert response.status_code == 200
    json_resp = response.json()
    
    assert json_resp["total"] == 1
    prod_data = json_resp["data"][0]
    
    assert prod_data["name"] == "Produkt A"
    assert prod_data["slug"] == "produkt-a" # <-- Nytt: Kolla att slug finns
    assert prod_data["prices"][0]["store"] == "Test Store"
    
    # <-- Nytt: Kolla att category är ett objekt
    assert prod_data["category"]["name"] == "Testkategori"
    assert prod_data["category"]["slug"] == "testkategori"

def test_get_product_details_by_id(client, db):
    # Förbered
    prod = Product(name="Produkt ID", ean="222", slug="produkt-id")
    db.add(prod)
    db.commit()

    # Anropa med ID
    response = client.get(f"/products/{prod.id}")
    
    # Verifiera
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Produkt ID"
    assert data["slug"] == "produkt-id"

def test_get_product_details_by_slug(client, db):
    """Testar den nya funktionaliteten: Hämta via SLUG"""
    # Förbered
    prod = Product(name="Produkt Slug", ean="333", slug="unik-produkt-slug")
    db.add(prod)
    db.commit()

    # Anropa med SLUG istället för ID
    response = client.get(f"/products/unik-produkt-slug")
    
    # Verifiera
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == prod.id
    assert data["name"] == "Produkt Slug"

def test_search_products(client, db):
    prod = Product(name="Unik Osthyvel", ean="444", slug="unik-osthyvel")
    db.add(prod)
    db.commit()

    response = client.get("/products?search=Osthyvel")
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["data"][0]["name"] == "Unik Osthyvel"