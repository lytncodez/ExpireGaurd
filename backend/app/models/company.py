"""Company = the pharmacy. Holds facility details and the editable expiry risk bands."""

from __future__ import annotations

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Company(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "companies"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(32))
    address: Mapped[str | None] = mapped_column(Text)
    license_number: Mapped[str | None] = mapped_column(String(100))
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="GHS", server_default="GHS")
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="Africa/Accra", server_default="UTC")

    # Risk bands (days to expiry). <=0 Expired, <=critical Critical, <=action Action Required,
    # <=monitor Monitor, otherwise Safe. advisory = early-advisory alert window inside Safe.
    critical_days: Mapped[int] = mapped_column(Integer, nullable=False, default=7, server_default="7")
    action_days: Mapped[int] = mapped_column(Integer, nullable=False, default=30, server_default="30")
    monitor_days: Mapped[int] = mapped_column(Integer, nullable=False, default=60, server_default="60")
    advisory_days: Mapped[int] = mapped_column(Integer, nullable=False, default=90, server_default="90")
    # Which bands raise alerts (frontend toggles enable0d/7d/30d/60d/90d).
    alert_expired: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    alert_critical: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    alert_action: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    alert_monitor: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    alert_advisory: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
