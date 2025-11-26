from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from app.main import app
from app.database import get_db

client = TestClient(app)

# En enkel klass för att simulera databas-objekt som FastAPI kan läsa
class MockItem:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)

def override_get_db():
    mock_db = MagicMock()
    
    # Skapa objekt som beter sig som riktiga DB-rader
    cat_obj = MockItem(id=1, name="Hårvård")
    prod_obj = MockItem(id=101, name="H&S Schampo", ean="123", category_id=1, image_url=None)
    price_obj = MockItem(price=45.0, url="#", product_id=101)
    store_obj = MockItem(name="Apotea", base_shipping=49)

    # 1. Mocka /categories (returnerar lista)
    # Kedjan: db.query(Category).all()
    mock_db.query.return_value.all.return_value = [cat_obj]
    
    # 2. Mocka /categories/1 (returnerar en kategori)
    # Kedjan: db.query(Category).filter(...).first()
    mock_db.query.return_value.filter.return_value.first.return_value = cat_obj
    
    # 3. Mocka Produkter i kategorin
    # Kedjan: ...limit(50).all()
    mock_db.query.return_value.filter.return_value.limit.return_value.all.return_value = [prod_obj]
    
    # 4. Mocka Priser (loopen)
    # Kedjan: ...order_by(...).all() -> Returnerar lista av tuples [(price, store)]
    mock_db.query.return_value.join.return_value.filter.return_value.order_by.return_value.all.return_value = [(price_obj, store_obj)]
    
    yield mock_db

app.dependency_overrides[get_db] = override_get_db

def test_get_categories():
    response = client.get("/categories")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["name"] == "Hårvård"

def test_get_single_category():
    response = client.get("/categories/1")
    assert response.status_code == 200
    data = response.json()
    
    assert data["category"]["name"] == "Hårvård"
    assert len(data["products"]) >= 1
    assert data["products"][0]["name"] == "H&S Schampo"