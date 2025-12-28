import pytest
from unittest.mock import MagicMock, patch
from app.services.categorizer import run_sql_keyword_categorization, run_ai_categorization_bulk

def test_sql_keyword_categorization():
    """Testar att SQL-regex genereras och körs."""
    mock_db = MagicMock()
    cat_map = {"Manligt": 1, "Parfym": 2}
    
    mock_result = MagicMock()
    mock_result.rowcount = 3
    mock_db.execute.return_value = mock_result
    
    hits = run_sql_keyword_categorization(mock_db, cat_map)
    
    assert hits >= 3
    args = mock_db.execute.call_args_list
    sql_query = str(args[0][0][0])
    
    assert "UPDATE products" in sql_query
    assert "~*" in sql_query

# UPPDATERAD MOCK FÖR NYA SDK
@patch("google.genai.Client")
def test_ai_categorization_bulk(mock_client_class):
    """Testar att AI-funktionen hanterar JSON-svar och batchning med nya SDK."""
    mock_db = MagicMock()
    
    # Mocka produkter
    prod1 = MagicMock()
    prod1.id = 100
    prod1.name = "Dior Sauvage"
    
    # Mocka databas-svaret
    mock_db.query.return_value.filter.return_value.limit.return_value.all.side_effect = [[prod1], []]
    
    cat_names = ["Parfym"]
    cat_map = {"Parfym": 10}
    
    # Mocka AI-svaret
    mock_response = MagicMock()
    mock_response.text = '[{"id": 100, "category": "Parfym"}]'
    
    # Konfigurera mock-klienten
    mock_instance = mock_client_class.return_value
    mock_instance.models.generate_content.return_value = mock_response
    
    # KÖR
    run_ai_categorization_bulk(mock_db, cat_names, cat_map, limit_count=None)
    
    # VERIFIERA
    assert mock_db.bulk_update_mappings.called
    
    # Kolla att generate_content anropades på "models"
    assert mock_instance.models.generate_content.called