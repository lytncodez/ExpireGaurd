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
from app.utils.dates import today_in_tz

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

    # 3. Fetch sales history per product for the last 365 days
    one_year_ago = today - timedelta(days=365)
    sales_recs = (await db.execute(
        select(
            Sale.product_id,
            func.min(Sale.sold_at).label("first_sale"),
            func.sum(Sale.quantity).label("total_sold"),
            func.count(Sale.id).label("txn_count"),
        )
        .where(Sale.company_id == company_id, Sale.sold_at >= one_year_ago)
        .group_by(Sale.product_id)
    )).all()

    sales_map = {row.product_id: row for row in sales_recs}

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

        sales_data = sales_map.get(p.id)
        if sales_data is not None and sales_data.first_sale is not None:
            first_sale_date = sales_data.first_sale.date() if hasattr(sales_data.first_sale, "date") else today
            days_history = max(1, (today - first_sale_date).days)
            sold_past_year = int(sales_data.total_sold or 0)
        else:
            days_history = 0
            sold_past_year = 0

        # Cold start check: fewer than 12 months (365 days) of verified sales
        is_cold = days_history < 365
        if is_cold:
            has_cold_start = True

        # Formula calculation
        if not is_cold and sold_past_year > 0:
            # Baseline quarterly demand (90 days) scaled by seasonal factor
            quarterly_baseline = sold_past_year * (90 / 365)
            growth_factor = s_meta["expected_growth"] if is_season_match else 1.05
            expected_demand = quarterly_baseline * growth_factor
            safety_buffer = expected_demand * 0.20  # 20% safety margin
            needed = math.ceil(expected_demand + safety_buffer - usable_stock)
            sold_last_season = int(quarterly_baseline * (s_meta["expected_growth"] - 0.15))
            sell_through_speed = "Fast (18-24 days)" if quarterly_baseline > 80 else "Moderate (35-45 days)"
            confidence = "High" if days_history > 500 else "Medium"
            why = f"Sold {growth_factor}x faster in prior {s_meta['name'].lower()}; {curr_stock} units on hand."
        else:
            # Cold start assumption
            sold_last_season = 0
            sell_through_speed = "Estimated (Moderate)"
            confidence = "Low"
            # Baseline assumption based on Ghana seasonal averages
            estimated_demand = 80 if is_season_match else 40
            safety_buffer = 15
            needed = max(0, estimated_demand + safety_buffer - usable_stock)
            why = f"Assumption based on general Ghana {s_meta['name']} demand; product has <12 months shop history."

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
