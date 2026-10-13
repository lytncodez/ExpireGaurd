from fastapi import APIRouter, Request

from app.core.exceptions import error_responses
from app.dependencies.auth import AdminUser, StaffUser
from app.dependencies.database import DbSession
from app.schemas.settings import PharmacySettings, ThresholdSettings
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
