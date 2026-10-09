from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.config import Settings

settings = Settings()

engine = create_engine(settings.DATABASE_URL)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
