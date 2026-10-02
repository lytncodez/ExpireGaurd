"""
Database configuration and session management.

Flow:
1. Engine connects to PostgreSQL using DATABASE_URL
2. SessionLocal creates new sessions for each request
3. Base is inherited by all ORM models
4. get_db() dependency injects session into route handlers
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session

from .config import settings

# Create database engine
engine = create_engine(
    settings.database_url,
    # Pool settings for production
    pool_pre_ping=True,  # Test connection before using
    echo=settings.debug,  # Log SQL queries if DEBUG=True
)

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# Base class for all ORM models
Base = declarative_base()


def get_db():
    """
    Dependency that provides a database session to route handlers.
    
    Usage in routes:
        @router.get("/products")
        def get_products(db: Session = Depends(get_db)):
            return db.query(Product).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
