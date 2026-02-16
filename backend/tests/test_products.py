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
    response = client.get("/api/v1/products?limit=10")
    
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
    response = client.get(f"/api/v1/products/{prod.id}")
    
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
    response = client.get(f"/api/v1/products/unik-produkt-slug")
    
    # Verifiera
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == prod.id
    assert data["name"] == "Produkt Slug"

def test_search_products(client, db):
    prod = Product(name="Unik Osthyvel", ean="444", slug="unik-osthyvel")
    db.add(prod)
    db.commit()

    response = client.get("/api/v1/products?search=Osthyvel")
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["data"][0]["name"] == "Unik Osthyvel"

def test_products_endpoint_returns_affiliate_links(client, db):
    """
    Verifierar att API:et för produkter returnerar tracking-länkar
    när butiken är konfigurerad för det.
    """
    # 1. Setup: Skapa en butik med Adtraction
    store = Store(
        name="AffiliateStore", 
        base_shipping=0,
        affiliate_network="adtraction",
        affiliate_program_id="123456"
    )
    db.add(store)
    db.commit()

    # 2. Skapa produkt och pris
    prod = Product(name="TestAffiliate", ean="999", slug="test-affiliate")
    db.add(prod)
    db.commit()

    raw_url = "https://butik.se/produkt"
    price = ProductPrice(product_id=prod.id, store_id=store.id, price=100.0, url=raw_url)
    db.add(price)
    db.commit()

    # --- TEST 1: Produktlistan (GET /api/v1/api/v1/products/) ---
    response = client.get("/api/v1/products/?search=TestAffiliate")
    assert response.status_code == 200
    data = response.json()["data"]
    
    assert len(data) > 0
    price_entry = data[0]["prices"][0]
    
    # Kritiskt: URL:en ska vara en tracking-länk, inte originalet
    assert "at.track.adtr.co" in price_entry["url"]
    assert "123456" in price_entry["url"]

    # --- TEST 2: Produktsidan (GET /api/v1/api/v1/products/{id}) ---
    response_detail = client.get(f"/api/v1/products/{prod.slug}")
    assert response_detail.status_code == 200
    detail_data = response_detail.json()
    
    detail_price = detail_data["prices"][0]
    assert "at.track.adtr.co" in detail_price["url"]

def test_product_not_found_returns_404(client, db):
    """Testar att en icke-existerande produkt ger 404."""
    response = client.get("/api/v1/products/does-not-exist-999")
    assert response.status_code == 404

def test_empty_products_list(client, db):
    """Testar att tom databas ger tom lista."""
    response = client.get("/api/v1/products?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["data"] == []