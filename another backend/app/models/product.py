"""
PRODUCT = something the business sells (the *kind* of item, not a specific delivery).
A specific delivery with an expiry date is a BATCH (added later).

Uniqueness is per company: two companies can use the same SKU or barcode.
NULL values are allowed (not every product has a barcode), and Postgres
treats NULLs as different, so many products can have no barcode.
"""
import uuid
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Index, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Product(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "products"
    __table_args__ = (
        UniqueConstraint("company_id", "sku", name="uq_products_company_sku"),
        UniqueConstraint("company_id", "barcode", name="uq_products_company_barcode"),
        CheckConstraint("selling_price >= 0", name="ck_products_selling_price_nonneg"),
        CheckConstraint("cost_price >= 0", name="ck_products_cost_price_nonneg"),
        Index("ix_products_company_name", "company_id", "name"),
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # If a category is deleted, products stay but become uncategorised.
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    sku: Mapped[str | None] = mapped_column(String(64))
    barcode: Mapped[str | None] = mapped_column(String(64), index=True)  # fast scanner lookups
    brand: Mapped[str | None] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text)
    unit: Mapped[str] = mapped_column(String(30), default="unit", nullable=False)
    # Numeric (not float) so money never gets rounding errors.
    selling_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    cost_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    company: Mapped["Company"] = relationship(back_populates="products")
    category: Mapped["Category | None"] = relationship(back_populates="products")
    batches: Mapped[list["Batch"]] = relationship(back_populates="product", cascade="all, delete-orphan")
