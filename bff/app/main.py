"""FastAPI BFF entry point (UI-NFR-3)."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import TYPE_CHECKING

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.types import Scope

from app import agents, auth, proxy
from app.config import get_settings
from app.saga_client import close_client, init_client

if TYPE_CHECKING:
    from collections.abc import AsyncIterator

log = logging.getLogger(__name__)

# In Docker: /app/app/main.py → parent.parent = /app/ → /app/frontend/dist/ ✓
# In dev:   bff/app/main.py  → parent.parent = bff/  → bff/frontend/dist/  (does not exist; Vite handles it)
_STATIC_DIR = Path(__file__).parent.parent / "frontend" / "dist"


class _SPAStaticFiles(StaticFiles):
    """StaticFiles with SPA fallback: unknown paths → index.html.

    Without this, navigating directly to a client-side route (e.g. /login after
    a page refresh) returns {"detail":"Not Found"} because StaticFiles only
    serves files that physically exist in the dist directory.
    """

    async def get_response(self, path: str, scope: Scope):  # type: ignore[override]
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code == 404:
                return await super().get_response("index.html", scope)
            raise


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    logging.basicConfig(level=settings.log_level.upper())
    await init_client(settings)
    log.info("bff_ready saga_url=%s", settings.saga_base_url)
    try:
        yield
    finally:
        await close_client()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Saga UI BFF",
        version="0.1.0",
        description="Backend-for-Frontend for Saga UI",
        lifespan=lifespan,
        docs_url="/bff/docs" if settings.debug else None,
        redoc_url=None,
        openapi_url="/bff/openapi.json" if settings.debug else None,
    )

    # Rate limiting
    from slowapi import Limiter
    from slowapi.util import get_remote_address

    app.state.limiter = Limiter(key_func=get_remote_address)
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    # CORS (only if configured explicitly)
    if settings.cors_allow_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_allow_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # Routers
    app.include_router(auth.router)
    app.include_router(agents.router)
    app.include_router(proxy.router)

    @app.get("/health", tags=["system"])
    async def health() -> dict[str, object]:
        from app.saga_client import get_client

        saga_ok: bool | None = None
        store_name: str | None = None
        try:
            client = get_client()
            r = await client.get("/health", timeout=3.0)
            saga_ok = r.status_code == 200
            if saga_ok:
                store_name = r.json().get("name")
        except Exception:
            saga_ok = False
        return {
            "status": "ok",
            "version": "0.1.0",
            "saga_reachable": saga_ok,
            "store_name": store_name,
            "agents_configured": bool(get_settings().agents_base_url),
        }

    # Serve built frontend (production mode) with SPA fallback for client-side routes
    if _STATIC_DIR.exists():
        app.mount("/", _SPAStaticFiles(directory=str(_STATIC_DIR), html=True), name="spa")

    return app


app = create_app()


def start() -> None:
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8088,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )


if __name__ == "__main__":
    start()
