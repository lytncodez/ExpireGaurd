"""Alert ORM model - tracks expiry alerts with SMS delivery status"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.core.database import Base


class AlertType(str, enum.Enum):
    """Alert types based on expiry status"""
    EXPIRING_SOON = "EXPIRING_SOON"      # 31-90 days
    CRITICAL = "CRITICAL"                # 1-30 days
    EXPIRED = "EXPIRED"                  # 0 or less days


class AlertSeverity(str, enum.Enum):
    """Alert severity levels"""
    LOW = "LOW"                          # EXPIRING_SOON
    MEDIUM = "MEDIUM"                    # CRITICAL
    HIGH = "HIGH"                        # EXPIRED


class SMSStatus(str, enum.Enum):
    """SMS delivery status"""
    PENDING = "PENDING"                  # Not sent yet
    SENT = "SENT"                        # Successfully sent
    FAILED = "FAILED"                    # Failed to send
    SKIPPED = "SKIPPED"                  # Mock mode or no phone


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False, index=True)
    alert_type = Column(SQLEnum(AlertType), nullable=False, index=True)
    severity = Column(SQLEnum(AlertSeverity), nullable=False, index=True)
    message = Column(String, nullable=False)
    
    # SMS fields
    recipient_phone = Column(String, nullable=True)  # Phone number to send SMS to
    sms_status = Column(SQLEnum(SMSStatus), default=SMSStatus.PENDING, index=True)
    sms_sent = Column(Boolean, default=False, index=True)
    sms_sent_at = Column(DateTime, nullable=True)
    sms_error = Column(String, nullable=True)  # Error message if SMS failed
    
    # Alert status
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    batch = relationship("Batch", back_populates="alerts")

    def __repr__(self):
        return f"<Alert {self.id}: {self.alert_type.value} - {self.sms_status.value}>"
