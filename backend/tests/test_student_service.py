"""Integration tests for app.modules.students.service.

These tests require a live PostgreSQL database.
"""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.identity.schemas import AuthSyncRequest

pytestmark = pytest.mark.asyncio


async def _create_user(session: AsyncSession, *, role: str = "student") -> uuid.UUID:
    """Helper: create a real user row via identity service and return its local UUID."""
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
    """Helper: create a curriculum domain and return its UUID."""
    from app.modules.curriculum import service as curriculum_svc

    domain = await curriculum_svc.create_domain(
        session,
        name=f"domain_{uuid.uuid4().hex[:8]}",
        description="test domain",
    )
    return domain.id


# ---------------------------------------------------------------------------
# upsert_student_profile
# ---------------------------------------------------------------------------


async def test_upsert_creates_profile_incomplete(db_session: AsyncSession) -> None:
    """upsert with only career_goals should create a profile that is NOT complete."""
    from app.modules.students import service as students_svc
    from app.modules.students.schemas import StudentProfileUpdate

    user_id = await _create_user(db_session)

    payload = StudentProfileUpdate(
        career_goals="Become a software engineer",
        education=None,
        domain_id=None,
    )
    profile = await students_svc.upsert_student_profile(db_session, user_id, payload)

    assert profile is not None
    assert profile.career_goals == "Become a software engineer"
    assert profile.profile_complete is False


async def test_upsert_sets_profile_complete_when_required_fields_present(
    db_session: AsyncSession,
) -> None:
    """upsert with all required fields marks profile_complete=True."""
    from app.modules.students import service as students_svc
    from app.modules.students.schemas import StudentProfileUpdate

    user_id = await _create_user(db_session)
    domain_id = await _create_domain(db_session)

    payload = StudentProfileUpdate(
        career_goals="Build AI tools",
        education="BSc Computer Science",
        domain_id=domain_id,
    )
    profile = await students_svc.upsert_student_profile(db_session, user_id, payload)

    assert profile.profile_complete is True
    assert profile.domain_id == domain_id


async def test_connect_github_normalises_username_lowercase(db_session: AsyncSession) -> None:
    """connect_github stores the username in lowercase regardless of input case."""
    from app.modules.students import service as students_svc

    user_id = await _create_user(db_session)

    profile = await students_svc.connect_github(
        db_session, user_id, github_username="JohnDoe123"
    )

    assert profile.github_username == "johndoe123"
