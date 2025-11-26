import sys
import os
import pytest
from unittest.mock import MagicMock, patch

# Lägg till rotmappen i sökvägen så vi kan importera scripten
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Importera funktionerna vi ska testa
# OBS: Om detta misslyckas, se till att du står i 'backend' när du kör pytest
from assign_categories import run_keyword_categorization, run_ai_categorization
from seed_categories import seed_categories

# En enkel klass för att simulera DB-objekt
class MockItem:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)

# --- TESTA KATEGORISERING (NYCKELORD) ---
def test_keyword_categorization():
    """Testar att 'Nivea Men' hamnar i 'Manligt' baserat på regler."""
    mock_db = MagicMock()
    
    # Skapa en produkt som heter "Nivea Men Face"
    product = MockItem(id=1, name="Nivea Men Face Cream", category_id=None)
    
    # Skapa en kategori-map: {"Manligt": 1, ...}
    cat_map = {"Manligt": 1, "Ansiktsvård": 2}
    
    # Kör funktionen
    run_keyword_categorization(mock_db, [product], cat_map)
    
    # KOLLA RESULTATET:
    # Den borde ha valt "Manligt" (ID 1) eftersom "Men" finns i namnet,
    # även om "Face" (Ansiktsvård) också finns, om reglerna prioriterar rätt.
    assert product.category_id == 1 
    
    # Kolla att db.commit() kördes
    mock_db.commit.assert_called_once()

# --- TESTA KATEGORISERING (AI) ---
@patch("google.generativeai.GenerativeModel")
def test_ai_categorization(mock_model_class):
    """Testar att vi parsar AI:ns JSON-svar korrekt och uppdaterar produkten."""
    mock_db = MagicMock()
    
    # Setup: En produkt och kategorier
    product = MockItem(id=99, name="Dior Sauvage", category_id=None)
    cat_names = ["Parfym", "Bilar"]
    cat_map = {"Parfym": 10, "Bilar": 20}
    
    # Setup: Mocka AI-svaret
    # Vi låtsas att Gemini svarar med denna JSON
    mock_response = MagicMock()
    mock_response.text = '[{"id": 99, "category": "Parfym"}]'
    
    # Koppla ihop mockarna
    mock_instance = mock_model_class.return_value
    mock_instance.generate_content.return_value = mock_response
    
    # Kör funktionen
    run_ai_categorization(mock_db, [product], cat_names, cat_map)
    
    # KOLLA RESULTATET:
    # AI:n sa "Parfym", så ID ska bli 10
    assert product.category_id == 10
    mock_db.commit.assert_called()

# --- TESTA SEEDING ---
@patch("seed_categories.SessionLocal") # Vi mockar SessionLocal inuti filen
def test_seed_categories(mock_session_cls):
    """Testar att scriptet försöker skapa kategorier."""
    mock_db = MagicMock()
    mock_session_cls.return_value = mock_db
    
    # Scenario: Inga kategorier finns i DB (query returnerar None)
    mock_db.query.return_value.filter.return_value.first.return_value = None
    
    # Kör scriptet
    seed_categories()
    
    # Vi har 7 standardkategorier i listan.
    # Scriptet borde ha anropat db.add() 7 gånger.
    assert mock_db.add.call_count == 7
    mock_db.commit.assert_called_once()