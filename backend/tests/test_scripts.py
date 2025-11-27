import sys
import os
import pytest
from unittest.mock import MagicMock, patch

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# OBS: Vi importerar nu de nya optimerade funktionerna
from assign_categories import run_sql_keyword_categorization, run_ai_categorization_bulk
from seed_categories import seed_categories

class MockItem:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)

def test_sql_keyword_categorization():
    """Testar att SQL-funktionen anropar db.execute med rätt parametrar."""
    mock_db = MagicMock()
    cat_map = {"Manligt": 1}
    
    # Låtsas att vi uppdaterade 5 rader i databasen
    mock_result = MagicMock()
    mock_result.rowcount = 5
    mock_db.execute.return_value = mock_result
    
    hits = run_sql_keyword_categorization(mock_db, cat_map)
    
    assert hits == 5
    # Kolla att vi körde en UPDATE sql
    assert mock_db.execute.called
    args = mock_db.execute.call_args[0]
    # Kolla att SQL-frågan innehåller rätt logik
    assert "UPDATE products" in str(args[0])
    assert "name ~* :pattern" in str(args[0])

@patch("google.generativeai.GenerativeModel")
def test_ai_categorization_bulk(mock_model_class):
    """Testar att bulk-AI funktionen parsar JSON och kör bulk_update_mappings."""
    mock_db = MagicMock()
    
    # Setup: Produkter i batch (bara id och namn eftersom vi optimerade det)
    product_row = MockItem(id=99, name="Dior Sauvage")
    
    # Mocka queryn som hämtar batchen
    # Första anropet ger en produkt, andra ger tom lista (så loopen stannar)
    mock_db.query.return_value.filter.return_value.limit.return_value.all.side_effect = [[product_row], []]
    
    cat_names = ["Parfym"]
    cat_map = {"Parfym": 10}
    
    # Setup: Mocka AI-svaret
    mock_response = MagicMock()
    mock_response.text = '[{"id": 99, "category": "Parfym"}]'
    
    mock_instance = mock_model_class.return_value
    mock_instance.generate_content.return_value = mock_response
    
    # Kör funktionen
    run_ai_categorization_bulk(mock_db, cat_names, cat_map)
    
    # KOLLA RESULTATET:
    # Vi ska ha anropat bulk_update_mappings (inte add/commit per rad)
    assert mock_db.bulk_update_mappings.called
    
    # Kolla att vi skickade rätt data
    call_args = mock_db.bulk_update_mappings.call_args
    # call_args[0][1] är listan med mappings
    mappings = call_args[0][1]
    assert mappings[0]["id"] == 99
    assert mappings[0]["category_id"] == 10