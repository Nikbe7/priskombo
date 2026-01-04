import json
import os
import redis
from sqlalchemy.orm import Session
from app.models import ProductPrice, Store
from collections import defaultdict
from app.logging_config import get_logger

logger = get_logger("optimizer")

# Initiera Redis-klient
# Vi använder en global klient men skapar uppkopplingen vid behov.
# "redis" är hostnamnet från docker-compose.
redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")

try:
    # decode_responses=True gör att vi får strängar istället för bytes
    redis_client = redis.from_url(redis_url, decode_responses=True)
except Exception as e:
    logger.warning(f"Kunde inte initiera Redis-klient: {e}. Caching kommer vara inaktiverat.")
    redis_client = None

def calculate_best_basket(product_ids: list[int], db: Session):
    """
    Räknar ut billigaste sättet att handla en lista med produkter.
    Returnerar en lista med alternativ, sorterad på billigast totalpris först.
    Använder Redis för att cacha resultatet i 5 minuter.
    """
    if not product_ids:
        return []

    # 1. CACHE-CHECK (Redis)
    # Sortera IDn så att [1, 2] och [2, 1] behandlas som samma inköpslista
    sorted_ids = sorted(product_ids)
    cache_key = f"basket_optimization:{','.join(map(str, sorted_ids))}"

    if redis_client:
        try:
            cached_result = redis_client.get(cache_key)
            if cached_result:
                logger.info(f"⚡ Hittade optimering i cache för {len(product_ids)} produkter.")
                return json.loads(cached_result)
        except redis.RedisError as e:
            # Om Redis nere, logga bara och kör utan cache
            logger.warning(f"Redis-fel vid läsning: {e}")

    # 2. Hämta data från databasen (Cache Miss)
    logger.info(f"🧮 Räknar ut optimal inköpslista för {len(product_ids)} produkter...")

    prices = db.query(ProductPrice, Store)\
        .join(Store)\
        .filter(ProductPrice.product_id.in_(product_ids))\
        .all()
    
    # Strukturera data: Mappa produkt_id -> lista av erbjudanden
    product_map = defaultdict(list)
    all_stores = {}
    
    for price, store in prices:
        product_map[price.product_id].append({
            "product_id": price.product_id, 
            "store_id": store.id,
            "store_name": store.name,
            "price": price.price,
            "url": price.url,
            "shipping_rules": store
        })
        all_stores[store.id] = store

    results = []
    required_products = set(product_ids)

    # --- STRATEGI A: Allt i en butik (Samlad leverans) ---
    
    # Gruppera alla erbjudanden per butik
    store_baskets = defaultdict(list)
    for pid, offers in product_map.items():
        for offer in offers:
            store_baskets[offer["store_id"]].append(offer)

    for store_id, items in store_baskets.items():
        # Kolla vilka produkter denna butik har
        found_ids = {item["product_id"] for item in items}
        
        # Om butiken saknar någon av produkterna i listan, hoppa över den
        if len(found_ids) != len(required_products):
            continue 

        store = all_stores[store_id]
        product_total = sum(item["price"] for item in items)
        
        # Räkna frakt
        shipping = store.base_shipping
        if store.free_shipping_limit and product_total >= store.free_shipping_limit:
            shipping = 0.0
        
        results.append({
            "type": "Samlad leverans",
            "stores": [store.name],
            "details": [{
                "store": store.name,
                "products_count": len(items),
                "products_cost": product_total,
                "shipping": shipping
            }],
            "total_cost": product_total + shipping
        })

    # --- STRATEGI B: Smart Split (Billigast per vara) ---
    
    best_picks = {} # {store_id: [item1, item2]}
    
    for pid in product_ids:
        offers = product_map.get(pid)
        if not offers: 
            continue # Varan finns ingenstans
        
        # Sortera så billigast hamnar först
        cheapest_offer = sorted(offers, key=lambda x: x["price"])[0]
        
        sid = cheapest_offer["store_id"]
        if sid not in best_picks: 
            best_picks[sid] = []
        best_picks[sid].append(cheapest_offer)

    # Räkna ihop kostnaden för denna "Super-korg"
    split_details = []
    split_total_cost = 0
    store_names = []
    
    total_found_items = sum(len(items) for items in best_picks.values())
    
    # Kör bara split om vi hittade alla varor
    if total_found_items == len(required_products):
        for sid, items in best_picks.items():
            store = all_stores[sid]
            sub_total = sum(item["price"] for item in items)
            
            shipping = store.base_shipping
            if store.free_shipping_limit and sub_total >= store.free_shipping_limit:
                shipping = 0.0
            
            split_total_cost += sub_total + shipping
            store_names.append(store.name)
            
            split_details.append({
                "store": store.name,
                "products_count": len(items),
                "products_cost": sub_total,
                "shipping": shipping
            })

        # Lägg till Split-alternativet
        results.append({
            "type": "Smart Split (Billigast)",
            "stores": store_names,
            "details": split_details,
            "total_cost": split_total_cost
        })

    # Sortera så billigaste totalpriset hamnar först
    results.sort(key=lambda x: x["total_cost"])

    # 3. SPARA TILL CACHE (Redis)
    if redis_client and results:
        try:
            # Spara i 5 minuter (300 sekunder)
            redis_client.setex(cache_key, 300, json.dumps(results))
        except redis.RedisError as e:
            logger.warning(f"Kunde inte spara till Redis: {e}")

    return results