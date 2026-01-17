import json
import os
import redis
from sqlalchemy.orm import Session
from app.models import ProductPrice, Store, Product
from collections import defaultdict
from app.logging_config import get_logger
from app.services.affiliate import generate_tracking_link
import sys

logger = get_logger("optimizer")

redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")

try:
    redis_client = redis.from_url(redis_url, decode_responses=True)
except Exception as e:
    logger.warning(f"Redis error: {e}")
    redis_client = None

def calculate_shipping(store, current_total):
    """Hjälpfunktion för att räkna ut frakt för en butik baserat på summa."""
    if current_total <= 0:
        return 0.0
    
    if store.free_shipping_limit and current_total >= store.free_shipping_limit:
        return 0.0
    
    return store.base_shipping

def solve_recursive(product_idx, products_list, current_store_totals, current_assignments, current_cost_so_far, best_solution, store_lookup, quantity_map):
    """
    En rekursiv Branch and Bound-lösning.
    Garanterar matematiskt lägsta priset.
    """
    
    # BASFALL: Vi har gått igenom alla produkter
    if product_idx == len(products_list):
        # Räkna ut total frakt för denna kombination
        total_shipping = 0.0
        for sid, total in current_store_totals.items():
            if total > 0:
                store_obj = store_lookup[sid]
                total_shipping += calculate_shipping(store_obj, total)
        
        final_total = current_cost_so_far + total_shipping
        
        # Om detta är bättre än vårt tidigare bästa rekord, spara det!
        if final_total < best_solution['cost']:
            best_solution['cost'] = final_total
            best_solution['assignments'] = list(current_assignments)
        return

    # --- PRUNING (Optimering) ---
    if current_cost_so_far >= best_solution['cost']:
        return

    # Hämta nuvarande produkt och dess erbjudanden
    pid, offers = products_list[product_idx]
    qty = quantity_map[pid]

    # Sortering heuristik: Pris (lågt->högt), sedan föredra redan valda butiker
    def sort_key(o):
        is_active_store = 1 if current_store_totals.get(o['store_id'], 0) > 0 else 0
        return (o['price'], -is_active_store)

    sorted_offers = sorted(offers, key=sort_key)

    for offer in sorted_offers:
        sid = offer['store_id']
        price = offer['price']
        cost_for_items = price * qty

        # Uppdatera state
        old_total = current_store_totals.get(sid, 0.0)
        current_store_totals[sid] = old_total + cost_for_items
        current_assignments.append(offer)
        
        # Rekursera
        solve_recursive(
            product_idx + 1, 
            products_list, 
            current_store_totals, 
            current_assignments, 
            current_cost_so_far + cost_for_items, 
            best_solution,
            store_lookup,
            quantity_map
        )

        # Backtrack
        current_store_totals[sid] = old_total 
        current_assignments.pop()


def calculate_best_basket(cart_items: list, db: Session):
    if not cart_items:
        return []

    # 0. MAPPA UPP ANTAL
    quantity_map = {}
    for item in cart_items:
        pid = item.product_id if hasattr(item, "product_id") else item.get("product_id")
        qty = item.quantity if hasattr(item, "quantity") else item.get("quantity", 1)
        quantity_map[pid] = qty

    product_ids = list(quantity_map.keys())

    # 1. CACHE-CHECK
    sorted_items = sorted(quantity_map.items())
    cache_key_str = ",".join([f"{pid}:{qty}" for pid, qty in sorted_items])
    cache_key = f"basket_optimization_v3:{cache_key_str}" # V3 för ny logik

    if redis_client:
        try:
            cached_result = redis_client.get(cache_key)
            if cached_result:
                return json.loads(cached_result)
        except Exception:
            pass

    # 2. Hämta data
    prices = (
        db.query(ProductPrice, Store, Product)
        .join(Store)
        .join(Product)
        .filter(ProductPrice.product_id.in_(product_ids))
        .all()
    )

    all_stores = {}
    raw_product_map = defaultdict(list)

    # 3. Strukturera data
    for price, store, product in prices:
        all_stores[store.id] = store
        tracking_url = generate_tracking_link(price.url, store)
        
        raw_product_map[price.product_id].append({
            "product_id": price.product_id,
            "product_name": product.name,
            "product_slug": product.slug,
            "store_id": store.id,
            "store_name": store.name,
            "price": price.price,
            "url": tracking_url,
            "shipping_rules": store 
        })

    # 4. PRE-PROCESSING för rekursionen
    MAX_REASONABLE_SHIPPING = 250.0 
    products_list = []
    
    for pid in product_ids:
        offers = raw_product_map.get(pid)
        if not offers:
            continue
        min_price = min(o['price'] for o in offers)
        threshold = min_price + MAX_REASONABLE_SHIPPING
        valid_offers = [o for o in offers if o['price'] <= threshold]
        products_list.append((pid, valid_offers))

    products_list.sort(key=lambda x: len(x[1]))

    # 5. KÖR REKURSIV LÖSARE (Hittar den absoluta vinnaren)
    best_solution = {'cost': float('inf'), 'assignments': []}
    
    solve_recursive(
        product_idx=0, 
        products_list=products_list, 
        current_store_totals={}, 
        current_assignments=[], 
        current_cost_so_far=0.0, 
        best_solution=best_solution, 
        store_lookup=all_stores,
        quantity_map=quantity_map
    )

    # 6. FORMATERA VINNAREN
    results = []
    
    if best_solution['assignments']:
        # -- Hjälpfunktion för att skapa resultatet --
        def build_result_object(assignments, type_override=None):
            store_groups = defaultdict(list)
            for item in assignments:
                store_groups[item['store_id']].append(item)
                
            details = []
            store_names = []
            calc_total = 0
            
            for sid, items in store_groups.items():
                store = all_stores[sid]
                sub_total = sum(item["price"] * quantity_map[item["product_id"]] for item in items)
                shipping = calculate_shipping(store, sub_total)
                
                store_names.append(store.name)
                calc_total += sub_total + shipping
                
                details.append({
                    "store": store.name,
                    "products_count": sum(quantity_map[item["product_id"]] for item in items),
                    "products": [
                        {
                            "id": item["product_id"],
                            "name": item["product_name"],
                            "slug": item["product_slug"],
                            "price": item["price"],
                            "url": item.get("url")
                        } for item in items
                    ],
                    "products_cost": sub_total,
                    "shipping": shipping
                })

            # Avgör typ
            if type_override:
                res_type = type_override
            else:
                res_type = "Samlad leverans" if len(details) == 1 else "Smart Split (Billigast)"
            
            return {
                "type": res_type,
                "stores": store_names,
                "details": details,
                "total_cost": calc_total
            }
            
        # Lägg till vinnaren först
        winner_result = build_result_object(best_solution['assignments'])
        results.append(winner_result)
        
        # 7. (NYTT) OM VINNAREN ÄR EN SPLIT -> HITTA BÄSTA SAMLADE LEVERANS
        if winner_result["type"] != "Samlad leverans":
            
            best_single_store_option = None
            min_single_cost = float('inf')
            
            # Gruppera ALLA offers per butik (använd raw_product_map för att inte missa filtrerade butiker)
            store_inventories = defaultdict(list)
            for pid, offers in raw_product_map.items():
                for offer in offers:
                    store_inventories[offer['store_id']].append(offer)
            
            required_qty_count = len(quantity_map)
            
            for sid, offers in store_inventories.items():
                # Kolla att butiken har alla unika produkter som krävs
                unique_pids_in_store = {o['product_id'] for o in offers}
                if len(unique_pids_in_store) < required_qty_count:
                    continue # Butiken saknar varor
                
                # Butiken har allt! Välj ut de specifika erbjudandena (om dubbletter finns, ta första)
                current_store_items = []
                
                for pid in product_ids:
                    # Hitta erbjudandet för denna produkt i denna butik
                    match = next((o for o in offers if o['product_id'] == pid), None)
                    if match:
                        current_store_items.append(match)
                
                # Räkna ut kostnad för denna enskilda butik
                # Vi kan återanvända build_result_object för att få korrekt fraktuträkning
                single_res = build_result_object(current_store_items, type_override="Samlad leverans")
                
                if single_res["total_cost"] < min_single_cost:
                    min_single_cost = single_res["total_cost"]
                    best_single_store_option = single_res
            
            # Om vi hittade en samlad leverans, lägg till den som #2
            if best_single_store_option:
                results.append(best_single_store_option)

    # 8. SPARA TILL CACHE
    if redis_client and results:
        redis_client.setex(cache_key, 600, json.dumps(results)) 

    return results