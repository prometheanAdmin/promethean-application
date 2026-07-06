from __future__ import annotations

import uuid

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_admin_db, get_db, require_role
from app.modules.batches import service as batches_svc
from app.modules.batches.schemas import BatchCreate, BatchRead, BatchUpdate

log = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/v1", tags=["batches"])


@router.get("/batches", response_model=list[BatchRead])
async def list_batches(
    domain_id: uuid.UUID | None = Query(None, description="Filter by domain ID"),
    status_filter: str | None = Query(None, alias="status", description="Filter by status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> list[BatchRead]:
    """Return batches, optionally filtered by domain and status.

    Any authenticated user may browse batches — the profile gate for
    enrollment lives on the POST /batches/:id/enroll route.
    """
    batches = await batches_svc.list_batches(
        db, domain_id=domain_id, status=status_filter, limit=limit, offset=offset
    )
    return [BatchRead.model_validate(b) for b in batches]


@router.get("/batches/{batch_id}", response_model=BatchRead)
async def get_batch(
    batch_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> BatchRead:
    """Return full batch detail."""
    batch = await batches_svc.get_batch_by_id(db, batch_id)
    if batch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch {batch_id} not found",
        )
    return BatchRead.model_validate(batch)


@router.post(
    "/batches",
    response_model=BatchRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role("admin"))],
)
async def create_batch(
    body: BatchCreate,
    db: AsyncSession = Depends(get_admin_db),
) -> BatchRead:
    """Create a new batch.  Admin-only.  KAN-32."""
    batch = await batches_svc.create_batch(
        db,
        name=body.name,
        project_track=body.project_track,
        domain_id=body.domain_id,
        mentor_id=body.mentor_id,
        start_date=body.start_date,
        end_date=body.end_date,
        max_students=body.max_students,
        description=body.description,
        github_template_repo=body.github_template_repo,
        status=body.status,
    )
    log.info("batch_created", batch_id=str(batch.id), name=batch.name)
    return BatchRead.model_validate(batch)


@router.put(
    "/batches/{batch_id}",
    response_model=BatchRead,
    dependencies=[Depends(require_role("admin"))],
)
async def update_batch(
    batch_id: uuid.UUID,
    body: BatchUpdate,
    db: AsyncSession = Depends(get_admin_db),
) -> BatchRead:
    """Partially update a batch.  Admin-only."""
    batch = await batches_svc.update_batch(
        db,
        batch_id,
        name=body.name,
        project_track=body.project_track,
        domain_id=body.domain_id,
        mentor_id=body.mentor_id,
        start_date=body.start_date,
        end_date=body.end_date,
        max_students=body.max_students,
        description=body.description,
        github_template_repo=body.github_template_repo,
        status=body.status,
    )
    if batch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch {batch_id} not found",
        )
    return BatchRead.model_validate(batch)
