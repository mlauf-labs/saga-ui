"""BFF configuration loaded from environment variables / .env file."""

from __future__ import annotations

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Saga connection
    saga_base_url: str = "http://localhost:8000"
    saga_api_token: str = ""

    # Static UI credentials
    ui_username: str = "admin"
    ui_password: str = "admin"

    # Session
    session_secret: str = "change-me-in-production"
    session_max_age: int = 28800  # 8 hours in seconds

    # Limits
    max_upload_bytes: int = 100 * 1024 * 1024  # 100 MB

    # Misc
    log_level: str = "INFO"
    debug: bool = False

    # CORS – only needed when frontend is hosted on a different origin
    cors_allow_origins: list[str] = []

    @field_validator("saga_base_url")
    @classmethod
    def strip_trailing_slash(cls, v: str) -> str:
        return v.rstrip("/")

    def __repr__(self) -> str:
        """Never expose secrets in repr/logs."""
        return (
            f"Settings(saga_base_url={self.saga_base_url!r}, "
            f"ui_username={self.ui_username!r}, "
            f"saga_api_token=***, ui_password=***, session_secret=***)"
        )


_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
