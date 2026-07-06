"""Curriculum module ORM models — owns the domains table.

The curriculum module is the canonical owner of the ``domains`` reference
table.  Admin operations (create/update) go through the curriculum service
layer; no other module writes to this table directly.

No ``updated_at`` column exists on domains — domains are rarely modified and
the created_at timestamp is sufficient for auditing.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Domain(Base):
    """A field-of-study domain that students and mentors can be assigned to.

    status: 'active' | 'inactive'
    Inactive domains are hidden from enrollment discovery but preserve all
    existing FK references so historical data remains intact.
    """

    __tablename__ = "domains"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active", server_default="'active'"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
