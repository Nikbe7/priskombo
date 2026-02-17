from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship, backref
from app.db.session import Base

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    slug = Column(String, unique=True, index=True)
    
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    coming_soon = Column(Boolean, default=False)
    
    children = relationship("Category", 
                          backref=backref('parent', remote_side=[id]),
                          cascade="all, delete-orphan")
    products = relationship("Product", back_populates="category")
