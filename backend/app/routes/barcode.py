from fastapi import APIRouter, Path

from app.core.exceptions import error_responses
from app.dependencies.auth import StaffUser
from app.dependencies.database import DbSession
from app.models import UserRole
from app.schemas.barcode import (
    BarcodeLookupRequest,
    BarcodeLookupResponse,
    BarcodeParseRequest,
    BarcodeParseResponse,
)
from app.schemas.product import scrub_cost
from app.services import barcode_service

router = APIRouter(prefix="/barcode", tags=["Barcode"])


def _scrub(resp: BarcodeLookupResponse, user) -> BarcodeLookupResponse:
    scrub_cost(resp.product, user.role == UserRole.ADMIN)
    return resp

DESCRIPTION = (
    "The scanner (frontend/admin app) captures the barcode string and sends it here. A barcode identifies the "
    "**product only**; batch numbers and expiry dates are separate records. Returns the product, its in-stock "
    "batches in FEFO order with live expiry status, and inventory totals. Unknown barcodes return 404 NOT_FOUND."
)


@router.get("/lookup/{barcode}", response_model=BarcodeLookupResponse, summary="Look up a barcode (GET)",
            description=DESCRIPTION, responses=error_responses(400, 401, 404))
async def lookup_get(
    user: StaffUser, db: DbSession, barcode: str = Path(..., min_length=1, max_length=64)
) -> BarcodeLookupResponse:
    return _scrub(await barcode_service.lookup(db, user.company_id, barcode), user)


@router.post("/lookup", response_model=BarcodeLookupResponse, summary="Look up a barcode (POST)",
             description=DESCRIPTION, responses=error_responses(400, 401, 404, 422))
async def lookup_post(data: BarcodeLookupRequest, user: StaffUser, db: DbSession) -> BarcodeLookupResponse:
    return _scrub(await barcode_service.lookup(db, user.company_id, data.barcode), user)


@router.post("/parse", response_model=BarcodeParseResponse, response_model_by_alias=True,
             summary="Decode a scan (GS1 or plain)",
             description="Decodes GS1-128 / GS1 DataMatrix element strings — GTIN (01), expiry (17), batch (10), "
                         "serial (21) — from either the bracketed form or raw scanner output with FNC1 separators. "
                         "Plain EAN/UPC barcodes identify the product only; batch and expiry stay empty for the user "
                         "to enter. Returns the matching product if it is known.",
             responses=error_responses(400, 401, 422))
async def parse_code(data: BarcodeParseRequest, user: StaffUser, db: DbSession) -> BarcodeParseResponse:
    resp = await barcode_service.parse_code(db, user.company_id, data.code)
    if resp.product is not None:
        scrub_cost(resp.product, user.role == UserRole.ADMIN)
    return resp
