"""Seasonal aggregation engine & purchase recommendation planner.

Computes monthly & seasonal sales, sell-through velocity, and transparent
purchase recommendations with strict cold-start detection (<12 months history)
and FEFO expiry cross-checking.
"""

from __future__ import annotations

import math
import uuid
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Batch, BatchStatus, Company, Product, Sale, WorkflowStatus
from app.schemas.ai import SeasonalProductRecommendation, SeasonalRecommendationCard
from app.services.auth_service import get_company
from app.utils.dates import start_of_local_day_utc, today_in_tz

# Ghana seasonal calendar definitions
SEASONS_INFO = {
    "RAINY": {
        "name": "Rainy Season (Major Peak)",
        "date_range": "Apr to Jul",
        "months": [4, 5, 6, 7],
        "keywords": ["malaria", "artemether", "artesunate", "lumefantrine", "ors", "amoxicillin", "zinc", "paracetamol"],
        "expected_growth": 1.45,
    },
    "HARMATTAN": {
        "name": "Harmattan Season",
        "date_range": "Dec to Feb",
        "months": [12, 1, 2],
        "keywords": ["cough", "syrup", "cetirizine", "lozenge", "eye drop", "petroleum", "hydrocortisone", "menthol"],
        "expected_growth": 1.35,
    },
    "BACK_TO_SCHOOL": {
        "name": "Back-to-School Resumption",
        "date_range": "Aug to Sep",
        "months": [8, 9],
        "keywords": ["vitamin", "deworm", "albendazole", "multivitamin", "first aid", "plaster"],
        "expected_growth": 1.25,
    },
}

SUPPLIER_PACK_SIZE = 10  # Standard wholesale packaging unit in Ghana


def detect_season_for_query(query: str, current_month: int) -> str:
    q = query.lower()
    if any(w in q for w in ["harmattan", "cold", "dry", "dust", "cough", "december"]):
        return "HARMATTAN"
    if any(w in q for w in ["school", "deworm", "child", "september"]):
        return "BACK_TO_SCHOOL"
    if any(w in q for w in ["rain", "rainy", "malaria", "water", "wet", "april", "july"]):
        return "RAINY"
    # Default based on current month:
    if current_month in [11, 12, 1, 2]:
        return "HARMATTAN"
    if current_month in [7, 8, 9]:
        return "BACK_TO_SCHOOL"
    return "RAINY"


async def compute_seasonal_plan(
    db: AsyncSession,
    company_id: uuid.UUID,
    season_key: str | None = None,
    query: str = "",
) -> SeasonalRecommendationCard:
    """Compute transparent seasonal purchase recommendations backed by actual stock and sales data."""
    company = await get_company(db, company_id)
    today = today_in_tz(company.timezone)
    season_id = season_key or detect_season_for_query(query, today.month)
    s_meta = SEASONS_INFO.get(season_id, SEASONS_INFO["RAINY"])

    # 1. Fetch active products
    prods = list((await db.scalars(
        select(Product).where(Product.company_id == company_id, Product.is_active.is_(True))
    )).all())

    # 2. Fetch all batches with positive stock
    batch_rows = list((await db.scalars(
        select(Batch).where(
            Batch.company_id == company_id,
            Batch.remaining_quantity > 0,
            Batch.workflow_status == WorkflowStatus.ACTIVE,
        )
    )).all())

    stock_by_product: dict[uuid.UUID, int] = {}
    expiring_soon_by_product: dict[uuid.UUID, int] = {}
    for b in batch_rows:
        stock_by_product[b.product_id] = stock_by_product.get(b.product_id, 0) + b.remaining_quantity
        days_left = (b.expiry_date - today).days
        # If batch expires within 45 days, it cannot serve the full coming season
        if days_left <= 45:
            expiring_soon_by_product[b.product_id] = expiring_soon_by_product.get(b.product_id, 0) + b.remaining_quantity

    # 3. Sales history. sold_at is a timestamp, so compare against a timestamp (not a date).
    year_start = start_of_local_day_utc(today - timedelta(days=365), company.timezone)
    first_sale_rows = (await db.execute(
        select(Sale.product_id, func.min(Sale.sold_at))
        .where(Sale.company_id == company_id)
        .group_by(Sale.product_id)
    )).all()
    first_sale_map = {pid: first for pid, first in first_sale_rows}

    month_col = func.extract("month", Sale.sold_at)
    monthly_rows = (await db.execute(
        select(Sale.product_id, month_col.label("month"), func.sum(Sale.quantity))
        .where(Sale.company_id == company_id, Sale.sold_at >= year_start)
        .group_by(Sale.product_id, month_col)
    )).all()
    sold_past_year_map: dict[uuid.UUID, int] = {}
    sold_in_season_map: dict[uuid.UUID, int] = {}
    for pid, month, qty in monthly_rows:
        qty = int(qty or 0)
        sold_past_year_map[pid] = sold_past_year_map.get(pid, 0) + qty
        if int(month) in s_meta["months"]:
            sold_in_season_map[pid] = sold_in_season_map.get(pid, 0) + qty

    recommendations: list[SeasonalProductRecommendation] = []
    total_cost = 0.0
    has_cold_start = False

    # Filter or prioritize products that match seasonal relevance
    relevant_prods = []
    for p in prods:
        p_name = p.name.lower()
        is_relevant = any(k in p_name for k in s_meta["keywords"])
        if is_relevant or len(relevant_prods) < 6:
            relevant_prods.append((p, is_relevant))

    # Sort so seasonally targeted items come first
    relevant_prods.sort(key=lambda item: (not item[1], item[0].name))

    for p, is_season_match in relevant_prods[:6]:
        curr_stock = stock_by_product.get(p.id, 0)
        unusable_stock = expiring_soon_by_product.get(p.id, 0)
        usable_stock = max(0, curr_stock - unusable_stock)

        first_sale = first_sale_map.get(p.id)
        days_history = max(0, (today - first_sale.date()).days) if first_sale is not None else 0
        sold_past_year = sold_past_year_map.get(p.id, 0)
        # Real units sold during this season's months over the past year (not an estimate).
        sold_last_season = sold_in_season_map.get(p.id, 0)

        # Cold start check: fewer than 12 months of verified sales in this pharmacy
        is_cold = days_history < 365
        if is_cold:
            has_cold_start = True

        growth_factor = s_meta["expected_growth"] if is_season_match else 1.05
        if not is_cold and sold_past_year > 0:
            # Baseline 90-day demand from the past year, scaled by an ASSUMED seasonal uplift;
            # never below what was actually sold in last year's season.
            quarterly_baseline = sold_past_year * (90 / 365)
            expected_demand = max(quarterly_baseline * growth_factor, float(sold_last_season))
            safety_buffer = expected_demand * 0.20  # 20% safety margin
            needed = math.ceil(expected_demand + safety_buffer - usable_stock)
            sell_through_speed = "Fast" if quarterly_baseline > 80 else "Moderate"
            confidence = "High" if days_history >= 730 else "Medium"
            why = (
                f"Sold {sold_past_year} units in the past year ({sold_last_season} during these months); "
                f"plan assumes {growth_factor}x normal demand in season. {curr_stock} units on hand"
                + (f", {unusable_stock} expiring within 45 days." if unusable_stock else ".")
            )
        else:
            # Cold start: not enough history, fall back to a general assumption (clearly labelled)
            sell_through_speed = "Unknown (new product)"
            confidence = "Low"
            estimated_demand = 80 if is_season_match else 40
            safety_buffer = 15
            needed = max(0, estimated_demand + safety_buffer - usable_stock)
            why = (
                f"Less than 12 months of sales history here, so this uses a general {s_meta['name']} "
                f"assumption, not your records. {curr_stock} units on hand."
            )

        # Round up to supplier pack size (multiples of 10)
        if needed > 0:
            recommended_order = math.ceil(needed / SUPPLIER_PACK_SIZE) * SUPPLIER_PACK_SIZE
        else:
            recommended_order = 0

        cost_price = float(p.cost_price or 0.0)
        item_total_cost = recommended_order * cost_price
        total_cost += item_total_cost

        recommendations.append(SeasonalProductRecommendation(
            product_id=str(p.id),
            product=p.name,
            current_stock=curr_stock,
            recommended_order_qty=recommended_order,
            sold_last_season=sold_last_season,
            sell_through_speed=sell_through_speed,
            confidence=confidence,
            why=why,
            cost_ghs=round(item_total_cost, 2),
            cold_start=is_cold,
        ))

    cold_start_note = (
        "Notice: One or more products have fewer than 12 months of local sales history in this pharmacy. "
        "Recommendations marked 'Low' confidence reflect general Ghana seasonal demand assumptions, "
        "not patterns learned from historical shop records."
    ) if has_cold_start else None

    return SeasonalRecommendationCard(
        season_name=s_meta["name"],
        date_range=s_meta["date_range"],
        products=recommendations,
        estimated_total_cost_ghs=round(total_cost, 2),
        disclaimer="The AI only recommends. It never places orders automatically.",
        cold_start_note=cold_start_note,
    )
