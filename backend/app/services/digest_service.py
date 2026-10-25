"""Daily expiry email digest: one email per admin listing expired and soon-to-expire stock.

Sent automatically after the morning expiry check (when EMAIL_DIGEST_ENABLED and the pharmacy has it switched on),
or on demand from Settings via POST /alerts/send-digest.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.models import AuditAction, Batch, Notification, NotificationChannel, NotificationStatus, Product, WorkflowStatus
from app.services import audit_service
from app.services.alert_service import email_recipients
from app.services.auth_service import get_company
from app.services.email_service import email_enabled, send_email
from app.utils.dates import days_until, today_in_tz, utcnow

logger = get_logger(__name__)


@dataclass
class DigestLine:
    product: str
    batch_number: str
    quantity: int
    expiry_date: str
    days: int
    value: Decimal


@dataclass
class DigestResult:
    sent: int = 0
    failed: int = 0
    skipped_reason: str | None = None
    expired: int = 0
    critical: int = 0
    action_required: int = 0
    recipients: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "sent": self.sent, "failed": self.failed, "skipped_reason": self.skipped_reason,
            "expired": self.expired, "critical": self.critical, "action_required": self.action_required,
            "recipients": self.recipients,
        }


def _money(value: Decimal, currency: str) -> str:
    return f"{currency} {value:,.2f}"


def _section(title: str, lines: list[DigestLine], currency: str) -> list[str]:
    if not lines:
        return []
    total = sum((l.value for l in lines), Decimal("0"))
    out = [f"{title} ({len(lines)} batch{'es' if len(lines) != 1 else ''}, {_money(total, currency)} at cost)"]
    for l in lines:
        when = f"expired {abs(l.days)} day{'s' if abs(l.days) != 1 else ''} ago" if l.days <= 0 else \
            f"{l.days} day{'s' if l.days != 1 else ''} left"
        out.append(f"  - {l.product} | batch {l.batch_number} | {l.quantity} units | expires {l.expiry_date} ({when})")
    out.append("")
    return out


async def build_digest(db: AsyncSession, company_id: uuid.UUID) -> tuple[str, str, DigestResult]:
    """Return (subject, body, counts) for the pharmacy's current expiry position."""
    company = await get_company(db, company_id)
    today = today_in_tz(company.timezone)
    horizon = today + timedelta(days=company.action_days)
    rows = (
        await db.execute(
            select(Batch, Product)
            .join(Product, Product.id == Batch.product_id)
            .where(
                Batch.company_id == company_id,
                Batch.remaining_quantity > 0,
                Batch.workflow_status == WorkflowStatus.ACTIVE,
                Product.is_active.is_(True),
                Batch.expiry_date <= horizon,
            )
            .order_by(Batch.expiry_date, Product.name)
        )
    ).all()

    expired: list[DigestLine] = []
    critical: list[DigestLine] = []
    action: list[DigestLine] = []
    for batch, product in rows:
        days = days_until(batch.expiry_date, today)
        line = DigestLine(
            product=product.name, batch_number=batch.batch_number, quantity=batch.remaining_quantity,
            expiry_date=batch.expiry_date.isoformat(), days=days,
            value=(product.cost_price or Decimal("0")) * batch.remaining_quantity,
        )
        if days <= 0:
            expired.append(line)
        elif days <= company.critical_days:
            critical.append(line)
        else:
            action.append(line)

    counts = DigestResult(expired=len(expired), critical=len(critical), action_required=len(action))
    date_label = today.strftime("%a %d %b %Y")
    if not rows:
        subject = f"[ExpireGuard] {company.name}: no expiring stock ({date_label})"
        body_lines = [
            f"Good morning from ExpireGuard, {company.name}.",
            "",
            f"Nothing is expired or expiring within {company.action_days} days. No action needed today.",
        ]
    else:
        subject = (
            f"[ExpireGuard] {company.name}: {len(expired)} expired, {len(critical)} critical, "
            f"{len(action)} need action ({date_label})"
        )
        body_lines = [
            f"Good morning from ExpireGuard, {company.name}.",
            "",
            "Here is today's expiry position:",
            "",
            *_section("EXPIRED: remove from shelves, quarantine or dispose", expired, company.currency),
            *_section(f"CRITICAL: expires within {company.critical_days} days, dispense first (FEFO)", critical,
                      company.currency),
            *_section(f"ACTION REQUIRED: expires within {company.action_days} days, plan returns or promotions",
                      action, company.currency),
            "Open ExpireGuard to quarantine, return, dispose of or acknowledge these batches.",
        ]
    body_lines += [
        "",
        "You receive this daily email because you are an administrator of this pharmacy in ExpireGuard. "
        "An admin can switch it off in Settings > Alerts & Notifications.",
    ]
    return subject, "\n".join(body_lines), counts


async def send_expiry_digest(db: AsyncSession, company_id: uuid.UUID, *, manual: bool = False) -> DigestResult:
    """Email the digest to every admin. Scheduled runs skip pharmacies with nothing to report."""
    if not email_enabled():
        return DigestResult(skipped_reason="Email is turned off (EMAIL_MODE=off)")
    company = await get_company(db, company_id)
    if not manual and not (settings.EMAIL_DIGEST_ENABLED and company.email_digest_enabled):
        return DigestResult(skipped_reason="The daily expiry email is switched off")

    subject, body, result = await build_digest(db, company_id)
    if not manual and result.expired + result.critical + result.action_required == 0:
        result.skipped_reason = "Nothing expired or expiring soon"
        return result

    addresses = await email_recipients(db, company_id)
    if not addresses:
        result.skipped_reason = "No admin email address found"
        return result
    for address in addresses:
        notification = Notification(
            company_id=company_id, alert_id=None, channel=NotificationChannel.EMAIL, recipient=address,
            subject=subject[:255], message=body, status=NotificationStatus.PENDING, attempts=1,
        )
        db.add(notification)
        await db.flush()
        sent = await send_email(address, subject, body)
        notification.provider = sent.provider
        if sent.success:
            notification.status = NotificationStatus.SENT
            notification.provider_message_id = sent.message_id
            notification.sent_at = utcnow()
            result.sent += 1
        else:
            notification.status = NotificationStatus.FAILED
            notification.error_message = (sent.error or "Unknown error")[:1000]
            result.failed += 1
        result.recipients.append(address)
        audit_service.record(
            db, action=AuditAction.EMAIL_SENT if sent.success else AuditAction.EMAIL_FAILED,
            company_id=company_id, entity_type="notification", entity_id=notification.id,
            metadata={"digest": True, "manual": manual, "error": sent.error},
        )
    await db.commit()
    logger.info("Expiry digest for company %s: sent=%d failed=%d", company_id, result.sent, result.failed)
    return result
