"""Application configuration loaded from environment variables."""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Central configuration — reads .env automatically."""

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        extra="ignore",
    )

    app_name: str = "Xongket — Rural Disaster Management System"
    app_debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000
    database_url: str = f"sqlite:///{BACKEND_DIR / 'xongket.db'}"

    # ── Auth / JWT ───────────────────────────────────────
    jwt_secret: str = "xongket-disaster-management-secret-key-assam-2026"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 1440  # 24 hours

    # ── MQTT Broker Settings ─────────────────────────────
    mqtt_enabled: bool = False
    mqtt_broker: str = "localhost"
    mqtt_port: int = 1883
    mqtt_username: str | None = None
    mqtt_password: str | None = None
    mqtt_topic: str = "sensors/+/+"

    # Optional master API key (can bypass individual node key checks if set)
    master_api_key: str | None = None

    # ── AI Forecasting & Scheduler ──────────────────────
    forecast_scheduler_enabled: bool = True
    forecast_interval_minutes: int = 10


settings = Settings()
