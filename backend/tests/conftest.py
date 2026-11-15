"""Shared pytest fixtures — provides a fresh in-memory SQLite database
for every test function."""

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.database import Base

# Import all models so Base.metadata is fully populated
import app.models  # noqa: F401


@pytest.fixture()
def db_session():
    """Yield a SQLAlchemy session backed by a fresh in-memory SQLite DB."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def _set_fk_pragma(dbapi_conn, _rec):
        import sqlite3
        if isinstance(dbapi_conn, sqlite3.Connection):
            dbapi_conn.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()

