from __future__ import annotations

import re
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from time import monotonic
from typing import Any

import httpx
from jose import JWTError, jwk, jwt
from jose.exceptions import ExpiredSignatureError
from jose.utils import base64url_decode
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.types import ASGIApp

from app.config import Settings, get_settings

PUBLIC_ROUTES = {
    ("GET", "/health"),
    ("GET", "/readiness"),
    # auth/sync is intentionally public — called immediately after Clerk sign-in
    # before a full JWT session is established on the frontend.
    ("POST", "/api/v1/auth/sync"),
    # Public discovery endpoints — no auth required (served from Redis cache or DB)
    ("GET", "/api/v1/domains"),
    # NOTE: GET /api/v1/batches is NOT public — requires profile completion (KAN-26).
    # GET /api/v1/batches/{id} stays public via _PUBLIC_UUID_PATH below.
    ("GET", "/api/v1/mentors"),
}

# Exact UUID segment pattern — only matches the 8-4-4-4-12 lowercase hex form.
# Using re.fullmatch instead of startswith() to prevent over-broad bypasses
# (e.g. /api/v1/batches/../../admin would not match).
_UUID_SEG = r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
_PUBLIC_UUID_PATH = re.compile(rf"^/api/v1/(?:batches|mentors)/{_UUID_SEG}$")
JWKS_CACHE_TTL_SECONDS = 3600.0
ALLOWED_ALGORITHMS = ["RS256"]


@dataclass(slots=True)
class AuthError(Exception):
    detail: str


class ClerkAuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp, settings: Settings | None = None) -> None:
        super().__init__(app)
        self.settings = settings or get_settings()
        self._jwks: dict[str, Any] | None = None
        self._jwks_cached_at = 0.0

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        request.state.user_id = None
        request.state.roles = []  # list[str], set explicitly after auth
        request.state.email = None

        if self._should_skip_auth(request):
            response = await call_next(request)
            return response

        authorization = request.headers.get("Authorization")
        if authorization is None:
            return JSONResponse(
                {"detail": "Authorization header required"},
                status_code=401,
            )

        token = self._extract_bearer_token(authorization)
        if token is None:
            return JSONResponse({"detail": "Invalid token format"}, status_code=401)

        try:
            claims = await self._decode_and_verify_token(token)
            user_id = self._extract_user_id(claims)
            roles = self._extract_roles(claims)
            email = self._extract_email(claims)
        except AuthError as exc:
            return JSONResponse({"detail": exc.detail}, status_code=401)

        request.state.user_id = user_id
        request.state.roles = roles
        request.state.email = email
        response = await call_next(request)
        return response

    def _extract_bearer_token(self, authorization: str) -> str | None:
        parts = authorization.split()
        if len(parts) != 2:
            return None

        scheme, token = parts
        if scheme.lower() != "bearer" or not token:
            return None

        return token

    def _should_skip_auth(self, request: Request) -> bool:
        if request.method == "OPTIONS":
            return True

        if (
            self.settings.ENVIRONMENT in {"development", "test"}
            and request.method == "GET"
            and request.url.path in {"/debug/sentry-test", "/docs", "/openapi.json"}
        ):
            return True

        if (request.method, request.url.path) in PUBLIC_ROUTES:
            return True

        # Public UUID-detail routes: GET /api/v1/batches/{uuid}, GET /api/v1/mentors/{uuid}
        # Exact regex match prevents path-traversal bypasses that startswith() would allow.
        if request.method == "GET" and _PUBLIC_UUID_PATH.match(request.url.path):
            return True

        return False

    async def _decode_and_verify_token(self, token: str) -> dict[str, Any]:
        header = self._get_unverified_header(token)
        signing_key = await self._get_signing_key(header)

        self._verify_signature(token, signing_key)
        expected_issuer = self.settings.CLERK_JWKS_URL.removesuffix(
            "/.well-known/jwks.json"
        ).rstrip("/")

        try:
            claims = jwt.decode(
                token,
                signing_key,
                algorithms=ALLOWED_ALGORITHMS,
                issuer=expected_issuer,
                options={"verify_aud": False},
            )
        except ExpiredSignatureError as exc:
            raise AuthError("Token has expired") from exc
        except JWTError as exc:
            raise AuthError("Invalid token signature") from exc

        if not isinstance(claims, dict):
            raise AuthError("Invalid token signature")

        return dict(claims)

    def _get_unverified_header(self, token: str) -> dict[str, Any]:
        try:
            header = jwt.get_unverified_header(token)
        except JWTError as exc:
            raise AuthError("Invalid token format") from exc

        if header.get("alg") not in ALLOWED_ALGORITHMS:
            raise AuthError("Invalid token signature")

        return dict(header)

    async def _get_signing_key(self, header: dict[str, Any]) -> dict[str, Any]:
        kid = header.get("kid")
        if not isinstance(kid, str) or not kid:
            raise AuthError("Invalid token signature")

        jwks = await self._get_jwks()
        keys = jwks.get("keys")
        if not isinstance(keys, list):
            raise AuthError("Invalid token signature")

        signing_key = next(
            (key for key in keys if isinstance(key, dict) and key.get("kid") == kid),
            None,
        )
        if signing_key is None:
            raise AuthError("Invalid token signature")

        return dict(signing_key)

    def _verify_signature(self, token: str, signing_key: dict[str, Any]) -> None:
        try:
            message, encoded_signature = token.rsplit(".", maxsplit=1)
        except ValueError as exc:
            raise AuthError("Invalid token format") from exc

        try:
            key = jwk.construct(signing_key, algorithm="RS256")
            decoded_signature = base64url_decode(encoded_signature.encode("utf-8"))
        except Exception as exc:
            raise AuthError("Invalid token signature") from exc

        if not key.verify(message.encode("utf-8"), decoded_signature):
            raise AuthError("Invalid token signature")

    def _extract_user_id(self, claims: dict[str, Any]) -> str:
        user_id = claims.get("sub")
        if not isinstance(user_id, str) or not user_id:
            raise AuthError("Invalid token signature")

        return user_id

    def _extract_roles(self, claims: dict[str, Any]) -> list[str]:
        # Clerk JWTs only include role claims when a custom JWT template is
        # configured in the Clerk Dashboard (see docs/clerk-setup.md).
        # We support two JWT template shapes:
        #
        #   Preferred (singular string — easier Liquid template):
        #     { "role": "{{ user.public_metadata.role | default: \"student\" }}" }
        #
        #   Array form (if you prefer):
        #     { "roles": ["{{ user.public_metadata.role | default: \"student\" }}"] }
        #
        # Treat a missing or malformed claim as [] — route-level deps enforce roles.
        roles = claims.get("roles")
        if isinstance(roles, list):
            return [r for r in roles if isinstance(r, str) and r]

        # Fall back to singular 'role' string claim
        role = claims.get("role")
        if isinstance(role, str) and role:
            return [role]

        return []

    def _extract_email(self, claims: dict[str, Any]) -> str | None:
        # 'email' is not in the default Clerk JWT payload; it requires a custom
        # JWT template.  Return None when absent — callers must handle None.
        email = claims.get("email")
        if not isinstance(email, str):
            return None
        return email

    async def _get_jwks(self) -> dict[str, Any]:
        now = monotonic()
        if self._jwks is not None and (now - self._jwks_cached_at) < JWKS_CACHE_TTL_SECONDS:
            return self._jwks

        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(self.settings.CLERK_JWKS_URL)
            response.raise_for_status()
            jwks = response.json()

        if not isinstance(jwks, dict):
            raise AuthError("Invalid token signature")

        self._jwks = jwks
        self._jwks_cached_at = now
        return dict(jwks)
