"""Shared Redis client — single connection pool for the entire application.

Usage:
    from app.redis_client import get_redis_client

    redis = get_redis_client()
    await redis.set("key", "value", ex=60)

The client is created once per process via ``@lru_cache`` and reused across
all requests.  It is safe to import this module at startup; the actual
connection is established lazily on first command.
"""

from __future__ import annotations

from functools import lru_cache

from redis.asyncio import Redis

from app.config import get_settings


@lru_cache(maxsize=1)
def get_redis_client() -> Redis:
    """Return the shared aioredis.Redis instance.

    ``lru_cache(maxsize=1)`` guarantees a single connection pool per process.
    Calling this function multiple times is safe and cheap.

    Connection parameters:
    - socket_connect_timeout=2: fail fast if Redis is unreachable at startup
    - socket_timeout=2: abort any command that takes > 2 s (guards hot path)
    - retry_on_timeout=True: transparent retry on transient socket timeouts
    - health_check_interval=30: periodic PING to detect stale connections
    """
    settings = get_settings()
    return Redis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
        socket_connect_timeout=2,
        socket_timeout=2,
        retry_on_timeout=True,
        health_check_interval=30,
    )
