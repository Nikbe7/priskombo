from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from .category import CategoryLink

class ProductPriceBase(BaseModel):
    price: float
    url: str
    regular_price: Optional[float] = None
    discount_percent: Optional[float] = None

class ProductPrice(ProductPriceBase):
    store: str  # Vi returnerar butiksnamnet direkt för enkelhetens skull i frontend
    shipping: float = 0
    in_stock: bool = True

    model_config = ConfigDict(from_attributes=True)

class ProductBase(BaseModel):
    name: str
    ean: str
    image_url: Optional[str] = None
    slug: Optional[str] = None 
    description: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int
    category_id: Optional[int] = None
    
    # Returnerar nu ett objekt med slug/parent istället för bara en sträng
    category: Optional[CategoryLink] = None 
    
    rating: Optional[float] = 0.0
    prices: List[ProductPrice] = []

    model_config = ConfigDict(from_attributes=True)
