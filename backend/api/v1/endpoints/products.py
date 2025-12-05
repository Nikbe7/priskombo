from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
# Vi behöver inte längre JSONResponse för headers
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc, func

from app.database import get_db
from app.models import Product, ProductPrice, Store, Category

router = APIRouter()

@router.get("/")
def get_products(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
    category_id: Optional[int] = None,
    category_ids: Optional[List[int]] = Query(None), 
    search: Optional[str] = None,
    sort: Optional[str] = None
):
    """
    Hämta produkter med paginering och sortering.
    Returnerar ett objekt: { "data": [produkter], "total": int }
    """
    query = db.query(Product)

    # 1. Filtrera på kategori
    if category_ids:
        query = query.filter(Product.category_id.in_(category_ids))
    elif category_id:
        query = query.filter(Product.category_id == category_id)

    # 2. Sökning
    if search:
        search_filter = f"%{search}%"
        query = query.filter(Product.name.ilike(search_filter))

    # --- RÄKNA TOTALEN ---
    total_count = query.count()

    # 3. Sortering
    if sort == "price_asc" or sort == "price_desc":
        query = query.outerjoin(ProductPrice).group_by(Product.id)
        if sort == "price_asc":
            query = query.order_by(func.min(ProductPrice.price).asc())
        else:
            query = query.order_by(func.min(ProductPrice.price).desc())
            
    elif sort == "rating_desc":
        query = query.order_by(Product.rating.desc().nullslast())
        
    elif sort == "name_asc":
        query = query.order_by(Product.name.asc())
        
    elif sort == "newest":
        query = query.order_by(Product.id.desc())

    # 4. Paginering
    if limit == -1:
        products = query.offset(skip).all()
    else:
        products = query.offset(skip).limit(limit).all()

    # 5. Formatera output
    results = []
    for p in products:
        prices = db.query(ProductPrice, Store)\
            .join(Store)\
            .filter(ProductPrice.product_id == p.id)\
            .all()
        
        price_list = []
        for price, store in prices:
            price_list.append({
                "store": store.name,
                "price": price.price,
                "url": price.url
            })

        rating = getattr(p, "rating", 0) 

        results.append({
            "id": p.id,
            "name": p.name,
            "ean": p.ean,
            "image_url": p.image_url,
            "category_id": p.category_id,
            "rating": rating,
            "prices": price_list
        })

    # Returnera standard JSON-objekt med data och total
    return {
        "data": results,
        "total": total_count
    }

@router.get("/{product_id}")
def get_product_details(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produkten hittades inte")

    category_name = None
    if product.category_id:
        cat = db.query(Category).filter(Category.id == product.category_id).first()
        if cat:
            category_name = cat.name

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
            "shipping": getattr(store, "base_shipping", 0),
            "in_stock": True 
        })

    return {
        "id": product.id,
        "name": product.name,
        "ean": product.ean,
        "image_url": product.image_url,
        "category": category_name,
        "prices": price_list
    }