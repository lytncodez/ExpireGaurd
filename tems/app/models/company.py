"""
COMPANY = one business using ExpireGuard.

WHY it matters: almost every other table points back to a company.
That `company_id` is how we guarantee one business can never see another's data.
"""
import uuid  # noqa: F401  (kept for type hints in relationships)

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Company(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "companies"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(30))
    address: Mapped[str | None] = mapped_column(Text)
    currency: Mapped[str] = mapped_column(String(3), default="GHS", nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), default="Africa/Accra", nullable=False)

    users: Mapped[list["User"]] = relationship(back_populates="company", cascade="all, delete-orphan")
    categories: Mapped[list["Category"]] = relationship(back_populates="company", cascade="all, delete-orphan")
    products: Mapped[list["Product"]] = relationship(back_populates="company", cascade="all, delete-orphan")
