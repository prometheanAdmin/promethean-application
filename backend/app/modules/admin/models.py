"""Admin module ORM models.

The Domain model was the sole model here and has been moved to the
curriculum module, which now owns the domains table exclusively
(module-boundary rule: each module owns its tables).

This re-export is provided for backward compatibility with any import
that references ``app.modules.admin.models.Domain``.  New code should
import directly from ``app.modules.curriculum.models``.
"""

from __future__ import annotations

# Re-export so existing imports continue to work during the transition.
from app.modules.curriculum.models import Domain as Domain  # noqa: F401
