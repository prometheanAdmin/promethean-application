from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, model_validator

# Domain schemas — owned by curriculum, re-exported here for the admin router.
# `as X` form satisfies mypy strict's --no-implicit-reexport requirement.
from app.modules.curriculum.schemas import DomainCreate as DomainCreate
from app.modules.curriculum.schemas import DomainRead as DomainRead
from app.modules.curriculum.schemas import DomainUpdate as DomainUpdate

# Enrollment schemas — re-exported for the admin enrollments endpoint.
from app.modules.enrollment.schemas import EnrollmentAdminRead as EnrollmentAdminRead

# Mentor profile read — re-exported so admin router returns the full shape.
from app.modules.mentors.schemas import MentorProfileRead as MentorProfileRead


class AdminUserRead(BaseModel):
    """Admin view of a user — includes all roles from the join table."""

    id: uuid.UUID
    clerk_user_id: str
    email: str
    first_name: str | None
    last_name: str | None
    avatar_url: str | None
    roles: list[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def extract_roles(cls, obj: Any) -> Any:  # noqa: ANN401
        """Convert UserRole ORM objects → role strings before Pydantic validation."""
        if not isinstance(obj, dict) and hasattr(obj, "roles"):
            raw_roles = getattr(obj, "roles", []) or []
            return {
                "id": obj.id,
                "clerk_user_id": obj.clerk_user_id,
                "email": obj.email,
                "first_name": obj.first_name,
                "last_name": obj.last_name,
                "avatar_url": obj.avatar_url,
                "roles": [r.role for r in raw_roles],
                "created_at": obj.created_at,
            }
        return obj


class PaginatedAdminUserList(BaseModel):
    """Paginated admin user list with role/search filtering support."""

    items: list[AdminUserRead]
    total: int
    page: int
    per_page: int
