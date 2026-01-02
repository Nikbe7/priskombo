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

    # 2. Kör algoritmen
    results = calculate_best_basket([prod.id], db)
    
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

    results = calculate_best_basket([p1.id, p2.id], db)
    
    best = results[0]
    
    # Split: (100+50) + (100+50) = 300 kr
    # Samlat: 600+50 = 650 kr
    assert best["total_cost"] == 300.0
    assert len(best["stores"]) == 2 # Det ska vara två butiker inblandade