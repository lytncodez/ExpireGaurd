"""Frontend inventory items: one batch + its product, shaped like the React app's InventoryItem.

All rules the old browser-only prototype applied in localStorage now run here, per request:
role-scoped cost/supplier visibility, the quarantine / supplier-return / disposal workflow, the
per-batch activity history, and dispensing (via the FEFO-aware sales service).
"""

from __future__ import annotations

import secrets
import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequestError, ConflictError, NotFoundError, PermissionDeniedError
from app.models import (
    Alert,
    AuditAction,
    Batch,
    Category,
    InventoryMovement,
    MovementType,
    Product,
    Sale,
    User,
    UserRole,
    WorkflowReason,
    WorkflowStatus,
)
from app.schemas.items import (
    Acknowledgement,
    ActivityEntry,
    CloseFlagBody,
    InventoryItemOut,
    ItemCreate,
    ItemUpdate,
    ReasonBody,
    iso,
)
from app.schemas.sales import SaleCreate
from app.services import activity_service, audit_service, product_service, sales_service
from app.services.analytics_service import product_performance
from app.services.auth_service import get_company
from app.services.batch_service import build_batch, delete_batch
from app.services.expiry_service import RISK_LABELS, batch_status, classify, run_expiry_check, thresholds_for
from app.utils.dates import days_until, today_in_tz, utcnow
from app.utils.validators import normalize_barcode, normalize_batch_number, normalize_sku

RECOMMENDED_ACTIONS = {
    "Expired": "Remove from sale, quarantine and dispose",
    "Critical": "Dispense first (FEFO) or arrange a supplier return",
    "Action Required": "Prioritise stock for sale",
    "Monitor": "Halt reordering and track sales velocity",
    "Safe": "Standard stock rotation",
}
WORKFLOW_ACTIONS = {
    WorkflowStatus.QUARANTINED: "Keep isolated; dispose or return to supplier",
    WorkflowStatus.PENDING_RETURN: "Awaiting supplier return processing",
    WorkflowStatus.DISPOSED: "No action: batch disposed",
}
WORKFLOW_LABELS = {
    WorkflowStatus.QUARANTINED: "Quarantined",
    WorkflowStatus.PENDING_RETURN: "Pending Return",
    WorkflowStatus.DISPOSED: "Disposed",
}
DISPOSAL_MOVEMENT = {
    WorkflowReason.EXPIRED: MovementType.EXPIRED,
    WorkflowReason.DAMAGED: MovementType.DAMAGED,
    WorkflowReason.SUPPLIER_RETURN: MovementType.TRANSFER,
    WorkflowReason.OTHER: MovementType.ADJUSTMENT,
}
VELOCITY = {
    "FAST_MOVER": "Fast",
    "LOW_STOCK_HIGH_SALES": "Fast",
    "NORMAL": "Moderate",
    "SLOW_MOVER": "Slow",
    "HIGH_STOCK_LOW_SALES": "Slow",
}


def is_admin(user: User) -> bool:
    return user.role == UserRole.ADMIN


def _require_admin(user: User) -> None:
    if not is_admin(user):
        raise PermissionDeniedError("Only an admin can do this")


def _f(value: Decimal | None) -> float | None:
    return float(value) if value is not None else None


# --------------------------------------------------------------------------- read


async def _load(
    db: AsyncSession, user: User, batch_id: uuid.UUID | None = None, include_depleted: bool = False
) -> list[InventoryItemOut]:
    company = await get_company(db, user.company_id)
    today = today_in_tz(company.timezone)
    t = thresholds_for(company)
    stmt = (
        select(Batch, Product, Category.name)
        .join(Product, Product.id == Batch.product_id)
        .outerjoin(Category, Category.id == Product.category_id)
        .where(Batch.company_id == user.company_id, Product.is_active.is_(True))
    )
    if batch_id is not None:
        stmt = stmt.where(Batch.id == batch_id)
    elif not include_depleted:  # sold-out stock drops off the list; disposed batches stay for the Disposed view
        stmt = stmt.where((Batch.remaining_quantity > 0) | (Batch.workflow_status != WorkflowStatus.ACTIVE))
    rows = (await db.execute(stmt.order_by(Batch.expiry_date, Batch.batch_number))).all()
    if batch_id is not None and not rows:
        raise NotFoundError("Inventory item not found")

    ids = [b.id for b, _, _ in rows]
    sold: dict[uuid.UUID, int] = {}
    if ids:
        sold = {
            bid: int(units)
            for bid, units in (
                await db.execute(
                    select(Sale.batch_id, func.coalesce(func.sum(Sale.quantity), 0))
                    .where(Sale.batch_id.in_(ids))
                    .group_by(Sale.batch_id)
                )
            ).all()
        }
    activity = await activity_service.for_batches(db, ids)
    velocity: dict[uuid.UUID, str] = {}
    for p in await product_performance(db, company, today, settings.ANALYTICS_DEFAULT_DAYS):
        velocity[p.product_id] = "Dead" if p.units_sold == 0 else VELOCITY.get(p.classification, "Moderate")

    admin = is_admin(user)
    return [
        _to_item(b, p, cat, today, t, sold.get(b.id, 0), activity.get(b.id, []), velocity, admin)
        for b, p, cat in rows
    ]


def _to_item(batch, product, category_name, today, t, units_sold, activities, velocity, admin) -> InventoryItemOut:
    days = days_until(batch.expiry_date, today)
    risk = RISK_LABELS[classify(days, t)]
    if batch.workflow_status in WORKFLOW_LABELS:
        status = WORKFLOW_LABELS[batch.workflow_status]
        action = WORKFLOW_ACTIONS[batch.workflow_status]
    else:
        status = "Low Stock" if batch.remaining_quantity <= settings.LOW_STOCK_THRESHOLD else "In Stock"
        action = RECOMMENDED_ACTIONS[risk]
    supplier_return = dict(batch.supplier_return) if batch.supplier_return else None
    if supplier_return and not admin:
        supplier_return.pop("supplierName", None)
    selling = _f(product.selling_price)
    cost = _f(product.cost_price)
    return InventoryItemOut(
        id=batch.id,
        product_id=product.id,
        name=product.name,
        product_name=product.name,
        category=category_name or "General",
        sku=product.sku,
        barcode=product.barcode,
        unit=product.unit,
        batch_no=batch.batch_number,
        batch_number=batch.batch_number,
        quantity=max(batch.remaining_quantity, 0),
        units_sold=units_sold,
        unit_price=(cost if admin else selling) or 0.0,
        unit_cost_ghs=cost if admin else None,
        selling_price_ghs=selling,
        expiry_date=batch.expiry_date,
        manufacturing_date=batch.manufacturing_date,
        date_received=batch.date_received if admin else None,
        photo_url=product.photo,
        days_to_expiry=days,
        supplier=batch.supplier if admin else None,
        location=batch.storage_location,
        storage_location=batch.storage_location,
        status=status,
        risk_status=risk,
        recommended_action=action,
        velocity=velocity.get(product.id, "Moderate"),
        acknowledged=Acknowledgement(
            actor_id=str(batch.acknowledged_by or ""), actor_name=batch.acknowledged_by_name or "",
            at=iso(batch.acknowledged_at) or "",
        ) if batch.acknowledged_at else None,
        activity_log=[
            ActivityEntry(id=str(a.id), action=a.action, actor_id=str(a.user_id or ""), actor_name=a.actor_name,
                          at=iso(a.created_at) or "", note=a.note)
            for a in activities
        ],
        admin_flag=batch.admin_flag,
        supplier_return_request=supplier_return,
        quarantine_reason=batch.quarantine_reason,
        disposal=batch.disposal,
    )


async def list_items(db: AsyncSession, user: User, include_depleted: bool = False) -> list[InventoryItemOut]:
    return await _load(db, user, include_depleted=include_depleted)


async def get_item(db: AsyncSession, user: User, batch_id: uuid.UUID) -> InventoryItemOut:
    return (await _load(db, user, batch_id))[0]


# --------------------------------------------------------------------------- create / update / delete


async def _match_product(db: AsyncSession, company_id: uuid.UUID, data: ItemCreate,
                         barcode: str | None, sku: str | None) -> Product | None:
    conditions = []
    if barcode:
        conditions.append(Product.barcode == barcode)
    if sku:
        conditions.append(Product.sku == sku)
    if conditions:
        found = await db.scalar(select(Product).where(Product.company_id == company_id, or_(*conditions)).limit(1))
        if found:
            return found
    return await db.scalar(
        select(Product)
        .where(Product.company_id == company_id, func.lower(Product.name) == data.name.strip().lower())
        .order_by(Product.is_active.desc(), Product.created_at)
        .limit(1)
    )


async def _unique_batch_number(db: AsyncSession, product_id: uuid.UUID, today: date) -> str:
    for _ in range(10):
        candidate = f"B-{today:%y%m%d}-{secrets.token_hex(2).upper()}"
        if not await db.scalar(select(Batch.id).where(Batch.product_id == product_id, Batch.batch_number == candidate)):
            return candidate
    raise ConflictError("Could not allocate a batch number; please enter one")


async def create_item(db: AsyncSession, user: User, data: ItemCreate, ip: str | None) -> InventoryItemOut:
    admin = is_admin(user)
    company = await get_company(db, user.company_id)
    today = today_in_tz(company.timezone)
    try:
        barcode = normalize_barcode(data.barcode)
        sku = normalize_sku(data.sku)
    except ValueError as exc:
        raise BadRequestError(str(exc)) from exc

    category = await product_service.get_or_create_category(db, user.company_id, data.category.strip())
    cost = (data.unit_cost_ghs if data.unit_cost_ghs is not None else data.unit_price) if admin else None
    selling = data.selling_price_ghs

    product = await _match_product(db, user.company_id, data, barcode, sku)
    if product is None:
        product = Product(
            company_id=user.company_id,
            category_id=category.id,
            name=data.name.strip(),
            sku=sku or f"AUTO-{secrets.token_hex(4).upper()}",
            barcode=barcode,
            unit=(data.unit or "unit").strip(),
            selling_price=selling or Decimal("0"),
            cost_price=cost or Decimal("0"),
            is_active=True,
        )
        db.add(product)
        try:
            async with db.begin_nested():
                await db.flush()
        except IntegrityError as exc:
            raise ConflictError("A product with this barcode or SKU already exists") from exc
        audit_service.record(
            db, action=AuditAction.PRODUCT_CREATED, company_id=user.company_id, user_id=user.id,
            entity_type="product", entity_id=product.id, metadata={"name": product.name, "via": "items"},
            ip_address=ip,
        )
    else:
        if not product.is_active:
            product.is_active = True
        if product.category_id is None:
            product.category_id = category.id
        if admin and cost is not None:
            product.cost_price = cost
        if admin and selling is not None:
            product.selling_price = selling
        if barcode and not product.barcode:
            product.barcode = barcode

    batch_number = normalize_batch_number(data.batch_no) or await _unique_batch_number(db, product.id, today)
    if await db.scalar(select(Batch.id).where(Batch.product_id == product.id, Batch.batch_number == batch_number)):
        raise ConflictError(
            "This batch number already exists for the product",
            details={"batchNo": batch_number, "productId": str(product.id)},
        )
    batch, movement = build_batch(
        product, batch_number, data.expiry_date, data.quantity, today, data.manufacturing_date,
        thresholds_for(company),
        supplier=data.supplier.strip() if admin and data.supplier else None,
        storage_location=data.location.strip() if data.location else None,
        date_received=data.date_received if admin else None,
    )
    if data.status == "Quarantined":
        batch.workflow_status = WorkflowStatus.QUARANTINED
        batch.quarantine_reason = WorkflowReason.OTHER
    db.add(batch)
    await db.flush()
    db.add(movement)
    activity_service.log(db, company_id=user.company_id, batch_id=batch.id, user=user,
                         action=f"Received batch ({data.quantity:,} units)")
    if data.status == "Pending Return":
        _start_return(batch, user, note=None)
        activity_service.log(db, company_id=user.company_id, batch_id=batch.id, user=user,
                             action="Requested supplier return")
    audit_service.record(
        db, action=AuditAction.BATCH_CREATED, company_id=user.company_id, user_id=user.id,
        entity_type="batch", entity_id=batch.id,
        metadata={"product": product.name, "batch_number": batch_number, "quantity": data.quantity,
                  "expiry_date": data.expiry_date.isoformat(), "via": "items"},
        ip_address=ip,
    )
    await db.commit()
    await run_expiry_check(db, user.company_id, actor_id=user.id, batch_ids=[batch.id])
    return await get_item(db, user, batch.id)


async def _batch_and_product(db: AsyncSession, user: User, batch_id: uuid.UUID) -> tuple[Batch, Product]:
    row = (
        await db.execute(
            select(Batch, Product)
            .join(Product, Product.id == Batch.product_id)
            .where(Batch.id == batch_id, Batch.company_id == user.company_id)
            .with_for_update(of=Batch)
        )
    ).first()
    if row is None:
        raise NotFoundError("Inventory item not found")
    return row[0], row[1]


async def update_item(db: AsyncSession, user: User, batch_id: uuid.UUID, data: ItemUpdate, ip: str | None) -> InventoryItemOut:
    batch, product = await _batch_and_product(db, user, batch_id)
    changes = data.model_dump(exclude_unset=True)
    admin_fields = set(changes) - {"photo_url", "location"}
    if admin_fields and not is_admin(user):
        raise PermissionDeniedError("Only an admin can change these fields", details={"fields": sorted(admin_fields)})
    notes: list[str] = []
    if "photo_url" in changes:
        photo = changes["photo_url"]
        if photo and not photo.startswith("data:image/"):
            raise BadRequestError("photoUrl must be an image data URL")
        product.photo = photo or None
        notes.append("Updated product photo")
    if "location" in changes:
        batch.storage_location = (changes["location"] or "").strip() or None
        notes.append("Updated storage location")
    if changes.get("name"):
        product.name = changes["name"].strip()
    if changes.get("category"):
        product.category_id = (await product_service.get_or_create_category(db, user.company_id, changes["category"])).id
    if "supplier" in changes:
        batch.supplier = (changes["supplier"] or "").strip() or None
    if changes.get("unit_cost_ghs") is not None:
        product.cost_price = changes["unit_cost_ghs"]
    if changes.get("selling_price_ghs") is not None:
        product.selling_price = changes["selling_price_ghs"]
    date_changed = False
    if changes.get("expiry_date"):
        batch.expiry_date = changes["expiry_date"]
        date_changed = True
    if "manufacturing_date" in changes:
        batch.manufacturing_date = changes["manufacturing_date"]
    if batch.manufacturing_date and batch.expiry_date < batch.manufacturing_date:
        raise BadRequestError("expiryDate cannot be before manufacturingDate")
    if admin_fields:
        notes.append("Edited batch details")
    for note in notes:
        activity_service.log(db, company_id=user.company_id, batch_id=batch.id, user=user, action=note)
    audit_service.record(
        db, action=AuditAction.BATCH_UPDATED, company_id=user.company_id, user_id=user.id,
        entity_type="batch", entity_id=batch.id, metadata={"fields": sorted(changes)}, ip_address=ip,
    )
    await db.commit()
    if date_changed:
        await run_expiry_check(db, user.company_id, actor_id=user.id, batch_ids=[batch.id])
    return await get_item(db, user, batch.id)


async def delete_item(db: AsyncSession, user: User, batch_id: uuid.UUID, ip: str | None) -> None:
    _require_admin(user)
    await delete_batch(db, user, batch_id, ip)


# --------------------------------------------------------------------------- workflow


def _now() -> str:
    return utcnow().isoformat()


async def _finish(db: AsyncSession, user: User, batch: Batch, action: str, note: str | None, ip: str | None,
                  *, recheck: bool = False) -> InventoryItemOut:
    activity_service.log(db, company_id=user.company_id, batch_id=batch.id, user=user, action=action, note=note)
    audit_service.record(
        db, action=AuditAction.BATCH_WORKFLOW, company_id=user.company_id, user_id=user.id,
        entity_type="batch", entity_id=batch.id, metadata={"action": action, "note": note}, ip_address=ip,
    )
    await db.commit()
    if recheck:  # workflow changes open/close expiry alerts
        await run_expiry_check(db, user.company_id, actor_id=user.id, batch_ids=[batch.id])
    return await get_item(db, user, batch.id)


async def acknowledge(db: AsyncSession, user: User, batch_id: uuid.UUID, ip: str | None) -> InventoryItemOut:
    batch, _ = await _batch_and_product(db, user, batch_id)
    batch.acknowledged_by = user.id
    batch.acknowledged_by_name = user.name
    batch.acknowledged_at = utcnow()
    for alert in (await db.scalars(
        select(Alert).where(Alert.batch_id == batch.id, Alert.is_resolved.is_(False), Alert.is_read.is_(False))
    )).all():
        alert.is_read = True
    return await _finish(db, user, batch, "Acknowledged expiry alert", None, ip)


async def flag_for_review(db: AsyncSession, user: User, batch_id: uuid.UUID, note: str, ip: str | None) -> InventoryItemOut:
    batch, _ = await _batch_and_product(db, user, batch_id)
    batch.admin_flag = {"status": "open", "note": note.strip(), "actorId": str(user.id), "actorName": user.name,
                        "at": _now()}
    return await _finish(db, user, batch, "Flagged for Admin Review", note.strip(), ip)


async def close_flag(db: AsyncSession, user: User, batch_id: uuid.UUID, body: CloseFlagBody, ip: str | None) -> InventoryItemOut:
    _require_admin(user)
    batch, _ = await _batch_and_product(db, user, batch_id)
    if not batch.admin_flag or batch.admin_flag.get("status") != "open":
        raise ConflictError("This batch has no open review flag")
    note = (body.note or "").strip()
    flag = dict(batch.admin_flag)
    flag.update({"status": body.status, "closedBy": user.name, "closedAt": _now()})
    if note:
        flag["resolutionNote"] = note
    batch.admin_flag = flag
    action = "Resolved Admin Review flag" if body.status == "resolved" else "Dismissed Admin Review flag"
    return await _finish(db, user, batch, action, note or None, ip)


async def quarantine(db: AsyncSession, user: User, batch_id: uuid.UUID, body: ReasonBody, ip: str | None) -> InventoryItemOut:
    batch, _ = await _batch_and_product(db, user, batch_id)
    if batch.workflow_status == WorkflowStatus.DISPOSED:
        raise ConflictError("This batch has already been disposed")
    batch.workflow_status = WorkflowStatus.QUARANTINED
    batch.quarantine_reason = body.reason
    note = f"Reason: {body.reason.value}" + (f" — {body.note.strip()}" if body.note and body.note.strip() else "")
    return await _finish(db, user, batch, "Moved to Quarantine", note, ip, recheck=True)


async def add_note(db: AsyncSession, user: User, batch_id: uuid.UUID, note: str, ip: str | None) -> InventoryItemOut:
    batch, _ = await _batch_and_product(db, user, batch_id)
    return await _finish(db, user, batch, "Added batch note", note.strip(), ip)


def _start_return(batch: Batch, user: User, note: str | None) -> None:
    batch.workflow_status = WorkflowStatus.PENDING_RETURN
    request = {
        "status": "requested",
        "supplierName": batch.supplier or "Supplier not recorded",
        "supplierBatchNo": batch.batch_number,
        "requestedBy": user.name,
        "requestedAt": _now(),
    }
    if note:
        request["note"] = note
    batch.supplier_return = request


async def request_return(db: AsyncSession, user: User, batch_id: uuid.UUID, note: str | None, ip: str | None) -> InventoryItemOut:
    batch, _ = await _batch_and_product(db, user, batch_id)
    if batch.supplier_return and batch.supplier_return.get("status") == "requested":
        return await get_item(db, user, batch.id)  # already requested: idempotent, like the frontend
    if batch.workflow_status == WorkflowStatus.DISPOSED:
        raise ConflictError("This batch has already been disposed")
    note = (note or "").strip() or None
    _start_return(batch, user, note)
    return await _finish(db, user, batch, "Requested supplier return", note, ip, recheck=True)


async def process_return(db: AsyncSession, user: User, batch_id: uuid.UUID, ip: str | None) -> InventoryItemOut:
    _require_admin(user)
    batch, _ = await _batch_and_product(db, user, batch_id)
    if not batch.supplier_return:
        raise ConflictError("No supplier return has been requested for this batch")
    request = dict(batch.supplier_return)
    request.update({"status": "processed", "processedBy": user.name, "processedAt": _now()})
    batch.supplier_return = request
    batch.workflow_status = WorkflowStatus.QUARANTINED
    batch.quarantine_reason = WorkflowReason.SUPPLIER_RETURN
    return await _finish(db, user, batch, "Processed supplier return request", None, ip, recheck=True)


async def dispose(db: AsyncSession, user: User, batch_id: uuid.UUID, body: ReasonBody, ip: str | None) -> InventoryItemOut:
    batch, _ = await _batch_and_product(db, user, batch_id)
    if batch.workflow_status == WorkflowStatus.DISPOSED:
        raise ConflictError("This batch has already been disposed")
    company = await get_company(db, user.company_id)
    quantity = max(batch.remaining_quantity, 0)
    note = (body.note or "").strip()
    batch.disposal = {"reason": body.reason.value, "quantity": quantity, "actorId": str(user.id),
                      "actorName": user.name, "at": _now(), **({"note": note} if note else {})}
    batch.workflow_status = WorkflowStatus.DISPOSED
    batch.quarantine_reason = body.reason
    if quantity:
        db.add(InventoryMovement(
            company_id=user.company_id, product_id=batch.product_id, batch_id=batch.id,
            movement_type=DISPOSAL_MOVEMENT[body.reason], quantity=-quantity, reference_type="DISPOSAL",
            reference_id=batch.id, notes=f"Disposed: {body.reason.value}" + (f" — {note}" if note else ""),
        ))
        batch.remaining_quantity = 0
    batch.status = batch_status(batch.expiry_date, batch.remaining_quantity, today_in_tz(company.timezone),
                                thresholds_for(company))
    return await _finish(db, user, batch, "Confirmed physical disposal",
                         f"Reason: {body.reason.value}" + (f" — {note}" if note else ""), ip, recheck=True)


async def sell(db: AsyncSession, user: User, batch_id: uuid.UUID, units: int, ip: str | None) -> InventoryItemOut:
    """Dispense from this exact batch (logs 'Dispensed N units' in the sales service)."""
    batch, product = await _batch_and_product(db, user, batch_id)
    await sales_service.record_sale(db, user, SaleCreate(product_id=product.id, batch_id=batch.id, quantity=units), ip)
    return await get_item(db, user, batch_id)

