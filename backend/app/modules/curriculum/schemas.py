"""Pydantic schemas for the curriculum module.

These are the canonical domain schemas.  The admin module re-exports them
so domain CRUD requests and responses share a single definition.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DomainRead(BaseModel):
    """Full domain payload — returned from all domain endpoints."""

    id: uuid.UUID
    name: str
    description: str | None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DomainCreate(BaseModel):
    """Admin: create a new domain."""

    name: str = Field(..., max_length=100, description="Unique domain name")
    description: str | None = Field(None, max_length=500)


class DomainUpdate(BaseModel):
    """Admin: partially update a domain.  None = leave unchanged."""

    name: str | None = Field(None, max_length=100)
    description: str | None = Field(None, max_length=500)
    status: str | None = Field(
        None,
        description="'active' | 'inactive'",
    )
