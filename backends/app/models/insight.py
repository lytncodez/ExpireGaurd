"""
INSIGHT = an AI-written (or rule-based) finding, with the evidence behind it.

`supporting_data` stores the verified numbers the insight is based on,
so every claim can be checked against real analytics.
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, JSONType, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.alert import AlertSeverity


class InsightCategory(str, enum.Enum):
    EXPIRY = "EXPIRY"
    INVENTORY = "INVENTORY"
    SALES = "SALES"
    PRODUCT_PERFORMANCE = "PRODUCT_PERFORMANCE"
    ANOMALY = "ANOMALY"
    WASTE_RISK = "WASTE_RISK"
    STOCK_RISK = "STOCK_RISK"
    RECOMMENDATION = "RECOMMENDATION"


class Insight(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "insights"
    __table_args__ = (Index("ix_insights_company_created", "company_id", "created_at"),)

    company_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL"), index=True
    )
    batch_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("batches.id", ondelete="SET NULL"), index=True
    )
    category: Mapped[InsightCategory] = mapped_column(
        Enum(InsightCategory, native_enum=False, length=30), nullable=False
    )
    severity: Mapped[AlertSeverity] = mapped_column(
        Enum(AlertSeverity, native_enum=False, length=20), default=AlertSeverity.INFO, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[str | None] = mapped_column(Text)
    recommendation: Mapped[str | None] = mapped_column(Text)
    supporting_data: Mapped[dict | list | None] = mapped_column(JSONType)
    ai_provider: Mapped[str | None] = mapped_column(String(30))
    ai_model: Mapped[str | None] = mapped_column(String(80))
