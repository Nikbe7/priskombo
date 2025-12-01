import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from app.main import app
from app.database import get_db
from app.models import Category, Product, ProductPrice, Store

client = TestClient(app)

class MockItem:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)

def override_get_db():
    mock_db = MagicMock()
    
    # --- Test Data ---
    cat_obj = MockItem(id=1, name="Hårvård")
    prod_obj = MockItem(id=101, name="H&S Schampo", ean="123", category_id=1, image_url=None, popularity_score=10, rating=4.5)
    price_obj = MockItem(price=45.0, url="#", product_id=101, regular_price=50.0)
    store_obj = MockItem(name="Apotea", base_shipping=49)

    # --- Smart Helper ---
    def create_mock_query(items, count_val=100):
        m = MagicMock()
        # Gör så att kedjade anrop (filter, join, etc) returnerar samma mock
        m.filter.return_value = m
        m.join.return_value = m
        m.group_by.return_value = m
        m.order_by.return_value = m
        m.limit.return_value = m
        m.offset.return_value = m
        
        # Resultat-metoder
        m.all.return_value = items
        m.first.return_value = items[0] if items else None
        m.count.return_value = count_val
        m.scalar.return_value = count_val
        return m

    # --- Side Effect ---
    def query_side_effect(*args):
        if not args: return MagicMock()
        
        def is_model(arg, cls):
            return arg is cls or getattr(arg, "__name__", "") == cls.__name__

        # 1. PRISER (Join query)
        if len(args) > 1:
            return create_mock_query([(price_obj, store_obj)])

        arg = args[0]

        # 2. KATEGORIER
        if is_model(arg, Category):
            return create_mock_query([cat_obj])

        # 3. PRODUKTER
        if is_model(arg, Product):
            return create_mock_query([prod_obj], count_val=100)

        return MagicMock()

    mock_db.query.side_effect = query_side_effect
    yield mock_db

# VIKTIGT: Fixture för isolering även här
@pytest.fixture(autouse=True)
def mock_db_session():
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides = {}

def test_get_categories():
    response = client.get("/categories")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["name"] == "Hårvård"

def test_get_single_category_pagination():
    response = client.get("/categories/1?page=2&limit=10")
    assert response.status_code == 200
    data = response.json()
    
    # Paginering
    assert data["pagination"]["total"] == 100
    assert data["pagination"]["page"] == 2
    
    # Produkter
    assert len(data["products"]) >= 1
    assert data["products"][0]["name"] == "H&S Schampo"