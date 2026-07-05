"""RLS policies, mentor is_verified, domains table.

Revision ID: 0002_rls_and_additions
Revises: 0001_epic_01_foundation
Create Date: 2026-07-05 12:00:00
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002_rls_and_additions"
down_revision: str | None = "0001_epic_01_foundation"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # BE-011 / KAN-24 — add is_verified to mentor_profiles
    # ------------------------------------------------------------------
    op.add_column(
        "mentor_profiles",
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default="false"),
    )

    # ------------------------------------------------------------------
    # KAN-29 — domains lookup table
    # ------------------------------------------------------------------
    op.create_table(
        "domains",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_domains_name", "domains", ["name"], unique=True)

    # ------------------------------------------------------------------
    # BE-008 / KAN-21 — Row-Level Security
    #
    # The backend service runs as the `promethean` role which owns the
    # tables.  By default, table owners bypass RLS.  We use
    # FORCE ROW LEVEL SECURITY so that even the owner is subject to the
    # policies; admin routes set  app.bypass_rls = '1'  to regain access.
    #
    # Policy: a row is visible/writable when:
    #   a) app.current_user_id matches the row's identifying clerk_user_id
    #      (or the foreign-key chain back to the users table), OR
    #   b) app.bypass_rls is '1'  (set exclusively by admin DB sessions)
    # ------------------------------------------------------------------

    # users table
    op.execute("ALTER TABLE users ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE users FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY users_isolation ON users
        USING (
            clerk_user_id = current_setting('app.current_user_id', true)
            OR current_setting('app.bypass_rls', true) = '1'
        )
        WITH CHECK (
            clerk_user_id = current_setting('app.current_user_id', true)
            OR current_setting('app.bypass_rls', true) = '1'
        )
        """
    )

    # student_profiles table
    op.execute("ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE student_profiles FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY student_profiles_isolation ON student_profiles
        USING (
            user_id = (
                SELECT id FROM users
                WHERE clerk_user_id = current_setting('app.current_user_id', true)
            )
            OR current_setting('app.bypass_rls', true) = '1'
        )
        WITH CHECK (
            user_id = (
                SELECT id FROM users
                WHERE clerk_user_id = current_setting('app.current_user_id', true)
            )
            OR current_setting('app.bypass_rls', true) = '1'
        )
        """
    )

    # mentor_profiles table
    op.execute("ALTER TABLE mentor_profiles ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE mentor_profiles FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY mentor_profiles_isolation ON mentor_profiles
        USING (
            user_id = (
                SELECT id FROM users
                WHERE clerk_user_id = current_setting('app.current_user_id', true)
            )
            OR current_setting('app.bypass_rls', true) = '1'
        )
        WITH CHECK (
            user_id = (
                SELECT id FROM users
                WHERE clerk_user_id = current_setting('app.current_user_id', true)
            )
            OR current_setting('app.bypass_rls', true) = '1'
        )
        """
    )


def downgrade() -> None:
    # Remove RLS
    op.execute("ALTER TABLE mentor_profiles DISABLE ROW LEVEL SECURITY")
    op.execute("DROP POLICY IF EXISTS mentor_profiles_isolation ON mentor_profiles")
    op.execute("ALTER TABLE student_profiles DISABLE ROW LEVEL SECURITY")
    op.execute("DROP POLICY IF EXISTS student_profiles_isolation ON student_profiles")
    op.execute("ALTER TABLE users DISABLE ROW LEVEL SECURITY")
    op.execute("DROP POLICY IF EXISTS users_isolation ON users")

    # Remove domains table
    op.drop_index("ix_domains_name", table_name="domains")
    op.drop_table("domains")

    # Remove is_verified column
    op.drop_column("mentor_profiles", "is_verified")
