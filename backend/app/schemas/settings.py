"""Pharmacy risk-band settings, in the exact shape the frontend Settings page uses (camelCase)."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic.alias_generators import to_camel

from app.schemas.types import OptionalPhone, Phone


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class ThresholdSettings(CamelModel):
    critical_days: int = Field(ge=1, le=365, description="<= this many days: Critical")
    action_days: int = Field(ge=2, le=730, description="<= this many days: Action Required")
    monitor_days: int = Field(ge=3, le=1095, description="<= this many days: Monitor; beyond it: Safe")
    safe_days: int = Field(ge=3, le=1825, description="Early-advisory alert window (still Safe)")
    enable_90d: bool = Field(default=True, alias="enable90d", description="Early-advisory alerts")
    enable_60d: bool = Field(default=True, alias="enable60d", description="Monitor-band alerts")
    enable_30d: bool = Field(default=True, alias="enable30d", description="Action Required alerts")
    enable_7d: bool = Field(default=True, alias="enable7d", description="Critical alerts")
    enable_0d: bool = Field(default=True, alias="enable0d", description="Expired alerts")

    @model_validator(mode="after")
    def _ordered(self) -> "ThresholdSettings":
        if not (self.critical_days < self.action_days < self.monitor_days <= self.safe_days):
            raise ValueError("Bands must increase: critical < action required < monitor <= advisory (safe) days")
        return self


class PharmacySettings(ThresholdSettings):
    pharmacy_name: str
    license_number: str | None = None
    currency: str
    timezone: str
    low_stock_threshold: int = Field(description="Sellable units at/below which a batch shows as Low Stock")


class NotificationSettingsUpdate(CamelModel):
    """What an admin can change on the Settings > Alerts & notifications card."""

    alert_phone_numbers: list[Phone] = Field(
        default_factory=list, max_length=10,
        description="Extra numbers that receive SMS alerts, e.g. 0241234567 or +233241234567",
    )
    pharmacy_phone: OptionalPhone = Field(default=None, description="Used when no admin has a phone number")
    email_digest_enabled: bool = Field(default=True, description="Daily expiry email to admins")

    @field_validator("alert_phone_numbers")
    @classmethod
    def _dedupe(cls, value: list[str]) -> list[str]:
        return list(dict.fromkeys(value))


class NotificationSettings(NotificationSettingsUpdate):
    admin_phones: list[str] = Field(default_factory=list, description="Admins' own phone numbers (read-only)")
    admin_emails: list[str] = Field(default_factory=list, description="Where alert and digest emails go")
    sms_recipients: list[str] = Field(default_factory=list, description="Everyone who will get SMS alerts")
    sms_mode: str
    sms_provider: str
    email_mode: str
