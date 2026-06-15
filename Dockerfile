# ─── Stage 1: build the React SPA ────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder

WORKDIR /build/frontend

# Install dependencies first (layer-cache friendly)
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source and build
COPY frontend/ ./
RUN npm run build
# Output: /build/frontend/dist/


# ─── Stage 2: Python BFF runtime ─────────────────────────────────────────────
FROM python:3.12-slim AS runtime

# Install uv (fast Python package installer)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_NO_CACHE=1

WORKDIR /app

# Install Python dependencies from lock file (reproducible)
COPY bff/pyproject.toml bff/uv.lock ./
RUN uv sync --frozen --no-dev

# Copy BFF application source
COPY bff/app/ ./app/

# Copy built frontend into the location where FastAPI will serve it
COPY --from=frontend-builder /build/frontend/dist/ ./frontend/dist/

# Non-root user for security
RUN addgroup --system bff && adduser --system --ingroup bff bff
USER bff

EXPOSE 8088

# Use the virtualenv created by uv directly
ENV PATH="/app/.venv/bin:$PATH"

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8088/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8088", "--log-level", "info"]
