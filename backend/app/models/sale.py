"""Sales ORM model for inventory movement and analytics."""

from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.core.database import Base


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    sold_at = Column(DateTime, default=datetime.utcnow, index=True)

    product = relationship("Product", back_populates="sales")
