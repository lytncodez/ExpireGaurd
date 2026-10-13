"""Barcode lookup and scan decoding.

A plain barcode identifies a PRODUCT only. A GS1 element string (DataMatrix / GS1-128) may also carry
the batch number and expiry date; those are read from the code itself, never guessed.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError, NotFoundError
from app.models import Batch, Category, Product
from app.schemas.barcode import BarcodeInventory, BarcodeLookupResponse, BarcodeParseResponse
from app.services.auth_service import get_company
from app.services.batch_service import to_read
from app.services.expiry_service import batch_status, thresholds_for
from app.services.product_service import to_product_reads
from app.utils.dates import today_in_tz
from app.utils.gs1 import gtin_variants, parse
from app.utils.validators import normalize_barcode


async def lookup(db: AsyncSession, company_id: uuid.UUID, raw_barcode: str) -> BarcodeLookupResponse:
    try:
        barcode = normalize_barcode(raw_barcode)
    except ValueError as exc:
        raise BadRequestError(str(exc)) from exc
    if not barcode:
        raise BadRequestError("Barcode is empty")

    row = (
        await db.execute(
            select(Product, Category.name)
            .outerjoin(Category, Category.id == Product.category_id)
            .where(Product.company_id == company_id, Product.barcode == barcode, Product.is_active.is_(True))
        )
    ).first()
    if row is None:
        raise NotFoundError("No product found for this barcode", details={"barcode": barcode})
    product, category_name = row

    company = await get_company(db, company_id)
    today = today_in_tz(company.timezone)
    batches = (
        await db.scalars(
            select(Batch)
            .where(Batch.product_id == product.id, Batch.company_id == company_id, Batch.remaining_quantity > 0)
            .order_by(Batch.expiry_date, Batch.created_at)
        )
    ).all()
    batch_reads = []
    for b in batches:
        read = to_read(b, product.name, today)
        read.status = batch_status(b.expiry_date, b.remaining_quantity, today, thresholds_for(company))
        batch_reads.append(read)
    sellable = [b for b in batches if b.expiry_date > today]
    product_read = (await to_product_reads(db, company_id, [(product, category_name)], today))[0]
    return BarcodeLookupResponse(
        barcode=barcode,
        product=product_read,
        active_batches=batch_reads,
        inventory=BarcodeInventory(
            total_stock=sum(b.remaining_quantity for b in batches),
            sellable_stock=sum(b.remaining_quantity for b in sellable),
            expired_stock=sum(b.remaining_quantity for b in batches if b.expiry_date <= today),
            active_batch_count=len(batches),
            nearest_expiry=sellable[0].expiry_date if sellable else None,
            next_fefo_batch_id=str(sellable[0].id) if sellable else None,
        ),
    )


async def parse_code(db: AsyncSession, company_id: uuid.UUID, code: str) -> BarcodeParseResponse:
    """Decode a scan (GS1 or plain) and match it to a known product and batch. Never guesses missing data."""
    result = parse(code)
    candidates: list[str] = []
    if result.gtin:
        candidates = gtin_variants(result.gtin)
    elif not result.is_gs1:
        try:
            plain = normalize_barcode(code)
        except ValueError as exc:
            raise BadRequestError(str(exc)) from exc
        if plain:
            candidates = [plain]
    product = None
    if candidates:
        product = await db.scalar(
            select(Product).where(Product.company_id == company_id, Product.barcode.in_(candidates),
                                  Product.is_active.is_(True)).limit(1)
        )
    product_read = None
    existing_batch_id = None
    if product is not None:
        company = await get_company(db, company_id)
        category_name = await db.scalar(select(Category.name).where(Category.id == product.category_id)) \
            if product.category_id else None
        product_read = (await to_product_reads(db, company_id, [(product, category_name)],
                                               today_in_tz(company.timezone)))[0]
        if result.batch_number:
            existing = await db.scalar(select(Batch.id).where(Batch.product_id == product.id,
                                                              Batch.batch_number == result.batch_number))
            existing_batch_id = str(existing) if existing else None
    return BarcodeParseResponse(
        raw=result.raw,
        is_gs1=result.is_gs1,
        gtin=result.gtin,
        barcode=(product.barcode if product else (candidates[0] if candidates else None)),
        batch_number=result.batch_number,
        expiry_date=result.expiry_date,
        production_date=result.production_date,
        serial=result.serial,
        warnings=result.errors,
        product=product_read,
        existing_batch_id=existing_batch_id,
    )
