"""CATEGORY = a grouping of products (e.g. Dairy, Beverages). Scoped per company."""
import uuid

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Category(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "categories"
    # Two companies may both have "Dairy", but one company can't have it twice.
    __table_args__ = (UniqueConstraint("company_id", "name", name="uq_categories_company_name"),)

    company_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    company: Mapped["Company"] = relationship(back_populates="categories")
    products: Mapped[list["Product"]] = relationship(back_populates="category")
