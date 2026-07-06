"""Integration tests for app.modules.enrollment.service.

These tests require a live PostgreSQL database.
"""

from __future__ import annotations

import uuid
from datetime import date, timedelta

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.identity.schemas import AuthSyncRequest

pytestmark = pytest.mark.asyncio


async def _create_user(session: AsyncSession, *, role: str = "student") -> uuid.UUID:
    from app.modules.identity import service as identity_svc

    clerk_id = f"user_{uuid.uuid4().hex[:12]}"
    resp = await identity_svc.sync_clerk_user(
        session,
        payload=AuthSyncRequest(
            clerk_user_id=clerk_id,
            email=f"{clerk_id}@example.com",
            first_name="Test",
            last_name="User",
            avatar_url=None,
            role=role,
        ),
    )
    return resp.user_id


async def _create_domain(session: AsyncSession) -> uuid.UUID:
    from app.modules.curriculum import service as curriculum_svc

    domain = await curriculum_svc.create_domain(
        session,
        name=f"domain_{uuid.uuid4().hex[:8]}",
    )
    return domain.id


async def _create_batch(
    session: AsyncSession,
    *,
    mentor_id: uuid.UUID,
    domain_id: uuid.UUID,
    max_students: int = 10,
    status: str = "upcoming",
) -> uuid.UUID:
    from app.modules.enrollment import service as enrollment_svc
    from app.modules.enrollment.schemas import BatchCreate

    today = date.today()
    batch = await enrollment_svc.create_batch(
        session,
        BatchCreate(
            name=f"Batch {uuid.uuid4().hex[:6]}",
            project_track="Web Development",
            domain_id=domain_id,
            mentor_id=mentor_id,
            start_date=today + timedelta(days=7),
            end_date=today + timedelta(days=90),
            max_students=max_students,
            status=status,
        ),
    )
    return batch.id


async def _connect_github(session: AsyncSession, user_id: uuid.UUID) -> None:
    """Give the student a github_username so they can enroll."""
    from app.modules.students import service as students_svc

    await students_svc.connect_github(
        session, user_id, github_username=f"gh_{uuid.uuid4().hex[:8]}"
    )


# ---------------------------------------------------------------------------
# enroll_student
# ---------------------------------------------------------------------------


async def test_enroll_student_succeeds(db_session: AsyncSession) -> None:
    """Enrolling a student in an open batch creates an Enrollment row."""
    from app.modules.enrollment import service as enrollment_svc

    mentor_id = await _create_user(db_session, role="mentor")
    student_id = await _create_user(db_session, role="student")
    domain_id = await _create_domain(db_session)
    batch_id = await _create_batch(db_session, mentor_id=mentor_id, domain_id=domain_id)
    await _connect_github(db_session, student_id)

    enrollment = await enrollment_svc.enroll_student(db_session, student_id, batch_id)

    assert enrollment is not None
    assert enrollment.student_id == student_id
    assert enrollment.batch_id == batch_id
    assert enrollment.status == "active"


async def test_enroll_student_fails_when_already_enrolled(db_session: AsyncSession) -> None:
    """enroll_student is idempotent — calling twice returns the same enrollment."""
    from app.modules.enrollment import service as enrollment_svc

    mentor_id = await _create_user(db_session, role="mentor")
    student_id = await _create_user(db_session, role="student")
    domain_id = await _create_domain(db_session)
    batch_id = await _create_batch(db_session, mentor_id=mentor_id, domain_id=domain_id)
    await _connect_github(db_session, student_id)

    e1 = await enrollment_svc.enroll_student(db_session, student_id, batch_id)
    e2 = await enrollment_svc.enroll_student(db_session, student_id, batch_id)

    assert e1.id == e2.id


async def test_enroll_student_fails_when_batch_at_capacity(db_session: AsyncSession) -> None:
    """enroll_student raises ValueError when the batch is full."""
    from app.modules.enrollment import service as enrollment_svc

    mentor_id = await _create_user(db_session, role="mentor")
    domain_id = await _create_domain(db_session)
    batch_id = await _create_batch(
        db_session, mentor_id=mentor_id, domain_id=domain_id, max_students=1
    )

    # First student fills the batch
    first_student = await _create_user(db_session, role="student")
    await _connect_github(db_session, first_student)
    await enrollment_svc.enroll_student(db_session, first_student, batch_id)

    # Second student should be rejected
    second_student = await _create_user(db_session, role="student")
    await _connect_github(db_session, second_student)

    with pytest.raises(ValueError, match="full"):
        await enrollment_svc.enroll_student(db_session, second_student, batch_id)


async def test_enroll_student_fails_when_batch_completed(db_session: AsyncSession) -> None:
    """enroll_student raises ValueError for a batch with status 'completed'."""
    from app.modules.enrollment import service as enrollment_svc

    mentor_id = await _create_user(db_session, role="mentor")
    domain_id = await _create_domain(db_session)
    batch_id = await _create_batch(
        db_session, mentor_id=mentor_id, domain_id=domain_id, status="completed"
    )

    student_id = await _create_user(db_session, role="student")
    await _connect_github(db_session, student_id)

    with pytest.raises(ValueError, match="not open for enrollment"):
        await enrollment_svc.enroll_student(db_session, student_id, batch_id)
