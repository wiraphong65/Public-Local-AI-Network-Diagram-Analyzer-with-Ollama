from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./network_topology.db"
    SECRET_KEY: str = "your-secret-key-here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 ชั่วโมง - พอสำหรับ dev/testing

    # Ollama Configuration
    OLLAMA_BASE_URL: str = "http://10.80.49.111:11434"
    OLLAMA_MODEL: str = "gpt-oss:latest"  # Fixed model, cannot be changed
    OLLAMA_TIMEOUT: int = 3600  # 60 minutes timeout

    class Config:
        env_file = ".env"

settings = Settings()