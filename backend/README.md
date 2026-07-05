# Promethean Backend

FastAPI backend — Python 3.12, uv, SQLAlchemy 2.0 async, asyncpg, Alembic, PostgreSQL + pgvector.

> For full stack setup see the [root README](../README.md). This file covers backend-only development.

---

## Setup

```bash
cd backend
cp .env.example .env   # then fill in CLERK_* keys
uv sync                # install dependencies
```

---

## Run locally (without Docker)

You need PostgreSQL and Redis running. Easiest with Docker:

```bash
docker compose up postgres redis -d   # from the repo root
```

Then start the backend:

```bash
cd backend
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

Server: http://localhost:8000 · Swagger docs: http://localhost:8000/docs

---

## Common commands

```bash
uv run ruff check .              # lint
uv run ruff check . --fix        # auto-fix lint issues
uv run mypy app/                 # type check
uv run pytest tests/ -v          # run all tests
uv run pytest tests/ -v -k "auth"  # run matching tests
uv run alembic upgrade head      # apply migrations
uv run alembic check             # fail if unapplied migrations exist
uv run alembic downgrade -1      # roll back one migration
```

## Adding a migration

After changing a SQLAlchemy model:

```bash
uv run alembic revision --autogenerate -m "add_cohort_to_student_profiles"
# review the generated file in alembic/versions/
uv run alembic upgrade head
```

---

## Module structure

```
app/
├── config.py          # Settings (pydantic-settings), reads .env
├── database.py        # async engine + AsyncSessionLocal
├── dependencies.py    # FastAPI deps: get_db, get_admin_db, get_current_user, require_role
├── main.py            # app factory, middleware, router registration
├── middleware/
│   ├── auth.py        # ClerkAuthMiddleware — JWKS/RS256 JWT validation
│   └── sentry.py      # SentryContextMiddleware — tags every event with user_id
└── modules/
    ├── identity/      # User model, auth/sync, /me
    ├── students/      # StudentProfile model + routes
    ├── mentors/       # MentorProfile model + routes
    └── admin/         # Domain model, admin-only routes (require_role("admin"))
```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | asyncpg connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `CLERK_PUBLISHABLE_KEY` | Yes | From Clerk Dashboard |
| `CLERK_SECRET_KEY` | Yes | From Clerk Dashboard |
| `CLERK_JWKS_URL` | Yes | `https://YOUR_INSTANCE.clerk.accounts.dev/.well-known/jwks.json` |
| `SENTRY_DSN` | No | Leave blank to disable Sentry |
| `RESEND_API_KEY` | No | For email notifications |
| `ENVIRONMENT` | No | `development` / `production` (default: `development`) |

---

## Auth & security notes

- Every request (except `GET /health`) requires a valid Clerk JWT in `Authorization: Bearer ...`
- The `get_db` dependency sets `SET LOCAL app.current_user_id` before every query — this activates PostgreSQL RLS so users can only access their own rows
- The `get_admin_db` dependency additionally sets `SET LOCAL app.bypass_rls = '1'` — only used in admin routes
- Roles come from the JWT `role` claim (set by Clerk's `promethean-backend` JWT template). Never read from `unsafeMetadata`
- `require_role("admin")` / `require_role("mentor")` are FastAPI dependencies — drop them on any route that needs role-gating
