"""Curriculum repository — all raw DB I/O for the curriculum module.

Layer order:  Router → Service → Repository → DB.
All mutation functions flush but do NOT commit.
"""

from __future__ import annotations

import uuid

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.curriculum.models import Domain

log = structlog.get_logger(__name__)


async def get_all_domains(
    session: AsyncSession,
    *,
    status: str | None = "active",
) -> list[Domain]:
    """Return all domains with the given status, ordered alphabetically.

    ``status="active"`` is the default — pass ``status=None`` to return all.
    """
    q = select(Domain).order_by(Domain.name)
    if status is not None:
        q = q.where(Domain.status == status)
    result = await session.execute(q)
    return list(result.scalars().all())


async def get_domain_by_id(
    session: AsyncSession,
    domain_id: uuid.UUID,
) -> Domain | None:
    """Return a Domain by primary key."""
    result = await session.execute(select(Domain).where(Domain.id == domain_id))
    return result.scalar_one_or_none()


async def get_domain_by_name(
    session: AsyncSession,
    name: str,
) -> Domain | None:
    """Return a Domain by unique name (case-sensitive)."""
    result = await session.execute(select(Domain).where(Domain.name == name))
    return result.scalar_one_or_none()


async def create_domain(
    session: AsyncSession,
    *,
    name: str,
    description: str | None = None,
) -> Domain:
    """INSERT a new Domain row and flush.

    Uniqueness is enforced at the DB level (unique constraint on name).
    The caller (admin router) checks for duplicates before calling here and
    returns HTTP 409 — so a DB unique violation here is a programming error.
    """
    domain = Domain(name=name, description=description)
    session.add(domain)
    await session.flush()
    log.info("curriculum.repo.domain_created", name=name)
    return domain


async def update_domain(
    session: AsyncSession,
    domain: Domain,
    *,
    name: str | None = None,
    description: str | None = None,
    status: str | None = None,
) -> Domain:
    """Mutate non-None fields on an existing Domain row and flush."""
    if name is not None:
        domain.name = name
    if description is not None:
        domain.description = description
    if status is not None:
        domain.status = status
    await session.flush()
    log.debug("curriculum.repo.domain_updated", domain_id=str(domain.id))
    return domain
