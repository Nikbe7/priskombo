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
    
    # Skapa en produkt som är på REA
    # Pris: 80, Ordinarie: 100 (20% rabatt)
    deal_row = MockItem(
        id=1, 
        name="Super Schampo", 
        image_url="img.jpg",
        price=80.0, 
        regular_price=100.0,
        store_name="Apotea",
        url="http://...",
        discount_percent=20
    )
    
    # Mocka SQL-anropet db.execute(...)
    mock_db.execute.return_value.fetchall.return_value = [deal_row]
    
    yield mock_db

# Fixture för isolering
@pytest.fixture(autouse=True)
def mock_db_session():
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides = {}

def test_get_deals():
    response = client.get("/deals")
    assert response.status_code == 200
    data = response.json()
    
    # Vi förväntar oss en lista med deals
    assert len(data) == 1
    assert data[0]["name"] == "Super Schampo"
    assert data[0]["price"] == 80.0
    assert data[0]["regular_price"] == 100.0
    assert data[0]["discount_percent"] == 20