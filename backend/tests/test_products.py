import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from app.main import app
from app.database import get_db
from app.models import Product, Category, ProductPrice, Store

client = TestClient(app)

class MockItem:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)

# Vi behöver en mer robust mock för att hantera den nya komplexa list-vyn
def override_get_db():
    mock_db = MagicMock()
    
    # Test Data
    prod1 = MockItem(id=1, name="Produkt A", ean="111", category_id=10, image_url="img.jpg", rating=4.5)
    prod2 = MockItem(id=2, name="Produkt B", ean="222", category_id=10, image_url="img.jpg", rating=3.0)
    
    cat = MockItem(id=10, name="Test Kategori")
    
    price = MockItem(
        price=100.0, 
        regular_price=120.0,
        discount_percent=20,
        url="http://...", 
        product_id=1,
        store_id=1
    )
    store = MockItem(name="Test Store", base_shipping=49)

    # Helper för att identifiera modeller i query()
    def is_model(arg, model):
        return arg is model or getattr(arg, "__name__", "") == model.__name__

    def query_side_effect(*args):
        if not args: return MagicMock()
        first_arg = args[0]

        # 1. Hämta Produkter (List & Detail)
        # Endpointen gör: db.query(Product).filter(...).join(...).offset(...).limit(...)
        if is_model(first_arg, Product):
            m = MagicMock()
            
            # Setup chaining: Alla dessa metoder måste returnera 'm' (sig själv)
            # så att vi kan kedja .filter().order_by().limit() etc.
            m.filter.return_value = m
            m.join.return_value = m
            m.outerjoin.return_value = m
            m.group_by.return_value = m
            m.order_by.return_value = m
            m.limit.return_value = m
            m.offset.return_value = m
            
            # Metoder som returnerar data
            m.all.return_value = [prod1, prod2] # Returnera lista för list-vy
            m.first.return_value = prod1        # Returnera en för detalj-vy
            m.count.return_value = 2            # Returnera total antal för paginering
            
            return m

        # 2. Priser & Butiker (db.query(ProductPrice, Store))
        if len(args) > 1: 
            m = MagicMock()
            m.join.return_value = m
            m.filter.return_value = m
            m.order_by.return_value = m
            m.all.return_value = [(price, store)]
            return m
        
        # 3. Kategori (för detail view)
        if is_model(first_arg, Category):
            m = MagicMock()
            m.filter.return_value = m
            m.first.return_value = cat
            return m
            
        return MagicMock()

    mock_db.query.side_effect = query_side_effect
    yield mock_db

@pytest.fixture(autouse=True)
def mock_db_session():
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides = {}

def test_get_products_list_structure():
    """
    Testar att /products returnerar det nya formatet { data: [], total: int }
    """
    response = client.get("/products?limit=10")
    assert response.status_code == 200
    json_resp = response.json()
    
    # Verifiera rot-strukturen
    assert "data" in json_resp
    assert "total" in json_resp
    
    # Verifiera datan
    assert json_resp["total"] == 2
    assert len(json_resp["data"]) == 2
    assert json_resp["data"][0]["name"] == "Produkt A"
    
    # Verifiera att priser inkluderas i listan (viktigt för 'Från X kr')
    assert len(json_resp["data"][0]["prices"]) == 1

def test_get_products_search_and_sort():
    """Testar att endpointen accepterar sök- och sorteringsparametrar utan krasch."""
    response = client.get("/products?search=Produkt&sort=price_asc")
    assert response.status_code == 200
    assert response.json()["total"] == 2

def test_get_product_details():
    """Testar detaljvyn för en enskild produkt."""
    response = client.get("/products/1")
    assert response.status_code == 200
    data = response.json()
    
    assert data["name"] == "Produkt A"
    assert data["category"] == "Test Kategori"
    assert len(data["prices"]) == 1
    assert data["prices"][0]["store"] == "Test Store"

def test_get_single_product_includes_deals():
    """Testar att endpointen /products/{id} returnerar rabatt och ordinarie pris."""
    response = client.get("/products/1")
    assert response.status_code == 200
    data = response.json()
    
    # Verifiera grunddata
    assert data["name"] == "Produkt A"
    
    # Verifiera att vi har priser
    assert len(data["prices"]) > 0
    first_price = data["prices"][0]
    
    # Verifiera DE NYA FÄLTEN
    assert "regular_price" in first_price
    assert "discount_percent" in first_price
    
    # Verifiera att värdena från mocken kommer igenom
    assert first_price["regular_price"] == 120.0
    assert first_price["discount_percent"] == 20