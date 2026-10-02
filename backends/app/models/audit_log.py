"""
AUDIT_LOG = "who did what, when". Append-only.

The column is named `metadata` in the database, but SQLAlchemy reserves that
word on models, so in Python the attribute is called `extra_data`.
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, JSONType, UUIDPrimaryKeyMixin


class AuditLog(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "audit_logs"
    __table_args__ = (Index("ix_audit_company_created", "company_id", "created_at"),)

    # Nullable: e.g. a failed login has no known company or user.
    company_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("companies.id", ondelete="SET NULL"), index=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    action: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. PRODUCT_CREATED
    entity_type: Mapped[str | None] = mapped_column(String(50))
    entity_id: Mapped[str | None] = mapped_column(String(64))
    extra_data: Mapped[dict | None] = mapped_column("metadata", JSONType)
    ip_address: Mapped[str | None] = mapped_column(String(45))  # fits IPv6
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
