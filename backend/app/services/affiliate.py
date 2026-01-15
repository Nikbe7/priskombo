import urllib.parse
import os

# Hämta dina unika affiliate-IDn från miljövariabler
MY_ADTRACTION_CHANNEL_ID = os.getenv("ADTRACTION_CHANNEL_ID")
MY_ADRECORD_CHANNEL_ID = os.getenv("ADRECORD_CHANNEL_ID")

def generate_tracking_link(clean_url: str, store) -> str:
    """
    Genererar en tracking-länk baserat på butikens affiliate-nätverk.
    """
    if not clean_url:
        return ""

    encoded_url = urllib.parse.quote(clean_url, safe='')

    if store.affiliate_network == "adtraction":
        return f"https://at.track.adtr.co/t/t?a={store.affiliate_program_id}&as={MY_ADTRACTION_CHANNEL_ID}&t=2&url={encoded_url}"
    
    elif store.affiliate_network == "adrecord":
        return f"https://click.adrecord.com?p={store.affiliate_program_id}&c={MY_ADRECORD_CHANNEL_ID}&url={encoded_url}"

    # Lägg till fler nätverk här (Awin, Tradedoubler osv.)

    return clean_url