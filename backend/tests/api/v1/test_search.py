from app.models import Product, ProductPrice, Store, Category

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

    # 2. Sök via /api/v1/search endpointen (den som returnerar enkel lista)
    response = client.get("/api/v1/search?q=Gaming")
    
    assert response.status_code == 200
    data = response.json()
    
    assert len(data) == 1
    assert data[0]["name"] == "Gaming Mus"
    assert data[0]["prices"][0]["store"] == "Kjell"

def test_search_suggestions(client, db):
    """
    Testar att /suggestions returnerar kategorier, märken och produkter.
    """
    # 1. Setup Data
    # Skapa en kategori
    cat_parent = Category(name="Elektronik", slug="elektronik")
    db.add(cat_parent)
    db.commit()
    
    cat_child = Category(name="Hörlurar", slug="horlurar", parent_id=cat_parent.id)
    db.add(cat_child)
    
    # Skapa butik
    store = Store(name="TestStore", base_shipping=0)
    db.add(store)
    db.commit()

    # Skapa produkter (Sony Hörlurar)
    p1 = Product(name="Sony WH-1000XM5", brand="Sony", slug="sony-xm5", category_id=cat_child.id)
    p2 = Product(name="Sony In-Ear", brand="Sony", slug="sony-inear")
    p3 = Product(name="Samsung TV", brand="Samsung", slug="samsung-tv") # Ska inte matchas på "Son"
    db.add_all([p1, p2, p3])
    db.commit()

    # Lägg till priser så de syns
    db.add(ProductPrice(product_id=p1.id, store_id=store.id, price=3000))
    db.add(ProductPrice(product_id=p2.id, store_id=store.id, price=1500))
    db.commit()

    # 2. Anropa API med söksträng "Son" (borde matcha Sony)
    response = client.get("/api/v1/search/suggestions?q=Son")
    
    assert response.status_code == 200
    data = response.json()

    # 3. Verifiera struktur
    assert "categories" in data
    assert "brands" in data
    assert "products" in data

    # Verifiera innehåll
    # Brands: Borde hitta "Sony"
    assert "Sony" in data["brands"]
    
    # Produkter: Borde hitta Sony-produkterna
    product_names = [p["name"] for p in data["products"]]
    assert "Sony WH-1000XM5" in product_names
    assert "Samsung TV" not in product_names

    # 4. Testa kategori-sökning "Hör" -> "Hörlurar"
    response_cat = client.get("/api/v1/search/suggestions?q=Hör")
    data_cat = response_cat.json()
    
    cat_names = [c["name"] for c in data_cat["categories"]]
    assert "Hörlurar" in cat_names
    # Kolla att parent info finns med
    assert data_cat["categories"][0]["parent_name"] == "Elektronik"