import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from app.main import app
from app.database import get_db
from app.models import Product, Category

client = TestClient(app)

class MockItem:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)

def override_get_db():
    mock_db = MagicMock()
    
    prod = MockItem(id=1, name="Test Product", ean="111", category_id=10, image_url="img.jpg")
    cat = MockItem(id=10, name="Test Kategori")
    price = MockItem(price=100.0, url="http://...", regular_price=None)
    store = MockItem(name="Test Store", base_shipping=49)

    def create_mock_query(items):
        m = MagicMock()
        m.filter.return_value = m
        m.join.return_value = m
        m.order_by.return_value = m
        m.all.return_value = items
        m.first.return_value = items[0] if items else None
        return m

    def query_side_effect(*args):
        if not args: return MagicMock()
        
        # 1. Priser (Join)
        if len(args) > 1:
            return create_mock_query([(price, store)])

        arg = args[0]
        # 2. Produkt
        if arg is Product or getattr(arg, "__name__", "") == "Product":
            return create_mock_query([prod])
        
        # 3. Kategori
        if arg is Category or getattr(arg, "__name__", "") == "Category":
            return create_mock_query([cat])
            
        return MagicMock()

    mock_db.query.side_effect = query_side_effect
    yield mock_db

# VIKTIGT: Använd en fixture för att isolera detta test!
@pytest.fixture(autouse=True)
def mock_db_session():
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides = {}

def test_get_product_details():
    response = client.get("/products/1")
    assert response.status_code == 200
    data = response.json()
    
    assert data["name"] == "Test Product"
    assert data["category"] == "Test Kategori"
    assert len(data["prices"]) == 1
    assert data["prices"][0]["store"] == "Test Store"