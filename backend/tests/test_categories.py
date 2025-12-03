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
    cat_obj = MockItem(id=1, name="Hårvård", children=[])
    prod_obj = MockItem(id=101, name="H&S Schampo", ean="123", category_id=1, image_url=None, popularity_score=10, rating=4.5)
    price_obj = MockItem(price=45.0, url="#", product_id=101, regular_price=50.0)
    store_obj = MockItem(name="Apotea", base_shipping=49)

    # --- Helper ---
    def is_model(arg, model_class):
        return arg is model_class or getattr(arg, "__name__", "") == model_class.__name__

    # --- Robust Side Effect ---
    def query_side_effect(*args):
        if not args:
            return MagicMock()
            
        first_arg = args[0]
        first_arg_str = str(first_arg)

        # 1. Hämta Priser (ProductPrice OCH Store)
        if len(args) > 1:
            m = MagicMock()
            # Kedja för joins (Self-returning för att vara säker)
            m.join.return_value = m
            m.filter.return_value = m
            m.order_by.return_value = m
            m.all.return_value = [(price_obj, store_obj)]
            return m

        # 2. Räkna (func.count)
        if "count" in first_arg_str.lower(): 
            m = MagicMock()
            m.filter.return_value.scalar.return_value = 100
            return m

        # 3. Hämta Kategorier
        if is_model(first_arg, Category):
            m = MagicMock()
            m.filter.return_value = m # Self-returning
            m.all.return_value = [cat_obj]
            m.first.return_value = cat_obj
            return m

        # 4. Hämta Produkter (FIX: Self-returning mock för alla kedjor)
        if is_model(first_arg, Product):
            m = MagicMock()
            
            # Gör så att ALLA kedjbara metoder returnerar 'm' (sig själv)
            # Detta löser problemet med att filter().order_by() skapar en ny okänd mock
            m.filter.return_value = m
            m.order_by.return_value = m
            m.limit.return_value = m
            m.offset.return_value = m
            m.join.return_value = m
            m.group_by.return_value = m
            
            # Resultat-metoder (dessa anropas på 'm' i slutet av kedjan)
            m.count.return_value = 100
            m.all.return_value = [prod_obj]
            
            return m

        return MagicMock()

    mock_db.query.side_effect = query_side_effect
    yield mock_db

app.dependency_overrides[get_db] = override_get_db

def test_get_categories():
    response = client.get("/categories")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["name"] == "Hårvård"

def test_get_single_category_pagination():
    """Testar att pagination-data returneras korrekt."""
    response = client.get("/categories/1?page=2&limit=10")
    assert response.status_code == 200
    data = response.json()
    
    # Verify Pagination
    assert "pagination" in data
    assert data["pagination"]["total"] == 100
    assert data["pagination"]["page"] == 2
    
    # Verify Data
    assert len(data["products"]) >= 1
    assert data["products"][0]["name"] == "H&S Schampo"