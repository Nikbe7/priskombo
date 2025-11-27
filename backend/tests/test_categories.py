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
    
    cat_obj = MockItem(id=1, name="Hårvård")
    prod_obj = MockItem(id=101, name="H&S Schampo", ean="123", category_id=1, image_url=None)
    price_obj = MockItem(price=45.0, url="#", product_id=101)
    store_obj = MockItem(name="Apotea", base_shipping=49)

    # 1. Mocka /categories (returnerar lista)
    mock_db.query.return_value.all.return_value = [cat_obj]
    
    # 2. Mocka /categories/1 (returnerar en kategori)
    mock_db.query.return_value.filter.return_value.first.return_value = cat_obj
    
    # 3. Mocka Paginering (Total count)
    # Kedjan: db.query(func.count).filter(...).scalar() -> Returnera 100 produkter
    mock_db.query.return_value.filter.return_value.scalar.return_value = 100

    # 4. Mocka Produkter (limit/offset kedja)
    # Kedjan: ...limit(limit).offset(skip).all()
    mock_db.query.return_value.filter.return_value.limit.return_value.offset.return_value.all.return_value = [prod_obj]
    
    # 5. Mocka Priser
    mock_db.query.return_value.join.return_value.filter.return_value.order_by.return_value.all.return_value = [(price_obj, store_obj)]
    
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
    # Vi ber om sida 2 med 10 produkter per sida
    response = client.get("/categories/1?page=2&limit=10")
    assert response.status_code == 200
    data = response.json()
    
    # Kolla pagination-strukturen
    assert "pagination" in data
    assert data["pagination"]["page"] == 2
    assert data["pagination"]["limit"] == 10
    
    # Om total är 100 (från mocken) och limit 10, ska total_pages vara 10
    assert data["pagination"]["total"] == 100
    assert data["pagination"]["total_pages"] == 10
    
    # Kolla att vi fortfarande får produkter
    assert len(data["products"]) >= 1