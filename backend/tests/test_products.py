import pytest # <--- Ny import
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from app.main import app
from app.database import get_db

client = TestClient(app)

# En enkel klass för att simulera DB-rader
class MockItem:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)

def override_get_db():
    mock_db = MagicMock()
    
    # --- Test Data ---
    cat_obj = MockItem(id=1, name="Hårvård")
    prod_obj = MockItem(id=101, name="H&S Schampo", ean="123", category_id=1, image_url=None)
    price_obj = MockItem(price=45.0, url="#", product_id=101)
    store_obj = MockItem(name="Apotea", base_shipping=49)

    # --- Konfigurera Mock-kedjor ---
    # Istället för komplexa if-satser, sätter vi upp "vägarna" direkt.
    # Eftersom db.query() returnerar samma mock oavsett argument (som default),
    # kan vi preppa de olika metod-kedjorna som koden kommer anropa.

    # 1. db.query(Category).all() 
    # Används av: get_categories
    mock_db.query.return_value.all.return_value = [cat_obj]
    
    # 2. db.query(Category).filter(...).first()
    # Används av: get_category_products (Hämta kategori)
    mock_db.query.return_value.filter.return_value.first.return_value = cat_obj
    
    # 3. db.query(func.count).filter(...).scalar()
    # Används av: get_category_products (Paginering total)
    mock_db.query.return_value.filter.return_value.scalar.return_value = 100

    # 4. db.query(Product).filter(...).limit(...).offset(...).all()
    # Används av: get_category_products (Hämta produkter)
    (mock_db.query.return_value.filter.return_value
            .limit.return_value
            .offset.return_value
            .all.return_value) = [prod_obj]
    
    # 5. db.query(ProductPrice, Store).join(...).filter(...).order_by(...).all()
    # Används av: get_category_products (Hämta priser)
    (mock_db.query.return_value.join.return_value
            .filter.return_value
            .order_by.return_value
            .all.return_value) = [(price_obj, store_obj)]
    
    # Hantera kedja med dubbla joins också för säkerhets skull
    (mock_db.query.return_value.join.return_value
            .join.return_value
            .filter.return_value
            .order_by.return_value
            .all.return_value) = [(price_obj, store_obj)]

    yield mock_db

# FIX: Använd en fixture istället för global tilldelning
# autouse=True gör att den körs automatiskt för varje test i denna fil
@pytest.fixture(autouse=True)
def mock_db_session():
    app.dependency_overrides[get_db] = override_get_db
    yield
    # Rensa override efteråt så vi inte förstör för andra tester
    app.dependency_overrides = {}

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
    
    # Verify Pagination
    assert "pagination" in data
    assert data["pagination"]["total"] == 100
    assert data["pagination"]["page"] == 2
    assert data["pagination"]["limit"] == 10
    
    # Verify Data
    assert len(data["products"]) >= 1
    assert data["products"][0]["name"] == "H&S Schampo"