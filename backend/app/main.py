from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

from app.database import get_db
from app.models import Product, ProductPrice, Store
from app.services.optimizer import calculate_best_basket # <-- Vår nya fil!

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATAMODELLER (Schema) ---
# Detta berättar för FastAPI hur datat vi skickar IN ser ut
class BasketRequest(BaseModel):
    product_ids: List[int]

@app.get("/")
def read_root():
    return {"message": "API is running"}

@app.get("/search")
def search(q: str, db: Session = Depends(get_db)):
    if not q: return []
    products = db.query(Product).filter(Product.name.ilike(f"%{q}%")).all()
    results = []
    for product in products:
        prices = db.query(ProductPrice, Store).join(Store).filter(ProductPrice.product_id == product.id).order_by(ProductPrice.price.asc()).all()
        price_list = [{"store": s.name, "price": p.price, "url": p.url} for p, s in prices]
        results.append({
            "id": product.id,
            "name": product.name,
            "ean": product.ean,
            "image_url": product.image_url,  # <--- HÄR ÄR DEN NYA RADEN!
            "prices": price_list
        })
    return results

# --- NY ENDPOINT: OPTIMERA ---
@app.post("/optimize")
def optimize_basket(request: BasketRequest, db: Session = Depends(get_db)):
    """
    Tar emot en lista med produkt-IDn och returnerar billigaste butiken.
    """
    if not request.product_ids:
        raise HTTPException(status_code=400, detail="Varukorgen är tom")
    
    best_options = calculate_best_basket(request.product_ids, db)
    return best_options