from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc
from typing import Optional

from app.database import get_db
from app.models import Category, Product, ProductPrice, Store

router = APIRouter()

@router.get("/")
def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).all()

@router.get("/{category_id}")
def get_category_products(
    category_id: int, 
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("popularity", pattern="^(popularity|price_asc|price_desc|discount_desc|rating_desc|name_asc|newest|default)$"),
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    # 1. Hitta kategorin
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Kategorin hittades inte")

    # --- NY LOGIK: Inkludera underkategorier ---
    # Om detta är en huvudkategori, hämta produkter från alla dess barn
    category_ids = [category.id]
    for child in category.children:
        category_ids.append(child.id)
    
    # Sök på ALLA relevanta IDn
    query = db.query(Product).filter(Product.category_id.in_(category_ids))
    # -------------------------------------------

    # 3. Sökfilter (Samma som förut)
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))

    # 4. Sortering (Samma som förut)
    if sort == "name_asc":
        query = query.order_by(Product.name.asc())
    elif sort == "newest":
        query = query.order_by(Product.created_at.desc())
    elif sort == "popularity" or sort == "default":
        query = query.order_by(Product.popularity_score.desc(), Product.name.asc())
    elif sort == "rating_desc":
        query = query.order_by(Product.rating.desc())
    elif sort == "price_asc" or sort == "price_desc":
        query = query.join(ProductPrice).group_by(Product.id)
        min_price = func.min(ProductPrice.price)
        if sort == "price_asc": query = query.order_by(min_price.asc())
        else: query = query.order_by(min_price.desc())
    elif sort == "discount_desc":
        query = query.join(ProductPrice).group_by(Product.id)
        max_discount = func.max(
            (ProductPrice.regular_price - ProductPrice.price) / ProductPrice.regular_price
        )
        query = query.filter(ProductPrice.regular_price > 0).order_by(max_discount.desc())

    # 5. Paginering
    total_products = query.count()
    products = query.limit(limit).offset((page - 1) * limit).all()
    
    # 6. Bygg svar
    product_results = []
    for product in products:
        prices = db.query(ProductPrice, Store)\
            .join(Store)\
            .filter(ProductPrice.product_id == product.id)\
            .order_by(ProductPrice.price.asc())\
            .all()
            
        price_list = []
        for price, store in prices:
            price_list.append({
                "store": store.name,
                "price": price.price,
                "url": price.url,
                "regular_price": price.regular_price
            })
            
        product_results.append({
            "id": product.id,
            "name": product.name,
            "ean": product.ean,
            "image_url": product.image_url,
            "popularity": product.popularity_score,
            "rating": product.rating,
            "prices": price_list
        })

    return {
        "category": {"id": category.id, "name": category.name},
        "pagination": {
            "total": total_products,
            "page": page,
            "limit": limit,
            "total_pages": (total_products + limit - 1) // limit if limit > 0 else 1
        },
        "products": product_results
    }