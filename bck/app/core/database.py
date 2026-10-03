"""
Database engine and session setup (async SQLAlchemy 2.x).

WHY: One engine for the whole app; each request gets its own short-lived
session. The naming convention below gives every constraint a predictable
name, which makes Alembic migrations reliable.
"""
from sqlalchemy import MetaData
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Every model inherits from this."""
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,  # drop dead connections quietly
)

# expire_on_commit=False: objects stay readable after commit (needed in async code).
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# ---- Reusable column groups (mixins) ----
# WHY: every table needs an id and timestamps. Writing them once avoids
# copy-paste mistakes. We use UUIDs so ids can't be guessed (/products/1, /2...),
# which is a small but real security win for multi-company data.
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column


class UUIDPrimaryKeyMixin:
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


# JSON column that is plain JSON on any database but fast JSONB on PostgreSQL.
# WHY: we store flexible data (AI evidence, import errors) without extra tables.
from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB

JSONType = JSON().with_variant(JSONB(), "postgresql")
