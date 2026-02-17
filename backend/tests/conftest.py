import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
import os
from dotenv import load_dotenv

from app.db.base import Base
from app.db.session import get_db
from app.main import app

# URL till testdatabasen (som vi skapade i docker-compose)
# Obs: 'db' är hostnamnet för databas-containern i Docker
load_dotenv()

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """
    Körs EN gång när du startar pytest.
    Ser till att tabellerna finns i test_db.
    """
    Base.metadata.drop_all(bind=engine) # Rensa gammalt skräp
    Base.metadata.create_all(bind=engine) # Skapa nya tabeller
    
    yield # Här körs alla tester
    
    # (Valfritt) Städa bort tabeller efteråt
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db():
    """
    Skapar en ren databassession för VARJE testfunktion.
    Tömmer tabellerna innan testet startar så vi alltid har en ren miljö.
    """
    # Töm alla tabeller (snabbare än att droppa dem)
    with engine.connect() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
        conn.commit()

    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture(scope="function")
def client(db):
    """
    Ger en TestClient där 'get_db' automatiskt pekar på vår testdatabas.
    """
    def override_get_db():
        try:
            yield db
        finally:
            pass # Sessionen stängs av db-fixturen ovan

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides = {}