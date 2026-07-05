from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",  # Docker vars (POSTGRES_PASSWORD etc.) live in .env but aren't app settings
    )

    DATABASE_URL: str
    REDIS_URL: str
    CLERK_PUBLISHABLE_KEY: str
    CLERK_SECRET_KEY: str
    CLERK_JWKS_URL: str
    SENTRY_DSN: str = ""
    RESEND_API_KEY: str = ""
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    CORS_ORIGINS: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
