from app.models import Product, ProductPrice, Store

def test_get_deals(client, db):
    # 1. Skapa butik
    store = Store(name="Apotea")
    db.add(store)
    db.commit()

    # 2. Skapa produkt med REA
    prod = Product(name="Rea Produkt", ean="999", slug="rea-produkt", image_url="img.jpg")
    db.add(prod)
    db.commit()

    # Pris med rabatt (regular_price > price) och discount_percent > 0
    price = ProductPrice(
        product_id=prod.id, 
        store_id=store.id, 
        price=80.0, 
        regular_price=100.0, 
        discount_percent=20, 
        url="http://url"
    )
    db.add(price)
    db.commit()

    # 3. Anropa API
    response = client.get("/deals")
    
    # 4. Verifiera
    assert response.status_code == 200
    data = response.json()
    
    assert len(data) >= 1
    assert data[0]["name"] == "Rea Produkt"
    assert data[0]["discount_percent"] == 20