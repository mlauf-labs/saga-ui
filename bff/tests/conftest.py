"""Shared fixtures for BFF test suite."""
from __future__ import annotations

import os

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# ── Configure test environment before any app imports ─────────────────────────
os.environ.setdefault("SAGA_BASE_URL", "http://saga-mock")
os.environ.setdefault("SAGA_API_TOKEN", "test-token")
os.environ.setdefault("UI_USERNAME", "admin")
os.environ.setdefault("UI_PASSWORD", "secret")
os.environ.setdefault("SESSION_SECRET", "test-session-secret-minimum-32-chars-long!!")


@pytest.fixture(autouse=True)
def reset_settings():
    """Reset the settings singleton between tests so env patches take effect."""
    import app.config as cfg

    original = cfg._settings
    cfg._settings = None
    yield
    cfg._settings = original


@pytest_asyncio.fixture
async def client():
    """Unauthenticated ASGI test client.

    The Saga httpx client is initialised manually (ASGITransport does not
    trigger FastAPI lifespan events) and torn down after the test.
    respx.mock in individual tests intercepts its outbound calls.
    """
    from app import saga_client
    from app.config import get_settings
    from app.main import create_app

    settings = get_settings()
    await saga_client.init_client(settings)

    application = create_app()
    async with AsyncClient(
        transport=ASGITransport(app=application), base_url="http://test"
    ) as c:
        yield c

    await saga_client.close_client()


@pytest_asyncio.fixture
async def authed_client(client: AsyncClient):
    """Test client with a valid session cookie already set."""
    resp = await client.post(
        "/api/auth/login", json={"username": "admin", "password": "secret"}
    )
    assert resp.status_code == 200, resp.text
    yield client
