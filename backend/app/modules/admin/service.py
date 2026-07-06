"""Admin service layer — delegates domain and mentor operations.

Layer order:  Router → Service → Repository → DB.

Domain CRUD belongs to the curriculum module (which owns the domains table).
Mentor verification belongs to the mentors module.
This module re-exports both sets of functions so the admin router has a
single stable import surface.
"""

from __future__ import annotations

# Domain operations — curriculum module owns the domains table.
from app.modules.curriculum.service import (  # noqa: F401
    create_domain,
    get_domain_by_id,
    get_domain_by_name,
    update_domain,
)
from app.modules.curriculum.service import list_active_domains as list_domains  # noqa: F401

# Mentor verification — mentors module owns the mentor_profiles table.
from app.modules.mentors.service import verify_mentor as verify_mentor  # noqa: F401
