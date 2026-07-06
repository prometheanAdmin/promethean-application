"""Integration tests for app.modules.identity.service.

These tests require a live PostgreSQL database.  Run with Docker Compose:
    docker compose up -d db
    pytest tests/test_identity_service.py -v
"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.identity.schemas import AuthSyncRequest

pytestmark = pytest.mark.asyncio


# ---------------------------------------------------------------------------
# sync_clerk_user
# ---------------------------------------------------------------------------


async def test_sync_clerk_user_creates_new_user(db_session: AsyncSession) -> None:
    """First sync for a new Clerk user inserts a User row and returns is_new_user=True."""
    from app.modules.identity import service as svc

    payload = AuthSyncRequest(
        clerk_user_id="user_test_new_001",
        email="alice@example.com",
        first_name="Alice",
        last_name="Smith",
        avatar_url=None,
        role="student",
    )

    resp = await svc.sync_clerk_user(db_session, payload=payload)

    assert resp.is_new_user is True
    assert "student" in resp.roles
    assert resp.user_id is not None


async def test_sync_clerk_user_is_idempotent(db_session: AsyncSession) -> None:
    """Calling sync twice with the same clerk_user_id produces exactly one User row."""
    from app.modules.identity import repository as repo
    from app.modules.identity import service as svc

    payload = AuthSyncRequest(
        clerk_user_id="user_test_idem_002",
        email="bob@example.com",
        first_name="Bob",
        last_name="Jones",
        avatar_url=None,
        role="student",
    )

    resp1 = await svc.sync_clerk_user(db_session, payload=payload)
    resp2 = await svc.sync_clerk_user(db_session, payload=payload)

    assert resp1.is_new_user is True
    assert resp2.is_new_user is False
    assert resp1.user_id == resp2.user_id

    # Only one User row in DB
    user = await repo.get_user_by_clerk_id(db_session, payload.clerk_user_id)
    assert user is not None
    assert user.id == resp1.user_id


async def test_sync_clerk_user_updates_existing_user_fields(db_session: AsyncSession) -> None:
    """Second sync with changed fields updates the User row."""
    from app.modules.identity import repository as repo
    from app.modules.identity import service as svc

    clerk_id = "user_test_update_003"

    await svc.sync_clerk_user(
        db_session,
        payload=AuthSyncRequest(
            clerk_user_id=clerk_id,
            email="carol@example.com",
            first_name="Carol",
            last_name="Old",
            avatar_url=None,
            role="student",
        ),
    )

    await svc.sync_clerk_user(
        db_session,
        payload=AuthSyncRequest(
            clerk_user_id=clerk_id,
            email="carol_new@example.com",
            first_name="Carol",
            last_name="New",
            avatar_url="https://example.com/avatar.png",
            role="student",
        ),
    )

    user = await repo.get_user_by_clerk_id(db_session, clerk_id)
    assert user is not None
    assert user.email == "carol_new@example.com"
    assert user.last_name == "New"
    assert user.avatar_url == "https://example.com/avatar.png"


async def test_sync_clerk_user_assigns_role(db_session: AsyncSession) -> None:
    """sync_clerk_user correctly stores the given role on the user."""
    from app.modules.identity import service as svc

    for role in ("student", "mentor", "admin"):
        payload = AuthSyncRequest(
            clerk_user_id=f"user_test_role_{role}_004",
            email=f"{role}@example.com",
            first_name=role.capitalize(),
            last_name="Test",
            avatar_url=None,
            role=role,
        )
        resp = await svc.sync_clerk_user(db_session, payload=payload)
        assert role in resp.roles, f"Expected role '{role}' in {resp.roles}"


async def test_sync_clerk_user_binds_seeded_email_row_to_real_clerk_id(
    db_session: AsyncSession,
) -> None:
    """Seeded users are adopted by first real Clerk sign-in instead of duplicated."""
    from app.modules.identity import repository as repo
    from app.modules.identity import service as svc

    seeded = await repo.create_user(
        db_session,
        clerk_user_id="seed_charan_demo",
        email="charan.kdf15@gmail.com",
        first_name="Charan",
        last_name="Seeded",
        avatar_url=None,
    )
    await repo.upsert_user_role(db_session, user_id=seeded.id, role="student")
    await db_session.commit()

    resp = await svc.sync_clerk_user(
        db_session,
        payload=AuthSyncRequest(
            clerk_user_id="user_real_charan_123",
            email="charan.kdf15@gmail.com",
            first_name="Charan",
            last_name="Kdf",
            avatar_url="https://example.com/charan.png",
            role="student",
        ),
    )

    rebound = await repo.get_user_by_clerk_id(db_session, "user_real_charan_123")
    assert rebound is not None
    assert rebound.id == seeded.id
    assert resp.user_id == seeded.id
    assert resp.is_new_user is False
    assert rebound.last_name == "Kdf"
    assert "student" in resp.roles


async def test_get_me_returns_none_for_unknown_user(db_session: AsyncSession) -> None:
    """get_me returns None when the local user UUID does not exist."""
    import uuid

    from app.modules.identity import service as svc

    result = await svc.get_me(db_session, user_id=uuid.uuid4())
    assert result is None
