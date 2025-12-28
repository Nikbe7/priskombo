import pytest
import pandas as pd
from unittest.mock import MagicMock, patch
from app.services.importer import import_csv_feed
from app.models import Product, Store

@pytest.fixture
def mock_db():
    return MagicMock()

def test_import_csv_feed_success(mock_db):
    """Testar importflödet med Pandas och SQLAlchemy."""
    
    # 1. Skapa fake CSV-data i en DataFrame
    data = {
        "EAN": ["7300001", "7300002"],
        "Produktnamn": ["Testprodukt 1", "Testprodukt 2"],
        "Pris": ["100,50", "200"],
        "Länk": ["http://url1", "http://url2"],
        "Bildlänk": ["http://img1", "http://img2"]
    }
    df = pd.DataFrame(data)
    
    # 2. Mocka pandas read_csv så vi slipper riktiga filer
    with patch("pandas.read_csv", return_value=df):
        
        # Mocka att butiken inte finns, så den skapas
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        # Mocka existerande produkter (tom dict = allt är nytt)
        # importer.py gör: existing_products = {p.ean: p for p in db.query(Product).all()}
        mock_db.query.return_value.all.return_value = [] 
        
        # KÖR
        import_csv_feed("dummy_path.csv", "TestButik", mock_db)
        
        # VERIFIERA
        
        # 1. Butik skapades
        assert mock_db.add.called
        # Kolla argumenten till första add-anropet (borde vara Store)
        args, _ = mock_db.add.call_args_list[0]
        assert isinstance(args[0], Store)
        assert args[0].name == "TestButik"
        
        # 2. Produkter lades till (vi hade 2 rader i CSV)
        # Vi kollar commit (som körs på slutet)
        assert mock_db.commit.called
        
        # Vi kan kolla att add anropades minst 3 gånger (1 butik + 2 produkter + eventuella priser)
        assert mock_db.add.call_count >= 3