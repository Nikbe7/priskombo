from sqlalchemy.orm import Session
from app.models import ProductPrice, Store
from collections import defaultdict

def calculate_best_basket(product_ids: list[int], db: Session):
    # 1. Hämta alla priser
    prices = db.query(ProductPrice, Store)\
        .join(Store)\
        .filter(ProductPrice.product_id.in_(product_ids))\
        .all()
    
    # Spara alla priser i en lättläst struktur
    product_map = defaultdict(list)
    all_stores = {}
    
    for price, store in prices:
        # HÄR VAR MISSEN: Vi lägger till product_id direkt i objektet
        product_map[price.product_id].append({
            "product_id": price.product_id, 
            "store_id": store.id,
            "store_name": store.name,
            "price": price.price,
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
        # HÄR VAR FELET: Nu är det en enkel loop eftersom vi sparade product_id ovan
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
        if not offers: continue # Varan finns ingenstans
        
        # Sortera så billigast hamnar först
        cheapest_offer = sorted(offers, key=lambda x: x["price"])[0]
        
        sid = cheapest_offer["store_id"]
        if sid not in best_picks: best_picks[sid] = []
        best_picks[sid].append(cheapest_offer)

    # Räkna ihop kostnaden för denna "Super-korg"
    split_details = []
    split_total_cost = 0
    store_names = []
    
    # Vi kollar så att splitten faktiskt innehåller alla produkter
    # (Man kan lägga till logik här för att hantera om en vara är helt slut överallt)
    total_found_items = sum(len(items) for items in best_picks.values())
    
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

        # Lägg till Split-alternativet i resultatlistan (om det finns mer än 1 butik inblandad)
        # (Vi visar den även om det bara är 1 butik, men då kommer den hamna samma som Strategi A)
        results.append({
            "type": "Smart Split (Billigast)",
            "stores": store_names,
            "details": split_details,
            "total_cost": split_total_cost
        })

    # Sortera så billigaste totalpriset hamnar först
    results.sort(key=lambda x: x["total_cost"])

    return results