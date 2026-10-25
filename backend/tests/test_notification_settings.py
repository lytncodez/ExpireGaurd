"""Mobile numbers for SMS alerts (Settings + profile) and the daily expiry email digest."""

import uuid

import pytest

from app.core.config import settings
from app.services.digest_service import send_expiry_digest
from app.services.email_service import MockEmailProvider
from tests.helpers import create_batch, create_product, create_user


@pytest.fixture
def email_on(monkeypatch):
    monkeypatch.setattr(settings, "EMAIL_MODE", "mock")


async def test_notification_settings_accept_local_numbers(client, admin):
    h = admin["headers"]
    body = (await client.get("/settings/notifications", headers=h)).json()
    assert body["alertPhoneNumbers"] == [] and body["emailDigestEnabled"] is True
    assert body["smsRecipients"] == ["+254700000001"]

    resp = await client.put("/settings/notifications", headers=h, json={
        "alertPhoneNumbers": ["0241234567", "+233241234567", "0501112223"],
        "pharmacyPhone": "0302123456", "emailDigestEnabled": False,
    })
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["alertPhoneNumbers"] == ["+233241234567", "+233501112223"]  # normalised and de-duplicated
    assert body["pharmacyPhone"] == "+233302123456"
    assert body["emailDigestEnabled"] is False
    assert body["smsRecipients"] == ["+254700000001", "+233241234567", "+233501112223"]


async def test_notification_settings_reject_bad_numbers_and_dispensers(client, admin):
    h = admin["headers"]
    resp = await client.put("/settings/notifications", headers=h, json={"alertPhoneNumbers": ["12ab"]})
    assert resp.status_code == 422
    dispenser = await create_user(client, h, "disp@acme.test", "dispenser")
    assert (await client.get("/settings/notifications", headers=dispenser["headers"])).status_code == 403


async def test_expiry_sms_goes_to_extra_numbers(client, admin):
    h = admin["headers"]
    await client.put("/settings/notifications", headers=h, json={"alertPhoneNumbers": ["0241234567"]})
    product = await create_product(client, h)
    await create_batch(client, h, product["id"], days=1, qty=10)
    result = (await client.post("/expiry/check", headers=h)).json()
    assert result["sms_sent"] == 2
    alert = (await client.get("/alerts", headers=h)).json()["items"][0]
    notes = (await client.get(f"/notifications?alert_id={alert['id']}", headers=h)).json()["items"]
    assert {n["recipient"] for n in notes if n["channel"] == "SMS"} == {"+254700000001", "+233241234567"}


async def test_user_can_set_own_mobile_number(client, admin):
    h = admin["headers"]
    resp = await client.patch("/auth/me", headers=h, json={"phone_number": "0201234567"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["phone_number"] == "+233201234567"
    assert (await client.get("/auth/me", headers=h)).json()["phone_number"] == "+233201234567"
    assert (await client.patch("/auth/me", headers=h, json={"phone_number": "abc"})).status_code == 422


async def test_manual_digest_emails_admins(client, admin, email_on):
    h = admin["headers"]
    product = await create_product(client, h)
    await create_batch(client, h, product["id"], days=-1, qty=3, batch_number="OLD-1")
    await create_batch(client, h, product["id"], days=2, qty=10, batch_number="SOON-1")
    body = (await client.post("/alerts/send-digest", headers=h)).json()
    assert body["sent"] == 1 and body["failed"] == 0 and body["recipients"] == ["admin@acme.test"]
    assert body["expired"] == 1 and body["critical"] == 1
    mail = MockEmailProvider.outbox[-1]
    assert mail.to == "admin@acme.test" and "1 expired" in mail.subject
    assert "OLD-1" in mail.body and "SOON-1" in mail.body


async def test_scheduled_digest_skips_when_nothing_due_or_switched_off(client, admin, db, email_on):
    company_id = uuid.UUID(admin["company"]["id"])
    result = await send_expiry_digest(db, company_id)
    assert result.sent == 0 and result.skipped_reason == "Nothing expired or expiring soon"

    h = admin["headers"]
    product = await create_product(client, h)
    await create_batch(client, h, product["id"], days=1, qty=10)
    await client.put("/settings/notifications", headers=h, json={"emailDigestEnabled": False})
    db.expire_all()  # the API changed the company in another session
    result = await send_expiry_digest(db, company_id)
    assert result.sent == 0 and "switched off" in result.skipped_reason
    assert (await send_expiry_digest(db, company_id, manual=True)).sent == 1  # manual send still works


async def test_digest_reports_when_email_is_off(client, admin):
    body = (await client.post("/alerts/send-digest", headers=admin["headers"])).json()
    assert body["sent"] == 0 and "EMAIL_MODE=off" in body["skipped_reason"]
