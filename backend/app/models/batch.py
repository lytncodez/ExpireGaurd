"""Batch ORM model - represents stock batches with expiry dates"""

from sqlalchemy import Column, Integer, String, DateTime, Date, Float, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime, date
import enum

from app.core.database import Base


class ExpiryStatus(str, enum.Enum):
    """Expiry status enum"""
    SAFE = "SAFE"  # > 90 days
    EXPIRING_SOON = "EXPIRING_SOON"  # 31-90 days
    CRITICAL = "CRITICAL"  # 1-30 days
    EXPIRED = "EXPIRED"  # <= 0 days


class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    batch_number = Column(String, index=True, nullable=False)
    quantity_received = Column(Float, nullable=False)
    quantity_remaining = Column(Float, nullable=False)
    expiry_date = Column(Date, nullable=False, index=True)
    status = Column(SQLEnum(ExpiryStatus), default=ExpiryStatus.SAFE, index=True)
    days_remaining = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    product = relationship("Product", back_populates="batches")
    alerts = relationship("Alert", back_populates="batch", cascade="all, delete-orphan")
