from __future__ import annotations

import base64
import sys
from datetime import UTC, datetime, timedelta

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import Request
from httpx import ASGITransport, AsyncClient
from jose import jwt


def _base64url_uint(value: int) -> str:
    raw = value.to_bytes((value.bit_length() + 7) // 8, "big")
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _build_signing_material() -> tuple[str, dict[str, object]]:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")

    public_numbers = private_key.public_key().public_numbers()
    jwks = {
        "keys": [
            {
                "kty": "RSA",
                "kid": "test-key",
                "use": "sig",
                "alg": "RS256",
                "n": _base64url_uint(public_numbers.n),
                "e": _base64url_uint(public_numbers.e),
            }
        ]
    }
    return private_pem, jwks


def _build_test_app(monkeypatch: pytest.MonkeyPatch):
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

    for module_name in (
        "app.config",
        "app.database",
        "app.middleware.auth",
        "app.dependencies",
        "app.main",
    ):
        sys.modules.pop(module_name, None)

    private_key, jwks = _build_signing_material()

    import app.middleware.auth as auth_module

    async def fake_get_jwks(self) -> dict[str, object]:
        return jwks

    monkeypatch.setattr(auth_module.ClerkAuthMiddleware, "_get_jwks", fake_get_jwks)

    from app.main import create_app

    app = create_app()

    @app.get("/protected-test")
    async def protected_test(request: Request) -> dict[str, object]:
        return {
            "user_id": request.state.user_id,
            "roles": request.state.roles,
            "email": request.state.email,
        }

    return app, private_key, env["CLERK_JWKS_URL"].removesuffix("/.well-known/jwks.json")


def _build_valid_token(private_key: str, issuer: str) -> str:
    now = datetime.now(tz=UTC)
    payload = {
        "sub": "550e8400-e29b-41d4-a716-446655440000",
        "roles": ["student"],
        "email": "student@example.com",
        "iss": issuer,
        "exp": int((now + timedelta(minutes=5)).timestamp()),
    }
    return jwt.encode(payload, private_key, algorithm="RS256", headers={"kid": "test-key"})


@pytest.mark.asyncio
async def test_request_without_authorization_header_returns_401(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, _, _ = _build_test_app(monkeypatch)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.get("/protected-test")

    assert response.status_code == 401
    assert response.json() == {"detail": "Authorization header required"}


@pytest.mark.asyncio
async def test_request_with_malformed_token_returns_401(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, _, _ = _build_test_app(monkeypatch)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.get(
            "/protected-test",
            headers={"Authorization": "Bearer not-a-jwt"},
        )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid token format"}


@pytest.mark.asyncio
async def test_health_route_is_public(monkeypatch: pytest.MonkeyPatch) -> None:
    app, _, _ = _build_test_app(monkeypatch)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "env": "test"}


@pytest.mark.asyncio
async def test_valid_token_populates_request_state(monkeypatch: pytest.MonkeyPatch) -> None:
    app, private_key, issuer = _build_test_app(monkeypatch)
    token = _build_valid_token(private_key, issuer)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        response = await client.get(
            "/protected-test",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 200
    assert response.json() == {
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "roles": ["student"],
        "email": "student@example.com",
    }
