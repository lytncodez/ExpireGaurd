"""Files (Excel / CSV) a user shared with the AI assistant.

Each upload is parsed, classified (inventory / sales history / other) and summarised. The user then chooses to
import it as stock (inventory files) or keep it for analysis; kept files feed the AI context and the forecast.
"""

from __future__ import annotations

import enum
import uuid
from typing import Any

from sqlalchemy import ForeignKey, Index, Integer, LargeBinary, String, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.user import str_enum


class DatasetKind(str, enum.Enum):
    INVENTORY = "INVENTORY"
    SALES_HISTORY = "SALES_HISTORY"
    OTHER = "OTHER"


class DatasetStatus(str, enum.Enum):
    PENDING = "PENDING"  # uploaded, waiting for the user's choice
    KEPT = "KEPT"  # kept for analysis (used by the AI and the forecast)
    IMPORTED = "IMPORTED"  # imported into stock (and still available for analysis)


class AIDataset(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "ai_datasets"
    __table_args__ = (Index("ix_ai_datasets_company_created", "company_id", "created_at"),)

    company_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(8), nullable=False)  # csv | xlsx
    kind: Mapped[DatasetKind] = mapped_column(str_enum(DatasetKind, 16), nullable=False)
    status: Mapped[DatasetStatus] = mapped_column(
        str_enum(DatasetStatus, 16), nullable=False, default=DatasetStatus.PENDING, server_default="PENDING"
    )
    row_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    columns: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    # Parsed rows as strings (capped), used for analysis and the forecast
    rows: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False, default=list)
    summary: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    # Original bytes, kept so an inventory file can be imported later; cleared after import
    content: Mapped[bytes | None] = mapped_column(LargeBinary)
    import_job_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("import_jobs.id", ondelete="SET NULL"))
