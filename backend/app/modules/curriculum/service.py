"""Curriculum service — business logic + Redis caching for domains.

Layer order: Router → Service → Repository → DB.

Domains are a reference table that changes rarely but is read on every page
load (domain filter dropdowns, profile forms).  We cache the active list in
Redis with a 5-minute TTL to avoid hammering the DB.

Cache key:  "domains:active:list"
Invalidated: on create_domain and update_domain.
"""

from __future__ import annotations

import json
import uuid

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.curriculum import repository as repo
from app.modules.curriculum.models import Domain
from app.redis_client import get_redis_client

log = structlog.get_logger(__name__)

_CACHE_KEY = "domains:active:list"
_CACHE_TTL_S = 300  # 5 minutes


# ---------------------------------------------------------------------------
# Cache helpers
# ---------------------------------------------------------------------------


def _serialize_domains(domains: list[Domain]) -> str:
    """Serialize a list of Domain ORM objects to a JSON string for Redis."""
    return json.dumps(
        [
            {
                "id": str(d.id),
                "name": d.name,
                "description": d.description,
                "status": d.status,
                "created_at": d.created_at.isoformat(),
            }
            for d in domains
        ]
    )


def _deserialize_domains(raw: str) -> list[dict[str, object]]:
    """Deserialise cached JSON back to plain dicts (used for DomainRead validation)."""
    result: list[dict[str, object]] = json.loads(raw)
    return result


async def _invalidate_cache() -> None:
    """Delete the active domains cache key.  Best-effort — never raises."""
    try:
        redis = get_redis_client()
        await redis.delete(_CACHE_KEY)
        log.debug("curriculum.cache.invalidated", key=_CACHE_KEY)
    except Exception:
        log.warning("curriculum.cache.invalidate_failed", key=_CACHE_KEY)


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------


async def list_active_domains(session: AsyncSession) -> list[dict[str, object]]:
    """Return all active domains, served from Redis cache when available.

    Returns plain dicts (not ORM objects) so callers must use
    ``DomainRead.model_validate(d)`` to get a typed schema response.
    Using dicts as the cached representation keeps the service layer
    decoupled from the ORM after cache hydration.
    """
    redis = get_redis_client()

    try:
        cached = await redis.get(_CACHE_KEY)
        if cached is not None:
            log.debug("curriculum.cache.hit", key=_CACHE_KEY)
            raw = cached if isinstance(cached, str) else cached.decode("utf-8")
            return _deserialize_domains(raw)
    except Exception:
        log.warning("curriculum.cache.read_failed", key=_CACHE_KEY)

    # Cache miss — query DB and backfill
    domains = await repo.get_all_domains(session, status="active")
    try:
        await redis.set(_CACHE_KEY, _serialize_domains(domains), ex=_CACHE_TTL_S)
        log.debug("curriculum.cache.written", key=_CACHE_KEY, count=len(domains))
    except Exception:
        log.warning("curriculum.cache.write_failed", key=_CACHE_KEY)

    return _deserialize_domains(_serialize_domains(domains))


async def get_domain_by_id(
    session: AsyncSession,
    domain_id: uuid.UUID,
) -> Domain | None:
    """Return a domain by primary key.  Not cached — used for admin lookups."""
    return await repo.get_domain_by_id(session, domain_id)


async def get_domain_by_name(
    session: AsyncSession,
    name: str,
) -> Domain | None:
    """Return a domain by name.  Used by admin router for duplicate detection."""
    return await repo.get_domain_by_name(session, name)


async def create_domain(
    session: AsyncSession,
    *,
    name: str,
    description: str | None = None,
) -> Domain:
    """Create a domain and invalidate the Redis cache.

    Owns the transaction (commits).
    """
    domain = await repo.create_domain(session, name=name, description=description)
    await session.commit()
    await _invalidate_cache()
    log.info("curriculum.svc.domain_created", name=name)
    return domain


async def update_domain(
    session: AsyncSession,
    domain: Domain,
    *,
    name: str | None = None,
    description: str | None = None,
    status: str | None = None,
) -> Domain:
    """Update a domain and invalidate the Redis cache.

    Owns the transaction (commits).
    """
    domain = await repo.update_domain(
        session, domain, name=name, description=description, status=status
    )
    await session.commit()
    await _invalidate_cache()
    log.info("curriculum.svc.domain_updated", domain_id=str(domain.id))
    return domain


async def list_all_domains(session: AsyncSession) -> list[Domain]:
    """Return ALL domains regardless of status — for admin use only.

    Bypasses Redis cache (admin needs live data, including inactive domains).
    """
    return await repo.get_all_domains(session, status=None)
