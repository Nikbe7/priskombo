from typing import List, Optional
from pydantic import BaseModel, ConfigDict

# --- STORE SCHEMAS ---
class StoreBase(BaseModel):
    name: str

class Store(StoreBase):
    id: int
    base_shipping: float = 0
    free_shipping_limit: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)

# --- CATEGORY SCHEMAS ---
class CategoryBase(BaseModel):
    name: str
    slug: str
    parent_id: Optional[int] = None
    coming_soon: bool = False

# NYTT: En förenklad modell för att bygga länkar (Breadcrumbs/URL)
class CategoryLink(BaseModel):
    name: str
    slug: str
    parent: Optional['CategoryLink'] = None # Rekursiv för att hitta huvudkategorin

    model_config = ConfigDict(from_attributes=True)

class Category(CategoryBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True)

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

    model_config = ConfigDict(from_attributes=True)

# --- PRODUCT SCHEMAS ---
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

# Behövs för att lösa den rekursiva referensen i CategoryLink
CategoryLink.model_rebuild()

# --- OPTIMIZER / BASKET SCHEMAS ---
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