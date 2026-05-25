"""Database connection and session management."""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from app.config import settings

# Create database engine
engine = create_engine(
    settings.database_url,
    echo=settings.database_echo,
    connect_args={"check_same_thread": False}
    if "sqlite" in settings.database_url
    else {},
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db() -> Session:
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_all_tables() -> None:
    """Create all tables in the database."""
    Base.metadata.create_all(bind=engine)


def fix_specialist_roles() -> None:
    """Fix old accounts that have a specialty but role='parent'."""
    from sqlalchemy import text
    with engine.connect() as conn:
        conn.execute(
            text("UPDATE users SET role='specialist' WHERE specialty IS NOT NULL AND specialty != '' AND role='parent'")
        )
        conn.commit()
