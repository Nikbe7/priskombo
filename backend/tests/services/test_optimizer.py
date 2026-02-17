from app.models import Product, ProductPrice, Store
from app.services.optimizer import calculate_best_basket
from unittest.mock import patch

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

    # P1 billig på A (100 vs 500)
    db.add(ProductPrice(product_id=p1.id, store_id=s1.id, price=100.0, url=""))
    db.add(ProductPrice(product_id=p1.id, store_id=s2.id, price=500.0, url=""))
    
    # P2 billig på B (500 vs 100)
    db.add(ProductPrice(product_id=p2.id, store_id=s1.id, price=500.0, url=""))
    db.add(ProductPrice(product_id=p2.id, store_id=s2.id, price=100.0, url=""))
    db.commit()

    cart_items = [
        {"product_id": p1.id, "quantity": 1},
        {"product_id": p2.id, "quantity": 1}
    ]
    results = calculate_best_basket(cart_items, db)
    
    best = results[0]
    
    # Split: (100+50) + (100+50) = 300 kr
    # Samlat (t.ex Store A): 100 + 500 + 50 = 650 kr
    assert best["total_cost"] == 300.0
    assert len(best["stores"]) == 2
    assert best["type"] == "Smart Split (Billigast)"

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
    Om den rekursiva lösaren hittar att bästa priset är i en och samma butik,
    ska den returnera det som 'Samlad leverans', inte 'Smart Split'.
    """
    s1 = Store(name="MegaStore", base_shipping=50)
    s2 = Store(name="DyrButik", base_shipping=50)
    db.add_all([s1, s2])
    db.commit()

    p1 = Product(name="Billig P1", ean="1", slug="p1")
    p2 = Product(name="Billig P2", ean="2", slug="p2")
    db.add_all([p1, p2])
    db.commit()

    # MegaStore är billigast på BÅDA
    db.add(ProductPrice(product_id=p1.id, store_id=s1.id, price=100.0, url=""))
    db.add(ProductPrice(product_id=p1.id, store_id=s2.id, price=200.0, url=""))
    
    db.add(ProductPrice(product_id=p2.id, store_id=s1.id, price=100.0, url=""))
    db.add(ProductPrice(product_id=p2.id, store_id=s2.id, price=200.0, url=""))
    db.commit()

    cart_items = [
        {"product_id": p1.id, "quantity": 1},
        {"product_id": p2.id, "quantity": 1}
    ]
    results = calculate_best_basket(cart_items, db)
    
    best_option = results[0]
    
    # Det ska klassas som Samlad leverans eftersom allt kommer från MegaStore
    assert best_option["stores"][0] == "MegaStore"
    assert best_option["type"] == "Samlad leverans"
    # Eftersom vinnaren är "Samlad leverans" ska ingen fallback läggas till, så len==1
    assert len(results) == 1

@patch("app.services.optimizer.redis_client", None)
def test_fallback_to_single_store(db):
    """
    NYTT TEST: Om vinnaren är en 'Smart Split', ska vi ändå få 
    ett alternativ #2 som är 'Samlad leverans' (om möjligt).
    """
    # Setup: Det är mycket billigare att splitta
    s1 = Store(name="BilligPåA", base_shipping=10)
    s2 = Store(name="BilligPåB", base_shipping=10)
    # En "Mellan"-butik som har allt till okej pris
    s3 = Store(name="HarAllt", base_shipping=10) 
    
    db.add_all([s1, s2, s3])
    db.commit()

    p1 = Product(name="P1", ean="1", slug="p1")
    p2 = Product(name="P2", ean="2", slug="p2")
    db.add_all([p1, p2])
    db.commit()

    # --- KONFIGURERA PRISER ---
    
    # P1: 
    # - Billig på A (100)
    # - Dyr på B (1000) <--- Höjde priset här för att göra samlad leverans orimlig
    # - Mellan på HarAllt (200) <--- Sänkte priset här
    db.add(ProductPrice(product_id=p1.id, store_id=s1.id, price=100.0, url=""))
    db.add(ProductPrice(product_id=p1.id, store_id=s2.id, price=1000.0, url=""))
    db.add(ProductPrice(product_id=p1.id, store_id=s3.id, price=200.0, url=""))

    # P2: 
    # - Dyr på A (1000) <--- Höjde priset här
    # - Billig på B (100)
    # - Mellan på HarAllt (200) <--- Sänkte priset här
    db.add(ProductPrice(product_id=p2.id, store_id=s1.id, price=1000.0, url=""))
    db.add(ProductPrice(product_id=p2.id, store_id=s2.id, price=100.0, url=""))
    db.add(ProductPrice(product_id=p2.id, store_id=s3.id, price=200.0, url=""))
    
    db.commit()

    # UTRÄKNING:
    # 1. Smart Split: 
    #    P1 från A (100) + P2 från B (100) + Frakt (10+10) = 220 kr.
    #    (Detta blir Vinnaren)
    
    # 2. Samlad leverans alternativ:
    #    - BilligPåA: 100 + 1000 + 10 = 1110 kr.
    #    - BilligPåB: 1000 + 100 + 10 = 1110 kr.
    #    - HarAllt:   200 + 200 + 10 = 410 kr. (Vinnare av fallback)
    
    cart_items = [
        {"product_id": p1.id, "quantity": 1},
        {"product_id": p2.id, "quantity": 1}
    ]
    results = calculate_best_basket(cart_items, db)

    # Vi förväntar oss TVÅ resultat
    assert len(results) == 2
    
    # 1. Vinnaren ska vara Split
    assert results[0]["type"] == "Smart Split (Billigast)"
    assert results[0]["total_cost"] == 220.0
    
    # 2. Tvåan ska vara Samlad Leverans (från HarAllt, eftersom 410 < 1110)
    assert results[1]["type"] == "Samlad leverans"
    assert results[1]["stores"][0] == "HarAllt"
    assert results[1]["total_cost"] == 410.0

@patch("app.services.optimizer.redis_client", None)
def test_complex_shipping_threshold(db):
    """
    NYTT TEST: Verifierar att algoritmen klarar av 'Fri frakt'-trösklar.
    Här är det billigare att köpa en DYRARE vara för att få fri frakt.
    En enkel girig algoritm skulle misslyckas här.
    """
    # Butik A: Billig vara, men alltid frakt
    s1 = Store(name="AlltidFrakt", base_shipping=50, free_shipping_limit=None)
    # Butik B: Dyrare vara, men fri frakt över 110 kr
    s2 = Store(name="FriFraktButik", base_shipping=50, free_shipping_limit=110)
    
    db.add_all([s1, s2])
    db.commit()

    p1 = Product(name="LitenGrej", ean="1", slug="liten")
    p2 = Product(name="StorGrej", ean="2", slug="stor")
    db.add_all([p1, p2])
    db.commit()

    # P1: Billigast på AlltidFrakt (10 kr) vs FriFraktButik (20 kr)
    db.add(ProductPrice(product_id=p1.id, store_id=s1.id, price=10.0, url=""))
    db.add(ProductPrice(product_id=p1.id, store_id=s2.id, price=20.0, url=""))
    
    # P2: Samma pris (100 kr)
    db.add(ProductPrice(product_id=p2.id, store_id=s1.id, price=100.0, url=""))
    db.add(ProductPrice(product_id=p2.id, store_id=s2.id, price=100.0, url=""))
    
    db.commit()

    # Alternativ 1 (Girig/Slump): 
    # Köp P1 på AlltidFrakt (10kr). Köp P2 på FriFraktButik (100kr).
    # Resultat: (10+50) + (100+50) = 210 kr. (Eller samlat på s1: 110+50 = 160 kr)
    
    # Alternativ 2 (Smart):
    # Köp BÅDA på FriFraktButik.
    # Varor: 20 + 100 = 120 kr.
    # Frakt: 0 kr (eftersom 120 > 110).
    # Totalt: 120 kr.

    cart_items = [
        {"product_id": p1.id, "quantity": 1},
        {"product_id": p2.id, "quantity": 1}
    ]
    results = calculate_best_basket(cart_items, db)
    
    best = results[0]
    
    # Algoritmen ska ha valt FriFraktButik för BÅDA, trots att varan var dyrare där.
    assert best["total_cost"] == 120.0
    assert best["stores"][0] == "FriFraktButik"
    assert best["type"] == "Samlad leverans"

@patch("app.services.optimizer.redis_client", None)
def test_optimizer_returns_tracking_links(db):
    """Verifierar att tracking-länkar genereras."""
    store = Store(
        name="AffiliateStore", 
        base_shipping=0, 
        affiliate_network="adtraction",
        affiliate_program_id="112233"
    )
    db.add(store)
    db.commit()

    prod = Product(name="TestP", ean="111", slug="p1")
    db.add(prod)
    db.commit()

    raw_url = "https://butik.se/produkt"
    price = ProductPrice(product_id=prod.id, store_id=store.id, price=100.0, url=raw_url)
    db.add(price)
    db.commit()

    cart = [{"product_id": prod.id, "quantity": 1}]
    results = calculate_best_basket(cart, db)

    offer_url = results[0]["details"][0]["products"][0].get("url")
    
    assert "at.track.adtr.co" in offer_url
    assert "112233" in offer_url