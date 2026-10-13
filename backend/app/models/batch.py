"""Batches (lots) of a product, each with its own expiry date, quantity and handling workflow."""

from __future__ import annotations

import enum
import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.user import str_enum


class BatchStatus(str, enum.Enum):
    """Expiry risk band, recalculated by the expiry engine (company thresholds)."""

    SAFE = "SAFE"
    MONITOR = "MONITOR"
    ACTION_REQUIRED = "ACTION_REQUIRED"
    CRITICAL = "CRITICAL"
    EXPIRED = "EXPIRED"
    DEPLETED = "DEPLETED"


class WorkflowStatus(str, enum.Enum):
    """Physical handling state, set by staff actions. Only ACTIVE stock can be dispensed."""

    ACTIVE = "ACTIVE"
    QUARANTINED = "QUARANTINED"
    PENDING_RETURN = "PENDING_RETURN"
    DISPOSED = "DISPOSED"


class WorkflowReason(str, enum.Enum):
    EXPIRED = "Expired"
    DAMAGED = "Damaged"
    SUPPLIER_RETURN = "Supplier Return"
    OTHER = "Other"


class Batch(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "batches"
    __table_args__ = (
        UniqueConstraint("product_id", "batch_number", name="uq_batches_product_batch_number"),
        CheckConstraint("initial_quantity >= 0", name="initial_quantity_non_negative"),
        CheckConstraint(
            "manufacturing_date IS NULL OR expiry_date >= manufacturing_date", name="expiry_after_manufacturing"
        ),
        Index("ix_batches_company_status", "company_id", "status"),
        Index("ix_batches_company_expiry", "company_id", "expiry_date"),
    )

    # company_id is denormalised from product for strict, cheap tenant isolation.
    company_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    batch_number: Mapped[str] = mapped_column(String(64), nullable=False)
    manufacturing_date: Mapped[date | None] = mapped_column(Date)
    expiry_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    initial_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    remaining_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[BatchStatus] = mapped_column(str_enum(BatchStatus, 20), nullable=False, default=BatchStatus.SAFE)

    # Receiving details (admin-only in the API: dispensers never see supplier or receipt date)
    supplier: Mapped[str | None] = mapped_column(String(200))
    storage_location: Mapped[str | None] = mapped_column(String(120))
    date_received: Mapped[date | None] = mapped_column(Date)

    # Handling workflow
    workflow_status: Mapped[WorkflowStatus] = mapped_column(
        str_enum(WorkflowStatus, 20), nullable=False, default=WorkflowStatus.ACTIVE, server_default="ACTIVE"
    )
    quarantine_reason: Mapped[WorkflowReason | None] = mapped_column(str_enum(WorkflowReason, 20))
    acknowledged_by: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    acknowledged_by_name: Mapped[str | None] = mapped_column(String(200))
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # {"status","note","actorId","actorName","at","closedBy","closedAt","resolutionNote"}
    admin_flag: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    # {"status","supplierName","supplierBatchNo","requestedBy","requestedAt","note","processedBy","processedAt"}
    supplier_return: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    # {"reason","quantity","actorId","actorName","at","note"}
    disposal: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
