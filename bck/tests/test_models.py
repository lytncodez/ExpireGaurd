"""Tests that the database rules (constraints) really protect the data."""
from datetime import date

import pytest
from sqlalchemy.exc import IntegrityError

from app.models import Alert, AlertSeverity, AlertType, Batch, Company, Product


async def _make_product(db):
    company = Company(name="Test Co")
    db.add(company)
    await db.flush()
    product = Product(company_id=company.id, name="Milk")
    db.add(product)
    await db.flush()
    return company, product


async def test_batch_expiry_cannot_be_before_manufacturing(db_session):
    _, product = await _make_product(db_session)
    db_session.add(Batch(
        product_id=product.id, batch_number="A1",
        manufacturing_date=date(2026, 6, 1), expiry_date=date(2026, 5, 1),
        initial_quantity=10, remaining_quantity=10,
    ))
    with pytest.raises(IntegrityError):
        await db_session.flush()


async def test_batch_number_unique_per_product(db_session):
    _, product = await _make_product(db_session)
    for _ in range(2):
        db_session.add(Batch(
            product_id=product.id, batch_number="A1",
            expiry_date=date(2026, 12, 1), initial_quantity=5, remaining_quantity=5,
        ))
    with pytest.raises(IntegrityError):
        await db_session.flush()


async def test_remaining_quantity_cannot_go_negative(db_session):
    _, product = await _make_product(db_session)
    db_session.add(Batch(
        product_id=product.id, batch_number="A1",
        expiry_date=date(2026, 12, 1), initial_quantity=5, remaining_quantity=-1,
    ))
    with pytest.raises(IntegrityError):
        await db_session.flush()


async def test_only_one_open_alert_per_batch_and_type(db_session):
    company, product = await _make_product(db_session)
    batch = Batch(product_id=product.id, batch_number="A1", expiry_date=date(2026, 12, 1),
                  initial_quantity=5, remaining_quantity=5)
    db_session.add(batch)
    await db_session.flush()

    def make_alert():
        return Alert(company_id=company.id, product_id=product.id, batch_id=batch.id,
                     alert_type=AlertType.CRITICAL_EXPIRY, severity=AlertSeverity.CRITICAL,
                     title="t", message="m")

    first = make_alert()
    db_session.add(first)
    await db_session.flush()

    db_session.add(make_alert())  # duplicate while first is unresolved
    with pytest.raises(IntegrityError):
        await db_session.flush()
    await db_session.rollback()


async def test_new_alert_allowed_after_previous_resolved(db_session):
    company, product = await _make_product(db_session)
    batch = Batch(product_id=product.id, batch_number="A1", expiry_date=date(2026, 12, 1),
                  initial_quantity=5, remaining_quantity=5)
    db_session.add(batch)
    await db_session.flush()

    first = Alert(company_id=company.id, batch_id=batch.id, alert_type=AlertType.EXPIRED,
                  severity=AlertSeverity.URGENT, title="t", message="m", is_resolved=True)
    db_session.add(first)
    await db_session.flush()
    db_session.add(Alert(company_id=company.id, batch_id=batch.id, alert_type=AlertType.EXPIRED,
                         severity=AlertSeverity.URGENT, title="t", message="m"))
    await db_session.flush()  # must not raise


def test_all_14_tables_registered():
    from app.core.database import Base
    expected = {
        "companies", "users", "categories", "products", "batches", "inventory_movements",
        "sales", "alerts", "notifications", "import_jobs", "insights", "audit_logs",
        "ai_conversations", "ai_messages",
    }
    assert set(Base.metadata.tables) == expected
