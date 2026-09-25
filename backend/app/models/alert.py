"""Alert ORM model - tracks expiry alerts"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.core.database import Base


class AlertType(str, enum.Enum):
    """Alert types"""
    EXPIRING_SOON = "EXPIRING_SOON"
    CRITICAL = "CRITICAL"
    EXPIRED = "EXPIRED"


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    alert_type = Column(SQLEnum(AlertType), nullable=False, index=True)
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    batch = relationship("Batch", back_populates="alerts")
