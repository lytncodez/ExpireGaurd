"""Email delivery: mock outbox, alert emails, password reset emails and the SMTP provider."""

import smtplib

import pytest

from app.core.config import settings
from app.services.email_service import MockEmailProvider, SMTPEmailProvider, send_email
from tests.helpers import create_batch, create_product


@pytest.fixture
def email_on(monkeypatch):
    monkeypatch.setattr(settings, "EMAIL_MODE", "mock")


async def test_test_email_endpoint(client, admin, email_on):
    resp = await client.post("/alerts/test-email", json={"email": "owner@acme.test", "message": "hello"},
                             headers=admin["headers"])
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["channel"] == "EMAIL" and body["status"] == "SENT" and body["provider"] == "mock-email"
    assert body["recipient"] == "owner@acme.test" and body["subject"] == "ExpireGuard test email"
    assert MockEmailProvider.outbox[-1].to == "owner@acme.test" and MockEmailProvider.outbox[-1].body == "hello"


async def test_test_email_reports_when_email_is_off(client, admin):
    body = (await client.post("/alerts/test-email", json={"email": "owner@acme.test"}, headers=admin["headers"])).json()
    assert body["status"] == "FAILED" and "EMAIL_MODE=off" in body["error_message"]
    assert len(MockEmailProvider.outbox) == 0


async def test_critical_alert_emails_admins(client, admin, email_on):
    h = admin["headers"]
    product = await create_product(client, h)
    await create_batch(client, h, product["id"], days=1, qty=10)
    result = (await client.post("/expiry/check", headers=h)).json()
    assert result["emails_sent"] == 1 and result["emails_failed"] == 0
    assert result["sms_sent"] == 1  # SMS still goes out alongside email

    mail = MockEmailProvider.outbox[-1]
    assert mail.to == "admin@acme.test"
    assert "CRITICAL" in mail.subject and "Fresh Milk 1L" in mail.body

    alert = (await client.get("/alerts", headers=h)).json()["items"][0]
    notes = (await client.get(f"/notifications?alert_id={alert['id']}", headers=h)).json()["items"]
    assert sorted(n["channel"] for n in notes) == ["EMAIL", "SMS"]

    # Dashboard SMS counters only count SMS
    dash = (await client.get("/dashboard/alerts", headers=h)).json()
    assert dash["sms_sent"] == 1


async def test_warning_alerts_do_not_email_by_default(client, admin, email_on):
    h = admin["headers"]
    product = await create_product(client, h)
    await create_batch(client, h, product["id"], days=60)
    result = (await client.post("/expiry/check", headers=h)).json()
    assert result["alerts_created"] == 1 and result["emails_sent"] == 0
    assert len(MockEmailProvider.outbox) == 0


async def test_password_reset_code_is_emailed(client, admin, email_on):
    resp = await client.post("/auth/forgot-password", json={"email": "admin@acme.test"})
    assert resp.status_code == 200
    mail = MockEmailProvider.outbox[-1]
    assert mail.to == "admin@acme.test" and "reset" in mail.subject.lower()


class _FakeSMTP:
    instances: list["_FakeSMTP"] = []
    fail_login = False

    def __init__(self, host, port, timeout=None, **kwargs):
        self.host, self.port, self.calls = host, port, []
        _FakeSMTP.instances.append(self)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def starttls(self, context=None):
        self.calls.append("starttls")

    def login(self, user, password):
        if _FakeSMTP.fail_login:
            raise smtplib.SMTPAuthenticationError(535, b"bad credentials")
        self.calls.append(("login", user))

    def send_message(self, msg):
        self.calls.append(("send", msg["To"], msg["Subject"]))


async def test_smtp_provider_uses_starttls_and_login(monkeypatch):
    _FakeSMTP.instances.clear()
    _FakeSMTP.fail_login = False
    monkeypatch.setattr(smtplib, "SMTP", _FakeSMTP)
    provider = SMTPEmailProvider("smtp.gmail.com", 587, "pharmacy@gmail.com", "app-password", "starttls",
                                 "pharmacy@gmail.com", "ExpireGuard", 5)
    result = await send_email("owner@acme.test", "Subject line", "Body", provider=provider)
    assert result.success and result.provider == "smtp"
    calls = _FakeSMTP.instances[-1].calls
    assert calls == ["starttls", ("login", "pharmacy@gmail.com"), ("send", "owner@acme.test", "Subject line")]


async def test_smtp_login_failure_explains_app_password(monkeypatch):
    _FakeSMTP.fail_login = True
    monkeypatch.setattr(smtplib, "SMTP", _FakeSMTP)
    provider = SMTPEmailProvider("smtp.gmail.com", 587, "pharmacy@gmail.com", "wrong", "starttls",
                                 "pharmacy@gmail.com", "ExpireGuard", 5)
    result = await send_email("owner@acme.test", "Subject", "Body", provider=provider)
    _FakeSMTP.fail_login = False
    assert not result.success and "App Password" in result.error
