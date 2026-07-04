# Promethean Backend — CLAUDE.md

## Project context

<!-- PASTE PROJECT CONTEXT HERE -->

## Guiding principle: deployment-first, stability over cleverness

**Always favour a deployment-first mindset — every
change should keep the app stable and reproducibly deployable.** Before adding or changing
anything, ask "will this deploy cleanly and predictably on the server?"

- **Reproducibility first.** Deployments must install the *exact same* versions every time.
  Prefer pinned/locked dependencies for anything that ships to the server; avoid floating
  version ranges in the deploy path.
- **Stability over novelty.** Choose boring, proven approaches over clever ones. Don't add a
  dependency, tool, or abstraction unless it clearly earns its place — every addition is
  surface area that can break a deploy.
- **Keep the runtime lean.** Production installs runtime deps only; keep dev/test tooling out
  of the deploy path.
- **No surprises at startup.** Fail fast and loudly on misconfiguration (e.g. required env
  vars), never silently. Config comes from the environment, never hard-coded.
- **Guard the migration path.** Schema changes must be deliberate and reversible (migrations),
  never implicit `create_all` against production data.
- **Green before ship.** Tests, `mypy`, and `ruff` must pass before anything is considered
  deployable.

When in doubt, optimise for a change that is easy to roll out, easy to roll back, and hard to
break in production.

## Stack

- **Python 3.12** (pinned via `.python-version` and `requires-python == 3.12.*`)
- **FastAPI** + **Uvicorn**
- **Pydantic v2** / **pydantic-settings** for config
- **SQLAlchemy 2.0** (async) + **asyncpg** → **PostgreSQL** (`DATABASE_URL` env var, required)
- **pytest** + **httpx** (async) for tests
- **ruff** (lint + format), **mypy** (strict) for quality

## Setup

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"    # deps come from pyproject.toml (single source of truth)
```

## Commands

```bash
uvicorn app.main:app --reload    # run dev server (http://localhost:8000)
pytest                           # run tests
ruff check .                     # lint
ruff format .                    # format
mypy app                         # type-check
```

Docs: http://localhost:8000/docs

## Database

Postgres runs locally in Docker with a persistent named volume:

```bash
docker run --name promethean-pg -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=promethean -p 5432:5432 \
  -v promethean-pgdata:/var/lib/postgresql/data -d postgres:16
docker start promethean-pg       # subsequent runs
```

Connection string comes from the `DATABASE_URL` env var (see `.env.example`). No tables/models
yet — add a migration tool (e.g. Alembic) before creating schema; never `create_all` on startup.

## Layout

```
app/
  main.py            # FastAPI app factory, middleware, router mount
  core/config.py     # Settings (env-driven, cached via get_settings)
  db/base.py         # SQLAlchemy DeclarativeBase
  db/session.py      # async engine, sessionmaker, get_db dep
  api/router.py      # aggregates all route modules under /api
  api/routes/        # one module per resource
  schemas/           # Pydantic request/response models
  models/            # SQLAlchemy ORM models (none yet)
  services/          # business logic
tests/               # pytest, client + db_session fixtures in conftest.py
```

## Conventions

- All routes mount under the `/api` prefix.
- Request/response shapes live in `schemas/`, not inline in routes.
- Config comes from `get_settings()` — never read `os.environ` directly.
- Keep route handlers thin; put logic in `services/`.
- Type-annotate everything; mypy runs in strict mode.
