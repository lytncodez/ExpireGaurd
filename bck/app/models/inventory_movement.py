"""
INVENTORY_MOVEMENT = an append-only ledger of every stock change.

`quantity` is SIGNED: positive = stock in (PURCHASE, RETURN),
negative = stock out (SALE, EXPIRED, DAMAGED). Rows are never edited,
so history can always be traced and audited.
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, UUIDPrimaryKeyMixin


class MovementType(str, enum.Enum):
    PURCHASE = "PURCHASE"
    SALE = "SALE"
    RETURN = "RETURN"
    ADJUSTMENT = "ADJUSTMENT"
    EXPIRED = "EXPIRED"
    DAMAGED = "DAMAGED"
    TRANSFER = "TRANSFER"


class InventoryMovement(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "inventory_movements"
    __table_args__ = (Index("ix_movements_product_created", "product_id", "created_at"),)

    # RESTRICT: you can't delete a product that has stock history.
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    batch_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("batches.id", ondelete="RESTRICT"), index=True
    )
    movement_type: Mapped[MovementType] = mapped_column(
        Enum(MovementType, native_enum=False, length=20), nullable=False
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    # Points to what caused it, e.g. reference_type="SALE", reference_id=<sale id>.
    reference_type: Mapped[str | None] = mapped_column(String(30))
    reference_id: Mapped[uuid.UUID | None] = mapped_column(Uuid)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    product: Mapped["Product"] = relationship()
    batch: Mapped["Batch | None"] = relationship()
