"""
Central settings for ExpireGuard.

WHY: Every secret and tunable number lives here, read from environment
variables (or a local .env file). Nothing is hard-coded elsewhere, so the
same code runs in development, tests and production by changing env only.
"""
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Read values from a .env file; ignore variables we don't declare.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- App ---
    APP_NAME: str = "ExpireGuard"
    ENVIRONMENT: str = "development"  # development | testing | production
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # --- Database (async driver: asyncpg) ---
    DATABASE_URL: str = "postgresql+asyncpg://expireguard:expireguard@localhost:5432/expireguard"

    # --- Auth / JWT ---
    JWT_SECRET_KEY: str = Field(default="change-me-in-env", min_length=8)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    RESET_TOKEN_EXPIRE_MINUTES: int = 30

    # --- Expiry rules (deterministic, configurable) ---
    # days <= 0 -> EXPIRED | 1..CRITICAL_DAYS -> CRITICAL
    # CRITICAL_DAYS+1..SOON_DAYS -> EXPIRING_SOON | above -> SAFE
    EXPIRY_CRITICAL_DAYS: int = 30
    EXPIRY_SOON_DAYS: int = 90

    # --- Uploads ---
    MAX_UPLOAD_MB: int = 5

    # --- CORS ---
    CORS_ORIGINS: str = "http://localhost:3000"  # comma-separated

    # --- SMS ---
    SMS_MODE: str = "mock"  # mock | live
    SMS_PROVIDER_API_KEY: str = ""
    SMS_SENDER_ID: str = "ExpireGuard"

    # --- AI ---
    AI_PROVIDER: str = "mock"  # mock | openai | anthropic
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-6"

    # --- Scheduler ---
    SCHEDULER_ENABLED: bool = False
    EXPIRY_JOB_HOUR: int = 6  # run daily at this hour

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_MB * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    """Cached so .env is parsed once, not on every request."""
    return Settings()


settings = get_settings()
