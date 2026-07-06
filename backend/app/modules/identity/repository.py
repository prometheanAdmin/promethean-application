"""Identity repository — all raw DB I/O for the identity module.

Layer order:  Router → Service → Repository → DB
Cross-module: only the service layer may be called from other modules.
"""

from __future__ import annotations

import uuid

import structlog
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.identity.models import User, UserRole

log = structlog.get_logger(__name__)


async def get_user_by_clerk_id(
    session: AsyncSession, clerk_user_id: str
) -> User | None:
    """Return User (with roles eagerly loaded) or None."""
    result = await session.execute(
        select(User)
        .where(User.clerk_user_id == clerk_user_id)
        .options(selectinload(User.roles))
    )
    return result.scalar_one_or_none()


async def get_user_by_email(
    session: AsyncSession,
    email: str,
) -> User | None:
    """Return User (with roles eagerly loaded) by normalized email, or None."""
    result = await session.execute(
        select(User)
        .where(User.email == email.lower())
        .options(selectinload(User.roles))
    )
    return result.scalar_one_or_none()


async def get_user_by_id(
    session: AsyncSession, user_id: uuid.UUID
) -> User | None:
    """Return User (with roles eagerly loaded) or None."""
    result = await session.execute(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.roles))
    )
    return result.scalar_one_or_none()


async def list_users(session: AsyncSession) -> list[User]:
    """Return all users with roles eagerly loaded (admin use only)."""
    result = await session.execute(
        select(User).options(selectinload(User.roles)).order_by(User.created_at)
    )
    return list(result.scalars().all())


async def list_users_paginated(
    session: AsyncSession,
    *,
    role: str | None = None,
    search: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> list[User]:
    """Return paginated users with optional role + email/name search filter."""
    q = select(User).options(selectinload(User.roles)).order_by(User.created_at)

    if role is not None:
        q = q.join(UserRole, User.id == UserRole.user_id).where(UserRole.role == role)

    if search is not None:
        term = f"%{search.lower()}%"
        q = q.where(
            or_(
                User.email.ilike(term),
                User.first_name.ilike(term),
                User.last_name.ilike(term),
            )
        )

    q = q.limit(per_page).offset((page - 1) * per_page)
    result = await session.execute(q)
    return list(result.scalars().unique().all())


async def count_users(
    session: AsyncSession,
    *,
    role: str | None = None,
    search: str | None = None,
) -> int:
    """Return total user count matching the same filters as list_users_paginated."""
    q = select(func.count()).select_from(User)

    if role is not None:
        q = q.join(UserRole, User.id == UserRole.user_id).where(UserRole.role == role)

    if search is not None:
        term = f"%{search.lower()}%"
        q = q.where(
            or_(
                User.email.ilike(term),
                User.first_name.ilike(term),
                User.last_name.ilike(term),
            )
        )

    result = await session.scalar(q)
    return int(result) if result is not None else 0


async def create_user(
    session: AsyncSession,
    *,
    clerk_user_id: str,
    email: str,
    first_name: str | None,
    last_name: str | None,
    avatar_url: str | None,
) -> User:
    """Insert a new User row and flush so the PK is populated.

    Caller is responsible for the surrounding transaction.
    """
    user = User(
        clerk_user_id=clerk_user_id,
        email=email.lower(),
        first_name=first_name,
        last_name=last_name,
        avatar_url=avatar_url,
    )
    session.add(user)
    await session.flush()
    log.info("identity.repo.user_created", clerk_user_id=clerk_user_id)
    return user


async def update_user_fields(
    session: AsyncSession,
    user: User,
    *,
    email: str,
    first_name: str | None,
    last_name: str | None,
    avatar_url: str | None,
) -> User:
    """Update mutable fields on an existing User ORM object.

    Mutates the object in-place and flushes so downstream queries in the same
    transaction see the new values.  The DB-side ``set_updated_at`` trigger
    handles ``updated_at`` automatically on flush.

    Caller is responsible for the surrounding transaction.
    """
    user.email = email.lower()
    user.first_name = first_name
    user.last_name = last_name
    user.avatar_url = avatar_url
    await session.flush()
    log.debug("identity.repo.user_updated", clerk_user_id=user.clerk_user_id)
    return user


async def upsert_user_role(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    role: str,
    granted_by: uuid.UUID | None = None,
) -> UserRole:
    """Return the existing (user_id, role) row or INSERT a new one.

    Idempotent — safe to call every time the user syncs.
    Caller is responsible for the surrounding transaction.
    """
    result = await session.execute(
        select(UserRole).where(
            UserRole.user_id == user_id,
            UserRole.role == role,
        )
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        return existing

    user_role = UserRole(user_id=user_id, role=role, granted_by=granted_by)
    session.add(user_role)
    await session.flush()
    log.debug("identity.repo.role_inserted", user_id=str(user_id), role=role)
    return user_role
