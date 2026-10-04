from datetime import date, timedelta

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

from app.core.config import settings
from app.models.alert import Alert, AlertType, SMSStatus
from app.models.batch import Batch, ExpiryStatus
from app.models.user import User


def test_csv_upload_creates_critical_alert_and_sends_sms(client, db):
    db.add(
        User(
            id=1,
            email="csv-flow@example.com",
            hashed_password="unused",
            full_name="CSV Flow",
            phone="+233501234567",
        )
    )
    db.commit()

    expiry_date = (date.today() + timedelta(days=1)).isoformat()
    csv_data = (
        "product_name,sku,batch_number,quantity,expiry_date\n"
        f"Expiry Flow Test,EXP-FLOW-001,BATCH-TOMORROW,10,{expiry_date}\n"
    )

    response = client.post(
        "/imports/csv",
        files={"file": ("inventory.csv", csv_data, "text/csv")},
    )

    assert response.status_code == 200
    assert response.json() == {
        "status": "success",
        "products_created": 1,
        "batches_created": 1,
        "errors": [],
    }

    batch = db.query(Batch).one()
    assert batch.status == ExpiryStatus.CRITICAL
    assert batch.days_remaining == 1

    alert = db.query(Alert).one()
    assert alert.alert_type == AlertType.CRITICAL
    assert alert.recipient_phone == "+233501234567"
    assert alert.sms_status == SMSStatus.SENT
    assert alert.sms_sent is True

    dashboard = client.get("/dashboard/summary")
    assert dashboard.status_code == 200
    assert dashboard.json()["critical"] == 1
    assert dashboard.json()["unread_alerts"] == 1


def test_initial_migration_matches_live_models(tmp_path, monkeypatch):
    database_path = tmp_path / "migration.db"
    database_url = f"sqlite:///{database_path}"
    monkeypatch.setattr(settings, "database_url", database_url)

    config = Config("alembic.ini")
    command.upgrade(config, "head")

    inspector = inspect(create_engine(database_url))
    assert {column["name"] for column in inspector.get_columns("products")} >= {
        "barcode",
        "brand",
        "unit",
        "selling_price",
        "cost_price",
    }
    assert {column["name"] for column in inspector.get_columns("alerts")} >= {
        "severity",
        "recipient_phone",
        "sms_status",
        "sms_sent",
        "sms_sent_at",
        "resolved_at",
        "sms_error",
    }
    assert {column["name"] for column in inspector.get_columns("sales")} >= {
        "quantity",
        "total_amount",
        "sold_at",
    }
