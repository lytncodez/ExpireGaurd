import pytest

from app.models import BatchStatus
from app.services.expiry_service import ExpiryThresholds, batch_status, classify
from tests.helpers import create_batch, create_product, iso, today


# ---------------------------------------------------------------- pure rule tests (boundaries)
# Default pharmacy bands: <=0 Expired, 1-7 Critical, 8-30 Action Required, 31-60 Monitor, >60 Safe.
@pytest.mark.parametrize(
    "days,expected",
    [
        (-10, BatchStatus.EXPIRED),
        (-1, BatchStatus.EXPIRED),
        (0, BatchStatus.EXPIRED),
        (1, BatchStatus.CRITICAL),
        (7, BatchStatus.CRITICAL),
        (8, BatchStatus.ACTION_REQUIRED),
        (30, BatchStatus.ACTION_REQUIRED),
        (31, BatchStatus.MONITOR),
        (60, BatchStatus.MONITOR),
        (61, BatchStatus.SAFE),
        (90, BatchStatus.SAFE),
        (91, BatchStatus.SAFE),
        (1000, BatchStatus.SAFE),
    ],
)
def test_classify_boundaries(days, expected):
    assert classify(days, ExpiryThresholds(7, 30, 60, 90)) == expected


def test_custom_thresholds():
    t = ExpiryThresholds(critical_days=3, action_days=10, monitor_days=20, advisory_days=40)
    assert classify(3, t) == BatchStatus.CRITICAL
    assert classify(4, t) == BatchStatus.ACTION_REQUIRED
    assert classify(11, t) == BatchStatus.MONITOR
    assert classify(21, t) == BatchStatus.SAFE
    with pytest.raises(ValueError):
        ExpiryThresholds(critical_days=10, action_days=10, monitor_days=20, advisory_days=30)
    with pytest.raises(ValueError):
        ExpiryThresholds(critical_days=0, action_days=10, monitor_days=20, advisory_days=30)


def test_depleted_batch_status():
    assert batch_status(today(), 0, today()) == BatchStatus.DEPLETED


# ---------------------------------------------------------------- engine integration
async def test_expiry_check_classifies_boundary_batches(client, admin):
    h = admin["headers"]
    product = await create_product(client, h)
    expected = {
        0: "EXPIRED", 1: "CRITICAL", 7: "CRITICAL", 8: "ACTION_REQUIRED", 30: "ACTION_REQUIRED",
        31: "MONITOR", 60: "MONITOR", 61: "SAFE", 90: "SAFE", 91: "SAFE",
    }
    ids = {}
    for days in expected:
        ids[days] = (await create_batch(client, h, product["id"], days=days, qty=5))["id"]
    resp = await client.post("/expiry/check", headers=h)
    assert resp.status_code == 200
    result = resp.json()
    assert result["batches_checked"] == 10
    assert result["status_counts"] == {"EXPIRED": 1, "CRITICAL": 2, "ACTION_REQUIRED": 2, "MONITOR": 2, "SAFE": 3}
    # every band alerts; inside SAFE only the early-advisory window (<=90 days) does
    assert result["alerts_created"] == 9
    for days, status in expected.items():
        batch = (await client.get(f"/batches/{ids[days]}", headers=h)).json()
        assert batch["status"] == status, (days, batch)
        assert batch["days_remaining"] == days
    types = {a["alert_type"] for a in (await client.get("/alerts?page_size=50", headers=h)).json()["items"]}
    assert types == {"EXPIRED", "CRITICAL_EXPIRY", "EXPIRING_SOON", "EXPIRY_MONITOR", "EXPIRY_ADVISORY"}


async def test_pharmacy_bands_and_alert_toggles(client, admin):
    h = admin["headers"]
    product = await create_product(client, h)
    batch = await create_batch(client, h, product["id"], days=12, qty=5)
    assert batch["status"] == "ACTION_REQUIRED"
    settings = (await client.get("/settings", headers=h)).json()
    assert settings["criticalDays"] == 7 and settings["safeDays"] == 90 and settings["enable30d"] is True
    body = {"criticalDays": 14, "actionDays": 30, "monitorDays": 60, "safeDays": 90,
            "enable90d": False, "enable60d": True, "enable30d": True, "enable7d": True, "enable0d": True}
    resp = await client.put("/settings/thresholds", json=body, headers=h)
    assert resp.status_code == 200 and resp.json()["criticalDays"] == 14
    # saving re-runs the check: the 12-day batch is now Critical
    assert (await client.get(f"/batches/{batch['id']}", headers=h)).json()["status"] == "CRITICAL"
    assert (await client.get("/alerts/critical", headers=h)).json()["total"] == 1
    bad = dict(body, actionDays=10)
    assert (await client.put("/settings/thresholds", json=bad, headers=h)).status_code == 422
    # advisory alerts switched off: an 80-day batch gets no alert
    far = await create_batch(client, h, product["id"], days=80, qty=5, batch_number="FAR")
    await client.post("/expiry/check", headers=h)
    alerts = (await client.get("/alerts?page_size=50", headers=h)).json()["items"]
    assert not any(a["batch_id"] == far["id"] for a in alerts)


async def test_batch_expiring_tomorrow_is_critical_with_one_alert(client, admin):
    h = admin["headers"]
    product = await create_product(client, h)
    batch = await create_batch(client, h, product["id"], days=1, qty=24)
    first = (await client.post("/expiry/check", headers=h)).json()
    assert first["alerts_created"] == 1
    alerts = (await client.get("/alerts/critical", headers=h)).json()
    assert alerts["total"] == 1
    alert = alerts["items"][0]
    assert alert["alert_type"] == "CRITICAL_EXPIRY"
    assert alert["severity"] == "CRITICAL"
    assert alert["days_remaining"] == 1
    assert alert["quantity_at_risk"] == 24
    assert alert["batch_id"] == batch["id"]

    second = (await client.post("/expiry/check", headers=h)).json()
    assert second["alerts_created"] == 0
    assert second["duplicates_prevented"] == 1
    assert (await client.get("/alerts", headers=h)).json()["total"] == 1


async def test_escalation_resolves_superseded_alert(client, admin):
    h = admin["headers"]
    product = await create_product(client, h)
    batch = await create_batch(client, h, product["id"], days=20, qty=5)
    await client.post("/expiry/check", headers=h)
    assert (await client.get("/alerts/expiring-soon", headers=h)).json()["total"] == 1
    await client.patch(f"/batches/{batch['id']}", json={"expiry_date": iso(2)}, headers=h)
    result = (await client.post("/expiry/check", headers=h)).json()
    assert result["alerts_created"] == 1 and result["alerts_auto_resolved"] == 1
    assert (await client.get("/alerts/expiring-soon", headers=h)).json()["total"] == 0
    assert (await client.get("/alerts/critical", headers=h)).json()["total"] == 1


async def test_depleted_batch_alert_auto_resolves(client, admin):
    h = admin["headers"]
    product = await create_product(client, h)
    batch = await create_batch(client, h, product["id"], days=5, qty=2)
    await client.post("/expiry/check", headers=h)
    await client.post("/sales", json={"product_id": product["id"], "quantity": 2}, headers=h)
    result = (await client.post("/expiry/check", headers=h)).json()
    assert result["alerts_auto_resolved"] == 1
    assert (await client.get("/alerts?is_resolved=false", headers=h)).json()["total"] == 0
    assert (await client.get(f"/batches/{batch['id']}", headers=h)).json()["status"] == "DEPLETED"


async def test_expiry_listing_endpoints(client, admin):
    h = admin["headers"]
    product = await create_product(client, h)
    for d in (-3, 7, 20, 45, 200):
        await create_batch(client, h, product["id"], days=d)
    assert (await client.get("/expiry/expired", headers=h)).json()["total"] == 1
    assert (await client.get("/expiry/critical", headers=h)).json()["items"][0]["days_remaining"] == 7
    assert (await client.get("/expiry/soon", headers=h)).json()["items"][0]["days_remaining"] == 20
    assert (await client.get("/expiry/monitor", headers=h)).json()["items"][0]["days_remaining"] == 45
    assert (await client.get("/expiry", headers=h)).json()["total"] == 5
    assert (await client.get("/expiry?status=SAFE&status=EXPIRED", headers=h)).json()["total"] == 2
