"""HTTP-level tests for the public identity router contract."""

from __future__ import annotations

import sys
import uuid

import pytest
from httpx import ASGITransport, AsyncClient

pytestmark = pytest.mark.asyncio

_ENV = {
    "DATABASE_URL": "postgresql+asyncpg://postgres:postgres@localhost:5432/promethean_test",
    "REDIS_URL": "redis://localhost:6379",
    "CLERK_PUBLISHABLE_KEY": "pk_test_placeholder",
    "CLERK_SECRET_KEY": "sk_test_placeholder",
    "CLERK_JWKS_URL": "https://clerk.example.com/.well-known/jwks.json",
    "SENTRY_DSN": "",
    "RESEND_API_KEY": "re_placeholder",
    "ENVIRONMENT": "test",
    "DEBUG": "false",
}


def _build_app(monkeypatch: pytest.MonkeyPatch):
    for key, value in _ENV.items():
        monkeypatch.setenv(key, value)

    for mod in ("app.config", "app.database", "app.redis_client", "app.main"):
        sys.modules.pop(mod, None)

    from app.main import create_app

    return create_app()


async def test_public_auth_sync_ignores_client_supplied_role(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The public sync route must not honor a caller-supplied role field."""
    app = _build_app(monkeypatch)

    from app.modules.identity import router as identity_router
    from app.modules.identity.schemas import AuthSyncResponse

    captured_role: str | None = None

    async def fake_sync_clerk_user(_db, *, payload):  # type: ignore[no-untyped-def]
        nonlocal captured_role
        captured_role = payload.role
        return AuthSyncResponse(
            user_id=uuid.uuid4(),
            roles=[payload.role],
            is_new_user=True,
        )

    async def fake_push_role_to_clerk(_clerk_user_id: str, _role: str) -> None:
        return None

    monkeypatch.setattr(identity_router.identity_svc, "sync_clerk_user", fake_sync_clerk_user)
    monkeypatch.setattr(identity_router, "_push_role_to_clerk", fake_push_role_to_clerk)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.post(
            "/api/v1/auth/sync",
            json={
                "clerk_user_id": "user_test_public_sync",
                "email": "user@example.com",
                "first_name": "Test",
                "last_name": "User",
                "role": "mentor",
            },
        )

    assert response.status_code == 200
    assert captured_role == "student"
    assert response.json()["roles"] == ["student"]
