"""Demand forecast (predictive analysis) per product.

Method (deterministic, explainable, no AI):
  - weekly units sold over the last 12 weeks (only weeks since the product's first sale count)
  - level  = average of the last 4 weeks
  - trend  = least-squares slope over those weeks, damped by half and capped at +/-50% of the level
  - projection = level adjusted by the trend to the middle of the horizon
  - products with little history use the daily average from sales-history files the user kept in the AI chat
Days of cover and reorder suggestions (forecast + 7 days safety stock - current stock) follow from that.
"""

from __future__ import annotations

import math
import uuid
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

HISTORY_WEEKS = 12
SAFETY_DAYS = 7
METHOD = "12-week moving average with damped trend"


@dataclass
class SeriesForecast:
    daily_rate: float
    forecast_units: int
    trend_pct: float | None
    confidence: str


def project(weekly: list[float], horizon_days: int) -> SeriesForecast:
    """Forecast from weekly totals (oldest first). Pure function."""
    n = len(weekly)
    if n == 0:
        return SeriesForecast(0.0, 0, None, "Low")
    recent = weekly[-min(4, n):]
    level = sum(recent) / len(recent)
    trend_pct: float | None = None
    projected = level
    if n >= 6:
        xs = list(range(n))
        mx, my = sum(xs) / n, sum(weekly) / n
        denom = sum((x - mx) ** 2 for x in xs)
        slope = sum((x - mx) * (y - my) for x, y in zip(xs, weekly)) / denom if denom else 0.0
        offset = (len(recent) - 1) / 2 + 1 + (horizon_days / 7) / 2  # from the middle of the level window
        projected = level + 0.5 * slope * offset
        if level > 0:
            projected = min(max(projected, 0.5 * level), 1.5 * level)
            trend_pct = round((projected - level) / level * 100, 1)
        projected = max(projected, 0.0)
    active_weeks = sum(1 for w in weekly if w > 0)
    confidence = "High" if n >= 8 and active_weeks >= 6 else "Medium" if n >= 4 and active_weeks >= 2 else "Low"
    daily = projected / 7
    return SeriesForecast(round(daily, 3), int(round(daily * horizon_days)), trend_pct, confidence)


def reorder_units(forecast_units: int, daily_rate: float, stock: int) -> int:
    need = forecast_units + daily_rate * SAFETY_DAYS - stock
    return max(0, math.ceil(need)) if need > 0.5 else 0


async def forecast(db, company_id: uuid.UUID, horizon_days: int = 30, limit: int = 25) -> dict[str, Any]:
    from sqlalchemy import func, select

    from app.models import Batch, Product, Sale, WorkflowStatus
    from app.services.ai_dataset_service import kept_sales_daily_avg
    from app.services.auth_service import get_company
    from app.utils.dates import local_date, start_of_local_day_utc, today_in_tz

    company = await get_company(db, company_id)
    today = today_in_tz(company.timezone)
    start = today - timedelta(days=HISTORY_WEEKS * 7 - 1)

    products = {p.id: p for p in (await db.scalars(
        select(Product).where(Product.company_id == company_id, Product.is_active.is_(True))
    )).all()}
    stock: dict[uuid.UUID, int] = {
        pid: int(q) for pid, q in (await db.execute(
            select(Batch.product_id, func.sum(Batch.remaining_quantity))
            .where(Batch.company_id == company_id, Batch.remaining_quantity > 0,
                   Batch.workflow_status == WorkflowStatus.ACTIVE, Batch.expiry_date > today)
            .group_by(Batch.product_id)
        )).all()
    }
    first_sale: dict[uuid.UUID, date] = {
        pid: local_date(ts, company.timezone) for pid, ts in (await db.execute(
            select(Sale.product_id, func.min(Sale.sold_at)).where(Sale.company_id == company_id).group_by(Sale.product_id)
        )).all()
    }
    weekly: dict[uuid.UUID, list[float]] = {}
    company_weeks = [0.0] * HISTORY_WEEKS
    for pid, sold_at, qty in (await db.execute(
        select(Sale.product_id, Sale.sold_at, Sale.quantity)
        .where(Sale.company_id == company_id, Sale.sold_at >= start_of_local_day_utc(start, company.timezone))
    )).all():
        idx = (local_date(sold_at, company.timezone) - start).days // 7
        if 0 <= idx < HISTORY_WEEKS:
            weekly.setdefault(pid, [0.0] * HISTORY_WEEKS)[idx] += qty
            company_weeks[idx] += qty

    file_avgs = await kept_sales_daily_avg(db, company_id)
    items: list[dict[str, Any]] = []
    used_file_names: set[str] = set()
    for pid, product in products.items():
        series = weekly.get(pid)
        first = first_sale.get(pid)
        n_weeks = min(HISTORY_WEEKS, max(1, math.ceil(((today - first).days + 1) / 7))) if first else 0
        history = series[-n_weeks:] if series and n_weeks else []
        f = project(history, horizon_days) if history else SeriesForecast(0.0, 0, None, "Low")
        source = "sales"
        file_entry = file_avgs.get(product.name.strip().lower())
        if file_entry and n_weeks < 4:
            used_file_names.add(product.name.strip().lower())
            file_daily = file_entry[1]
            daily = file_daily if not history else (f.daily_rate + file_daily) / 2
            f = SeriesForecast(round(daily, 3), int(round(daily * horizon_days)), None,
                               "Medium" if history else "Low")
            source = "uploaded file" if not history else "sales + uploaded file"
        on_hand = stock.get(pid, 0)
        if f.forecast_units == 0 and f.daily_rate == 0:
            continue
        items.append({
            "product_id": str(pid), "product": product.name, "source": source,
            "daily_rate": f.daily_rate, "forecast_units": f.forecast_units, "trend_pct": f.trend_pct,
            "stock": on_hand,
            "days_of_cover": round(on_hand / f.daily_rate, 1) if f.daily_rate > 0 else None,
            "reorder_units": reorder_units(f.forecast_units, f.daily_rate, on_hand),
            "expected_revenue": float(round(Decimal(f.forecast_units) * (product.selling_price or Decimal("0")), 2)),
            "confidence": f.confidence, "history_weeks": n_weeks,
        })
    # Products that only exist in an uploaded sales file (not yet in ExpireGuard)
    for key, (name, daily) in file_avgs.items():
        if key in used_file_names or any(p.name.strip().lower() == key for p in products.values()):
            continue
        units = int(round(daily * horizon_days))
        if units <= 0:
            continue
        items.append({
            "product_id": None, "product": name, "source": "uploaded file (not in stock list)",
            "daily_rate": round(daily, 3), "forecast_units": units, "trend_pct": None, "stock": 0,
            "days_of_cover": 0.0, "reorder_units": reorder_units(units, daily, 0), "expected_revenue": None,
            "confidence": "Low", "history_weeks": 0,
        })

    items.sort(key=lambda i: (-i["forecast_units"], i["product"]))
    total_units = sum(i["forecast_units"] for i in items)
    total_revenue = round(sum(i["expected_revenue"] or 0 for i in items), 2)
    reorder = [i for i in items if i["reorder_units"] > 0]
    return {
        "as_of": today.isoformat(),
        "horizon_days": horizon_days,
        "method": METHOD,
        "products_count": len(items),
        "total_forecast_units": total_units,
        "total_expected_revenue": total_revenue,
        "reorder_count": len(reorder),
        "weekly_history": [
            {"week_start": (start + timedelta(days=7 * i)).isoformat(), "units": round(u)}
            for i, u in enumerate(company_weeks)
        ],
        "projected_weekly_units": round(total_units / horizon_days * 7) if horizon_days else 0,
        "products": items[:limit],
        "notes": [
            "Projections assume recent sales patterns continue. Promotions, outbreaks, holidays or supply "
            "problems can change actual demand.",
            "Reorder suggestions cover the forecast plus 7 days of safety stock, minus sellable (non-expired) stock.",
        ],
    }


def forecast_charts(ctx: dict[str, Any]) -> list[dict[str, Any]]:
    """MiniChart payloads (bar / line) built from the forecast section of an AI context."""
    fc = ctx.get("forecast") or {}
    items = fc.get("products") or []
    if not items:
        return []
    charts: list[dict[str, Any]] = [{
        "type": "bar",
        "title": f"Expected units sold in the next {fc['horizon_days']} days",
        "labels": [i["product"][:28] for i in items[:8]],
        "values": [i["forecast_units"] for i in items[:8]],
        "unit": "units",
    }]
    history = fc.get("weekly_history") or []
    if history:
        weeks_ahead = max(1, min(13, round(fc["horizon_days"] / 7)))
        labels = [h["week_start"][5:] for h in history] + [f"+{k}w" for k in range(1, weeks_ahead + 1)]
        values = [h["units"] for h in history] + [fc.get("projected_weekly_units", 0)] * weeks_ahead
        charts.append({"type": "line", "title": "Weekly units: last 12 weeks, then projection",
                       "labels": labels, "values": values, "unit": "units"})
    return charts
