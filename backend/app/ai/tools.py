"""Structured database tools for AI assistant.

Read-only, parameterized queries ensuring all numerical figures
are strictly grounded in the database ledger.
"""

from __future__ import annotations

import uuid
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Batch, BatchStatus, Company, InventoryMovement, MovementType, Product, Sale, WorkflowStatus
from app.services.auth_service import get_company
from app.utils.dates import today_in_tz


async def tool_get_current_stock(
    db: AsyncSession, company_id: uuid.UUID, product_name: str | None = None
) -> dict[str, Any]:
    """Tool: Get current stock breakdown by product and batch."""
    stmt = (
        select(Product.id, Product.name, Batch.batch_number, Batch.remaining_quantity, Batch.expiry_date, Batch.status)
        .join(Batch, Batch.product_id == Product.id)
        .where(
            Product.company_id == company_id,
            Product.is_active.is_(True),
            Batch.remaining_quantity > 0,
            Batch.workflow_status == WorkflowStatus.ACTIVE,
        )
    )
    if product_name:
        stmt = stmt.where(Product.name.ilike(f"%{product_name}%"))
    rows = (await db.execute(stmt.limit(20))).all()
    return {
        "tool": "get_current_stock",
        "results": [
            {
                "product_id": str(r[0]),
                "product": r[1],
                "batch_number": r[2],
                "remaining_quantity": r[3],
                "expiry_date": r[4].isoformat(),
                "status": r[5].value if hasattr(r[5], "value") else str(r[5]),
            }
            for r in rows
        ],
    }


async def tool_get_expiry_risks(
    db: AsyncSession, company_id: uuid.UUID, days_threshold: int = 60
) -> dict[str, Any]:
    """Tool: Retrieve batches approaching expiry within a given window."""
    company = await get_company(db, company_id)
    today = today_in_tz(company.timezone)
    target_date = today + timedelta(days=days_threshold)

    rows = (
        await db.execute(
            select(
                Product.name, Batch.batch_number, Batch.remaining_quantity, Batch.expiry_date,
                Product.cost_price, Product.selling_price
            )
            .join(Product, Product.id == Batch.product_id)
            .where(
                Batch.company_id == company_id,
                Batch.remaining_quantity > 0,
                Batch.expiry_date <= target_date,
                Batch.workflow_status != WorkflowStatus.DISPOSED,
            )
            .order_by(Batch.expiry_date.asc())
            .limit(20)
        )
    ).all()

    total_value_at_risk = Decimal("0")
    results = []
    for r in rows:
        days_left = (r[3] - today).days
        val = Decimal(r[2]) * r[4]
        total_value_at_risk += val
        results.append({
            "product": r[0],
            "batch_number": r[1],
            "units": r[2],
            "expiry_date": r[3].isoformat(),
            "days_remaining": days_left,
            "cost_value_ghs": float(val),
        })

    return {
        "tool": "get_expiry_risks",
        "days_threshold": days_threshold,
        "total_value_at_risk_ghs": float(total_value_at_risk),
        "batches": results,
    }


async def tool_get_sales_history(
    db: AsyncSession, company_id: uuid.UUID, period_days: int = 30
) -> dict[str, Any]:
    """Tool: Retrieve sales velocity and recent turnover figures."""
    company = await get_company(db, company_id)
    today = today_in_tz(company.timezone)
    start_dt = today - timedelta(days=period_days)

    rows = (
        await db.execute(
            select(
                Product.name,
                func.sum(Sale.quantity).label("units_sold"),
                func.sum(Sale.total_amount).label("revenue"),
            )
            .join(Product, Product.id == Sale.product_id)
            .where(Sale.company_id == company_id, Sale.sold_at >= start_dt)
            .group_by(Product.name)
            .order_by(func.sum(Sale.quantity).desc())
            .limit(10)
        )
    ).all()

    return {
        "tool": "get_sales_history",
        "period_days": period_days,
        "top_selling_products": [
            {"product": r[0], "units_sold": int(r[1] or 0), "revenue_ghs": float(r[2] or 0)}
            for r in rows
        ],
    }


async def tool_get_supplier_history(
    db: AsyncSession, company_id: uuid.UUID
) -> dict[str, Any]:
    """Tool: Retrieve supplier delivery and short-dated batch receipt statistics."""
    rows = (
        await db.execute(
            select(
                Batch.supplier,
                func.count(Batch.id).label("total_batches_supplied"),
                func.sum(Batch.initial_quantity).label("total_units"),
            )
            .where(Batch.company_id == company_id, Batch.supplier.isnot(None))
            .group_by(Batch.supplier)
            .order_by(func.count(Batch.id).desc())
            .limit(10)
        )
    ).all()

    return {
        "tool": "get_supplier_history",
        "suppliers": [
            {"supplier": r[0], "batches_delivered": r[1], "units_delivered": int(r[2] or 0)}
            for r in rows
        ],
    }
