from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Allows the database password in .env to be read.
    POSTGRES_PASSWORD: str | None = None

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
