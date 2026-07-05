from __future__ import annotations

from collections.abc import AsyncGenerator, Awaitable, Callable
from typing import Any

from fastapi import HTTPException, Request, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal


async def get_current_user(request: Request) -> dict[str, Any]:
    """FastAPI dependency — returns the authenticated user's context dict.

    Only ``user_id`` (from JWT ``sub``) is required.  ``roles`` defaults to an
    empty list when the JWT lacks a ``roles`` claim (Clerk does not include one
    unless a custom JWT template is configured).  ``email`` is optional for the
    same reason.
    """
    user_id = getattr(request.state, "user_id", None)

    if not isinstance(user_id, str) or not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    roles = getattr(request.state, "roles", None)
    roles = roles if isinstance(roles, list) else []

    return {
        "user_id": user_id,
        "roles": [r for r in roles if isinstance(r, str)],
        "email": getattr(request.state, "email", None),
    }


def require_role(role: str) -> Callable[[Request], Awaitable[dict[str, Any]]]:
    async def dependency(request: Request) -> dict[str, Any]:
        user = await get_current_user(request)
        if role not in user["roles"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions — role '{role}' required",
            )
        return user

    return dependency


async def get_db(request: Request) -> AsyncGenerator[AsyncSession, None]:
    """DB session with RLS user context set for the authenticated caller."""
    user = await get_current_user(request)
    async with AsyncSessionLocal() as session:
        await session.execute(
            text("SET LOCAL app.current_user_id = :uid"),
            {"uid": user["user_id"]},
        )
        await session.execute(
            text("SET LOCAL app.bypass_rls = '0'"),
        )
        try:
            yield session
        finally:
            await session.close()


async def get_admin_db(request: Request) -> AsyncGenerator[AsyncSession, None]:
    """DB session with RLS bypassed — for admin routes only.

    Callers must also declare ``Depends(require_role('admin'))`` to ensure only
    admins reach this dependency.
    """
    user = await get_current_user(request)
    if "admin" not in user["roles"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions — role 'admin' required",
        )
    async with AsyncSessionLocal() as session:
        await session.execute(
            text("SET LOCAL app.current_user_id = :uid"),
            {"uid": user["user_id"]},
        )
        await session.execute(
            text("SET LOCAL app.bypass_rls = '1'"),
        )
        try:
            yield session
        finally:
            await session.close()
