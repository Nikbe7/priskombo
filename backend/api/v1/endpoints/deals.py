from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db

router = APIRouter()

@router.get("/")
def get_best_deals(limit: int = 20, db: Session = Depends(get_db)):
    sql = text("""
        SELECT DISTINCT ON (p.id)
            p.id, p.name, p.image_url, p.slug, 
            pp.price, pp.regular_price, 
            s.name as store_name, pp.url,
            pp.discount_percent
        FROM product_prices pp
        JOIN products p ON pp.product_id = p.id
        JOIN stores s ON pp.store_id = s.id
        WHERE pp.discount_percent > 0
        ORDER BY p.id, pp.discount_percent DESC
        LIMIT :limit
    """)
    
    results = db.execute(sql, {"limit": limit}).fetchall()
    
    deals = []
    for row in results:
        deals.append({
            "id": row.id,
            "name": row.name,
            "slug": row.slug,
            "image_url": row.image_url,
            "price": row.price,
            "regular_price": row.regular_price,
            "store": row.store_name,
            "discount_percent": row.discount_percent,
            "url": row.url
        })
    
    return deals