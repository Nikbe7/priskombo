import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from app.main import app
from app.database import get_db

client = TestClient(app)

class MockItem:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)

def override_get_db():
    mock_db = MagicMock()
    
    # Skapa fake-data
    prod = MockItem(id=1, name="Nivea Creme", ean="123", image_url="img.jpg")
    price = MockItem(
        price=50.0, 
        regular_price=60.0,
        discount_percent=10,
        url="http://..."
    )
    store = MockItem(name="Apotea")
    
    # Mocka den komplexa sök-kedjan:
    # db.query(...).join(...).join(...).filter(...).limit(...).all()
    
    # Vi sätter upp kedjan steg för steg
    mock_query = mock_db.query.return_value
    mock_join1 = mock_query.join.return_value
    mock_join2 = mock_join1.join.return_value
    mock_filter = mock_join2.filter.return_value
    mock_limit = mock_filter.limit.return_value
    
    # Returnera en lista av tuples: [(Product, ProductPrice, Store)]
    mock_limit.all.return_value = [(prod, price, store)]
    
    yield mock_db

# FIX: Använd en fixture här också för att isolera testet!
@pytest.fixture(autouse=True)
def mock_db_session():
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides = {}

def test_search_products():
    # Sök efter "niv"
    response = client.get("/search?q=niv")
    assert response.status_code == 200
    data = response.json()
    
    assert len(data) == 1
    assert data[0]["name"] == "Nivea Creme"
    # Kolla att priserna grupperades rätt
    assert data[0]["prices"][0]["store"] == "Apotea"
    assert data[0]["prices"][0]["price"] == 50.0

def test_search_empty():
    # Sökning på 1 bokstav ska returnera tomt (enligt din regel)
    response = client.get("/search?q=a")
    assert response.status_code == 200
    assert response.json() == []