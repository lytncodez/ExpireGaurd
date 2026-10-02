"""Product ORM model"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, index=True, nullable=False)
    sku = Column(String, unique=True, index=True, nullable=False)
    barcode = Column(String, nullable=True)
    category = Column(String, nullable=True)
    brand = Column(String, nullable=True)
    unit = Column(String, nullable=True, default="pieces")
    selling_price = Column(Float, default=0.0)
    cost_price = Column(Float, default=0.0)
    unit_price = Column(Float, default=0.0)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def price(self):
        return self.selling_price or self.unit_price or 0.0

    # Relationships
    user = relationship("User", back_populates="products")
    batches = relationship("Batch", back_populates="product", cascade="all, delete-orphan")
    sales = relationship("Sale", back_populates="product", cascade="all, delete-orphan")
