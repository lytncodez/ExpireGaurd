"""Files (Excel / CSV) shared with the AI assistant.

Flow (the user's choice, "option C"):
  1. upload   -> the file is read, classified and summarised; nothing touches stock yet
  2. choose   -> INVENTORY files can be imported as stock (same pipeline as Imports)
                 any file can be kept for analysis
  3. use      -> kept / imported files are summarised into the AI context and sales files feed the forecast

The analysis half (`analyze_file`) is pure pandas so it can be unit tested without a database.
"""

from __future__ import annotations

import math
import uuid
from dataclasses import dataclass, field
from datetime import date
from typing import Any

import pandas as pd

from app.services.csv_service import ImportFileError, _canonical, normalize_columns, read_csv

MAX_STORED_ROWS = 2000
MAX_PRODUCTS_IN_SUMMARY = 15
MAX_DAILY_AVG_PRODUCTS = 500

SALES_DATE_COLS = ("date", "sale_date", "sales_date", "sold_at", "sold_on", "transaction_date", "invoice_date",
                   "day", "month", "period", "week")
SALES_PRODUCT_COLS = ("product", "product_name", "item", "item_name", "name", "drug", "medicine", "description")
SALES_QTY_COLS = ("quantity", "qty", "units", "units_sold", "qty_sold", "quantity_sold", "sold", "volume")
SALES_REVENUE_COLS = ("revenue", "amount", "total", "total_amount", "sales", "sales_amount", "value", "net_sales",
                      "amount_ghs", "total_ghs", "sales_ghs")


@dataclass
class FileAnalysis:
    kind: str  # INVENTORY | SALES_HISTORY | OTHER
    file_type: str
    row_count: int
    columns: list[str]
    rows: list[dict[str, Any]]
    summary: dict[str, Any] = field(default_factory=dict)


def _read(filename: str, content: bytes) -> tuple[pd.DataFrame, str]:
    from app.services.excel_service import read_excel

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext == "xlsx":
        return read_excel(content), "xlsx"
    if ext in ("csv", "txt"):
        return read_csv(content), "csv"
    raise ImportFileError("Unsupported file type. Upload an Excel (.xlsx) or CSV (.csv) file.")


def _cell(value: Any) -> str:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return ""
    if isinstance(value, pd.Timestamp):
        return value.date().isoformat()
    return str(value).strip()[:200]


def _numeric(series: pd.Series) -> pd.Series:
    cleaned = series.map(lambda v: _cell(v).replace(",", "").replace("GHS", "").replace("GH₵", "").strip())
    return pd.to_numeric(cleaned, errors="coerce")


def _dates(series: pd.Series) -> pd.Series:
    if pd.api.types.is_datetime64_any_dtype(series):
        return series
    values = series.map(lambda v: v if isinstance(v, (pd.Timestamp, date)) else _cell(v))
    iso = pd.to_datetime(values, errors="coerce", format="ISO8601")
    if iso.notna().mean() >= 0.8:
        return iso
    return pd.to_datetime(values, errors="coerce", dayfirst=True, format="mixed")


def _pick(columns: dict[str, str], names: tuple[str, ...]) -> str | None:
    for n in names:
        if n in columns:
            return columns[n]
    return None


def _r(x: float, d: int = 2) -> float:
    return round(float(x), d)


def _sales_summary(df: pd.DataFrame, date_col: str, product_col: str | None, qty_col: str | None,
                   rev_col: str | None) -> dict[str, Any] | None:
    data = pd.DataFrame({"date": _dates(df[date_col])})
    data["product"] = df[product_col].map(_cell) if product_col else "All products"
    data["units"] = _numeric(df[qty_col]) if qty_col else float("nan")
    data["revenue"] = _numeric(df[rev_col]) if rev_col else float("nan")
    data = data[data["date"].notna() & (data["units"].notna() | data["revenue"].notna())]
    data = data[data["product"] != ""]
    if len(data) == 0:
        return None
    start, end = data["date"].min().date(), data["date"].max().date()
    span = (end - start).days + 1
    has_units, has_rev = bool(qty_col), bool(rev_col)
    by_product = data.groupby("product").agg(units=("units", "sum"), revenue=("revenue", "sum"), lines=("date", "size"))
    by_product = by_product.sort_values("units" if has_units else "revenue", ascending=False)
    top = []
    for name, row in by_product.head(MAX_PRODUCTS_IN_SUMMARY).iterrows():
        item: dict[str, Any] = {"product": name}
        if has_units:
            item["units"] = _r(row["units"], 0)
            item["daily_avg_units"] = _r(row["units"] / span)
        if has_rev:
            item["revenue"] = _r(row["revenue"])
        top.append(item)
    monthly = data.assign(month=data["date"].dt.strftime("%Y-%m")).groupby("month").agg(
        units=("units", "sum"), revenue=("revenue", "sum"))
    months = []
    for month, row in monthly.tail(24).iterrows():
        m: dict[str, Any] = {"month": month}
        if has_units:
            m["units"] = _r(row["units"], 0)
        if has_rev:
            m["revenue"] = _r(row["revenue"])
        months.append(m)
    summary: dict[str, Any] = {
        "date_start": start.isoformat(), "date_end": end.isoformat(), "days_covered": span,
        "products": int(by_product.shape[0]), "valid_rows": int(len(data)),
        "top_products": top, "monthly": months,
    }
    if has_units:
        summary["total_units"] = _r(data["units"].sum(), 0)
        summary["product_daily_avg"] = {
            name: _r(row["units"] / span, 4)
            for name, row in by_product.head(MAX_DAILY_AVG_PRODUCTS).iterrows() if row["units"] > 0
        }
    if has_rev:
        summary["total_revenue"] = _r(data["revenue"].sum())
    if top:
        lead = top[0]["product"]
        summary["description"] = (
            f"Sales history from {start.isoformat()} to {end.isoformat()} ({span} days) covering "
            f"{summary['products']} product(s). Best seller: {lead}."
        )
    return summary


def _inventory_summary(df: pd.DataFrame, today: date) -> dict[str, Any]:
    norm = normalize_columns(df)
    qty = _numeric(norm["quantity"]).fillna(0)
    expiry = _dates(norm["expiry_date"])
    days = (expiry - pd.Timestamp(today)).dt.days
    names = norm["product_name"].map(_cell)
    by_product = pd.DataFrame({"product": names, "qty": qty}).groupby("product")["qty"].sum().sort_values(ascending=False)
    soonest = pd.DataFrame({"product": names, "expiry": expiry, "days": days, "qty": qty})
    soonest = soonest[soonest["expiry"].notna() & (soonest["days"] >= 0)].sort_values("days").head(5)
    return {
        "products": int(names[names != ""].nunique()),
        "batches": int(len(norm)),
        "total_units": _r(qty.sum(), 0),
        "expired_batches": int((days < 0).sum()),
        "expiring_within_90_days": int(((days >= 0) & (days <= 90)).sum()),
        "earliest_expiry": expiry.min().date().isoformat() if expiry.notna().any() else None,
        "largest_stock": [{"product": n, "units": _r(u, 0)} for n, u in by_product.head(10).items()],
        "soonest_expiring": [
            {"product": r["product"], "expiry_date": r["expiry"].date().isoformat(), "days_left": int(r["days"]),
             "units": _r(r["qty"], 0)}
            for _, r in soonest.iterrows()
        ],
    }


def _generic_summary(df: pd.DataFrame) -> dict[str, Any]:
    stats = []
    for col in df.columns:
        values = _numeric(df[col])
        if len(df) and values.notna().mean() >= 0.8:
            stats.append({"column": str(col), "sum": _r(values.sum()), "mean": _r(values.mean()),
                          "min": _r(values.min()), "max": _r(values.max())})
        if len(stats) >= 8:
            break
    return {"numeric_columns": stats}


def analyze_file(filename: str, content: bytes, today: date) -> FileAnalysis:
    """Read, classify and summarise a file. Raises ImportFileError for unreadable files."""
    df, file_type = _read(filename, content)
    df = df.dropna(how="all")
    df = df[[any(_cell(v) for v in rec) for rec in df.itertuples(index=False)]] if len(df) else df
    df = df[[c for c in df.columns if not str(c).startswith("Unnamed")]] if len(df.columns) else df
    if len(df) == 0:
        raise ImportFileError("The file contains no data rows")
    columns = [str(c) for c in df.columns]
    rows = [{str(k): _cell(v) for k, v in rec.items()} for rec in df.head(MAX_STORED_ROWS).to_dict(orient="records")]
    canon = {_canonical(c): c for c in df.columns}

    kind, summary = "OTHER", {}
    try:
        summary = _inventory_summary(df, today)
        kind = "INVENTORY"
        summary["description"] = (
            f"Stock list with {summary['batches']} batch row(s) for {summary['products']} product(s), "
            f"{summary['expired_batches']} already expired and {summary['expiring_within_90_days']} expiring "
            f"within 90 days."
        )
    except ImportFileError:
        date_col = _pick(canon, SALES_DATE_COLS)
        qty_col = _pick(canon, SALES_QTY_COLS)
        rev_col = _pick(canon, SALES_REVENUE_COLS)
        product_col = _pick(canon, SALES_PRODUCT_COLS)
        if date_col and (qty_col or rev_col):
            sales = _sales_summary(df, date_col, product_col, qty_col, rev_col)
            if sales:
                kind, summary = "SALES_HISTORY", sales
    if kind == "OTHER":
        summary = _generic_summary(df)
        summary["description"] = f"Table with {len(df)} row(s) and columns: {', '.join(columns[:10])}."
    summary["suggested_action"] = "IMPORT" if kind == "INVENTORY" else "KEEP"
    return FileAnalysis(kind=kind, file_type=file_type, row_count=int(len(df)), columns=columns[:100], rows=rows,
                        summary=summary)


# --------------------------------------------------------------------------- persistence (database)


async def upload_dataset(db, user, *, filename: str, content: bytes, ip: str | None = None):
    from app.models import AIDataset, AuditAction, DatasetKind
    from app.services import audit_service
    from app.services.auth_service import get_company
    from app.utils.dates import today_in_tz

    company = await get_company(db, user.company_id)
    analysis = analyze_file(filename, content, today_in_tz(company.timezone))
    ds = AIDataset(
        company_id=user.company_id, user_id=user.id, filename=filename[:255], file_type=analysis.file_type,
        kind=DatasetKind(analysis.kind), row_count=analysis.row_count, columns=analysis.columns,
        rows=analysis.rows, summary=analysis.summary,
        content=content if analysis.kind == "INVENTORY" else None,
    )
    db.add(ds)
    await db.flush()
    audit_service.record(
        db, action=AuditAction.AI_FILE_UPLOADED, company_id=user.company_id, user_id=user.id,
        entity_type="ai_dataset", entity_id=ds.id,
        metadata={"filename": filename, "kind": analysis.kind, "rows": analysis.row_count}, ip_address=ip,
    )
    await db.commit()
    await db.refresh(ds)
    return ds


async def list_datasets(db, company_id: uuid.UUID, limit: int = 50):
    from sqlalchemy import select

    from app.models import AIDataset

    return list((await db.scalars(
        select(AIDataset).where(AIDataset.company_id == company_id).order_by(AIDataset.created_at.desc()).limit(limit)
    )).all())


async def get_dataset(db, company_id: uuid.UUID, dataset_id: uuid.UUID, *, reload: bool = False):
    from app.core.exceptions import NotFoundError
    from app.models import AIDataset

    ds = await db.get(AIDataset, dataset_id, populate_existing=reload)
    if ds is None or ds.company_id != company_id:
        raise NotFoundError("File not found")
    return ds


async def keep_dataset(db, user, dataset_id: uuid.UUID):
    from app.models import DatasetStatus

    ds = await get_dataset(db, user.company_id, dataset_id)
    if ds.status == DatasetStatus.PENDING:
        ds.status = DatasetStatus.KEPT
        await db.commit()
        await db.refresh(ds)
    return ds


async def import_dataset(db, user, dataset_id: uuid.UUID, *, ip: str | None = None):
    """Import an INVENTORY file into stock through the normal import pipeline. Returns (dataset, ImportResult)."""
    from app.core.exceptions import BadRequestError
    from app.models import AuditAction, DatasetKind, DatasetStatus, ImportFileType, ImportStatus
    from app.services import audit_service
    from app.services.csv_service import process_import

    ds = await get_dataset(db, user.company_id, dataset_id)
    if ds.kind != DatasetKind.INVENTORY:
        raise BadRequestError("Only stock lists (with product, batch, expiry date and quantity columns) can be "
                              "imported. Keep this file for analysis instead.")
    if ds.status == DatasetStatus.IMPORTED or ds.content is None:
        raise BadRequestError("This file has already been imported")
    file_type = ImportFileType.XLSX if ds.file_type == "xlsx" else ImportFileType.CSV
    result = await process_import(db, user, filename=ds.filename, content=ds.content, file_type=file_type, ip=ip)
    ds = await get_dataset(db, user.company_id, dataset_id, reload=True)
    ds.import_job_id = result.job_id
    if result.status != ImportStatus.FAILED and result.batches_created > 0:
        ds.status = DatasetStatus.IMPORTED
        ds.content = None
    audit_service.record(
        db, action=AuditAction.AI_FILE_IMPORTED, company_id=user.company_id, user_id=user.id,
        entity_type="ai_dataset", entity_id=ds.id,
        metadata={"job_id": str(result.job_id), "batches_created": result.batches_created}, ip_address=ip,
    )
    await db.commit()
    await db.refresh(ds)
    return ds, result


async def delete_dataset(db, user, dataset_id: uuid.UUID, *, ip: str | None = None) -> None:
    from app.models import AuditAction
    from app.services import audit_service

    ds = await get_dataset(db, user.company_id, dataset_id)
    audit_service.record(
        db, action=AuditAction.AI_FILE_DELETED, company_id=user.company_id, user_id=user.id,
        entity_type="ai_dataset", entity_id=ds.id, metadata={"filename": ds.filename}, ip_address=ip,
    )
    await db.delete(ds)
    await db.commit()


def context_view(ds) -> dict[str, Any]:
    """Compact, AI-safe summary of one file (no raw rows, no per-product daily table)."""
    summary = {k: v for k, v in (ds.summary or {}).items() if k not in ("product_daily_avg", "suggested_action")}
    return {
        "id": str(ds.id), "filename": ds.filename, "kind": ds.kind.value, "status": ds.status.value,
        "row_count": ds.row_count, "columns": ds.columns[:20], "uploaded_at": ds.created_at.date().isoformat(),
        "description": summary.pop("description", None), "summary": summary,
    }


async def context_datasets(db, company_id: uuid.UUID, limit: int = 5) -> list[dict[str, Any]]:
    return [context_view(ds) for ds in await list_datasets(db, company_id, limit)]


async def kept_sales_daily_avg(db, company_id: uuid.UUID) -> dict[str, tuple[str, float]]:
    """lower-case product name -> (name, units per day) from kept/imported sales history files."""
    from sqlalchemy import select

    from app.models import AIDataset, DatasetKind, DatasetStatus

    rows = (await db.scalars(
        select(AIDataset)
        .where(AIDataset.company_id == company_id, AIDataset.kind == DatasetKind.SALES_HISTORY,
               AIDataset.status != DatasetStatus.PENDING)
        .order_by(AIDataset.created_at)
    )).all()
    merged: dict[str, tuple[str, float]] = {}
    for ds in rows:  # newer files override older ones
        for name, avg in (ds.summary or {}).get("product_daily_avg", {}).items():
            merged[name.strip().lower()] = (name.strip(), float(avg))
    return merged
