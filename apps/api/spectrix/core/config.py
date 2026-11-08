import os
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SPECTRIX"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    SPECTRIX_ENV: str = "development"
    DEBUG: bool = True
    
    # Base paths
    BASE_DIR: Path = Path(__file__).resolve().parents[4]
    STORAGE_VAULT_PATH: Path = BASE_DIR / "storage" / "uploads"
    DERIVATIVES_PATH: Path = BASE_DIR / "storage" / "derivatives"
    TEMP_PATH: Path = BASE_DIR / "storage" / "temp"
    
    # Database
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/spectrix.db"
    
    # Limits
    MAX_UPLOAD_SIZE_BYTES: int = 1024 * 1024 * 1024  # 1 GB
    
    # Security
    SECRET_KEY: str = "dev_secret_key_883a90"
    
    model_config = {
        "env_file": ".env",
        "extra": "ignore"
    }

settings = Settings()

# Ensure critical directories exist
settings.STORAGE_VAULT_PATH.mkdir(parents=True, exist_ok=True)
settings.DERIVATIVES_PATH.mkdir(parents=True, exist_ok=True)
settings.TEMP_PATH.mkdir(parents=True, exist_ok=True)
