from __future__ import annotations

import sys
from unittest.mock import Mock

import pytest
from httpx import ASGITransport, AsyncClient


def _build_test_app(monkeypatch: pytest.MonkeyPatch):
    env = {
        "DATABASE_URL": "postgresql+asyncpg://postgres:postgres@localhost:5432/promethean",
        "REDIS_URL": "redis://localhost:6379",
        "CLERK_PUBLISHABLE_KEY": "pk_test_placeholder",
        "CLERK_SECRET_KEY": "sk_test_placeholder",
        "CLERK_JWKS_URL": "https://clerk.example.com/.well-known/jwks.json",
        "SENTRY_DSN": "",
        "RESEND_API_KEY": "re_placeholder",
        "ENVIRONMENT": "development",
        "DEBUG": "false",
    }

    for key, value in env.items():
        monkeypatch.setenv(key, value)

    for module_name in (
        "app.config",
        "app.database",
        "app.middleware.auth",
        "app.middleware.sentry",
        "app.main",
    ):
        sys.modules.pop(module_name, None)

    from app.main import create_app

    return create_app()


@pytest.mark.asyncio
async def test_unhandled_exception_is_captured_by_sentry(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app = _build_test_app(monkeypatch)

    import app.middleware.sentry as sentry_middleware_module

    capture_exception = Mock()
    monkeypatch.setattr(
        sentry_middleware_module.sentry_sdk,
        "capture_exception",
        capture_exception,
    )

    async with AsyncClient(
        transport=ASGITransport(app=app, raise_app_exceptions=False),
        base_url="http://testserver",
    ) as client:
        response = await client.get("/debug/sentry-test")

    assert response.status_code == 500
    capture_exception.assert_called_once()
    assert str(capture_exception.call_args.args[0]) == "Sentry test error from Promethean backend"
