import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "GreenCity AI"
    APP_ENV: str = "development"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./greencity.db")
    POSTGIS_ENABLED: bool = os.getenv("POSTGIS_ENABLED", "true").lower() == "true"
    
    # JWT Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "greencity_ai_production_super_secret_jwt_key_change_in_prod")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    
    # Redis & Storage
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    STORAGE_PROVIDER: str = "local"
    UPLOAD_DIR: str = "./uploads"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
