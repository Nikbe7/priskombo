from app.models import Product, ProductPrice, Store

def test_optimize_with_valid_cart(client, db):
    """Testar optimize-endpointen med en giltig varukorg."""
    # 1. Setup
    store = Store(name="OptStore", base_shipping=49)
    db.add(store)
    db.commit()

    prod = Product(name="OptProd", ean="opt1", slug="opt-prod")
    db.add(prod)
    db.commit()

    price = ProductPrice(product_id=prod.id, store_id=store.id, price=200.0, url="http://url")
    db.add(price)
    db.commit()

    # 2. Anropa endpointen
    response = client.post("/api/v1/optimize/", json={
        "items": [{"product_id": prod.id, "quantity": 1}]
    })

    # 3. Verifiera
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["total_cost"] > 0
    assert "OptStore" in data[0]["stores"]

def test_optimize_with_empty_cart(client, db):
    """Testar att tom varukorg returnerar 400."""
    response = client.post("/api/v1/optimize/", json={
        "items": []
    })
    assert response.status_code == 400

def test_optimize_with_invalid_body(client, db):
    """Testar att felaktig request body returnerar 422."""
    response = client.post("/api/v1/optimize/", json={
        "wrong_field": "abc"
    })
    assert response.status_code == 422

def test_optimize_with_quantity(client, db):
    """Testar att quantity hanteras korrekt i endpointen."""
    store = Store(name="QtyStore", base_shipping=0, free_shipping_limit=0)
    db.add(store)
    db.commit()

    prod = Product(name="QtyProd", ean="qty1", slug="qty-prod")
    db.add(prod)
    db.commit()

    price = ProductPrice(product_id=prod.id, store_id=store.id, price=50.0, url="http://url")
    db.add(price)
    db.commit()

    response = client.post("/api/v1/optimize/", json={
        "items": [{"product_id": prod.id, "quantity": 3}]
    })

    assert response.status_code == 200
    data = response.json()
    # 50 * 3 = 150 kr (ingen frakt)
    assert data[0]["total_cost"] == 150.0
