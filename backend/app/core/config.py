"""
Application configuration loaded from environment variables.
Uses pydantic-settings for validation and type safety.
"""

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
    sms_provider: str = "MOCK"
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""
    africastalking_api_key: str = ""
    africastalking_username: str = ""
    anthropic_api_key: str = ""
    ai_model: str = "claude-sonnet-4-6"


settings = Settings()
