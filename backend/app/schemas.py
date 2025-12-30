from typing import List, Optional
from pydantic import BaseModel

# --- STORE SCHEMAS ---
class StoreBase(BaseModel):
    name: str

class Store(StoreBase):
    id: int
    base_shipping: float = 0
    free_shipping_limit: Optional[float] = None

    class Config:
        from_attributes = True

# --- CATEGORY SCHEMAS ---
class CategoryBase(BaseModel):
    name: str
    slug: str
    parent_id: Optional[int] = None
    coming_soon: bool = False

class Category(CategoryBase):
    id: int
    
    class Config:
        from_attributes = True

# --- PRICE SCHEMAS ---
class ProductPriceBase(BaseModel):
    price: float
    url: str
    regular_price: Optional[float] = None
    discount_percent: Optional[float] = None

class ProductPrice(ProductPriceBase):
    store: str  # Vi returnerar butiksnamnet direkt för enkelhetens skull i frontend
    shipping: float = 0
    in_stock: bool = True

    class Config:
        from_attributes = True

# --- PRODUCT SCHEMAS ---
class ProductBase(BaseModel):
    name: str
    ean: str
    image_url: Optional[str] = None
    slug: Optional[str] = None # <--- VIKTIGT: Denna saknades och kraschade testerna
    description: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int
    category_id: Optional[int] = None
    category: Optional[str] = None # Namnet på kategorin
    rating: Optional[float] = 0.0
    prices: List[ProductPrice] = []

    class Config:
        from_attributes = True

# --- OPTIMIZER / BASKET SCHEMAS ---
# Dessa används för /optimize endpointen

class BasketRequest(BaseModel):
    product_ids: List[int]

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
    missing_items: List[str] = [] # Namn på produkter som butiken inte hade

class OptimizationResult(BaseModel):
    cheapest_option: StoreBasket
    best_split_option: Optional[List[StoreBasket]] = None # Om det är billigare att dela upp köpet
    message: str