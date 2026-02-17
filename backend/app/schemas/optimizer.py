from typing import List, Optional
from pydantic import BaseModel

class BasketItemRequest(BaseModel):
    product_id: int
    quantity: int = 1

class BasketRequest(BaseModel):
    items: List[BasketItemRequest]

class BasketItem(BaseModel):
    product_id: int
    product_name: str
    price: float
    url: str
    image_url: Optional[str] = None

class StoreBasket(BaseModel):
    store: str
    total_price: float
    shipping_cost: float
    final_cost: float
    items: List[BasketItem]
    missing_items: List[str] = [] 

class OptimizationResult(BaseModel):
    cheapest_option: StoreBasket
    best_split_option: Optional[List[StoreBasket]] = None 
    message: str
