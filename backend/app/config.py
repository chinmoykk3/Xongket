"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Central configuration — reads .env automatically."""

    app_name: str = "Xongket — Rural Disaster Management System"
    app_debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8000
    database_url: str = "sqlite:///./xongket.db"

    class Config:
        env_file = ".env"


settings = Settings()
