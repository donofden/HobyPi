from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List

class Settings(BaseSettings):
    app_name: str = "HobyPi API"
    version: str = "0.3.0"
    cors_origins: List[str] = Field(default_factory=lambda: ["*"])

settings = Settings()
