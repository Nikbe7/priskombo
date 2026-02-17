from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload, joinedload
from sqlalchemy import or_, desc, asc, func

from app.db.session import get_db
from app.models import Product, ProductPrice, Store, Category
from app.services.affiliate import generate_tracking_link  # <--- NY IMPORT

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
    
    # Vi inkluderar även kategori-objektet här så att produktlistor kan bygga länkar direkt
    query = db.query(Product).options(
        selectinload(Product.prices).joinedload(ProductPrice.store),
        joinedload(Product.category)
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
    total_count = query.count()

    # 3. Sortering
    if sort == "price_asc" or sort == "price_desc":
        # Use a subquery for min price to avoid GROUP BY conflicts with eager loading
        min_price_subq = (
            db.query(
                ProductPrice.product_id,
                func.min(ProductPrice.price).label("min_price")
            )
            .group_by(ProductPrice.product_id)
            .subquery()
        )
        query = query.outerjoin(
            min_price_subq, Product.id == min_price_subq.c.product_id
        )
        if sort == "price_asc":
            query = query.order_by(min_price_subq.c.min_price.asc().nullslast())
        else:
            query = query.order_by(min_price_subq.c.min_price.desc().nullslast())
            
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
        for price in p.prices:
            if price.store:
                # --- GENERERA TRACKING LÄNK HÄR ---
                tracking_url = generate_tracking_link(price.url, price.store)
                
                price_list.append({
                    "store": price.store.name,
                    "price": price.price,
                    "url": tracking_url  # Använd den genererade länken
                })

        price_list.sort(key=lambda x: x['price'])
        rating = getattr(p, "rating", 0) 

        # Bygg kategori-strukturen för listan
        category_data = None
        if p.category:
            category_data = {
                "name": p.category.name,
                "slug": p.category.slug,
            }

        results.append({
            "id": p.id,
            "name": p.name,
            "ean": p.ean,
            "slug": p.slug,
            "image_url": p.image_url,
            "category_id": p.category_id,
            "category": category_data,
            "rating": rating,
            "prices": price_list
        })

    return {
        "data": results,
        "total": total_count
    }

@router.get("/{id_or_slug}")
def get_product_details(id_or_slug: str, db: Session = Depends(get_db)):
    """
    Hämtar en enskild produkt baserat på ID eller SLUG.
    Inkluderar hela kategoriträdet (Kategori -> Parent) för URL-byggande.
    """
    
    # Bygg query med alla relationer vi behöver
    query = db.query(Product).options(
        selectinload(Product.prices).joinedload(ProductPrice.store),
        # Här laddar vi rekursivt: Produkt -> Kategori -> Parent Kategori
        joinedload(Product.category).joinedload(Category.parent)
    )

    # Avgör om input är ett ID (siffror) eller en Slug (text)
    if id_or_slug.isdigit():
        product = query.filter(Product.id == int(id_or_slug)).first()
    else:
        product = query.filter(Product.slug == id_or_slug).first()

    if not product:
        raise HTTPException(status_code=404, detail="Produkten hittades inte")

    # Formatera priser
    price_list = []
    for price in product.prices:
        if price.store:
            tracking_url = generate_tracking_link(price.url, price.store)
            
            price_list.append({
                "store": price.store.name,
                "price": price.price,
                "regular_price": price.regular_price, 
                "discount_percent": price.discount_percent,
                "url": tracking_url,
                "original_url": price.url,
                "in_stock": True,
                "shipping": price.store.base_shipping
            })
    
    price_list.sort(key=lambda x: x['price'])

    # Bygg kategori-objektet enligt det nya schemat
    category_data = None
    if product.category:
        category_data = {
            "name": product.category.name,
            "slug": product.category.slug,
            "parent": None
        }
        # Lägg till parent om det finns
        if product.category.parent:
            category_data["parent"] = {
                "name": product.category.parent.name,
                "slug": product.category.parent.slug,
                "parent": None # Stoppar rekursionen här
            }

    return {
        "id": product.id,
        "name": product.name,
        "ean": product.ean,
        "slug": product.slug,
        "image_url": product.image_url,
        "category": category_data,
        "prices": price_list
    }