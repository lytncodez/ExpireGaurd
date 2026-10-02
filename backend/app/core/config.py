"""
Application configuration loaded from environment variables.
Uses pydantic-settings for validation and type safety.
"""

import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration object for app, database, and security settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "sqlite:///./expireguard.db"
    secret_key: str = "dev-secret-key-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    app_name: str = "ExpireGuard"
    debug: bool = False


settings = Settings()

sms_provider: str = os.getenv("SMS_PROVIDER", "MOCK")
twilio_account_sid: str = os.getenv("TWILIO_ACCOUNT_SID", "")
twilio_auth_token: str = os.getenv("TWILIO_AUTH_TOKEN", "")
twilio_phone_number: str = os.getenv("TWILIO_PHONE_NUMBER", "")
anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
ai_model: str = os.getenv("AI_MODEL", "claude-sonnet-4-6")