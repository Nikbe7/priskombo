from app.models import Product, ProductPrice, Store

def test_search_endpoint(client, db):
    # 1. Setup
    store = Store(name="Kjell")
    db.add(store)
    db.commit()

    prod = Product(name="Gaming Mus", ean="555", slug="gaming-mus")
    db.add(prod)
    db.commit()

    price = ProductPrice(product_id=prod.id, store_id=store.id, price=500, url="url")
    db.add(price)
    db.commit()

    # 2. Sök via /search endpointen (den som returnerar enkel lista)
    response = client.get("/search?q=Gaming")
    
    assert response.status_code == 200
    data = response.json()
    
    assert len(data) == 1
    assert data[0]["name"] == "Gaming Mus"
    assert data[0]["prices"][0]["store"] == "Kjell"