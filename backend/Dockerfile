FROM python:3.12-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
RUN mkdir -p /home/appuser/.cache/uv && chown -R appuser:appgroup /home/appuser

ENV HOME=/home/appuser
ENV UV_CACHE_DIR=/home/appuser/.cache/uv

# Copy dependency files first (layer caching)
COPY pyproject.toml uv.lock* ./

# Install dependencies into the system (not a venv)
RUN uv sync --frozen --no-dev
RUN chown -R appuser:appgroup /home/appuser

# Copy application code
COPY . .

RUN chown -R appuser:appgroup /app /home/appuser

USER appuser

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
