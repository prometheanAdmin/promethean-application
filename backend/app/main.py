from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

import sentry_sdk
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sentry_sdk.crons import capture_checkin
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sqlalchemy import text

from app.config import Settings, get_settings
from app.database import AsyncSessionLocal
from app.middleware.auth import ClerkAuthMiddleware
from app.middleware.sentry import SentryContextMiddleware
from app.modules.admin.router import router as admin_router
from app.modules.curriculum.router import router as curriculum_router
from app.modules.enrollment.router import router as enrollment_router
from app.modules.identity.router import router as identity_router
from app.modules.mentors.router import router as mentors_router
from app.modules.students.router import router as students_router
from app.redis_client import get_redis_client


def configure_structlog() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.add_log_level,
            structlog.processors.JSONRenderer(),
        ],
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def _cors_origins_from_settings(settings: Settings) -> list[str]:
    return [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    if settings.SENTRY_DSN:
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENVIRONMENT,
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                SqlalchemyIntegration(),
            ],
            traces_sample_rate=0.2,
            profiles_sample_rate=0.1,
            send_default_pii=False,
        )
        capture_checkin(
            monitor_slug="promethean-fastapi-startup",
            status="ok",
        )
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    configure_structlog()

    app = FastAPI(
        title="Promethean API",
        version="1.0.0",
        debug=settings.DEBUG,
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins_from_settings(settings),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(SentryContextMiddleware, settings=settings)
    app.add_middleware(ClerkAuthMiddleware, settings=settings)

    # Routers each declare their own full /api/v1/... prefixes
    app.include_router(identity_router)
    app.include_router(students_router)
    app.include_router(mentors_router)
    app.include_router(admin_router)
    app.include_router(curriculum_router)
    app.include_router(enrollment_router)

    @app.get("/health")
    async def health() -> dict[str, Any]:
        return {"status": "ok", "env": settings.ENVIRONMENT}

    @app.get("/readiness")
    async def readiness() -> JSONResponse:
        """Readiness probe for Kubernetes / ECS health checks.

        Unlike /health (process alive), /readiness checks that all dependencies
        are reachable and the service can handle traffic.
        Returns 503 if any dependency is unhealthy.
        """
        checks: dict[str, str] = {}

        # Database check
        try:
            async with AsyncSessionLocal() as session:
                await session.execute(text("SELECT 1"))
            checks["database"] = "ok"
        except Exception:
            checks["database"] = "error"

        # Redis check
        try:
            redis = get_redis_client()
            await redis.ping()
            checks["redis"] = "ok"
        except Exception:
            checks["redis"] = "error"

        all_ok = all(v == "ok" for v in checks.values())
        return JSONResponse(
            content={"status": "ok" if all_ok else "degraded", "checks": checks},
            status_code=200 if all_ok else 503,
        )

    if settings.ENVIRONMENT == "development":

        @app.get("/debug/sentry-test")
        async def debug_sentry_test() -> None:
            raise Exception("Sentry test error from Promethean backend")

    return app


app = create_app()
