import os
import uuid

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile
from fastapi.responses import PlainTextResponse
from sqlalchemy import select

from app.core.config import settings
from app.core.exceptions import BadRequestError, NotFoundError, PayloadTooLargeError, error_responses
from app.dependencies.auth import StaffUser, rate_limit
from app.dependencies.database import DbSession
from app.models import ImportFileType, ImportJob
from app.schemas import Page
from app.schemas.imports import ImportErrorsResponse, ImportJobRead, ImportPreview, ImportResult, ImportRowError
from app.services.csv_service import preview_import, process_import, template_csv
from app.utils.helpers import client_ip
from app.utils.pagination import PageParams, page_meta, page_params, paginate

router = APIRouter(prefix="/imports", tags=["Imports"])

CSV_TYPES = {"text/csv", "application/csv", "text/plain", "application/vnd.ms-excel", "application/octet-stream"}
XLSX_TYPES = {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/octet-stream", "application/zip"}

IMPORT_DESCRIPTION = (
    "Columns (case/spacing-insensitive, common aliases accepted): **product_name, batch_number, expiry_date, "
    "quantity** (required), and optional sku, barcode, category, brand, unit, description, selling_price, "
    "unit_cost, supplier, storage_location, date_received, manufacturing_date. Products are matched by sku, then "
    "barcode, then name. Dispensers' cost, supplier and receipt columns are ignored. Dates: YYYY-MM-DD preferred "
    "(DD/MM/YYYY accepted). Valid rows are written in a single transaction; invalid and duplicate rows are "
    "reported, never half-written. With strict=true any invalid row aborts the whole import. "
    "New batches are run through the expiry engine immediately."
)


async def _read_upload(file: UploadFile, extensions: set[str], content_types: set[str]) -> tuple[str, bytes]:
    filename = os.path.basename(file.filename or "upload")
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in extensions:
        raise BadRequestError(f"Unsupported file extension; expected {', '.join(sorted(extensions))}")
    if file.content_type and file.content_type.split(";")[0].strip() not in content_types:
        raise BadRequestError(f"Unsupported content type {file.content_type}")
    content = await file.read(settings.max_upload_bytes + 1)
    if len(content) > settings.max_upload_bytes:
        raise PayloadTooLargeError(f"File exceeds the {settings.MAX_UPLOAD_SIZE_MB} MB limit")
    if not content:
        raise BadRequestError("The uploaded file is empty")
    return filename, content


@router.post("/csv", response_model=ImportResult, summary="Import CSV", description=IMPORT_DESCRIPTION,
             responses=error_responses(400, 401, 403, 413, 422, 429),
             dependencies=[Depends(rate_limit("upload", settings.RATE_LIMIT_UPLOAD_PER_MINUTE))])
async def import_csv(
    user: StaffUser, request: Request, db: DbSession,
    file: UploadFile = File(..., description="UTF-8 CSV file"),
    strict: bool = Query(False, description="Abort the whole import if any row is invalid"),
) -> ImportResult:
    filename, content = await _read_upload(file, {"csv"}, CSV_TYPES)
    return await process_import(
        db, user, filename=filename, content=content, file_type=ImportFileType.CSV, strict=strict, ip=client_ip(request)
    )


@router.post("/excel", response_model=ImportResult, summary="Import Excel (.xlsx)", description=IMPORT_DESCRIPTION,
             responses=error_responses(400, 401, 403, 413, 422, 429),
             dependencies=[Depends(rate_limit("upload", settings.RATE_LIMIT_UPLOAD_PER_MINUTE))])
async def import_excel(
    user: StaffUser, request: Request, db: DbSession,
    file: UploadFile = File(..., description=".xlsx workbook (first sheet is read)"),
    strict: bool = Query(False, description="Abort the whole import if any row is invalid"),
) -> ImportResult:
    filename, content = await _read_upload(file, {"xlsx"}, XLSX_TYPES)
    return await process_import(
        db, user, filename=filename, content=content, file_type=ImportFileType.XLSX, strict=strict, ip=client_ip(request)
    )


@router.get("/template.csv", response_class=PlainTextResponse, summary="Download import template",
            description="CSV header with two example rows.", responses=error_responses(401))
async def import_template(user: StaffUser) -> PlainTextResponse:
    return PlainTextResponse(
        template_csv(), media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="expireguard_import_template.csv"'},
    )


@router.post("/preview", response_model=ImportPreview, summary="Preview an import (dry run)",
             description="Validates a .csv or .xlsx file and reports rows, duplicates, products to create or update "
                         "and the risk band of each new batch. Writes nothing; send the same file to /imports/csv "
                         "or /imports/excel to commit.",
             responses=error_responses(400, 401, 413, 422, 429),
             dependencies=[Depends(rate_limit("upload", settings.RATE_LIMIT_UPLOAD_PER_MINUTE))])
async def preview(user: StaffUser, db: DbSession, file: UploadFile = File(...)) -> ImportPreview:
    name = (file.filename or "").lower()
    if name.endswith(".xlsx"):
        _, content = await _read_upload(file, {"xlsx"}, XLSX_TYPES)
        return await preview_import(db, user, content=content, file_type=ImportFileType.XLSX)
    _, content = await _read_upload(file, {"csv"}, CSV_TYPES)
    return await preview_import(db, user, content=content, file_type=ImportFileType.CSV)


@router.get("", response_model=Page[ImportJobRead], summary="List import jobs",
            description="Newest first.", responses=error_responses(401, 403))
async def list_imports(user: StaffUser, db: DbSession, params: PageParams = Depends(page_params)) -> Page[ImportJobRead]:
    stmt = select(ImportJob).where(ImportJob.company_id == user.company_id).order_by(ImportJob.created_at.desc())
    items, total = await paginate(db, stmt, params)
    return Page(items=[ImportJobRead.model_validate(i) for i in items], **page_meta(total, params))


async def _get_job(db, company_id: uuid.UUID, job_id: uuid.UUID) -> ImportJob:
    job = await db.scalar(select(ImportJob).where(ImportJob.id == job_id, ImportJob.company_id == company_id))
    if job is None:
        raise NotFoundError("Import job not found")
    return job


@router.get("/{job_id}", response_model=ImportJobRead, summary="Get import job",
            description="Status and counts of one import.", responses=error_responses(401, 403, 404))
async def get_import(job_id: uuid.UUID, user: StaffUser, db: DbSession) -> ImportJobRead:
    return ImportJobRead.model_validate(await _get_job(db, user.company_id, job_id))


@router.get("/{job_id}/errors", response_model=ImportErrorsResponse, summary="Import row errors",
            description="Every invalid, missing or duplicate row with spreadsheet row numbers.",
            responses=error_responses(401, 403, 404))
async def get_import_errors(job_id: uuid.UUID, user: StaffUser, db: DbSession) -> ImportErrorsResponse:
    job = await _get_job(db, user.company_id, job_id)
    errors = job.error_details or []
    return ImportErrorsResponse(job_id=job.id, total_errors=len(errors), errors=[ImportRowError(**e) for e in errors])
