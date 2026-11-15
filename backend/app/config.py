"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration — reads .env automatically."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Xongket — Rural Disaster Management System"
    app_debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8000
    database_url: str = "sqlite:///./xongket.db"

    # ── MQTT Broker Settings ─────────────────────────────
    mqtt_enabled: bool = False
    mqtt_broker: str = "localhost"
    mqtt_port: int = 1883
    mqtt_username: str | None = None
    mqtt_password: str | None = None
    mqtt_topic: str = "sensors/+/+"

    # Optional master API key (can bypass individual node key checks if set)
    master_api_key: str | None = None


settings = Settings()
