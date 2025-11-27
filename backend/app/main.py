from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import List

from app.database import get_db
from app.models import Product, ProductPrice, Store
from app.services.optimizer import calculate_best_basket
from api.v1.endpoints import categories
from app.services.optimizer import calculate_best_basket

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # <--- Stjärnan betyder "Alla är välkomna"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# HÄR REGISTRERAR VI ROUTERN:
app.include_router(categories.router, prefix="/categories", tags=["categories"])

# --- DATAMODELLER (Schema) ---
# Detta berättar för FastAPI hur datat vi skickar IN ser ut
class BasketRequest(BaseModel):
    product_ids: List[int]

@app.get("/")
def read_root():
    return {"message": "API is running"}

@app.get("/search")
def search(q: str, db: Session = Depends(get_db)):
    if not q or len(q) < 2: # Sök inte på 1 bokstav
        return []

    # OPTIMERAD SÖKNING:
    # 1. Hämta Produkter, Priser och Butiker i EN fråga (JOIN)
    # 2. Begränsa till 50 träffar för att inte döda frontend
    query_result = db.query(Product, ProductPrice, Store)\
        .join(ProductPrice, Product.id == ProductPrice.product_id)\
        .join(Store, ProductPrice.store_id == Store.id)\
        .filter(Product.name.ilike(f"%{q}%"))\
        .limit(200)\
        .all() # Hämtar max 200 rader (t.ex. 50 produkter * 4 butiker)

    # 3. Gruppera resultatet i Python (mycket snabbare än SQL-anrop)
    results_map = {}
    
    for product, price, store in query_result:
        if product.id not in results_map:
            results_map[product.id] = {
                "id": product.id,
                "name": product.name,
                "ean": product.ean,
                "image_url": product.image_url,
                "prices": []
            }
        
        results_map[product.id]["prices"].append({
            "store": store.name,
            "price": price.price,
            "url": price.url
        })
    
    # 4. Returnera som lista och sortera ev. på bästa pris
    final_results = list(results_map.values())
    return final_results

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