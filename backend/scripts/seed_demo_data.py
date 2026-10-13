"""Seed a realistic demo pharmacy for ExpireGuard.

    python scripts/seed_demo_data.py              # (re)create the demo pharmacy
    python scripts/seed_demo_data.py --run-expiry # ...and run the expiry check (alerts + mock SMS)

Logins match the frontend README: admin@expireguard.com / admin123 (admin) and
dispenser@expireguard.com / dispenser123 (dispenser).

Creates categories, 17 medicines with suppliers and shelf locations, current batches across every expiry band (including one
expiring TOMORROW and some already expired), 90 days of sales history with fast, slow,
spiking, declining and low-stock/high-sales profiles, and the matching inventory movements.
"""

from __future__ import annotations

import argparse
import asyncio
import random
import sys
import uuid
from dataclasses import dataclass
from datetime import datetime, time, timedelta, timezone
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import delete, select  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.database import SessionLocal  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models import (  # noqa: E402
    Batch,
    Category,
    Company,
    InventoryMovement,
    MovementType,
    Product,
    Sale,
    User,
    UserRole,
)
from app.services.expiry_service import batch_status, run_expiry_check  # noqa: E402
from app.utils.dates import today_in_tz  # noqa: E402

COMPANY_EMAIL = "office@accracentral.example"
COMPANY_NAME = "Accra Central Pharmacy"
# Same demo accounts as the frontend README.
ADMIN_EMAIL, ADMIN_PASSWORD = "admin@expireguard.com", "admin123"
DISPENSER_EMAIL, DISPENSER_PASSWORD = "dispenser@expireguard.com", "dispenser123"
LEGACY_EMAIL, LEGACY_PASSWORD = "manager@expireguard.com", "manager123"  # legacy demo login -> dispenser
PASSWORD = ADMIN_PASSWORD  # kept for older scripts/tests: the admin password
TIMEZONE = "Africa/Accra"
HISTORY_DAYS = 90

# Products the tests and demo talk about
SPIKE_PRODUCT = "Artemether/Lumefantrine 20/120mg"
DECLINE_PRODUCT = "Cough Syrup 100ml"
LOW_STOCK_HIGH_SALES_PRODUCT = "Insulin Glargine Pen"
HIGH_STOCK_LOW_SALES_PRODUCT = "Vitamin C 1000mg"
TOMORROW_PRODUCT = "Amoxicillin 500mg Capsules"


@dataclass
class Spec:
    name: str
    sku: str
    barcode: str
    category: str
    unit: str
    price: str
    cost: str
    profile: str
    batches: list[tuple[int, int]]  # (days until expiry, remaining quantity)
    supplier: str = "PharmaCorp Inc."
    location: str = "Aisle A1 - Shelf 1"


PRODUCTS: list[Spec] = [
    Spec(TOMORROW_PRODUCT, "ANT-AMX-500", "6009000100011", "Antibiotics", "pack", "28.00", "18.50", "fast",
         [(1, 40), (12, 120), (60, 200)], "PharmaCorp Inc.", "Aisle A1 - Shelf 2"),  # batch expiring TOMORROW
    Spec("Ciprofloxacin 500mg Tablets", "ANT-CIP-500", "6009000100028", "Antibiotics", "pack", "36.00", "24.00",
         "medium", [(-3, 15), (20, 60)], "Kinapharma Ltd.", "Aisle B1"),
    Spec("Azithromycin 500mg 3s", "ANT-AZI-500", "6009000100035", "Antibiotics", "pack", "52.00", "38.50", "slow",
         [(300, 500)], "Tobbinco Pharmaceuticals", "Aisle B3"),
    Spec(SPIKE_PRODUCT, "MAL-ART-120", "6009000100042", "Antimalarials", "pack", "34.00", "22.50", "spike",
         [(45, 80), (120, 100)], "Novartis Ghana Ltd.", "Aisle A1 - Fast Track Bay"),
    Spec("Paracetamol 500mg Tablets", "ANL-PAR-500", "6009000100059", "Analgesics", "pack", "12.00", "7.50", "fast",
         [(400, 600)], "Ernest Chemists Ltd.", "Aisle A2"),
    Spec("Ibuprofen 400mg Tablets", "ANL-IBU-400", "6009000100066", "Analgesics", "pack", "15.00", "9.00", "medium",
         [(365, 150)], "Ernest Chemists Ltd.", "Aisle A2"),
    Spec("Diclofenac Gel 50g", "ANL-DIC-050", "6009000100073", "Analgesics", "tube", "25.00", "16.00", "medium",
         [(15, 70)], "Ernest Chemists Ltd.", "Aisle A3"),
    Spec("Oral Rehydration Salts 10s", "FST-ORS-010", "6009000100080", "First Aid", "pack", "8.50", "5.50", "fast",
         [(2, 30), (5, 80)], "Universal Hospitals Group", "Aisle C1"),
    Spec("Cetirizine 10mg Tablets", "AHI-CET-010", "6009000100097", "Antihistamines", "pack", "12.50", "8.50", "slow",
         [(-10, 20), (700, 300)], "MediSupply Co.", "Aisle C2"),
    Spec(DECLINE_PRODUCT, "RES-CGH-100", "6009000100103", "Respiratory", "bottle", "22.00", "14.00", "decline",
         [(3, 50)], "Kinapharma Ltd.", "Aisle C3"),
    Spec("Metformin 500mg Tablets", "DIA-MET-500", "6009000100110", "Diabetes", "pack", "18.00", "11.00", "medium",
         [(25, 90), (200, 150)], "PharmaCorp Inc.", "Aisle D1"),
    Spec(LOW_STOCK_HIGH_SALES_PRODUCT, "DIA-INS-300", "6009000100127", "Diabetes", "pen", "95.00", "68.00", "tight",
         [(40, 8)], "Novo Nordisk Ghana", "Cold Storage C1"),  # low stock / high sales
    Spec("Lisinopril 10mg Tablets", "CAR-LIS-010", "6009000100134", "Cardiovascular", "pack", "42.00", "29.00",
         "medium", [(28, 40), (80, 60)], "PharmaCorp Inc.", "Aisle D2"),
    Spec("Omeprazole 20mg Capsules", "GAS-OME-020", "6009000100141", "Gastrointestinal", "pack", "20.00", "12.50",
         "slow", [(85, 300)], "MediSupply Co.", "Aisle D3"),
    Spec(HIGH_STOCK_LOW_SALES_PRODUCT, "SUP-VTC-1000", "6009000100158", "Supplements", "bottle", "38.00", "24.00",
         "slow", [(150, 400)], "Tobbinco Pharmaceuticals", "Warehouse Bay W1"),  # high stock / low sales
    Spec("Folic Acid 5mg Tablets", "SUP-FOL-005", "6009000100165", "Supplements", "pack", "9.00", "5.00", "medium",
         [(500, 200)], "Ernest Chemists Ltd.", "Aisle E1"),
    Spec("Zinc Sulphate 20mg Tablets", "SUP-ZNC-020", "6009000100172", "Supplements", "pack", "10.00", "6.00",
         "fast", [(35, 100), (90, 250)], "Universal Hospitals Group", "Aisle E1"),
]


def daily_units(profile: str, days_ago: int, rng: random.Random) -> int:
    recent = days_ago < 7
    if profile == "fast":
        return rng.randint(18, 30)
    if profile == "medium":
        return rng.randint(4, 10)
    if profile == "slow":
        return 1 if rng.random() < 0.12 else 0
    if profile == "spike":
        return rng.randint(16, 22) if recent else rng.randint(4, 6)
    if profile == "decline":
        return rng.randint(0, 1) if recent else rng.randint(8, 12)
    if profile == "tight":
        return rng.randint(9, 12)  # outsells the median product while holding ~1 day of stock
    return 0


async def seed(
    session_factory: async_sessionmaker[AsyncSession] = SessionLocal,
    *,
    reset: bool = True,
    run_expiry: bool = False,
) -> dict:
    rng = random.Random(42)
    async with session_factory() as db:
        existing = await db.scalar(select(Company.id).where(Company.email == COMPANY_EMAIL))
        if existing:
            if not reset:
                raise SystemExit("Demo pharmacy already exists (run without --no-reset to recreate it)")
            await db.execute(delete(Company).where(Company.id == existing))
            await db.commit()
        others = await db.scalar(select(Company.id).where(Company.email != COMPANY_EMAIL).limit(1))
        if others and not settings.ALLOW_MULTIPLE_COMPANIES:
            raise SystemExit(
                "This database already has a (non-demo) pharmacy. ExpireGuard runs one pharmacy per install, so "
                "seed an empty database instead (or set ALLOW_MULTIPLE_COMPANIES=true for testing)."
            )
        taken = await db.scalar(
            select(User.email).where(User.email.in_([ADMIN_EMAIL, DISPENSER_EMAIL, LEGACY_EMAIL])).limit(1)
        )
        if taken:
            raise SystemExit(f"The demo login {taken} is already used by another pharmacy's account")

        company = Company(
            name=COMPANY_NAME, email=COMPANY_EMAIL, phone="+233302000100", address="Kwame Nkrumah Ave, Accra",
            license_number="GHA-FDA-PH-2024-8891", currency="GHS", timezone=TIMEZONE,
        )
        db.add(company)
        await db.flush()
        db.add_all([
            User(company_id=company.id, name="Admin User", email=ADMIN_EMAIL, phone_number="+233240000001",
                 password_hash=hash_password(ADMIN_PASSWORD), role=UserRole.ADMIN),
            User(company_id=company.id, name="Jane Dispenser", email=DISPENSER_EMAIL, phone_number=None,
                 password_hash=hash_password(DISPENSER_PASSWORD), role=UserRole.DISPENSER),
            User(company_id=company.id, name="Jane Manager", email=LEGACY_EMAIL, phone_number=None,
                 password_hash=hash_password(LEGACY_PASSWORD), role=UserRole.DISPENSER),
        ])

        today = today_in_tz(TIMEZONE)
        categories: dict[str, Category] = {}
        stats = {"products": 0, "batches": 0, "sales": 0, "movements": 0, "units_sold": 0}

        for spec in PRODUCTS:
            if spec.category not in categories:
                categories[spec.category] = Category(company_id=company.id, name=spec.category)
                db.add(categories[spec.category])
                await db.flush()
            product = Product(
                company_id=company.id, category_id=categories[spec.category].id, name=spec.name, sku=spec.sku,
                barcode=spec.barcode, unit=spec.unit, selling_price=Decimal(spec.price), cost_price=Decimal(spec.cost),
                brand="Demo", is_active=True,
            )
            db.add(product)
            await db.flush()
            stats["products"] += 1

            # 1. Sales history drawn from an older, now depleted batch.
            history = [(d, daily_units(spec.profile, d, rng)) for d in range(HISTORY_DAYS, 0, -1)]
            history.append((0, daily_units(spec.profile, 0, rng) // 2))  # part of today
            total_hist = sum(u for _, u in history)
            received_at = datetime.combine(today - timedelta(days=HISTORY_DAYS + 5), time(8), tzinfo=timezone.utc)
            if total_hist:
                hist = Batch(
                    id=uuid.uuid4(), company_id=company.id, product_id=product.id, batch_number=f"HIST-{spec.sku}",
                    manufacturing_date=today - timedelta(days=HISTORY_DAYS + 10),
                    expiry_date=today + timedelta(days=3650 if spec.profile != "fast" else 30),
                    initial_quantity=total_hist, remaining_quantity=0, status=batch_status(today, 0, today),
                    supplier=spec.supplier, storage_location=spec.location,
                    date_received=today - timedelta(days=HISTORY_DAYS + 5),
                    created_at=received_at, updated_at=received_at,
                )
                db.add(hist)
                await db.flush()
                db.add(InventoryMovement(
                    company_id=company.id, product_id=product.id, batch_id=hist.id,
                    movement_type=MovementType.PURCHASE, quantity=total_hist, reference_type="BATCH",
                    reference_id=hist.id, notes="Seed: historical stock", created_at=received_at,
                ))
                stats["batches"] += 1
                stats["movements"] += 1
                for days_ago, units in history:
                    if units <= 0:
                        continue
                    sold_at = datetime.combine(today - timedelta(days=days_ago), time(9), tzinfo=timezone.utc)
                    sold_at += timedelta(minutes=rng.randint(0, 600))
                    if days_ago == 0:
                        sold_at = min(sold_at, datetime.now(timezone.utc) - timedelta(minutes=1))
                    sale = Sale(
                        id=uuid.uuid4(), company_id=company.id, product_id=product.id, batch_id=hist.id,
                        quantity=units, unit_price=product.selling_price,
                        total_amount=product.selling_price * units, sold_at=sold_at, created_at=sold_at,
                    )
                    db.add(sale)
                    db.add(InventoryMovement(
                        company_id=company.id, product_id=product.id, batch_id=hist.id,
                        movement_type=MovementType.SALE, quantity=-units, reference_type="SALE",
                        reference_id=sale.id, created_at=sold_at,
                    ))
                    stats["sales"] += 1
                    stats["movements"] += 1
                    stats["units_sold"] += units

            # 2. Current batches across the expiry bands.
            for i, (days, qty) in enumerate(spec.batches, start=1):
                expiry = today + timedelta(days=days)
                mfg = min(expiry, today) - timedelta(days=30)
                created = datetime.combine(today - timedelta(days=rng.randint(3, 20)), time(8), tzinfo=timezone.utc)
                batch = Batch(
                    id=uuid.uuid4(), company_id=company.id, product_id=product.id,
                    batch_number=f"{spec.sku.split('-')[1]}-{today:%y%m}-{i:02d}",
                    manufacturing_date=mfg, expiry_date=expiry, initial_quantity=qty, remaining_quantity=qty,
                    status=batch_status(expiry, qty, today), created_at=created, updated_at=created,
                    supplier=spec.supplier, storage_location=spec.location, date_received=created.date(),
                )
                db.add(batch)
                await db.flush()
                db.add(InventoryMovement(
                    company_id=company.id, product_id=product.id, batch_id=batch.id,
                    movement_type=MovementType.PURCHASE, quantity=qty, reference_type="BATCH",
                    reference_id=batch.id, notes="Seed: current stock", created_at=created,
                ))
                stats["batches"] += 1
                stats["movements"] += 1

        await db.commit()
        result = {"company_id": str(company.id), "as_of": today.isoformat(), **stats}
        if run_expiry:
            check = await run_expiry_check(db, company.id)
            result["expiry_check"] = {k: v for k, v in check.as_dict().items() if k != "new_alert_ids"}
        return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--no-reset", action="store_true", help="Fail instead of recreating an existing demo company")
    parser.add_argument("--run-expiry", action="store_true", help="Run the expiry check after seeding")
    args = parser.parse_args()
    result = asyncio.run(seed(reset=not args.no_reset, run_expiry=args.run_expiry))
    print("Demo data seeded:")
    for key, value in result.items():
        print(f"  {key}: {value}")
    print("\nLogin credentials:")
    print(f"  admin      {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
    print(f"  dispenser  {DISPENSER_EMAIL} / {DISPENSER_PASSWORD}")


if __name__ == "__main__":
    main()
