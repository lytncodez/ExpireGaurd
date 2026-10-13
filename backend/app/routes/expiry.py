from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.core.config import settings
from app.core.exceptions import error_responses
from app.dependencies.auth import AdminUser, StaffUser
from app.dependencies.database import DbSession
from app.models import BatchStatus
from app.schemas import Page
from app.schemas.batch import BatchRead
from app.services import expiry_service
from app.utils.pagination import PageParams, page_meta, page_params

router = APIRouter(prefix="/expiry", tags=["Expiry engine"])

RULES = (
    "Deterministic rules: days_remaining = expiry_date - today (pharmacy timezone). "
    "<=0 EXPIRED, then CRITICAL, ACTION_REQUIRED, MONITOR and SAFE using the pharmacy's risk bands "
    f"(defaults {settings.EXPIRY_CRITICAL_DAYS}/{settings.EXPIRY_ACTION_DAYS}/{settings.EXPIRY_MONITOR_DAYS} days, "
    "editable via PUT /settings)."
)


class ExpiryCheckResponse(BaseModel):
    company_id: str
    as_of: str
    batches_checked: int
    statuses_updated: int
    status_counts: dict[str, int]
    alerts_created: int
    duplicates_prevented: int
    alerts_auto_resolved: int
    sms_sent: int
    sms_failed: int
    new_alert_ids: list[str]


async def _list(user, db, params, statuses) -> Page[BatchRead]:
    items, total = await expiry_service.list_expiry(db, user.company_id, params, statuses)
    return Page(items=items, **page_meta(total, params))


@router.get("", response_model=Page[BatchRead], summary="In-stock batches with live expiry status",
            description=RULES + " Optionally filter by status.", responses=error_responses(401, 422))
async def list_expiry(
    user: StaffUser, db: DbSession, params: PageParams = Depends(page_params),
    status: list[BatchStatus] | None = Query(None),
) -> Page[BatchRead]:
    return await _list(user, db, params, status)


@router.get("/expired", response_model=Page[BatchRead], summary="Expired batches",
            description="In-stock batches with days_remaining <= 0.", responses=error_responses(401))
async def list_expired(user: StaffUser, db: DbSession, params: PageParams = Depends(page_params)) -> Page[BatchRead]:
    return await _list(user, db, params, [BatchStatus.EXPIRED])


@router.get("/critical", response_model=Page[BatchRead], summary="Critical batches",
            description="In-stock batches in the Critical band (default 1-7 days).",
            responses=error_responses(401))
async def list_critical(user: StaffUser, db: DbSession, params: PageParams = Depends(page_params)) -> Page[BatchRead]:
    return await _list(user, db, params, [BatchStatus.CRITICAL])


@router.get("/soon", response_model=Page[BatchRead], summary="Action Required batches",
            description="In-stock batches in the Action Required band (default 8-30 days).",
            responses=error_responses(401))
async def list_soon(user: StaffUser, db: DbSession, params: PageParams = Depends(page_params)) -> Page[BatchRead]:
    return await _list(user, db, params, [BatchStatus.ACTION_REQUIRED])


@router.get("/monitor", response_model=Page[BatchRead], summary="Monitor batches",
            description="In-stock batches in the Monitor band (default 31-60 days).",
            responses=error_responses(401))
async def list_monitor(user: StaffUser, db: DbSession, params: PageParams = Depends(page_params)) -> Page[BatchRead]:
    return await _list(user, db, params, [BatchStatus.MONITOR])


@router.post("/check", response_model=ExpiryCheckResponse, summary="Run the expiry check now",
             description="Retrieves batches, calculates days remaining, updates statuses, creates alerts (never a "
                         "duplicate of an unresolved alert), auto-resolves superseded ones, then sends SMS for new "
                         "alerts at or above SMS_MIN_SEVERITY. SMS failures are recorded and never abort the check. "
                         "ADMIN only.",
             responses=error_responses(401, 403))
async def run_check(user: AdminUser, db: DbSession) -> dict[str, Any]:
    result = await expiry_service.run_expiry_check(db, user.company_id, actor_id=user.id)
    return result.as_dict()
