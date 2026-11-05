from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="PEDIVEIN_", extra="ignore")

    database_url: str = "postgresql+psycopg://pedivein:pedivein@localhost:5434/pedivein"

    # Auth
    jwt_secret: str = "dev-only-change-me"
    jwt_expire_minutes: int = 12 * 60
    cookie_name: str = "pedivein_session"
    cookie_secure: bool = False

    # AI inference service (backend_ai_cpu)
    ai_base_url: str = "http://127.0.0.1:8000"
    ai_api_key: str | None = None
    ai_timeout_seconds: float = 180.0
    # Background check that mirrors training runs and starts scheduled retrains.
    retrain_scheduler: bool = True
    retrain_check_seconds: int = 300

    # Image storage (patient data: keep on an encrypted, access-controlled volume)
    upload_dir: Path = Path("uploads")
    max_upload_mb: int = 15

    # Create the initial admin account on first start (no demo patients)
    seed_demo_data: bool = True
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
