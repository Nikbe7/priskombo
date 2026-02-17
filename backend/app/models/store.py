from sqlalchemy import Column, Integer, String, Float
from sqlalchemy.orm import relationship
from app.db.session import Base

class Store(Base):
    __tablename__ = "stores"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    base_shipping = Column(Float, default=0.0)
    free_shipping_limit = Column(Float, nullable=True)
    prices = relationship("ProductPrice", back_populates="store")
    affiliate_network = Column(String)
    affiliate_program_id = Column(String)
