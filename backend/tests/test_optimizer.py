from unittest.mock import patch
from app.services.optimizer import calculate_best_basket
from app.models import Product, ProductPrice, Store

# Vi patchar bort redis_client så att vi alltid testar logiken, inte cachen
@patch("app.services.optimizer.redis_client", None) 
def test_single_store_cheapest(db):
    """Testar att algoritmen väljer billigaste butiken när allt finns där."""
    
    # 1. Setup Data
    apotea = Store(name="Apotea", base_shipping=49, free_shipping_limit=299)
    lyko = Store(name="Lyko", base_shipping=39, free_shipping_limit=199)
    db.add_all([apotea, lyko])
    db.commit()

    prod = Product(name="Produkt X", ean="101", slug="prod-x")
    db.add(prod)
    db.commit()

    # Apotea: 100kr, Lyko: 150kr
    p1 = ProductPrice(product_id=prod.id, store_id=apotea.id, price=100.0, url="u1")    
    p2 = ProductPrice(product_id=prod.id, store_id=lyko.id, price=150.0, url="u2")      
    db.add_all([p1, p2])
    db.commit()

    # 2. Kör algoritmen (OBS: Ny struktur med quantity)
    cart_items = [{"product_id": prod.id, "quantity": 1}]
    results = calculate_best_basket(cart_items, db)
    
    # 3. Verifiera
    best = results[0] # Listan är sorterad billigast först
    
    assert best["stores"][0] == "Apotea"
    assert best["total_cost"] == 149.0 # 100 + 49 frakt

@patch("app.services.optimizer.redis_client", None)
def test_smart_split(db):
    """Testar att algoritmen delar upp köpet om det lönar sig."""
    s1 = Store(name="Store A", base_shipping=50)
    s2 = Store(name="Store B", base_shipping=50)
    db.add_all([s1, s2])
    db.commit()

    p1 = Product(name="P1", ean="1", slug="p1")
    p2 = Product(name="P2", ean="2", slug="p2")
    db.add_all([p1, p2])
    db.commit()

    # P1 billig på A
    db.add(ProductPrice(product_id=p1.id, store_id=s1.id, price=100.0, url=""))
    db.add(ProductPrice(product_id=p1.id, store_id=s2.id, price=500.0, url=""))
    
    # P2 billig på B
    db.add(ProductPrice(product_id=p2.id, store_id=s1.id, price=500.0, url=""))
    db.add(ProductPrice(product_id=p2.id, store_id=s2.id, price=100.0, url=""))
    db.commit()

    # OBS: Ny struktur
    cart_items = [
        {"product_id": p1.id, "quantity": 1},
        {"product_id": p2.id, "quantity": 1}
    ]
    results = calculate_best_basket(cart_items, db)
    
    best = results[0]
    
    # Split: (100+50) + (100+50) = 300 kr
    # Samlat: 600+50 = 650 kr
    assert best["total_cost"] == 300.0
    assert len(best["stores"]) == 2 # Det ska vara två butiker inblandade

@patch("app.services.optimizer.redis_client", None)
def test_quantity_calculation(db):
    """Testar att priset multipliceras korrekt med antal."""
    store = Store(name="BulkStore", base_shipping=0, free_shipping_limit=0)
    db.add(store)
    db.commit()

    prod = Product(name="Bulk Item", ean="999", slug="bulk")
    db.add(prod)
    db.commit()

    price = 100.0
    db.add(ProductPrice(product_id=prod.id, store_id=store.id, price=price, url=""))
    db.commit()

    # Vi köper 5 st
    quantity = 5
    cart_items = [{"product_id": prod.id, "quantity": quantity}]
    
    results = calculate_best_basket(cart_items, db)
    best = results[0]

    expected_cost = price * quantity # 500.0
    assert best["details"][0]["products_cost"] == expected_cost
    assert best["total_cost"] == expected_cost

@patch("app.services.optimizer.redis_client", None)
def test_smart_split_suppressed_if_single_store(db):
    """
    Om 'Smart Split' (billigast per vara) resulterar i att ALLA varor
    köps från samma butik, ska alternativet INTE returneras som en split.
    Det täcks redan av 'Samlad leverans'.
    """
    # 1. Skapa två butiker
    s1 = Store(name="MegaStore", base_shipping=50)
    s2 = Store(name="DyrButik", base_shipping=50)
    db.add_all([s1, s2])
    db.commit()

    # 2. Skapa två produkter
    p1 = Product(name="Billig P1", ean="1", slug="p1")
    p2 = Product(name="Billig P2", ean="2", slug="p2")
    db.add_all([p1, p2])
    db.commit()

    # 3. MegaStore är billigast på BÅDA
    # P1: MegaStore=100, DyrButik=200
    db.add(ProductPrice(product_id=p1.id, store_id=s1.id, price=100.0, url=""))
    db.add(ProductPrice(product_id=p1.id, store_id=s2.id, price=200.0, url=""))
    
    # P2: MegaStore=100, DyrButik=200
    db.add(ProductPrice(product_id=p2.id, store_id=s1.id, price=100.0, url=""))
    db.add(ProductPrice(product_id=p2.id, store_id=s2.id, price=200.0, url=""))
    db.commit()

    # 4. Optimera
    cart_items = [
        {"product_id": p1.id, "quantity": 1},
        {"product_id": p2.id, "quantity": 1}
    ]
    results = calculate_best_basket(cart_items, db)
    
    # 5. Verifiera
    # Vi förväntar oss att INGEN "Smart Split" finns med, eftersom en split 
    # som hamnar i en enda butik ska filtreras bort.
    # Däremot kan vi få FLERA "Samlad leverans"-alternativ (både MegaStore och DyrButik).
    
    smart_split_results = [r for r in results if r["type"] == "Smart Split (Billigast)"]
    assert len(smart_split_results) == 0, "Borde inte finnas någon Smart Split om allt köps från en butik"

    # Kontrollera att det bästa alternativet är MegaStore
    best_option = results[0]
    assert best_option["stores"][0] == "MegaStore"
    assert best_option["type"] == "Samlad leverans"