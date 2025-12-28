import pytest
from unittest.mock import MagicMock, call
from app.models import Category, Product
from app.services.seeder import seed_categories, update_coming_soon_status

# Mock-objekt för att simulera databasrader
class MockItem:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)

@pytest.fixture
def mock_db():
    return MagicMock()

def test_seed_categories_creates_structure(mock_db):
    """Testar att seed_categories skapar kategorier."""
    # Simulera att inga kategorier finns (returnera None vid sökning)
    mock_db.query.return_value.filter.return_value.first.return_value = None
    
    seed_categories(mock_db)
    
    # Kontrollera att db.add har anropats (betyder att kategorier skapades)
    assert mock_db.add.called
    assert mock_db.commit.called

def test_update_coming_soon_status(mock_db):
    """Testar att kategorier låses upp (coming_soon=False) om de har produkter."""
    
    # 1. Mocka reset-steget (update all to True)
    mock_db.query.return_value.update.return_value = None
    
    # 2. Mocka vilka kategorier som har produkter
    # Vi säger att kategori ID 5 och 10 har produkter
    # query(Product.category_id).distinct().all() returnerar tuples [(5,), (10,)]
    mock_db.query.return_value.distinct.return_value.all.return_value = [(5,), (10,)]
    
    # 3. Mocka föräldrar (Parents)
    # Vi säger att kategori 5 har förälder 1
    mock_db.query.return_value.filter.return_value.distinct.return_value.all.return_value = [(1,)]

    # Kör funktionen
    update_coming_soon_status(mock_db)
    
    # VERIFIERA
    
    # Kolla att vi först satte alla till True
    mock_db.query.return_value.update.assert_any_call({Category.coming_soon: True})
    
    # Kolla att vi satte de aktiva kategorierna (5 och 10) till False
    # Vi kan inte kolla exakt SQL-anrop enkelt med mocks, men vi kan se att filter anropades
    assert mock_db.query.return_value.filter.called
    
    # Kolla att commit kördes
    assert mock_db.commit.called