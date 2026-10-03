"""
BATCH = one specific delivery/lot of a product, with its own expiry date.

Example: Product "Yoghurt 500ml" can have batch A1234 (expires June) and
batch B5678 (expires August). Expiry is tracked per batch, not per product.
"""
import enum
import uuid
from datetime import date

from sqlalchemy import CheckConstraint, Date, Enum, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin


class BatchStatus(str, enum.Enum):
    SAFE = "SAFE"
    EXPIRING_SOON = "EXPIRING_SOON"
    CRITICAL = "CRITICAL"
    EXPIRED = "EXPIRED"


class Batch(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "batches"
    __table_args__ = (
        UniqueConstraint("product_id", "batch_number", name="uq_batches_product_batch_number"),
        CheckConstraint(
            "manufacturing_date IS NULL OR expiry_date >= manufacturing_date",
            name="ck_batches_expiry_after_manufacturing",
        ),
        CheckConstraint("initial_quantity >= 0", name="ck_batches_initial_qty_nonneg"),
        CheckConstraint("remaining_quantity >= 0", name="ck_batches_remaining_qty_nonneg"),
        Index("ix_batches_expiry_date", "expiry_date"),
        Index("ix_batches_status", "status"),
    )

    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    batch_number: Mapped[str] = mapped_column(String(64), nullable=False)
    manufacturing_date: Mapped[date | None] = mapped_column(Date)
    expiry_date: Mapped[date] = mapped_column(Date, nullable=False)
    initial_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    # Safety net: the database refuses negative stock, even if code has a bug.
    remaining_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[BatchStatus] = mapped_column(
        Enum(BatchStatus, native_enum=False, length=20), default=BatchStatus.SAFE, nullable=False
    )

    product: Mapped["Product"] = relationship(back_populates="batches")
