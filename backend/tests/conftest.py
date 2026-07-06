"""Shared test fixtures.

Design choices:
- Each test gets a fresh async DB session whose changes are rolled back on
  teardown — tests are hermetic and never affect each other.
- ``join_transaction_mode="create_savepoint"`` ensures that service-level
  ``session.commit()`` calls only release the SAVEPOINT, not the outer test
  transaction, so the outer rollback undoes everything.
- The ``app_client`` fixture builds the full FastAPI app and returns an
  ``AsyncClient`` for HTTP-level tests.  It overrides the DB dependency so
  the same rolled-back session is used end-to-end.
"""

from __future__ import annotations

import os
import sys
from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

# ---------------------------------------------------------------------------
# Shared env setup
# ---------------------------------------------------------------------------

_TEST_ENV: dict[str, str] = {
    "DATABASE_URL": os.environ.get(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/promethean_test",
    ),
    "REDIS_URL": os.environ.get("REDIS_URL", "redis://localhost:6379"),
    "CLERK_PUBLISHABLE_KEY": "pk_test_placeholder",
    "CLERK_SECRET_KEY": "sk_test_placeholder",
    "CLERK_JWKS_URL": "https://clerk.example.com/.well-known/jwks.json",
    "SENTRY_DSN": "",
    "RESEND_API_KEY": "re_placeholder",
    "ENVIRONMENT": "test",
    "DEBUG": "false",
}


def _patch_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for k, v in _TEST_ENV.items():
        monkeypatch.setenv(k, v)
    # Force reload of settings-dependent modules
    for mod in ("app.config", "app.database", "app.redis_client"):
        sys.modules.pop(mod, None)


# ---------------------------------------------------------------------------
# Database fixtures — require a live PostgreSQL instance
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def test_db_url() -> str:
    """Return the test database URL from env."""
    return _TEST_ENV["DATABASE_URL"]


@pytest.fixture
async def db_session(test_db_url: str) -> AsyncIterator[AsyncSession]:
    """Provide a real async session for integration tests.

    Each test gets a transaction that is always rolled back on teardown so
    tests never affect each other.

    ``join_transaction_mode="create_savepoint"`` means calls to
    ``session.commit()`` inside service code only release a SAVEPOINT rather
    than the outer test transaction — the outer rollback undoes all changes.
    """
    from app.database import Base

    engine = create_async_engine(test_db_url, echo=False)

    # Create all tables once per test run
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with engine.connect() as conn:
        await conn.begin()  # outer test transaction
        session_factory = async_sessionmaker(
            bind=conn,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
            join_transaction_mode="create_savepoint",
        )
        async with session_factory() as session:
            yield session

        await conn.rollback()

    await engine.dispose()


# ---------------------------------------------------------------------------
# App client fixture — HTTP-level integration tests
# ---------------------------------------------------------------------------


@pytest.fixture
def app_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Patch environment variables needed to construct the app."""
    _patch_env(monkeypatch)


@pytest.fixture
async def app_client(app_env: None) -> AsyncIterator[AsyncClient]:
    """Return an AsyncClient wired to the full FastAPI app.

    Does NOT override the DB dependency — use this for smoke tests and
    auth checks where you don't need DB access.
    """
    # Reload main after env is patched
    for mod in ("app.main",):
        sys.modules.pop(mod, None)

    from app.main import create_app

    application = create_app()

    async with AsyncClient(
        transport=ASGITransport(app=application),
        base_url="http://testserver",
    ) as client:
        yield client
