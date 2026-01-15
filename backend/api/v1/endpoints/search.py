from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Product, ProductPrice, Store
from typing import List

router = APIRouter()

@router.get("/")
def search(q: str, db: Session = Depends(get_db)):
    """
    Sök endpoint som matchar det format din frontend förväntar sig.
    Returnerar en platt lista av produkter.
    """
    if not q or len(q) < 2:
        return []

    # Sökning med joins för att få med priser och butiker
    query_result = db.query(Product, ProductPrice, Store)\
        .join(ProductPrice, Product.id == ProductPrice.product_id)\
        .join(Store, ProductPrice.store_id == Store.id)\
        .filter(Product.name.ilike(f"%{q}%"))\
        .limit(200)\
        .all()

    results_map = {}
    
    for product, price, store in query_result:
        if product.id not in results_map:
            results_map[product.id] = {
                "id": product.id,
                "name": product.name,
                "ean": product.ean,
                "slug": product.slug, # Viktigt att slug är med för länkning
                "image_url": product.image_url,
                "prices": []
            }
        
        results_map[product.id]["prices"].append({
            "store": store.name,
            "price": price.price,
            "regular_price": price.regular_price,
            "discount_percent": price.discount_percent,
            "url": price.url
        })
    
    return list(results_map.values())