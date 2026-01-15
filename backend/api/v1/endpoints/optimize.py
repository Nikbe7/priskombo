from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.database import get_db
from app.services.optimizer import calculate_best_basket

router = APIRouter()

# --- Modeller för input ---
# (Dessa definierar hur JSON-datan från frontend måste se ut)
class CartItem(BaseModel):
    product_id: int
    quantity: int

class OptimizeRequest(BaseModel):
    items: List[CartItem]

@router.post("/")
def optimize_basket(request: OptimizeRequest, db: Session = Depends(get_db)):
    """
    Endpoint som tar emot varukorgen och returnerar den optimerade lösningen 
    (Samlad leverans vs Smart Split).
    """
    if not request.items:
        raise HTTPException(status_code=400, detail="Varukorgen är tom")

    # Skicka datan till din service-funktion som gör själva uträkningen
    try:
        results = calculate_best_basket(request.items, db)
        return results
    except Exception as e:
        print(f"Fel vid optimering: {e}")
        raise HTTPException(status_code=500, detail="Ett fel uppstod vid optimeringen")