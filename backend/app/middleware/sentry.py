from __future__ import annotations

import hashlib
import json
from collections.abc import Awaitable, Callable

import sentry_sdk
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

from app.config import Settings, get_settings


def _hash_user_id(user_id: str) -> str:
    return hashlib.sha256(user_id.encode("utf-8")).hexdigest()


class SentryContextMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp, settings: Settings | None = None) -> None:
        super().__init__(app)
        self.settings = settings or get_settings()

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        with sentry_sdk.isolation_scope():
            user_id = getattr(request.state, "user_id", None)
            roles = getattr(request.state, "roles", None)

            if isinstance(user_id, str) and user_id:
                sentry_sdk.set_user({"id": _hash_user_id(user_id)})
            else:
                sentry_sdk.set_user(None)

            sentry_sdk.set_tag("environment", self.settings.ENVIRONMENT)
            if isinstance(roles, list):
                sentry_sdk.set_tag("roles", json.dumps(roles, separators=(",", ":")))
            else:
                sentry_sdk.set_tag("roles", "[]")

            try:
                response = await call_next(request)
                return response
            except Exception as exc:
                sentry_sdk.capture_exception(exc)
                raise
