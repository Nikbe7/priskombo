from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Product, ProductPrice, Store, Category

router = APIRouter()

@router.get("/{product_id}")
def get_product_details(product_id: int, db: Session = Depends(get_db)):
    # 1. Hämta produkten
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produkten hittades inte")

    # 2. Hämta kategorinamn (om det finns)
    category_name = None
    if product.category_id:
        cat = db.query(Category).filter(Category.id == product.category_id).first()
        if cat:
            category_name = cat.name

    # 3. Hämta alla priser och butiker
    prices = db.query(ProductPrice, Store)\
        .join(Store)\
        .filter(ProductPrice.product_id == product.id)\
        .order_by(ProductPrice.price.asc())\
        .all()

    # 4. Formatera listan med priser
    price_list = []
    for price, store in prices:
        price_list.append({
            "store": store.name,
            "price": price.price,
            "url": price.url,
            "shipping": store.base_shipping,
            "in_stock": True # Vi kan lägga till lagerstatus i framtiden
        })

    return {
        "id": product.id,
        "name": product.name,
        "ean": product.ean,
        "image_url": product.image_url,
        "category": category_name,
        "prices": price_list
    }