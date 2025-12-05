import pytest
import pandas as pd
from unittest.mock import MagicMock, patch
from io import StringIO

# Dynamisk import för att hitta modulen
try:
    from app.services.feed_engine import process_feed_bulk 
    MODULE_PATH = "app.services.feed_engine"
except ImportError:
    from feed_engine import process_feed_bulk
    MODULE_PATH = "feed_engine"

@pytest.fixture
def mock_db():
    return MagicMock()

def test_process_feed_bulk_success(mock_db):
    """Testar att produkter och priser läggs till korrekt."""
    
    # Skapa DataFrame (med lowercase keys för att matcha logiken i feed_engine)
    mock_df = pd.DataFrame({
        'produktnamn': ['Testprodukt'],
        'pris': ['100 kr'],
        'ean': ['123456789'],
        'länk': ['http://example.com']
    })

    # 1. Mocka pandas.read_csv och GOOGLE_API_KEY
    # Vi sätter GOOGLE_API_KEY till None för att hoppa över AI-steget
    with patch("pandas.read_csv", return_value=mock_df), \
         patch(f"{MODULE_PATH}.GOOGLE_API_KEY", None):
        
        # 2. Mocka DB-frågor
        # Butiken finns ej -> Skapa
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        # Produkt-lookup (Fas 2) -> Hittar ID 99
        mock_prod_lookup = MagicMock()
        mock_prod_lookup.ean = "123456789"
        mock_prod_lookup.id = 99
        mock_db.query.return_value.filter.return_value.all.return_value = [mock_prod_lookup]

        # 3. Kör funktionen
        process_feed_bulk("dummy.csv", "TestButik", mock_db)

        # 4. Verifiera: Butik skapad
        assert mock_db.add.called
        added_store = mock_db.add.call_args[0][0]
        assert added_store.name == "TestButik"

        # 5. Verifiera: Produkter upsertade
        assert mock_db.execute.called
        
        # 6. Verifiera: Priser bulk-insertade
        assert mock_db.bulk_insert_mappings.called
        
        call_args = mock_db.bulk_insert_mappings.call_args
        inserted_prices = call_args[0][1]
        
        assert len(inserted_prices) == 1
        assert inserted_prices[0]["price"] == 100.0
        assert inserted_prices[0]["product_id"] == 99