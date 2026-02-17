from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from app.db.session import Base
from datetime import datetime, timezone

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    ean = Column(String, unique=True, index=True)
    name = Column(String, index=True)
    brand = Column(String, index=True, nullable=True)
    slug = Column(String, unique=True, index=True)
    image_url = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    
    popularity_score = Column(Integer, default=0)
    rating = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    category = relationship("Category", back_populates="products")
    prices = relationship("ProductPrice", back_populates="product")

class ProductPrice(Base):
    __tablename__ = "product_prices"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    store_id = Column(Integer, ForeignKey("stores.id"))
    price = Column(Float)
    regular_price = Column(Float, nullable=True)
    discount_percent = Column(Integer, default=0)
    url = Column(Text)
    updated_at = Column(DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    product = relationship("Product", back_populates="prices")
    store = relationship("Store", back_populates="prices")
