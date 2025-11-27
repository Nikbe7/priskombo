import pytest
from unittest.mock import MagicMock, patch
import pandas as pd
from app.services.feed_engine import process_feed_bulk

@patch("app.services.feed_engine.pd.read_csv")
def test_process_feed_bulk(mock_read_csv):
    # 1. SETUP
    mock_db = MagicMock()
    
    # Låtsas att vi har en butik
    mock_store = MagicMock()
    mock_store.id = 1
    mock_db.query.return_value.filter.return_value.first.return_value = mock_store
    
    # LÅSA UPP FELET HÄR:
    # Istället för att använda pd.read_csv (som är mockad och trasig nu),
    # skapar vi en DataFrame manuellt.
    df = pd.DataFrame({
        "Produktnamn": ["Test Shampoo"],
        "EAN": ["99999"],
        "Pris": ["100,00"], # Notera kommatecknet som sträng, precis som i en CSV
        "Länk": ["http://test.se"]
    })
    
    # Säg åt mocken att returnera vår manuella DataFrame
    mock_read_csv.return_value = df
    
    # Låtsas att vi hittar produkt-ID för EAN 99999
    # (När koden frågar db.query(Product.id)...)
    mock_product_row = MagicMock()
    mock_product_row.ean = "99999"
    mock_product_row.id = 55
    mock_db.query.return_value.filter.return_value.all.return_value = [mock_product_row]

    # 2. KÖR FUNKTIONEN
    process_feed_bulk("dummy.csv", "TestStore", mock_db)
    
    # 3. VERIFIERA
    
    # Kolla att den försökte köra en upsert (db.execute anropades)
    assert mock_db.execute.called
    
    # Kolla att den försökte spara priser (bulk_insert_mappings)
    assert mock_db.bulk_insert_mappings.called
    
    # Kolla att den skickade rätt data till bulk_insert
    call_args = mock_db.bulk_insert_mappings.call_args
    price_data = call_args[0][1]
    
    assert len(price_data) == 1
    assert price_data[0]["price"] == 100.0
    assert price_data[0]["product_id"] == 55