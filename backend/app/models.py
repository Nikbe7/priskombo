from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, DateTime, Boolean
from sqlalchemy.orm import relationship, backref
from app.database import Base
from datetime import datetime

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    
    # --- NYTT HÄR ---
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    coming_soon = Column(Boolean, default=False)
    
    # Relation för att hitta underkategorier
    children = relationship("Category", 
                          backref=backref('parent', remote_side=[id]),
                          cascade="all, delete-orphan")
    # ----------------

    products = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    ean = Column(String, unique=True, index=True)
    name = Column(String)
    image_url = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    
    # Sortering
    popularity_score = Column(Integer, default=0)
    rating = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    category = relationship("Category", back_populates="products")
    prices = relationship("ProductPrice", back_populates="product")

class Store(Base):
    __tablename__ = "stores"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    base_shipping = Column(Float, default=0.0)
    free_shipping_limit = Column(Float, nullable=True)
    prices = relationship("ProductPrice", back_populates="store")

class ProductPrice(Base):
    __tablename__ = "product_prices"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    store_id = Column(Integer, ForeignKey("stores.id"))
    price = Column(Float)
    regular_price = Column(Float, nullable=True)
    url = Column(Text)
    updated_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="prices")
    store = relationship("Store", back_populates="prices")