from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db

router = APIRouter()

@router.get("/")
def get_best_deals(limit: int = 50, db: Session = Depends(get_db)):
    """
    Hämtar produkter där priset är sänkt (price < regular_price).
    Sorterar på procentuell rabatt.
    """
    
    # Vi använder SQL direkt för att enkelt räkna ut rabatt %
    sql = text("""
        SELECT 
            p.id, p.name, p.image_url, 
            pp.price, pp.regular_price, 
            s.name as store_name, pp.url,
            CAST(((pp.regular_price - pp.price) / pp.regular_price * 100) AS INTEGER) as discount_percent
        FROM product_prices pp
        JOIN products p ON pp.product_id = p.id
        JOIN stores s ON pp.store_id = s.id
        WHERE pp.regular_price > pp.price
        AND pp.regular_price > 0
        ORDER BY discount_percent DESC
        LIMIT :limit
    """)
    
    results = db.execute(sql, {"limit": limit}).fetchall()
    
    deals = []
    for row in results:
        deals.append({
            "id": row.id,
            "name": row.name,
            "image_url": row.image_url,
            "price": row.price,
            "regular_price": row.regular_price,
            "store": row.store_name,
            "url": row.url,
            "discount_percent": row.discount_percent
        })
        
    return deals