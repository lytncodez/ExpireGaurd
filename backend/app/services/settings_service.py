"""Read and update the pharmacy's risk bands (stored on the company row)."""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import AuditAction, Company, User
from app.schemas.settings import (
    NotificationSettings,
    NotificationSettingsUpdate,
    PharmacySettings,
    ThresholdSettings,
)
from app.services import audit_service
from app.services.auth_service import get_company

# frontend toggle -> company column
TOGGLES = {
    "enable_0d": "alert_expired",
    "enable_7d": "alert_critical",
    "enable_30d": "alert_action",
    "enable_60d": "alert_monitor",
    "enable_90d": "alert_advisory",
}


def to_settings(company: Company) -> PharmacySettings:
    return PharmacySettings(
        critical_days=company.critical_days,
        action_days=company.action_days,
        monitor_days=company.monitor_days,
        safe_days=company.advisory_days,
        **{toggle: getattr(company, column) for toggle, column in TOGGLES.items()},
        pharmacy_name=company.name,
        license_number=company.license_number,
        currency=company.currency,
        timezone=company.timezone,
        low_stock_threshold=settings.LOW_STOCK_THRESHOLD,
    )


async def get_settings(db: AsyncSession, company_id: uuid.UUID) -> PharmacySettings:
    return to_settings(await get_company(db, company_id))


async def update_thresholds(
    db: AsyncSession, user: User, data: ThresholdSettings, ip: str | None
) -> PharmacySettings:
    """Save new bands and immediately re-run the expiry check so statuses and alerts follow them."""
    from app.services.expiry_service import run_expiry_check

    company = await get_company(db, user.company_id)
    company.critical_days = data.critical_days
    company.action_days = data.action_days
    company.monitor_days = data.monitor_days
    company.advisory_days = data.safe_days
    for toggle, column in TOGGLES.items():
        setattr(company, column, getattr(data, toggle))
    audit_service.record(
        db, action=AuditAction.SETTINGS_UPDATED, company_id=company.id, user_id=user.id,
        entity_type="company", entity_id=company.id, metadata=data.model_dump(by_alias=True), ip_address=ip,
    )
    await db.commit()
    await run_expiry_check(db, company.id, actor_id=user.id)
    await db.refresh(company)
    return to_settings(company)


async def get_notification_settings(db: AsyncSession, company_id: uuid.UUID) -> NotificationSettings:
    from sqlalchemy import select

    from app.models import UserRole
    from app.services.alert_service import email_recipients, recipients

    company = await get_company(db, company_id)
    admin_phones = (
        await db.scalars(
            select(User.phone_number).where(
                User.company_id == company_id, User.is_active.is_(True), User.role == UserRole.ADMIN,
                User.phone_number.is_not(None),
            )
        )
    ).all()
    return NotificationSettings(
        alert_phone_numbers=list(company.alert_phones or []),
        pharmacy_phone=company.phone,
        email_digest_enabled=company.email_digest_enabled,
        admin_phones=[p for p in admin_phones if p],
        admin_emails=await email_recipients(db, company_id),
        sms_recipients=await recipients(db, company_id),
        sms_mode=settings.SMS_MODE,
        sms_provider=settings.SMS_PROVIDER,
        email_mode=settings.EMAIL_MODE,
    )


async def update_notification_settings(
    db: AsyncSession, user: User, data: NotificationSettingsUpdate, ip: str | None
) -> NotificationSettings:
    company = await get_company(db, user.company_id)
    sent = data.model_fields_set  # only change what the client sent
    if "alert_phone_numbers" in sent:
        company.alert_phones = list(data.alert_phone_numbers)
    if "pharmacy_phone" in sent:
        company.phone = data.pharmacy_phone
    if "email_digest_enabled" in sent:
        company.email_digest_enabled = data.email_digest_enabled
    audit_service.record(
        db, action=AuditAction.SETTINGS_UPDATED, company_id=company.id, user_id=user.id,
        entity_type="company", entity_id=company.id,
        metadata={"notifications": data.model_dump(by_alias=True)}, ip_address=ip,
    )
    await db.commit()
    return await get_notification_settings(db, company.id)
