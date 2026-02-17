from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, subqueryload, joinedload
from sqlalchemy import func, desc, asc, distinct
from typing import Optional, List

from app.db.session import get_db
from app.models import Category, Product, ProductPrice, Store

router = APIRouter()

@router.get("/")
def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).all()

@router.get("/{slug}")
def get_category_by_slug(
    slug: str, 
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("popularity", pattern="^(popularity|price_asc|price_desc|discount_desc|rating_desc|name_asc|newest|default)$"),
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    brands: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    # 1. Hitta kategorin via SLUG
    category = db.query(Category).filter(Category.slug == slug).first()
    if not category:
        raise HTTPException(status_code=404, detail="Kategorin hittades inte")

    # Kolla om detta är en huvudkategori (har inga föräldrar)
    is_parent_category = category.parent_id is None
    
    # Om det är en huvudkategori, vill vi kanske bara returnera dess barn
    # Men för nu låter vi den hämta produkter från alla barn också.
    
    category_ids = [category.id] + [c.id for c in category.children]
    
    # ... (Resten av logiken är samma som förut, men vi använder category_ids) ...
    
    query = db.query(Product).filter(Product.category_id.in_(category_ids))

    # --- FILTER & SORTERING (Klipp in samma logik som du hade innan) ---
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))

    if brands:
        brand_list = brands.split(",")
        query = query.filter(Product.brand.in_(brand_list))

    if min_price is not None or max_price is not None:
        query = query.join(ProductPrice)
        if min_price is not None: query = query.filter(ProductPrice.price >= min_price)
        if max_price is not None: query = query.filter(ProductPrice.price <= max_price)
        query = query.distinct()

    # FACETS (Märken)
    facet_query = db.query(Product.brand, func.count(Product.id))\
        .filter(Product.category_id.in_(category_ids))\
        .filter(Product.brand != None)\
        .group_by(Product.brand)\
        .order_by(func.count(Product.id).desc())
    
    available_brands = [{"name": b, "count": c} for b, c in facet_query.all()]

    price_stats = db.query(func.min(ProductPrice.price), func.max(ProductPrice.price))\
        .join(Product)\
        .filter(Product.category_id.in_(category_ids))\
        .first()
    
    min_cat_price = price_stats[0] or 0
    max_cat_price = price_stats[1] or 10000

    # SORTERING
    if sort == "name_asc": query = query.order_by(Product.name.asc())
    elif sort == "newest": query = query.order_by(Product.created_at.desc())
    elif sort == "popularity" or sort == "default": query = query.order_by(Product.popularity_score.desc(), Product.name.asc())
    elif sort == "rating_desc": query = query.order_by(Product.rating.desc())
    elif sort == "price_asc" or sort == "price_desc":
        if min_price is None and max_price is None: query = query.join(ProductPrice)
        query = query.group_by(Product.id)
        min_p = func.min(ProductPrice.price)
        if sort == "price_asc": query = query.order_by(min_p.asc())
        else: query = query.order_by(min_p.desc())
    elif sort == "discount_desc":
        if min_price is None and max_price is None: query = query.join(ProductPrice)
        query = query.group_by(Product.id)
        max_d = func.max((ProductPrice.regular_price - ProductPrice.price) / ProductPrice.regular_price)
        query = query.filter(ProductPrice.regular_price > 0).order_by(max_d.desc())

    total_products = query.count()
    
    # subqueryload: Hämtar alla priser för dessa 20 produkter i EN extra fråga (istället för 20 st)
    # joinedload: Hämtar butiksinfo (Store) direkt tillsammans med priset
    query = query.options(
        subqueryload(Product.prices).joinedload(ProductPrice.store)
    )

    products = query.limit(limit).offset((page - 1) * limit).all()
    
    product_results = []
    for product in products:
        # Nu finns priserna redan laddade i product.prices!
        # Vi sorterar dem i Python istället för i databasen (går supersnabbt på så få objekt)
        sorted_prices = sorted(product.prices, key=lambda p: p.price)
        
        price_list = []
        for p in sorted_prices:
            # Vi kollar så att p.store finns (ifall datan skulle vara trasig)
            if p.store:
                price_list.append({
                    "store": p.store.name, 
                    "price": p.price, 
                    "url": p.url, 
                    "regular_price": p.regular_price
                })

        product_results.append({
            "id": product.id,
            "name": product.name,
            "brand": product.brand,
            "ean": product.ean,
            "image_url": product.image_url,
            "popularity": product.popularity_score,
            "rating": product.rating,
            "prices": price_list
        })

    return {
        "category": {
            "id": category.id, 
            "name": category.name, 
            "slug": category.slug,
            "is_parent": is_parent_category, # <-- Viktig flagga för frontend!
            "children": [{"name": c.name, "slug": c.slug} for c in category.children] # Skicka med barnen
        },
        "filters": {
            "brands": available_brands,
            "price_range": {"min": min_cat_price, "max": max_cat_price}
        },
        "pagination": {
            "total": total_products,
            "page": page,
            "limit": limit,
            "total_pages": (total_products + limit - 1) // limit if limit > 0 else 1
        },
        "products": product_results
    }