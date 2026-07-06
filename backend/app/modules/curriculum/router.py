"""Curriculum router — public domain discovery.

Routes:
  GET /api/v1/domains — PUBLIC: list of active domains (Redis-cached)

No authentication required.  The domain list is a reference dataset used
by the frontend for profile form dropdowns and batch discovery filters.

The response is served from a 5-minute Redis cache; DB is only hit on cache
miss or after an admin create/update invalidates the key.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_public_db
from app.modules.curriculum import service as curriculum_svc
from app.modules.curriculum.schemas import DomainRead

router = APIRouter(prefix="/api/v1", tags=["curriculum"])


@router.get("/domains", response_model=list[DomainRead])
async def list_domains(
    db: AsyncSession = Depends(get_public_db),
) -> list[DomainRead]:
    """Return all active domains.  No authentication required.

    Response is served from a 5-minute Redis cache when available.
    Stale cache is never a correctness problem — domains are reference data
    that changes very rarely and only via admin action.
    """
    domains = await curriculum_svc.list_active_domains(db)
    return [DomainRead.model_validate(d) for d in domains]
