from app.models import Product, ProductPrice, Store

def test_get_products_list_structure(client, db):
    # 1. Förbered data i test_db
    store = Store(name="Test Store")
    db.add(store)
    db.commit() # Måste committa för att få ID

    prod = Product(name="Produkt A", ean="111", slug="produkt-a")
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
    assert json_resp["data"][0]["name"] == "Produkt A"
    assert json_resp["data"][0]["prices"][0]["store"] == "Test Store"

def test_get_product_details(client, db):
    # Förbered
    prod = Product(name="Produkt Detalj", ean="222", slug="produkt-detalj")
    db.add(prod)
    db.commit()

    # Anropa
    response = client.get(f"/products/{prod.id}")
    
    # Verifiera
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Produkt Detalj"

def test_search_products(client, db):
    # Skapa en produkt att söka på
    prod = Product(name="Unik Osthyvel", ean="333", slug="unik-osthyvel")
    db.add(prod)
    db.commit() # Viktigt!

    # Sök
    response = client.get("/products?search=Osthyvel")
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["data"][0]["name"] == "Unik Osthyvel"