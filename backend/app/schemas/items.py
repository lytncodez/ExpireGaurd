"""Frontend-shaped inventory items.

One item = one batch, flattened with its product, in exactly the `InventoryItem` shape used by the
React app (camelCase JSON). Cost, supplier and receipt fields are filled for admins only; for
dispensers they are always null — this is enforced here on the server, not in the browser.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Any, Literal

from pydantic import BeforeValidator, Field, model_validator

from app.models.batch import WorkflowReason
from app.schemas.settings import CamelModel

ItemStatus = Literal["In Stock", "Low Stock", "Quarantined", "Pending Return", "Disposed"]
RiskStatus = Literal["Safe", "Monitor", "Action Required", "Critical", "Expired"]
Velocity = Literal["Fast", "Moderate", "Slow", "Dead"]
MAX_PHOTO_CHARS = 2_000_000  # ~1.5 MB image as a data URL


def _date_part(value: Any) -> Any:
    """Accept 'YYYY-MM-DD' or a full ISO datetime from the browser (toISOString())."""
    if isinstance(value, str) and len(value) > 10 and value[4] == "-" and value[10] in "T ":
        return value[:10]
    return value


LooseDate = Annotated[date, BeforeValidator(_date_part)]


class Acknowledgement(CamelModel):
    actor_id: str
    actor_name: str
    at: str


class ActivityEntry(CamelModel):
    id: str
    action: str
    actor_id: str
    actor_name: str
    at: str
    note: str | None = None


class InventoryItemOut(CamelModel):
    id: uuid.UUID = Field(description="Batch id")
    product_id: uuid.UUID
    name: str
    product_name: str
    category: str
    sku: str | None
    barcode: str | None
    unit: str
    batch_no: str
    batch_number: str
    quantity: int
    units_sold: int
    unit_price: float = Field(description="Admin: unit cost. Dispenser: selling price.")
    unit_cost_ghs: float | None = Field(description="Admin only")
    selling_price_ghs: float | None
    expiry_date: date
    manufacturing_date: date | None
    date_received: date | None = Field(description="Admin only")
    photo_url: str | None
    days_to_expiry: int
    supplier: str | None = Field(description="Admin only")
    location: str | None
    storage_location: str | None
    status: ItemStatus
    risk_status: RiskStatus
    recommended_action: str
    velocity: Velocity
    acknowledged: Acknowledgement | None
    activity_log: list[ActivityEntry]
    admin_flag: dict[str, Any] | None
    supplier_return_request: dict[str, Any] | None
    quarantine_reason: WorkflowReason | None
    disposal: dict[str, Any] | None


class ItemCreate(CamelModel):
    """Mirrors the frontend addItem() payload. Admins may send cost/supplier; for dispensers they are ignored."""

    name: str = Field(min_length=1, max_length=200)
    category: str = Field(min_length=1, max_length=120)
    batch_no: str | None = Field(default=None, max_length=64)
    quantity: int = Field(gt=0, le=1_000_000_000)
    unit_price: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    unit_cost_ghs: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    selling_price_ghs: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    expiry_date: LooseDate
    manufacturing_date: LooseDate | None = None
    date_received: LooseDate | None = None
    supplier: str | None = Field(default=None, max_length=200)
    location: str | None = Field(default=None, max_length=120)
    status: ItemStatus | None = None
    barcode: str | None = Field(default=None, max_length=64)
    sku: str | None = Field(default=None, max_length=64)
    unit: str | None = Field(default=None, max_length=32)

    @model_validator(mode="after")
    def _dates(self) -> "ItemCreate":
        if self.manufacturing_date and self.expiry_date < self.manufacturing_date:
            raise ValueError("expiryDate cannot be before manufacturingDate")
        return self


class ItemUpdate(CamelModel):
    """photoUrl and location for anyone; the rest is admin-only."""

    photo_url: str | None = Field(default=None, max_length=MAX_PHOTO_CHARS)
    location: str | None = Field(default=None, max_length=120)
    name: str | None = Field(default=None, min_length=1, max_length=200)
    category: str | None = Field(default=None, min_length=1, max_length=120)
    supplier: str | None = Field(default=None, max_length=200)
    unit_cost_ghs: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    selling_price_ghs: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    expiry_date: LooseDate | None = None
    manufacturing_date: LooseDate | None = None


class NoteBody(CamelModel):
    note: str = Field(min_length=1, max_length=2000)


class OptionalNoteBody(CamelModel):
    note: str | None = Field(default=None, max_length=2000)


class ReasonBody(CamelModel):
    reason: WorkflowReason
    note: str | None = Field(default=None, max_length=2000)


class CloseFlagBody(CamelModel):
    status: Literal["resolved", "dismissed"]
    note: str | None = Field(default=None, max_length=2000)


class SellBody(CamelModel):
    units: int = Field(gt=0, le=1_000_000)


def iso(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None
