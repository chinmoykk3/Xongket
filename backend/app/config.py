"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration — reads .env automatically."""

    model_config = SettingsConfigDict(env_file=".env")

    app_name: str = "Xongket — Rural Disaster Management System"
    app_debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8000
    database_url: str = "sqlite:///./xongket.db"


settings = Settings()
