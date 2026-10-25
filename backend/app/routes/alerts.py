import uuid

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from app.core.exceptions import error_responses
from app.dependencies.auth import AdminUser, StaffUser
from app.dependencies.database import DbSession
from app.models import AlertSeverity, AlertType
from app.schemas import Page
from app.schemas.alerts import AlertRead, TestEmailRequest, TestSMSRequest
from app.schemas.notifications import NotificationRead
from app.services import alert_service, notification_service
from app.utils.helpers import client_ip
from app.utils.pagination import PageParams, page_meta, page_params

router = APIRouter(prefix="/alerts", tags=["Alerts"])


async def _page(user, db, params, **filters) -> Page[AlertRead]:
    items, total = await alert_service.list_alerts(db, user.company_id, params, **filters)
    return Page(items=[AlertRead.model_validate(a) for a in items], **page_meta(total, params))


@router.get("", response_model=Page[AlertRead], summary="List alerts",
            description="Newest first. Filter by type, severity, read and resolved state.",
            responses=error_responses(401, 422))
async def list_alerts(
    user: StaffUser, db: DbSession, params: PageParams = Depends(page_params),
    alert_type: AlertType | None = None, severity: AlertSeverity | None = None,
    is_read: bool | None = None, is_resolved: bool | None = None, product_id: uuid.UUID | None = None,
) -> Page[AlertRead]:
    return await _page(
        user, db, params, alert_types=[alert_type] if alert_type else None, severity=severity,
        is_read=is_read, is_resolved=is_resolved, product_id=product_id,
    )


@router.get("/critical", response_model=Page[AlertRead], summary="Open critical-expiry alerts",
            description="Unresolved CRITICAL_EXPIRY alerts.", responses=error_responses(401))
async def critical_alerts(user: StaffUser, db: DbSession, params: PageParams = Depends(page_params)) -> Page[AlertRead]:
    return await _page(user, db, params, alert_types=[AlertType.CRITICAL_EXPIRY], is_resolved=False)


@router.get("/expired", response_model=Page[AlertRead], summary="Open expired alerts",
            description="Unresolved EXPIRED alerts.", responses=error_responses(401))
async def expired_alerts(user: StaffUser, db: DbSession, params: PageParams = Depends(page_params)) -> Page[AlertRead]:
    return await _page(user, db, params, alert_types=[AlertType.EXPIRED], is_resolved=False)


@router.get("/expiring-soon", response_model=Page[AlertRead], summary="Open expiring-soon alerts",
            description="Unresolved EXPIRING_SOON alerts.", responses=error_responses(401))
async def expiring_soon_alerts(
    user: StaffUser, db: DbSession, params: PageParams = Depends(page_params)
) -> Page[AlertRead]:
    return await _page(user, db, params, alert_types=[AlertType.EXPIRING_SOON], is_resolved=False)


@router.post("/test-sms", response_model=NotificationRead, summary="Send a test SMS",
             description="Sends through the configured provider (mock or live) and records a notification. "
                         "A provider failure is returned as status FAILED with error_message, not as an HTTP error. "
                         "ADMIN.",
             responses=error_responses(401, 403, 422))
async def test_sms(data: TestSMSRequest, user: AdminUser, db: DbSession) -> NotificationRead:
    return NotificationRead.model_validate(
        await notification_service.send_test_sms(db, user, data.phone_number, data.message)
    )


@router.post("/test-email", response_model=NotificationRead, summary="Send a test email",
             description="Sends through the configured email setup (EMAIL_MODE mock or live SMTP, e.g. Gmail) and "
                         "records a notification. A delivery failure is returned as status FAILED with error_message, "
                         "not as an HTTP error. ADMIN.",
             responses=error_responses(401, 403, 422))
async def test_email(data: TestEmailRequest, user: AdminUser, db: DbSession) -> NotificationRead:
    return NotificationRead.model_validate(
        await notification_service.send_test_email(db, user, str(data.email), data.message)
    )


class DigestResponse(BaseModel):
    sent: int
    failed: int
    skipped_reason: str | None
    expired: int
    critical: int
    action_required: int
    recipients: list[str]


@router.post("/send-digest", response_model=DigestResponse, summary="Email today's expiry digest now",
             description="Emails every admin the list of expired, critical and action-required batches right away "
                         "(the same email that goes out automatically each morning). ADMIN.",
             responses=error_responses(401, 403))
async def send_digest(user: AdminUser, db: DbSession) -> DigestResponse:
    from app.services.digest_service import send_expiry_digest

    return DigestResponse(**(await send_expiry_digest(db, user.company_id, manual=True)).as_dict())


@router.get("/{alert_id}", response_model=AlertRead, summary="Get alert",
            description="Single alert including SMS delivery state.", responses=error_responses(401, 404))
async def get_alert(alert_id: uuid.UUID, user: StaffUser, db: DbSession) -> AlertRead:
    return AlertRead.model_validate(await alert_service.get_alert(db, user.company_id, alert_id))


@router.patch("/{alert_id}/read", response_model=AlertRead, summary="Mark alert read",
              description="Any role.", responses=error_responses(401, 404))
async def mark_read(alert_id: uuid.UUID, user: StaffUser, db: DbSession) -> AlertRead:
    return AlertRead.model_validate(await alert_service.mark_read(db, user, alert_id))


@router.patch("/{alert_id}/resolve", response_model=AlertRead, summary="Resolve alert",
              description="Closes the alert. A new alert of the same type can then be raised if the condition "
                          "persists at the next check. ADMIN.",
              responses=error_responses(401, 403, 404))
async def resolve(alert_id: uuid.UUID, user: AdminUser, request: Request, db: DbSession) -> AlertRead:
    return AlertRead.model_validate(await alert_service.resolve(db, user, alert_id, client_ip(request)))
