"""
ALERT = a warning about a batch/product (e.g. "Batch A1234 expires in 12 days").

DUPLICATE PREVENTION lives in the database itself: the partial unique index
below allows only ONE unresolved alert per (batch, alert_type). Even if the
expiry job runs 100 times, it can't create the same open alert twice.
Once an alert is resolved, a new one of that type may be created again.
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, Integer, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, UUIDPrimaryKeyMixin


class AlertType(str, enum.Enum):
    EXPIRING_SOON = "EXPIRING_SOON"
    CRITICAL_EXPIRY = "CRITICAL_EXPIRY"
    EXPIRED = "EXPIRED"
    LOW_STOCK = "LOW_STOCK"
    OVERSTOCK = "OVERSTOCK"
    UNUSUAL_STOCK = "UNUSUAL_STOCK"
    IMPORT_ERROR = "IMPORT_ERROR"
    SYSTEM_ERROR = "SYSTEM_ERROR"


class AlertSeverity(str, enum.Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"
    URGENT = "URGENT"


class Alert(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "alerts"
    __table_args__ = (
        Index(
            "uq_alerts_open_batch_type",
            "batch_id",
            "alert_type",
            unique=True,
            postgresql_where=text("is_resolved = false"),
            sqlite_where=text("is_resolved = 0"),
        ),
        Index("ix_alerts_company_resolved", "company_id", "is_resolved"),
        Index("ix_alerts_company_created", "company_id", "created_at"),
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    batch_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("batches.id", ondelete="CASCADE"), index=True
    )
    alert_type: Mapped[AlertType] = mapped_column(
        Enum(AlertType, native_enum=False, length=30), nullable=False
    )
    severity: Mapped[AlertSeverity] = mapped_column(
        Enum(AlertSeverity, native_enum=False, length=20), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    days_remaining: Mapped[int | None] = mapped_column(Integer)
    quantity_at_risk: Mapped[int | None] = mapped_column(Integer)
    recipient_phone: Mapped[str | None] = mapped_column(String(30))
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sms_sent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sms_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    sms_error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    product: Mapped["Product | None"] = relationship()
    batch: Mapped["Batch | None"] = relationship()
