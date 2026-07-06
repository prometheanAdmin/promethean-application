"""Epic 02 — full UUID schema: users, user_roles, profiles, domains, batches, enrollments.

Replaces the old integer-PK tables created in 0001 and adds all Epic-02
entities in a single atomic migration.  The downgrade() fully restores the
0001 state so that rollback is possible during staging.

Revision ID: 0002_epic_02_schema
Revises: 0001_epic_01_foundation
Create Date: 2026-07-05
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0002_epic_02_schema"
down_revision: str | None = "0001_epic_01_foundation"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

# ENUM object used only in downgrade() to restore the old schema
_promethean_role_enum = postgresql.ENUM(
    "student",
    "mentor",
    "admin",
    name="promethean_role",
    create_type=False,
)


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 0. Shared trigger function — keeps updated_at accurate on every UPDATE
    #    regardless of whether the write came through the ORM or raw SQL.
    # ------------------------------------------------------------------
    op.execute(
        """
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )

    # ------------------------------------------------------------------
    # 1. Drop old integer-PK tables (FK-safe order) and the ENUM type
    # ------------------------------------------------------------------
    op.drop_table("student_profiles")
    op.drop_table("mentor_profiles")
    op.drop_index("ix_users_clerk_user_id", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    _promethean_role_enum.drop(op.get_bind(), checkfirst=True)

    # ------------------------------------------------------------------
    # 2. users — UUID pk, no role column, + avatar_url / updated_at
    # ------------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("clerk_user_id", sa.String(255), nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=True),
        sa.Column("last_name", sa.String(100), nullable=True),
        sa.Column("avatar_url", sa.String(500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_users_clerk_user_id", "users", ["clerk_user_id"], unique=True)
    op.create_index("ix_users_email", "users", ["email"], unique=True)

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

    # ------------------------------------------------------------------
    # 3. user_roles — join table; role is String(50), not an ENUM
    # ------------------------------------------------------------------
    op.create_table(
        "user_roles",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", sa.String(50), nullable=False),
        sa.Column(
            "granted_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "granted_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.UniqueConstraint("user_id", "role", name="uq_user_roles_user_role"),
    )
    op.create_index("ix_user_roles_user_id", "user_roles", ["user_id"])

    op.execute("ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE user_roles FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY user_roles_isolation ON user_roles
        USING (
            user_id = (
                SELECT id FROM users
                WHERE clerk_user_id = current_setting('app.current_user_id', true)
            )
            OR current_setting('app.bypass_rls', true) = '1'
        )
        WITH CHECK (
            current_setting('app.bypass_rls', true) = '1'
        )
        """
    )

    # ------------------------------------------------------------------
    # 4. domains — lookup table for fields of study
    # ------------------------------------------------------------------
    op.create_table(
        "domains",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default="'active'",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("name", name="uq_domains_name"),
    )

    op.execute("ALTER TABLE domains ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE domains FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY domains_read_all ON domains
        FOR SELECT
        USING (true)
        """
    )
    op.execute(
        """
        CREATE POLICY domains_admin_write ON domains
        FOR ALL
        USING (current_setting('app.bypass_rls', true) = '1')
        WITH CHECK (current_setting('app.bypass_rls', true) = '1')
        """
    )

    # ------------------------------------------------------------------
    # 5. student_profiles — UUID pk, JSONB skills, domain_id (plain UUID — no FK)
    # ------------------------------------------------------------------
    op.create_table(
        "student_profiles",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("education", sa.String(255), nullable=True),
        sa.Column(
            "skills",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("career_goals", sa.Text(), nullable=True),
        sa.Column("github_username", sa.String(100), nullable=True),
        # Plain UUID — no FK constraint to domains (cross-module boundary).
        # Referential integrity enforced at the application layer.
        sa.Column(
            "domain_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "profile_complete",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_student_profiles_user_id", "student_profiles", ["user_id"])
    op.create_index("ix_student_profiles_domain_id", "student_profiles", ["domain_id"])

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

    # ------------------------------------------------------------------
    # 6. mentor_profiles — UUID pk, JSONB domains, Numeric fields
    # ------------------------------------------------------------------
    op.create_table(
        "mentor_profiles",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("company", sa.String(255), nullable=True),
        sa.Column("experience_yrs", sa.Integer(), nullable=True),
        sa.Column(
            "domains",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("github_username", sa.String(100), nullable=True),
        sa.Column(
            "is_verified",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
        sa.Column("rating_avg", sa.Numeric(3, 2), nullable=True),
        sa.Column(
            "rev_share_pct",
            sa.Numeric(5, 2),
            nullable=False,
            server_default="65.00",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_mentor_profiles_user_id", "mentor_profiles", ["user_id"])

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
            OR is_verified = true
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

    # ------------------------------------------------------------------
    # 7. batches — UUID pk, domain_id + mentor_id FKs
    # ------------------------------------------------------------------
    op.create_table(
        "batches",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "domain_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("domains.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "mentor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("project_track", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column(
            "max_students",
            sa.Integer(),
            nullable=False,
            server_default="20",
        ),
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default="'upcoming'",
        ),
        sa.Column("github_template_repo", sa.String(500), nullable=True),
        # Batch-level repo created at batch creation time (10s timeout, NULL on failure)
        sa.Column("github_repo_url", sa.String(500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_batches_domain_id", "batches", ["domain_id"])
    op.create_index("ix_batches_mentor_id", "batches", ["mentor_id"])
    op.create_index("ix_batches_status", "batches", ["status"])

    op.execute("ALTER TABLE batches ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE batches FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY batches_read_all ON batches
        FOR SELECT
        USING (true)
        """
    )
    op.execute(
        """
        CREATE POLICY batches_admin_write ON batches
        FOR ALL
        USING (current_setting('app.bypass_rls', true) = '1')
        WITH CHECK (current_setting('app.bypass_rls', true) = '1')
        """
    )

    # ------------------------------------------------------------------
    # 8. enrollments — UUID pk, student_id + batch_id FKs
    # ------------------------------------------------------------------
    op.create_table(
        "enrollments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "student_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "batch_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("batches.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("github_repo_url", sa.String(500), nullable=True),
        sa.Column(
            "payment_status",
            sa.String(20),
            nullable=False,
            server_default="'free'",
        ),
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default="'active'",
        ),
        sa.Column(
            "enrolled_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("student_id", "batch_id", name="uq_enrollment_student_batch"),
    )
    op.create_index("ix_enrollments_student_id", "enrollments", ["student_id"])
    op.create_index("ix_enrollments_batch_id", "enrollments", ["batch_id"])
    op.create_index("ix_enrollments_status", "enrollments", ["status"])

    op.execute("ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE enrollments FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY enrollments_isolation ON enrollments
        USING (
            student_id = (
                SELECT id FROM users
                WHERE clerk_user_id = current_setting('app.current_user_id', true)
            )
            OR current_setting('app.bypass_rls', true) = '1'
        )
        WITH CHECK (
            student_id = (
                SELECT id FROM users
                WHERE clerk_user_id = current_setting('app.current_user_id', true)
            )
            OR current_setting('app.bypass_rls', true) = '1'
        )
        """
    )


    # ------------------------------------------------------------------
    # 9. updated_at triggers — fire on every UPDATE to keep timestamps accurate
    #    independently of whether the write came through the ORM or raw SQL.
    # ------------------------------------------------------------------
    for table in ("users", "student_profiles", "mentor_profiles", "batches", "enrollments"):
        op.execute(
            f"""
            CREATE TRIGGER trg_{table}_updated_at
            BEFORE UPDATE ON {table}
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
            """
        )


def downgrade() -> None:
    """Restore the exact state left by 0001_epic_01_foundation."""

    # Drop triggers and shared trigger function
    for table in ("enrollments", "batches", "mentor_profiles", "student_profiles", "users"):
        op.execute(f"DROP TRIGGER IF EXISTS trg_{table}_updated_at ON {table}")
    op.execute("DROP FUNCTION IF EXISTS set_updated_at()")

    # Drop new tables in FK-safe reverse order
    op.execute("DROP POLICY IF EXISTS enrollments_isolation ON enrollments")
    op.execute("ALTER TABLE enrollments DISABLE ROW LEVEL SECURITY")
    op.drop_index("ix_enrollments_status", table_name="enrollments")
    op.drop_index("ix_enrollments_batch_id", table_name="enrollments")
    op.drop_index("ix_enrollments_student_id", table_name="enrollments")
    op.drop_table("enrollments")

    op.execute("DROP POLICY IF EXISTS batches_admin_write ON batches")
    op.execute("DROP POLICY IF EXISTS batches_read_all ON batches")
    op.execute("ALTER TABLE batches DISABLE ROW LEVEL SECURITY")
    op.drop_index("ix_batches_status", table_name="batches")
    op.drop_index("ix_batches_mentor_id", table_name="batches")
    op.drop_index("ix_batches_domain_id", table_name="batches")
    op.drop_table("batches")

    op.execute("DROP POLICY IF EXISTS mentor_profiles_isolation ON mentor_profiles")
    op.execute("ALTER TABLE mentor_profiles DISABLE ROW LEVEL SECURITY")
    op.drop_index("ix_mentor_profiles_user_id", table_name="mentor_profiles")
    op.drop_table("mentor_profiles")

    op.execute("DROP POLICY IF EXISTS student_profiles_isolation ON student_profiles")
    op.execute("ALTER TABLE student_profiles DISABLE ROW LEVEL SECURITY")
    op.drop_index("ix_student_profiles_domain_id", table_name="student_profiles")
    op.drop_index("ix_student_profiles_user_id", table_name="student_profiles")
    op.drop_table("student_profiles")

    op.execute("DROP POLICY IF EXISTS domains_admin_write ON domains")
    op.execute("DROP POLICY IF EXISTS domains_read_all ON domains")
    op.execute("ALTER TABLE domains DISABLE ROW LEVEL SECURITY")
    op.drop_table("domains")

    op.execute("DROP POLICY IF EXISTS user_roles_isolation ON user_roles")
    op.execute("ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY")
    op.drop_index("ix_user_roles_user_id", table_name="user_roles")
    op.drop_table("user_roles")

    op.execute("DROP POLICY IF EXISTS users_isolation ON users")
    op.execute("ALTER TABLE users DISABLE ROW LEVEL SECURITY")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_clerk_user_id", table_name="users")
    op.drop_table("users")

    # ------------------------------------------------------------------
    # Restore 0001 schema: promethean_role ENUM + integer-PK tables
    # ------------------------------------------------------------------
    postgresql.ENUM(
        "student",
        "mentor",
        "admin",
        name="promethean_role",
    ).create(op.get_bind(), checkfirst=True)

    promethean_role = postgresql.ENUM(
        "student",
        "mentor",
        "admin",
        name="promethean_role",
        create_type=False,
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("clerk_user_id", sa.String(255), nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=True),
        sa.Column("last_name", sa.String(100), nullable=True),
        sa.Column("role", promethean_role, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_users_clerk_user_id", "users", ["clerk_user_id"], unique=True)
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "mentor_profiles",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("expertise", sa.String(255), nullable=True),
        sa.Column("timezone", sa.String(50), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.UniqueConstraint("user_id"),
    )

    op.create_table(
        "student_profiles",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("cohort", sa.String(100), nullable=True),
        sa.Column("timezone", sa.String(50), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.UniqueConstraint("user_id"),
    )
