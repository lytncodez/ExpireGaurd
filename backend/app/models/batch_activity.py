"""Per-batch activity history shown in the frontend (who did what, when)."""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Index, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, CreatedAtMixin, UUIDPrimaryKeyMixin


class BatchActivity(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "batch_activities"
    __table_args__ = (Index("ix_batch_activities_batch_created", "batch_id", "created_at"),)

    company_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    batch_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("batches.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    actor_name: Mapped[str] = mapped_column(String(200), nullable=False)
    action: Mapped[str] = mapped_column(String(200), nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
