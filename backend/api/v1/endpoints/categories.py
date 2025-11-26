from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Category, Product, ProductPrice, Store

router = APIRouter()

# 1. Hämta alla kategorier (för menyn)
@router.get("/")
def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).all()

# 2. Hämta en specifik kategori och dess produkter
@router.get("/{category_id}")
def get_category_products(category_id: int, db: Session = Depends(get_db)):
    # Hitta kategorin
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Kategorin hittades inte")

    # Hitta produkter i kategorin
    products = db.query(Product).filter(Product.category_id == category_id).limit(50).all()
    
    # Bygg snyggt resultat med priser (Samma logik som sökning)
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
        "products": product_results
    }