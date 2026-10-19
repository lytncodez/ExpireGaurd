"""Email delivery over SMTP (Gmail, Brevo, SendGrid, Outlook ...).

    EMAIL_MODE=off   -> nothing is sent
    EMAIL_MODE=mock  -> MockEmailProvider (logs + in-memory outbox, for local development)
    EMAIL_MODE=live  -> SMTP with the credentials from the environment

`send_email` never raises: failures come back as EmailResult(success=False, error=...).
"""

from __future__ import annotations

import asyncio
import smtplib
import ssl
import uuid
from abc import ABC, abstractmethod
from collections import deque
from dataclasses import dataclass
from datetime import datetime
from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from functools import lru_cache

from app.core.config import secret_value, settings
from app.core.logging import get_logger
from app.utils.dates import utcnow

logger = get_logger(__name__)


@dataclass(frozen=True)
class EmailResult:
    success: bool
    provider: str
    message_id: str | None = None
    error: str | None = None


@dataclass(frozen=True)
class MockEmail:
    to: str
    subject: str
    body: str
    message_id: str
    sent_at: datetime


class EmailProvider(ABC):
    name: str = "base"

    @abstractmethod
    async def send(self, to: str, subject: str, body: str) -> EmailResult:  # pragma: no cover - interface
        raise NotImplementedError


class MockEmailProvider(EmailProvider):
    name = "mock-email"
    outbox: deque[MockEmail] = deque(maxlen=1000)

    async def send(self, to: str, subject: str, body: str) -> EmailResult:
        message_id = f"mock-{uuid.uuid4().hex[:16]}"
        self.outbox.append(MockEmail(to=to, subject=subject, body=body, message_id=message_id, sent_at=utcnow()))
        logger.info("[MOCK EMAIL] to=%s subject=%s\n%s", to, subject, body)
        return EmailResult(success=True, provider=self.name, message_id=message_id)


class SMTPEmailProvider(EmailProvider):
    name = "smtp"

    def __init__(
        self, host: str, port: int, username: str | None, password: str | None, security: str,
        sender: str, sender_name: str, timeout: float,
    ) -> None:
        self.host = host
        self.port = port
        self.username = username
        self._password = password
        self.security = security
        self.sender = sender
        self.sender_name = sender_name
        self.timeout = timeout

    def _build(self, to: str, subject: str, body: str) -> EmailMessage:
        msg = EmailMessage()
        msg["From"] = formataddr((self.sender_name, self.sender))
        msg["To"] = to
        msg["Subject"] = subject
        msg["Message-ID"] = make_msgid(domain=self.sender.split("@")[-1] or None)
        msg.set_content(body)
        return msg

    def _send_blocking(self, msg: EmailMessage) -> None:
        context = ssl.create_default_context()
        if self.security == "ssl":
            server: smtplib.SMTP = smtplib.SMTP_SSL(self.host, self.port, timeout=self.timeout, context=context)
        else:
            server = smtplib.SMTP(self.host, self.port, timeout=self.timeout)
        with server:
            if self.security == "starttls":
                server.starttls(context=context)
            if self.username and self._password:
                server.login(self.username, self._password)
            server.send_message(msg)

    async def send(self, to: str, subject: str, body: str) -> EmailResult:
        msg = self._build(to, subject, body)
        try:
            await asyncio.to_thread(self._send_blocking, msg)
        except smtplib.SMTPAuthenticationError:
            return EmailResult(
                False, self.name,
                error="SMTP login rejected. For Gmail, use an App Password (not your normal password).",
            )
        except (smtplib.SMTPException, OSError) as exc:
            return EmailResult(False, self.name, error=f"{type(exc).__name__}: {str(exc)[:300]}")
        return EmailResult(True, self.name, message_id=msg["Message-ID"])


def email_enabled() -> bool:
    return settings.EMAIL_MODE != "off"


@lru_cache
def get_email_provider() -> EmailProvider:
    if settings.EMAIL_MODE != "live":
        return MockEmailProvider()
    return SMTPEmailProvider(
        host=settings.SMTP_HOST or "",
        port=settings.SMTP_PORT,
        username=settings.SMTP_USERNAME,
        password=secret_value(settings.SMTP_PASSWORD),
        security=settings.SMTP_SECURITY,
        sender=settings.EMAIL_FROM or "",
        sender_name=settings.EMAIL_FROM_NAME,
        timeout=settings.SMTP_TIMEOUT_SECONDS,
    )


async def send_email(to: str, subject: str, body: str, provider: EmailProvider | None = None) -> EmailResult:
    if provider is None and not email_enabled():
        return EmailResult(False, "off", error="Email is turned off (EMAIL_MODE=off)")
    provider = provider or get_email_provider()
    try:
        result = await provider.send(to, subject, body)
    except Exception as exc:  # noqa: BLE001 - provider errors must never propagate
        logger.exception("Email provider %s raised", provider.name)
        result = EmailResult(False, provider.name, error=f"{type(exc).__name__}: {str(exc)[:300]}")
    if not result.success:
        logger.warning("Email to %s via %s failed: %s", to, provider.name, result.error)
    return result
