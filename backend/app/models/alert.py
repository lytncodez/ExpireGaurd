"""Alert ORM model - tracks expiry alerts"""

import enum
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum as SQLEnum, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class AlertType(str, enum.Enum):
    """Alert types"""
    EXPIRING_SOON = "EXPIRING_SOON"
    CRITICAL = "CRITICAL"
    EXPIRED = "EXPIRED"


class AlertSeverity(str, enum.Enum):
    """Alert severity levels"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class SMSStatus(str, enum.Enum):
    """SMS delivery status"""
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    alert_type = Column(SQLEnum(AlertType), nullable=False, index=True)
    severity = Column(SQLEnum(AlertSeverity), nullable=False, default=AlertSeverity.LOW, index=True)
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False, index=True)
    recipient_phone = Column(String, nullable=True)
    sms_status = Column(SQLEnum(SMSStatus), default=SMSStatus.PENDING, index=True)
    sms_sent = Column(Boolean, default=False)
    sms_sent_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    sms_error = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    batch = relationship("Batch", back_populates="alerts")
