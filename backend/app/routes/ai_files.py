"""Files shared with the AI assistant (Excel / CSV) and the demand forecast."""

import os
import uuid

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile, status

from app.core.config import settings
from app.core.exceptions import BadRequestError, PayloadTooLargeError, error_responses
from app.dependencies.auth import CurrentUser, StaffUser, rate_limit
from app.dependencies.database import DbSession
from app.schemas.ai import DatasetImportResponse, DatasetRead, ForecastResponse
from app.services import ai_dataset_service
from app.services.csv_service import ImportFileError
from app.services.forecast_service import forecast, forecast_charts
from app.utils.helpers import client_ip

router = APIRouter(prefix="/ai", tags=["AI files & forecast"])

ALLOWED_EXTENSIONS = {"csv", "xlsx"}


@router.post(
    "/files", response_model=DatasetRead, status_code=status.HTTP_201_CREATED, summary="Share a file with the AI",
    description="Upload an Excel (.xlsx) or CSV file. It is read, classified (INVENTORY stock list, SALES_HISTORY or "
                "OTHER) and summarised. Nothing changes in stock until you call /ai/files/{id}/import; or call "
                "/ai/files/{id}/keep to keep it for analysis. Kept files are used by the AI chat and the forecast.",
    responses=error_responses(400, 401, 413, 422, 429),
    dependencies=[Depends(rate_limit("upload", settings.RATE_LIMIT_UPLOAD_PER_MINUTE))],
)
async def upload_file(user: StaffUser, request: Request, db: DbSession,
                      file: UploadFile = File(..., description=".xlsx or .csv")) -> DatasetRead:
    filename = os.path.basename(file.filename or "upload")
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise BadRequestError("Upload an Excel (.xlsx) or CSV (.csv) file. Old .xls files: open in Excel and "
                              "'Save As' .xlsx first.")
    content = await file.read(settings.max_upload_bytes + 1)
    if len(content) > settings.max_upload_bytes:
        raise PayloadTooLargeError(f"File exceeds the {settings.MAX_UPLOAD_SIZE_MB} MB limit")
    if not content:
        raise BadRequestError("The uploaded file is empty")
    try:
        ds = await ai_dataset_service.upload_dataset(db, user, filename=filename, content=content,
                                                     ip=client_ip(request))
    except ImportFileError as exc:
        raise BadRequestError(exc.message) from exc
    return DatasetRead.from_model(ds)


@router.get("/files", response_model=list[DatasetRead], summary="Files shared with the AI",
            responses=error_responses(401))
async def list_files(user: CurrentUser, db: DbSession) -> list[DatasetRead]:
    return [DatasetRead.from_model(d, preview=0) for d in await ai_dataset_service.list_datasets(db, user.company_id)]


@router.get("/files/{dataset_id}", response_model=DatasetRead, summary="One shared file with a preview",
            responses=error_responses(401, 404))
async def get_file(dataset_id: uuid.UUID, user: CurrentUser, db: DbSession) -> DatasetRead:
    return DatasetRead.from_model(await ai_dataset_service.get_dataset(db, user.company_id, dataset_id), preview=20)


@router.post("/files/{dataset_id}/keep", response_model=DatasetRead, summary="Keep a file for analysis",
             responses=error_responses(401, 403, 404))
async def keep_file(dataset_id: uuid.UUID, user: StaffUser, db: DbSession) -> DatasetRead:
    return DatasetRead.from_model(await ai_dataset_service.keep_dataset(db, user, dataset_id))


@router.post("/files/{dataset_id}/import", response_model=DatasetImportResponse, summary="Import a stock file",
             description="Imports an INVENTORY file into stock through the normal import pipeline (products, batches, "
                         "expiry alerts). Invalid or duplicate rows are skipped and reported.",
             responses=error_responses(400, 401, 403, 404))
async def import_file(dataset_id: uuid.UUID, user: StaffUser, request: Request, db: DbSession) -> DatasetImportResponse:
    ds, result = await ai_dataset_service.import_dataset(db, user, dataset_id, ip=client_ip(request))
    if result.batches_created:
        message = (f"Imported {result.batches_created} batch(es)"
                   + (f"; {result.failed_rows} row(s) had errors" if result.failed_rows else "")
                   + (f"; {result.duplicate_rows} duplicate(s) skipped" if result.duplicate_rows else "") + ".")
    else:
        message = "Nothing was imported. Check the file's rows in Imports for details."
    return DatasetImportResponse(
        dataset=DatasetRead.from_model(ds), job_id=result.job_id, status=result.status.value,
        total_rows=result.total_rows, batches_created=result.batches_created,
        products_created=result.products_created, failed_rows=result.failed_rows,
        duplicate_rows=result.duplicate_rows, alerts_generated=result.alerts_generated, message=message,
    )


@router.delete("/files/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove a shared file",
               description="Removes the file from the assistant. Stock already imported from it is not touched.",
               responses=error_responses(401, 403, 404))
async def delete_file(dataset_id: uuid.UUID, user: StaffUser, request: Request, db: DbSession) -> None:
    await ai_dataset_service.delete_dataset(db, user, dataset_id, ip=client_ip(request))


@router.get("/forecast", response_model=ForecastResponse, summary="Demand forecast",
            description="Per-product demand projection from the last 12 weeks of sales (plus kept sales-history "
                        "files), with days of cover and reorder suggestions. Deterministic: no AI involved.",
            responses=error_responses(401, 422))
async def get_forecast(user: CurrentUser, db: DbSession,
                       horizon_days: int = Query(30, ge=7, le=180),
                       limit: int = Query(25, ge=1, le=200)) -> ForecastResponse:
    fc = await forecast(db, user.company_id, horizon_days=horizon_days, limit=limit)
    return ForecastResponse(**fc, charts=forecast_charts({"forecast": fc}))
