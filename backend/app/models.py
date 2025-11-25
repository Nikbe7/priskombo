from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    ean = Column(String, unique=True, index=True)
    name = Column(String)
    image_url = Column(Text, nullable=True)
    
    # Relation: En produkt kan ha många priser
    prices = relationship("ProductPrice", back_populates="product")

class Store(Base):
    __tablename__ = "stores"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    base_shipping = Column(Float, default=0.0)
    free_shipping_limit = Column(Float, nullable=True)

class ProductPrice(Base):
    __tablename__ = "product_prices"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Kopplingar (Foreign Keys)
    product_id = Column(Integer, ForeignKey("products.id"))
    store_id = Column(Integer, ForeignKey("stores.id"))
    
    price = Column(Float)
    url = Column(Text)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationer för att kunna skriva price.store.name i koden sen
    product = relationship("Product", back_populates="prices")
    store = relationship("Store")