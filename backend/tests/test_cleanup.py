import pytest
from unittest.mock import MagicMock, patch
from app.models import Category, Product
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from cleanup_categories import cleanup

class MockItem:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)

@pytest.fixture
def mock_db():
    return MagicMock()

@pytest.fixture
def mock_session_local(mock_db):
    with patch("cleanup_categories.SessionLocal", return_value=mock_db) as mock:
        yield mock

def test_cleanup_moves_orphaned_category(mock_session_local, mock_db):
    """Testar att 'Apotek & Hälsa' flyttas till 'Skönhet & Hälsa'."""
    
    parent = MockItem(id=1, name="Skönhet & Hälsa")
    target = MockItem(id=2, name="Apotek & Hälsa", parent_id=None, coming_soon=True)
    
    # SKAPA MOCK UTANFÖR side_effect SÅ DEN DELAS
    shared_query_mock = MagicMock()
    
    # Konfigurera sekvensen för .first()
    shared_query_mock.filter.return_value.first.side_effect = [
        parent, # 1. Hitta parent
        target, # 2. Hitta target
        None, None, None, None, None, None, None, None # Subs loop
    ]
    shared_query_mock.all.return_value = []
    shared_query_mock.order_by.return_value.all.return_value = []

    def query_side_effect(model):
        # Returnera alltid samma mock-objekt så att side_effect-iteratorn inte nollställs
        return shared_query_mock

    mock_db.query.side_effect = query_side_effect

    cleanup()

    assert target.parent_id == 1
    assert target.coming_soon is False
    assert mock_db.commit.called

def test_cleanup_merges_duplicates(mock_session_local, mock_db):
    """Testar att dubbletter slås ihop."""
    
    cat1 = MockItem(id=10, name="Dublett", parent_id=1)
    cat2 = MockItem(id=11, name="Dublett", parent_id=1) 
    prod1 = MockItem(id=100, category_id=11)
    
    query_mock = MagicMock()
    
    # .all() sekvens: Dubblett-koll -> Status-uppdatering
    query_mock.order_by.return_value.all.side_effect = [[cat1, cat2], []]
    query_mock.all.return_value = []
    query_mock.filter.return_value.first.return_value = None # Inga felplacerade

    prod_query_mock = MagicMock()
    prod_query_mock.filter.return_value.all.return_value = [prod1]
    
    def query_side_effect(model):
        if model == Category:
            return query_mock
        if model == Product:
            return prod_query_mock
        return MagicMock()
    
    mock_db.query.side_effect = query_side_effect

    cleanup()

    assert prod1.category_id == 10
    mock_db.delete.assert_called_with(cat2)
    assert mock_db.commit.called

def test_cleanup_updates_status(mock_session_local, mock_db):
    """Testar att 'coming_soon' sätts korrekt baserat på produkter."""
    
    cat_empty = MockItem(id=1, name="Tom", coming_soon=False)
    cat_full = MockItem(id=2, name="Full", coming_soon=True)
    
    query_mock = MagicMock()
    query_mock.filter.return_value.first.return_value = None
    query_mock.order_by.return_value.all.return_value = []
    
    # Steg 3: Hämta alla kategorier
    query_mock.all.return_value = [cat_empty, cat_full]
    
    # Mocka skalären för count
    scalar_mock = MagicMock()
    scalar_mock.filter.return_value.scalar.side_effect = [0, 5]
    
    def query_side_effect(*args):
        arg_str = str(args)
        if "count" in arg_str.lower():
            return scalar_mock
        return query_mock

    mock_db.query.side_effect = query_side_effect

    cleanup()

    assert cat_empty.coming_soon is True
    assert cat_full.coming_soon is False