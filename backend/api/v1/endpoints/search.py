from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Product, ProductPrice, Store, Category
from pydantic import BaseModel

router = APIRouter()

# Schema för förslag
class SuggestionResponse(BaseModel):
    categories: List[dict]
    brands: List[str]
    products: List[dict]

# 1. Sökförslag (Autocomplete)
@router.get("/suggestions", response_model=SuggestionResponse)
def get_search_suggestions(
    q: str = Query(..., min_length=2),
    db: Session = Depends(get_db)
):
    """
    Returnerar förslag på kategorier, varumärken och produkter.
    """
    query = q.lower()

    # Kategorier
    categories_query = (
        db.query(Category)
        .filter(Category.name.ilike(f"%{query}%"))
        .limit(3)
        .all()
    )

    categories_data = []
    for cat in categories_query:
        parent_name = cat.parent.name if cat.parent else None
        parent_slug = cat.parent.slug if cat.parent else None
        
        categories_data.append({
            "id": cat.id,
            "name": cat.name,
            "slug": cat.slug,
            "parent_name": parent_name,
            "parent_slug": parent_slug
        })

    # Varumärken
    brands_query = (
        db.query(Product.brand)
        .filter(Product.brand.ilike(f"{query}%"))
        .filter(Product.brand.isnot(None))
        .distinct()
        .limit(3)
        .all()
    )
    brands = [b[0] for b in brands_query if b[0]]

    # Produkter
    products_query = (
        db.query(Product)
        .join(ProductPrice)
        .filter(Product.name.ilike(f"%{query}%"))
        .limit(5)
        .all()
    )

    products_data = []
    for p in products_query:
        min_price = min((price.price for price in p.prices), default=0)
        products_data.append({
            "id": p.id,
            "name": p.name,
            "slug": p.slug,
            "image_url": p.image_url,
            "brand": p.brand,
            "min_price": min_price,
            "category_slug": p.category.slug if p.category else None 
        })

    return {
        "categories": categories_data,
        "brands": brands,
        "products": products_data
    }

# 2. Huvudsökning (Sökresultat-sidan)
# ÄNDRING HÄR: @router.get("") istället för @router.get("/")
@router.get("")
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