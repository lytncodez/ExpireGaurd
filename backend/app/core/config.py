"""Application configuration loaded from environment variables / .env."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

Severity = Literal["INFO", "WARNING", "CRITICAL", "URGENT"]


class Settings(BaseSettings):
    """All runtime settings. Secrets are SecretStr so they never leak into logs/reprs."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Application -------------------------------------------------------
    APP_NAME: str = "ExpireGuard"
    APP_ENV: Literal["development", "test", "production"] = "development"
    LOG_LEVEL: str = "INFO"
    LOG_JSON: bool = False
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # --- Database ----------------------------------------------------------
    DATABASE_URL: str = "postgresql+asyncpg://expireguard:expireguard@localhost:5432/expireguard"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_ECHO: bool = False

    # --- Auth --------------------------------------------------------------
    JWT_SECRET_KEY: SecretStr
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    RESET_TOKEN_EXPIRE_MINUTES: int = 30

    # --- Rate limiting -----------------------------------------------------
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_AUTH_PER_MINUTE: int = 10
    RATE_LIMIT_UPLOAD_PER_MINUTE: int = 5

    # --- Pharmacy (single-pharmacy install) ---------------------------------
    PHARMACY_NAME: str = "My Pharmacy"          # used when the first user signs up
    PHARMACY_CURRENCY: str = "GHS"
    PHARMACY_TIMEZONE: str = "Africa/Accra"
    # Local numbers typed without a country code (e.g. 0241234567) get this prefix.
    DEFAULT_PHONE_COUNTRY_CODE: str = "+233"
    ALLOW_PUBLIC_SIGNUP: bool = True            # later sign-ups join the pharmacy as dispensers
    ALLOW_MULTIPLE_COMPANIES: bool = False      # multi-tenant mode (used by the test suite)

    # --- Expiry engine: default risk bands for a new pharmacy (editable in Settings) --
    EXPIRY_CRITICAL_DAYS: int = 7
    EXPIRY_ACTION_DAYS: int = 30
    EXPIRY_MONITOR_DAYS: int = 60
    EXPIRY_ADVISORY_DAYS: int = 90

    # --- Inventory ---------------------------------------------------------
    ALLOW_NEGATIVE_INVENTORY: bool = False
    LOW_STOCK_THRESHOLD: int = 10

    # --- SMS ---------------------------------------------------------------
    SMS_MODE: Literal["mock", "live"] = "mock"
    SMS_PROVIDER: Literal["africastalking", "twilio"] = "africastalking"
    SMS_MIN_SEVERITY: Severity = "CRITICAL"
    SMS_TIMEOUT_SECONDS: float = 10.0
    SMS_MAX_ATTEMPTS: int = 3
    SMS_SENDER_ID: str | None = None
    AT_USERNAME: str | None = None
    AT_API_KEY: SecretStr | None = None
    AT_SANDBOX: bool = True
    TWILIO_ACCOUNT_SID: str | None = None
    TWILIO_AUTH_TOKEN: SecretStr | None = None
    TWILIO_FROM_NUMBER: str | None = None

    # --- Email (SMTP: Gmail, Brevo, SendGrid, Outlook ...) ---
    EMAIL_MODE: Literal["off", "mock", "live"] = "mock"
    EMAIL_MIN_SEVERITY: Severity = "CRITICAL"
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: SecretStr | None = None
    SMTP_SECURITY: Literal["starttls", "ssl", "none"] = "starttls"  # Gmail: starttls on 587, or ssl on 465
    SMTP_TIMEOUT_SECONDS: float = 15.0
    EMAIL_FROM: str | None = None
    EMAIL_FROM_NAME: str = "ExpireGuard"

    # --- Imports -----------------------------------------------------------
    MAX_UPLOAD_SIZE_MB: int = 10
    MAX_IMPORT_ROWS: int = 50_000
    IMPORT_DATE_DAYFIRST: bool = True

    # --- Analytics / anomalies ----------------------------------------------
    ANALYTICS_DEFAULT_DAYS: int = 30
    ANOMALY_BASELINE_DAYS: int = 28
    ANOMALY_RECENT_DAYS: int = 7
    ANOMALY_Z_THRESHOLD: float = 2.5
    ANOMALY_MIN_PCT_CHANGE: float = 50.0
    ANOMALY_HIGH_COVER_DAYS: int = 180
    ANOMALY_LOW_COVER_DAYS: int = 3

    # --- AI intelligence layer (Phase 2) -----------------------------------
    AI_PROVIDER: Literal["mock", "openai", "anthropic"] = "mock"
    OPENAI_API_KEY: SecretStr | None = None
    OPENAI_MODEL: str | None = None
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    ANTHROPIC_API_KEY: SecretStr | None = None
    ANTHROPIC_MODEL: str | None = None
    ANTHROPIC_BASE_URL: str = "https://api.anthropic.com/v1"
    AI_TIMEOUT_SECONDS: float = 45.0
    AI_MAX_TOKENS: int = 2000
    AI_TEMPERATURE: float = 0.2
    AI_CHAT_HISTORY_MESSAGES: int = 10
    AI_CONTEXT_LIST_LIMIT: int = 10
    AI_RATE_LIMIT_PER_MINUTE: int = 20

    # --- Background jobs ---------------------------------------------------
    SCHEDULER_ENABLED: bool = True
    EXPIRY_JOB_HOUR: int = 6
    EXPIRY_JOB_MINUTE: int = 0
    EMAIL_DIGEST_ENABLED: bool = True  # daily expiry email to admins (each pharmacy can switch it off)
    ALERT_JOB_INTERVAL_MINUTES: int = 30
    CLEANUP_JOB_HOUR: int = 3
    ALERT_RETENTION_DAYS: int = 180

    @field_validator("DATABASE_URL")
    @classmethod
    def _asyncpg_url(cls, url: str) -> str:
        """Accept the plain URLs hosts give out (Neon, Render, Supabase) and make them work with asyncpg."""
        from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

        for prefix in ("postgres://", "postgresql://", "postgresql+psycopg2://", "postgresql+psycopg://"):
            if url.startswith(prefix):
                url = "postgresql+asyncpg://" + url[len(prefix):]
                break
        parts = urlsplit(url)
        query = dict(parse_qsl(parts.query))
        sslmode = query.pop("sslmode", None)
        query.pop("channel_binding", None)  # libpq-only option
        if sslmode and sslmode != "disable" and "ssl" not in query:
            query["ssl"] = "require"
        return urlunsplit(parts._replace(query=urlencode(query)))

    @model_validator(mode="after")
    def _validate(self) -> "Settings":
        if not (1 <= self.EXPIRY_CRITICAL_DAYS < self.EXPIRY_ACTION_DAYS < self.EXPIRY_MONITOR_DAYS
                <= self.EXPIRY_ADVISORY_DAYS):
            raise ValueError("Require 1 <= EXPIRY_CRITICAL_DAYS < EXPIRY_ACTION_DAYS < EXPIRY_MONITOR_DAYS "
                             "<= EXPIRY_ADVISORY_DAYS")
        secret = self.JWT_SECRET_KEY.get_secret_value()
        if self.APP_ENV == "production":
            if len(secret) < 32 or secret.startswith("change-me"):
                raise ValueError("JWT_SECRET_KEY must be a strong random value (>=32 chars) in production")
        if self.EMAIL_MODE == "live" and not (self.SMTP_HOST and self.EMAIL_FROM):
            raise ValueError("EMAIL_MODE=live requires SMTP_HOST and EMAIL_FROM (plus SMTP_USERNAME/SMTP_PASSWORD)")
        if self.SMS_MODE == "live":
            if self.SMS_PROVIDER == "africastalking" and not (self.AT_USERNAME and secret_value(self.AT_API_KEY)):
                raise ValueError("SMS_MODE=live with africastalking requires AT_USERNAME and AT_API_KEY")
            if self.SMS_PROVIDER == "twilio" and not (
                self.TWILIO_ACCOUNT_SID and secret_value(self.TWILIO_AUTH_TOKEN) and self.TWILIO_FROM_NUMBER
            ):
                raise ValueError(
                    "SMS_MODE=live with twilio requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER"
                )
        return self

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    @property
    def expose_reset_token(self) -> bool:
        """Return reset tokens in API responses only outside production (local testing)."""
        return self.APP_ENV != "production"


def secret_value(value: SecretStr | None) -> str | None:
    """Return the secret, treating an empty/blank value (e.g. `KEY=` in .env) as not set."""
    if value is None:
        return None
    raw = value.get_secret_value().strip()
    return raw or None


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
