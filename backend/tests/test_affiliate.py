from app.services.affiliate import generate_tracking_link
from app.models import Store

def test_generate_adtraction_link():
    # 1. Skapa en "Adtraction-butik"
    store = Store(
        name="TestButik", 
        affiliate_network="adtraction", 
        affiliate_program_id="123456"
    )
    original_url = "https://www.testbutik.se/produkt-1"
    
    # 2. Generera länk
    result = generate_tracking_link(original_url, store)
    
    # 3. Verifiera (kolla att program_id och url kom med)
    assert "at.track.adtr.co" in result
    assert "a=123456" in result # Program ID
    assert "url=https%3A%2F%2Fwww.testbutik.se%2Fprodukt-1" in result # URL-kodad

def test_generate_adrecord_link():
    # 1. Skapa en "Adrecord-butik"
    store = Store(
        name="AnnanButik", 
        affiliate_network="adrecord", 
        affiliate_program_id="999"
    )
    original_url = "https://www.annan.se/p2"
    
    # 2. Generera länk
    result = generate_tracking_link(original_url, store)
    
    # 3. Verifiera
    assert "click.adrecord.com" in result
    assert "p=999" in result

def test_generate_default_link_if_no_network():
    # 1. Skapa en vanlig butik (utan nätverk)
    store = Store(name="VanligButik", affiliate_network=None)
    original_url = "https://www.vanlig.se/produkt"
    
    # 2. Generera länk
    result = generate_tracking_link(original_url, store)
    
    # 3. Ska vara oförändrad
    assert result == original_url