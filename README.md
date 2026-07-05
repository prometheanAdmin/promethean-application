# Promethean

AI-powered mentorship platform. FastAPI backend · Next.js frontend · Clerk auth · PostgreSQL + pgvector · Redis.

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Docker + Docker Compose | Latest | https://docs.docker.com/get-docker |
| Node.js | 22 | `nvm install 22 && nvm use 22` |
| Python | 3.12 | https://python.org or `pyenv install 3.12` |
| uv | Latest | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |

---

## First-time setup

### 1. Clone

```bash
git clone https://github.com/prometheanAdmin/promethean-application.git
cd promethean-application
```

### 2. Backend env file

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and fill in the Clerk keys (Clerk Dashboard → API Keys):

```
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_JWKS_URL=https://YOUR_INSTANCE.clerk.accounts.dev/.well-known/jwks.json
```

Everything else (`DATABASE_URL`, `REDIS_URL`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD`) is pre-filled with working local defaults.

### 3. Frontend env file

Create `front-end/.env.local`:

```bash
cat > front-end/.env.local << 'EOF'
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF
```

> Ask the team lead for the Clerk keys if you don't have dashboard access.

---

## Run the full stack

```bash
docker compose up --build
```

Docker starts PostgreSQL, Redis, the FastAPI backend, and the realtime server. Alembic migrations run automatically on first startup.

| Service | URL |
|---|---|
| Backend API | http://localhost:8000 |
| Interactive API docs | http://localhost:8000/docs |
| Realtime server | http://localhost:3001/health |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

Then in a second terminal, start the frontend:

```bash
cd front-end
npm install
npm run dev
```

Frontend: http://localhost:3000

To stop: `Ctrl+C` then `docker compose down`. To wipe the database and start fresh: `docker compose down -v`.

---

## Development commands

### Backend

```bash
cd backend
uv sync                          # install / sync dependencies
uv run ruff check .              # lint
uv run mypy app/                 # type check
uv run pytest tests/ -v          # run tests
uv run alembic upgrade head      # apply pending migrations
uv run alembic check             # verify no unapplied migrations
```

Adding a migration after changing a model:

```bash
uv run alembic revision --autogenerate -m "describe_your_change"
uv run alembic upgrade head
```

### Frontend

```bash
cd front-end
npm install
npm run dev          # dev server (http://localhost:3000)
npm run lint         # ESLint
npx tsc --noEmit     # TypeScript check
npm run build        # production build
```

---

## Project structure

```
promethean-application/
├── backend/                      # FastAPI — Python 3.12, uv, SQLAlchemy 2.0 async
│   ├── app/
│   │   ├── config.py             # settings from .env (pydantic-settings)
│   │   ├── database.py           # async engine + session factory
│   │   ├── dependencies.py       # get_db, get_admin_db, get_current_user, require_role
│   │   ├── middleware/
│   │   │   ├── auth.py           # validates Clerk JWT (JWKS/RS256), sets request.state
│   │   │   └── sentry.py         # attaches user_id to every Sentry event
│   │   └── modules/              # one folder per domain
│   │       ├── identity/         # auth/sync, /me
│   │       ├── students/         # student profiles
│   │       ├── mentors/          # mentor profiles
│   │       └── admin/            # user listing, mentor verification, domains
│   ├── alembic/versions/         # database migrations
│   └── tests/
├── front-end/                    # Next.js 15, TypeScript, Clerk v7
│   └── src/
│       ├── app/                  # App Router pages
│       ├── components/           # UI components
│       ├── lib/
│       │   ├── api.ts            # fetch wrapper — attaches Clerk JWT automatically
│       │   └── auth.ts           # role helpers (reads publicMetadata.role)
│       └── middleware.ts         # protects /dashboard/* routes
├── realtime/                     # Node.js 22 Socket.IO server (Sprint 2)
├── docker-compose.yml
└── .github/workflows/            # CI — backend + frontend checks on every PR
```

---

## Auth flow

1. User signs in via Clerk (handled by the frontend automatically).
2. Frontend calls `POST /api/v1/auth/sync` — creates the user in the local DB and writes their role into Clerk `publicMetadata`.
3. Clerk's JWT template (`promethean-backend`) embeds `role` + `email` in every subsequent token.
4. Backend middleware validates the JWT on every request and sets `request.state.user_id` and `request.state.roles`.
5. PostgreSQL Row-Level Security uses the `app.current_user_id` session variable so users can only read/write their own rows.

Roles: `student` (default) · `mentor` · `admin`

---

## API reference

Full interactive docs at http://localhost:8000/docs when the backend is running.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Health check |
| POST | `/api/v1/auth/sync` | JWT | Upsert user, sync role to Clerk |
| GET | `/api/v1/me` | JWT | Current user profile |
| GET | `/api/v1/students/` | JWT | List students |
| PUT | `/api/v1/me/student-profile` | JWT (student) | Update student profile |
| GET | `/api/v1/mentors/` | JWT | List mentors |
| PUT | `/api/v1/me/mentor-profile` | JWT (mentor) | Update mentor profile |
| GET | `/api/v1/admin/users` | JWT (admin) | List all users |
| PUT | `/api/v1/admin/mentors/{id}/verify` | JWT (admin) | Verify a mentor |
| POST | `/api/v1/admin/domains` | JWT (admin) | Create a domain |

---

## CI / Branch protection

GitHub Actions runs on every PR to `main`:
- **Backend**: ruff → mypy → pytest (≥70% coverage) → alembic check → Docker build
- **Frontend**: ESLint → TypeScript

Configure branch protection in GitHub → Settings → Branches → main:
1. Require a pull request before merging
2. Require status checks: `Lint, Type Check, Test` and `Docker Build Check`
3. Require branch to be up to date before merging

---

## Additional docs

- [Clerk JWT template setup](docs/clerk-setup.md)
