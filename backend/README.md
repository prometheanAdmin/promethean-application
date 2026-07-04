# Promethean Backend

FastAPI backend for the Promethean application. Requires **Python 3.12**.

## Spin up the server

**1. Start Postgres** (Docker, data persists in a named volume):

```bash
# first time only:
docker run --name promethean-pg -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=promethean -p 5432:5432 \
  -v promethean-pgdata:/var/lib/postgresql/data -d postgres:16

# after that, just:
docker start promethean-pg
```

**2. Set up the Python environment** (first time only):

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env        # DATABASE_URL is already set for the Docker DB above
```

**3. Run the app:**

```bash
source .venv/bin/activate   # if not already active
uvicorn app.main:app --reload
```

Server: http://localhost:8000 · Interactive docs: http://localhost:8000/docs

Stop with `Ctrl+C`. Stop the DB with `docker stop promethean-pg`.

### Endpoints

| Method | Path          | Response                                   |
|--------|---------------|--------------------------------------------|
| GET    | `/`           | `{"app":"Promethean","status":"running"}`  |
| GET    | `/api/health` | `{"status":"ok"}`                          |

## Development

```bash
pytest            # tests
ruff check .      # lint
mypy app          # type-check
```

See [CLAUDE.md](CLAUDE.md) for project context and conventions.
