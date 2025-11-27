from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.database import get_db
from app.models import Category, Product, ProductPrice, Store

router = APIRouter()

@router.get("/")
def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).all()

# UPPDATERAD: Nu med paginering
@router.get("/{category_id}")
def get_category_products(
    category_id: int, 
    page: int = Query(1, ge=1),      # Default sida 1, får inte vara < 1
    limit: int = Query(20, ge=1, le=100), # Default 20 produkter, max 100
    db: Session = Depends(get_db)
):
    # 1. Hitta kategorin
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Kategorin hittades inte")

    # 2. Räkna totalt antal produkter i kategorin (för att veta antal sidor)
    total_products = db.query(func.count(Product.id)).filter(Product.category_id == category_id).scalar()

    # 3. Räkna ut offset (var vi ska börja hämta)
    skip = (page - 1) * limit

    # 4. Hämta produkter för just denna sida
    products = db.query(Product)\
        .filter(Product.category_id == category_id)\
        .limit(limit)\
        .offset(skip)\
        .all()
    
    # 5. Bygg resultat med priser
    product_results = []
    for product in products:
        # Hämta priser (samma som förut)
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
                "url": price.url
            })
            
        product_results.append({
            "id": product.id,
            "name": product.name,
            "ean": product.ean,
            "image_url": product.image_url,
            "prices": price_list
        })

    return {
        "category": {"id": category.id, "name": category.name},
        "pagination": {
            "total": total_products,
            "page": page,
            "limit": limit,
            "total_pages": (total_products + limit - 1) // limit
        },
        "products": product_results
    }