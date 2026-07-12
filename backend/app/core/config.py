from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DEBUG: bool = False
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    SUPABASE_JWT_SECRET: str
    REDIS_URL: str = "redis://localhost:6379"
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    MOCK_AI: bool = False
    SENTRY_DSN: str = ""
    ALLOWED_ORIGINS: List[str] = ["*"]
    REVENUECAT_WEBHOOK_SECRET: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
