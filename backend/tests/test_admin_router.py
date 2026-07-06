"""Tests for app.modules.admin.router.

These tests use FastAPI dependency overrides so they run without a live
database.  They verify role enforcement and basic routing behaviour.
"""

from __future__ import annotations

import sys
import uuid
from unittest.mock import AsyncMock

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
    """Build a test app with env patched and all cached modules cleared."""
    for k, v in _ENV.items():
        monkeypatch.setenv(k, v)
    for mod in (
        "app.config",
        "app.database",
        "app.redis_client",
        "app.main",
    ):
        sys.modules.pop(mod, None)

    from app.main import create_app

    return create_app()


# ---------------------------------------------------------------------------
# Role enforcement: non-admin cannot access /api/v1/admin/*
# ---------------------------------------------------------------------------


async def test_non_admin_cannot_access_admin_routes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Requests without the 'admin' role receive 403 on all admin endpoints.

    We patch ClerkAuthMiddleware._get_jwks with a JWKS that returns a key,
    then provide a valid JWT signed with that key that has role='student'.
    The require_role('admin') dependency must reject with 403.
    """
    import base64

    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from jose import jwt as jose_jwt

    # Generate a throw-away RSA key pair
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")
    pub = private_key.public_key().public_numbers()

    def _b64(n: int) -> str:
        raw = n.to_bytes((n.bit_length() + 7) // 8, "big")
        return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")

    jwks = {
        "keys": [
            {
                "kty": "RSA",
                "kid": "test-key",
                "use": "sig",
                "alg": "RS256",
                "n": _b64(pub.n),
                "e": _b64(pub.e),
            }
        ]
    }

    # Build token with role=student
    import datetime

    now = datetime.datetime.now(tz=datetime.UTC)
    token = jose_jwt.encode(
        {
            "sub": "user_student_123",
            "role": "student",
            "iss": "https://clerk.example.com",
            "exp": int((now + datetime.timedelta(minutes=5)).timestamp()),
        },
        private_pem,
        algorithm="RS256",
        headers={"kid": "test-key"},
    )

    app = _build_app(monkeypatch)

    import app.middleware.auth as auth_module

    async def fake_get_jwks(self):  # type: ignore[override]
        return jwks

    monkeypatch.setattr(auth_module.ClerkAuthMiddleware, "_get_jwks", fake_get_jwks)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        # Try several admin endpoints
        for path in (
            "/api/v1/admin/users",
            "/api/v1/admin/domains",
        ):
            resp = await client.get(path, headers={"Authorization": f"Bearer {token}"})
            assert resp.status_code == 403, (
                f"Expected 403 on {path} for student role, got {resp.status_code}"
            )


# ---------------------------------------------------------------------------
# Admin: create domain
# ---------------------------------------------------------------------------


async def test_admin_can_create_domain(monkeypatch: pytest.MonkeyPatch) -> None:
    """POST /api/v1/admin/domains returns 201 when admin role is present.

    The curriculum service is mocked so no real DB is required.
    """
    app = _build_app(monkeypatch)

    from app.modules.curriculum import models as curriculum_models

    fake_domain = curriculum_models.Domain()
    fake_domain.id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    fake_domain.name = "AI Engineering"
    fake_domain.description = "All things AI"
    fake_domain.status = "active"
    import datetime
    fake_domain.created_at = datetime.datetime(2025, 1, 1, tzinfo=datetime.UTC)

    import app.modules.curriculum.service as curriculum_svc_mod

    monkeypatch.setattr(curriculum_svc_mod, "get_domain_by_name", AsyncMock(return_value=None))
    monkeypatch.setattr(
        curriculum_svc_mod, "create_domain", AsyncMock(return_value=fake_domain)
    )

    from app.dependencies import get_admin_db, require_role

    async def mock_admin_db():
        yield AsyncMock()

    app.dependency_overrides[get_admin_db] = mock_admin_db
    app.dependency_overrides[require_role("admin")] = lambda: None

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        resp = await client.post(
            "/api/v1/admin/domains",
            json={"name": "AI Engineering", "description": "All things AI"},
            headers={"Authorization": "Bearer fake"},
        )

    app.dependency_overrides.clear()

    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "AI Engineering"
    assert data["status"] == "active"


# ---------------------------------------------------------------------------
# Admin: verify mentor
# ---------------------------------------------------------------------------


async def test_admin_can_verify_mentor(monkeypatch: pytest.MonkeyPatch) -> None:
    """PUT /api/v1/admin/mentors/{id}/verify returns 200 with the updated profile.

    The mentors service is mocked so no real DB is required.
    """
    app = _build_app(monkeypatch)

    mentor_profile_id = uuid.UUID("00000000-0000-0000-0000-000000000002")
    mentor_user_id = uuid.UUID("00000000-0000-0000-0000-000000000003")

    from app.modules.mentors import models as mentor_models

    fake_profile = mentor_models.MentorProfile()
    fake_profile.id = mentor_profile_id
    fake_profile.user_id = mentor_user_id
    fake_profile.is_verified = True

    import app.modules.identity.service as identity_svc_mod
    import app.modules.mentors.service as mentors_svc_mod

    monkeypatch.setattr(mentors_svc_mod, "verify_mentor", AsyncMock(return_value=fake_profile))
    monkeypatch.setattr(
        identity_svc_mod, "get_user_by_clerk_id", AsyncMock(return_value=None)
    )

    from app.dependencies import get_admin_db, require_role

    async def mock_admin_db():
        yield AsyncMock()

    app.dependency_overrides[get_admin_db] = mock_admin_db
    app.dependency_overrides[require_role("admin")] = lambda: None

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        resp = await client.put(
            f"/api/v1/admin/mentors/{mentor_profile_id}/verify",
            json={"is_verified": True, "rejection_reason": None},
            headers={"Authorization": "Bearer fake"},
        )

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    data = resp.json()
    assert data["is_verified"] is True
    assert data["id"] == str(mentor_profile_id)
