from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field

from app.schemas.batch import BatchRead
from app.schemas.product import ProductRead
from app.schemas.settings import CamelModel


class BarcodeLookupRequest(BaseModel):
    barcode: str = Field(min_length=1, max_length=64, description="Raw string captured by the scanner")


class BarcodeInventory(BaseModel):
    total_stock: int
    sellable_stock: int
    expired_stock: int
    active_batch_count: int
    nearest_expiry: date | None
    next_fefo_batch_id: str | None = Field(description="Batch that should be sold next (First-Expired-First-Out)")


class BarcodeLookupResponse(BaseModel):
    barcode: str
    product: ProductRead
    active_batches: list[BatchRead]
    inventory: BarcodeInventory


class BarcodeParseRequest(BaseModel):
    code: str = Field(min_length=1, max_length=200, description="Raw scanner output or GS1 human-readable string")


class BarcodeParseResponse(CamelModel):
    """What a scan tells us. GS1 codes may carry batch and expiry; plain barcodes only identify the product."""

    raw: str
    is_gs1: bool
    gtin: str | None = None
    barcode: str | None = Field(default=None, description="Barcode used to look up the product")
    batch_number: str | None = None
    expiry_date: date | None = None
    production_date: date | None = None
    serial: str | None = None
    warnings: list[str] = Field(default_factory=list)
    product: ProductRead | None = Field(default=None, description="Known product for this code, if any")
    existing_batch_id: str | None = Field(default=None, description="Set when this batch is already in stock")
