from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    """Core identity record.  One row per human on the platform.

    Deliberately contains only identity data — no role, no profile data.
    Role is a capability (user_roles join table), not an identity attribute,
    because a student who becomes a mentor must not lose their student history
    and a mentor may also enroll as a student.

    Profile data lives in StudentProfile / MentorProfile to avoid nulls on
    columns that only apply to one role type.
    """

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    clerk_user_id: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    email: Mapped[str] = mapped_column(
        String(320), unique=True, index=True, nullable=False
    )
    first_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Intra-module only — cross-module ORM relationships are banned.
    roles: Mapped[list[UserRole]] = relationship(
        "UserRole",
        back_populates="user",
        lazy="selectin",
        foreign_keys="UserRole.user_id",
    )


class UserRole(Base):
    """Role grant join table.  One row per (user, role) pair.

    Using a join table instead of an ENUM column on users:
    1. A user can hold multiple roles simultaneously (student + mentor).
    2. Role grants are auditable — we know when each role was granted and
       by whom.
    3. Adding a new role (e.g. 'company_recruiter') requires an INSERT,
       not an ALTER TABLE on a live schema.
    """

    __tablename__ = "user_roles"
    __table_args__ = (
        UniqueConstraint("user_id", "role", name="uq_user_roles_user_role"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    granted_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    user: Mapped[User] = relationship(
        "User",
        back_populates="roles",
        foreign_keys=[user_id],
    )
