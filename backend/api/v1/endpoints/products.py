from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload, joinedload
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
    
    # Vi säger till databasen: "När du hämtar produkter, hämta också deras priser 
    # och vilken butik priset tillhör direkt."
    # selectinload = Bra för listor (en produkt har många priser)
    # joinedload = Bra för enskilda relationer (ett pris har en butik)
    query = db.query(Product).options(
        selectinload(Product.prices).joinedload(ProductPrice.store)
    )

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
    # Obs: count() kan vara långsamt på enorma tabeller, men ok här.
    # För exakt count måste vi köra detta innan vi lägger på options/limits
    total_count = query.count()

    # 3. Sortering
    if sort == "price_asc" or sort == "price_desc":
        # För att sortera på pris måste vi joina tabellerna
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
        price_list = []
        # p.prices är redan ifylld tack vare selectinload
        for price in p.prices:
            # price.store är redan ifylld tack vare joinedload
            if price.store:
                price_list.append({
                    "store": price.store.name,
                    "price": price.price,
                    "url": price.url
                })

        # Sortera prislistan i Python istället för DB (snabbare när datan är hämtad)
        price_list.sort(key=lambda x: x['price'])

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

    return {
        "data": results,
        "total": total_count
    }

@router.get("/{product_id}")
def get_product_details(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).options(
        selectinload(Product.prices).joinedload(ProductPrice.store)
    ).filter(Product.id == product_id).first()

    if not product:
        raise HTTPException(status_code=404, detail="Produkten hittades inte")

    # Hämta kategori-namn
    category_name = None
    if product.category_id:
        cat = db.query(Category).filter(Category.id == product.category_id).first()
        if cat:
            category_name = cat.name

    # Formatera priser från relationen
    price_list = []
    for price in product.prices:
        if price.store:
            price_list.append({
                "store": price.store.name,
                "price": price.price,
                "regular_price": price.regular_price, 
                "discount_percent": price.discount_percent,
                "url": price.url,
                "in_stock": True,
                "shipping": price.store.base_shipping
            })
    
    # Sortera billigast först
    price_list.sort(key=lambda x: x['price'])

    return {
        "id": product.id,
        "name": product.name,
        "ean": product.ean,
        "image_url": product.image_url,
        "category": category_name,
        "prices": price_list
    }