from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    
    # Relation: En kategori har många produkter
    products = relationship("Product", back_populates="category")

class Store(Base):
    __tablename__ = "stores"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    base_shipping = Column(Float, default=0.0)
    free_shipping_limit = Column(Float, nullable=True)
    
    # Relation: En butik har många priser
    prices = relationship("ProductPrice", back_populates="store")

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    ean = Column(String, unique=True, index=True)
    name = Column(String)
    image_url = Column(Text, nullable=True)
    
    # Koppling till Kategori (kan vara null om vi inte vet kategorin än)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    category = relationship("Category", back_populates="products")

    # Relation: En produkt har många priser (ett från varje butik)
    prices = relationship("ProductPrice", back_populates="product")

class ProductPrice(Base):
    __tablename__ = "product_prices"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    store_id = Column(Integer, ForeignKey("stores.id"))
    price = Column(Float, nullable=False)
    url = Column(Text)
    updated_at = Column(DateTime, default=datetime.utcnow)

    # Relationer
    product = relationship("Product", back_populates="prices")
    store = relationship("Store", back_populates="prices")