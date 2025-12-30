import os
from app.services.importer import import_csv_feed
from app.models import Product, ProductPrice, Store

TEST_FILENAME = "test_feed.csv"
TEST_CSV_CONTENT = """EAN;Produktnamn;Pris;Länk;Bildlänk
731001;Super Schampo;99,50;http://link.se;http://img.se
731002;Balsam Lyx;149.00;http://link2.se;
"""

def test_import_csv_feed_integration(db):
    """Integrationstest som använder riktiga test_db via conftest.py."""
    
    # 1. Skapa fil
    with open(TEST_FILENAME, "w", encoding="utf-8") as f:
        f.write(TEST_CSV_CONTENT)

    try:
        # 2. Kör import
        import_csv_feed(TEST_FILENAME, "TestStore", db)

        # 3. Verifiera mot databasen
        store = db.query(Store).filter_by(name="TestStore").first()
        assert store is not None
        assert store.base_shipping == 49

        p1 = db.query(Product).filter_by(ean="731001").first()
        assert p1.name == "Super Schampo"
        assert p1.slug == "super-schampo" # Slug genereras automatiskt

        price = db.query(ProductPrice).filter_by(product_id=p1.id).first()
        assert price.price == 99.50
        assert price.store_id == store.id

    finally:
        if os.path.exists(TEST_FILENAME):
            os.remove(TEST_FILENAME)