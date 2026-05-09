"""Application configuration from environment variables."""

import os
from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App settings
    app_name: str = "Interactive Learning Platform"
    app_version: str = "0.1.0"
    debug: bool = os.getenv("DEBUG", "False").lower() == "true"
    environment: Literal["development", "staging", "production"] = os.getenv(
        "ENVIRONMENT", "development"
    )

    # Server settings
    host: str = "0.0.0.0"
    port: int = int(os.getenv("PORT", 8000))

    # CORS settings (for frontend compatibility)
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    allowed_origins: list[str] = [
        frontend_url,
        "http://localhost:3000",
        "http://localhost:5173",
    ]

    # Database settings
    database_url: str = os.getenv(
        "DATABASE_URL", "sqlite:///./app.db"
    )  # Default SQLite for development
    database_echo: bool = debug  # Log SQL queries in debug mode

    # API settings
    api_prefix: str = "/api"
    api_timeout: int = 30

    # JWT settings
    jwt_secret: str = os.getenv("JWT_SECRET", "beyond21-dev-secret-change-in-production")
    jwt_expire_hours: int = 72

    # Feature flags
    enable_docs: bool = True  # Swagger/OpenAPI docs

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
