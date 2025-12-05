from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db

router = APIRouter()

@router.get("/")
def get_best_deals(limit: int = 20, db: Session = Depends(get_db)):
    # OPTIMERAD SQL: Använder den indexerade kolumnen 'discount_percent'
    # Detta är O(1) istället för O(N) och kommer inte krascha servern.
    sql = text("""
        SELECT 
            p.id, p.name, p.image_url, 
            pp.price, pp.regular_price, 
            s.name as store_name, pp.url,
            pp.discount_percent
        FROM product_prices pp
        JOIN products p ON pp.product_id = p.id
        JOIN stores s ON pp.store_id = s.id
        WHERE pp.discount_percent > 0
        ORDER BY pp.discount_percent DESC
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
            "discount_percent": row.discount_percent,
            "url": row.url
        })
    
    return deals