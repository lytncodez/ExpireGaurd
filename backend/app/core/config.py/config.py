"""
Application configuration loaded from environment variables.
Uses pydantic-settings for validation and type safety.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Central configuration object. All environment variables are validated
    and type-checked here. If a required variable is missing, the app
    will fail to start with a clear error message.
    """

    # Database
    database_url: str
    
    # JWT Security
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # App Metadata
    app_name: str = "ExpireGuard"
    debug: bool = False

    class Config:
        # Load from .env file
        env_file = ".env"
        env_file_encoding = "utf-8"


# Create a single instance to use throughout the app
settings = Settings()
