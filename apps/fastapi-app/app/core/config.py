"""
Configuration Management for HobyPi API

This module handles all application configuration using environment variables
and Pydantic settings. It provides centralized access to:
- Database connection settings
- JWT authentication configuration  
- Application metadata
- Development vs production settings

Environment variables are loaded from .env file if present.
"""
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List
from dotenv import load_dotenv
import os
from pathlib import Path

# Load environment variables from .env file in project root
project_root = Path(__file__).parent.parent.parent.parent  # Go up to HobyPi root
env_path = project_root / ".env"
load_dotenv(dotenv_path=env_path)

class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    All settings have sensible defaults for development, but should be
    explicitly configured for production deployment.
    """
    
    # Application metadata
    app_name: str = "HobyPi API"
    version: str = "0.3.0"
    cors_origins: List[str] = Field(default_factory=lambda: ["*"])
    
    # Database configuration
    # Note: Uses async driver for application, sync for migrations
    db_url_async: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+asyncpg://postgres:postgres@localhost/hobypi"
    )
    db_url_sync: str = os.getenv(
        "DATABASE_URL_SYNC", 
        "postgresql+psycopg://postgres:postgres@localhost/hobypi"
    )
    
    # JWT authentication settings
    jwt_secret: str = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    jwt_expire_minutes: int = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))
    jwt_issuer: str = os.getenv("JWT_ISSUER", "hobypi")
    jwt_audience: str = os.getenv("JWT_AUDIENCE", "hobypi-clients")

# Global settings instance
settings = Settings()
