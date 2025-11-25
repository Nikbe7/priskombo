from app.services.optimizer import calculate_best_basket
from collections import namedtuple
from unittest.mock import MagicMock

# Vi skapar enkla klasser för att simulera Databas-objekt
MockStore = namedtuple("MockStore", ["id", "name", "base_shipping", "free_shipping_limit"])
MockPrice = namedtuple("MockPrice", ["product_id", "price"])

def test_single_store_cheapest():
    """Testar att algoritmen väljer billigaste butiken när allt finns där."""
    
    # SETUP: Skapa en låtsas-databas session
    mock_db = MagicMock()
    
    # Skapa två butiker
    apotea = MockStore(1, "Apotea", 49, 299)
    lyko = MockStore(2, "Lyko", 39, 199)
    
    # Vi vill köpa Produkt 101.
    # Apotea säljer för 100kr. Lyko säljer för 150kr.
    # Mocka vad db.query(...).all() returnerar:
    mock_return_data = [
        (MockPrice(101, 100), apotea),
        (MockPrice(101, 150), lyko)
    ]
    
    # Säg åt mock-databasen att returnera detta
    mock_db.query.return_value.join.return_value.filter.return_value.all.return_value = mock_return_data
    
    # KÖR ALGORITMEN
    results = calculate_best_basket([101], mock_db)
    
    # KOLLA RESULTATET
    # Apotea: 100 + 49 (frakt) = 149 kr
    # Lyko: 150 + 39 (frakt) = 189 kr
    # Apotea ska vinna (ligga först)
    
    best_choice = results[0]
    assert best_choice["stores"][0] == "Apotea"
    assert best_choice["total_cost"] == 149

def test_smart_split():
    """Testar att algoritmen delar upp köpet om det lönar sig."""
    mock_db = MagicMock()
    
    apotea = MockStore(1, "Apotea", 49, 999) # Dyr fraktgräns
    lyko = MockStore(2, "Lyko", 39, 999)
    
    # Produkt 1: Billig på Apotea (50kr vs 100kr)
    # Produkt 2: Billig på Lyko (50kr vs 100kr)
    mock_data = [
        (MockPrice(1, 50), apotea), (MockPrice(1, 100), lyko),
        (MockPrice(2, 100), apotea), (MockPrice(2, 50), lyko)
    ]
    
    mock_db.query.return_value.join.return_value.filter.return_value.all.return_value = mock_data
    
    results = calculate_best_basket([1, 2], mock_db)
    
    # Alternativ 1 (Samlad Apotea): 50+100 + 49 = 199 kr
    # Alternativ 2 (Samlad Lyko): 100+50 + 39 = 189 kr
    # Alternativ 3 (Split): 
    #   Apotea (Prod 1): 50 + 49 = 99
    #   Lyko (Prod 2): 50 + 39 = 89
    #   Totalt: 99 + 89 = 188 kr
    
    # Split (188 kr) ska vinna över Lyko (189 kr)!
    best_choice = results[0]
    assert best_choice["type"] == "Smart Split (Billigast)"
    assert best_choice["total_cost"] == 188