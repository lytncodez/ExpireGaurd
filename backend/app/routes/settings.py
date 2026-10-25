from fastapi import APIRouter, Request

from app.core.exceptions import error_responses
from app.dependencies.auth import AdminUser, StaffUser
from app.dependencies.database import DbSession
from app.schemas.settings import (
    NotificationSettings,
    NotificationSettingsUpdate,
    PharmacySettings,
    ThresholdSettings,
)
from app.services import settings_service
from app.utils.helpers import client_ip

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("", response_model=PharmacySettings, response_model_by_alias=True, summary="Pharmacy settings",
            description="Risk-band thresholds, alert toggles and pharmacy details. Every signed-in user can read "
                        "them (the frontend colours batches with these bands).",
            responses=error_responses(401))
async def get_settings(user: StaffUser, db: DbSession) -> PharmacySettings:
    return await settings_service.get_settings(db, user.company_id)


@router.put("/thresholds", response_model=PharmacySettings, response_model_by_alias=True,
            summary="Update risk bands",
            description="Saves criticalDays < actionDays < monitorDays <= safeDays and the alert toggles, then re-runs "
                        "the expiry check so batch statuses and alerts follow the new bands. ADMIN only.",
            responses=error_responses(401, 403, 422))
async def update_thresholds(data: ThresholdSettings, user: AdminUser, request: Request, db: DbSession) -> PharmacySettings:
    return await settings_service.update_thresholds(db, user, data, client_ip(request))


@router.get("/notifications", response_model=NotificationSettings, response_model_by_alias=True,
            summary="Alert recipients",
            description="Who receives SMS and email alerts: admins' phones and emails, extra alert numbers, the "
                        "pharmacy phone, the daily email digest switch, and whether SMS/email are live. ADMIN only.",
            responses=error_responses(401, 403))
async def get_notification_settings(user: AdminUser, db: DbSession) -> NotificationSettings:
    return await settings_service.get_notification_settings(db, user.company_id)


@router.put("/notifications", response_model=NotificationSettings, response_model_by_alias=True,
            summary="Update alert recipients",
            description="Set extra SMS alert numbers (local 0241234567 or international +233... format), the pharmacy "
                        "phone and the daily email digest switch. ADMIN only.",
            responses=error_responses(401, 403, 422))
async def update_notification_settings(
    data: NotificationSettingsUpdate, user: AdminUser, request: Request, db: DbSession,
) -> NotificationSettings:
    return await settings_service.update_notification_settings(db, user, data, client_ip(request))
