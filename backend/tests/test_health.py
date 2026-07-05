from __future__ import annotations

import importlib
import sys

import pytest
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_health_returns_ok(monkeypatch: pytest.MonkeyPatch) -> None:
    env = {
        "DATABASE_URL": "postgresql+asyncpg://postgres:postgres@localhost:5432/promethean",
        "REDIS_URL": "redis://localhost:6379",
        "CLERK_PUBLISHABLE_KEY": "pk_test_placeholder",
        "CLERK_SECRET_KEY": "sk_test_placeholder",
        "CLERK_JWKS_URL": "https://clerk.example.com/.well-known/jwks.json",
        "SENTRY_DSN": "",
        "RESEND_API_KEY": "re_placeholder",
        "ENVIRONMENT": "test",
        "DEBUG": "false",
    }

    for key, value in env.items():
        monkeypatch.setenv(key, value)

    for module_name in ("app.config", "app.database", "app.main"):
        if module_name in sys.modules:
            importlib.reload(sys.modules[module_name])

    from app.main import create_app

    app = create_app()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "env": "test"}
