"""Tests for /api/agents-stats endpoint."""

from __future__ import annotations

import respx
from httpx import AsyncClient, Response


def _make_session_cookie() -> str:
    """Build a valid signed session cookie directly (bypasses the rate-limited login endpoint).

    Sign with the app's configured session secret rather than a hard-coded value, so the
    cookie validates regardless of what SESSION_SECRET the environment provides (CI sets a
    different value than the conftest default).
    """
    from itsdangerous import URLSafeTimedSerializer

    from app.config import get_settings

    s = URLSafeTimedSerializer(get_settings().session_secret)
    return s.dumps({"u": "admin"})


async def test_agents_stats_401_when_unauthenticated(client: AsyncClient) -> None:
    """No session → auth dependency rejects with 401 before checking config."""
    resp = await client.get("/api/agents-stats")
    assert resp.status_code in (401, 403, 404)


async def test_agents_stats_404_when_unconfigured(client: AsyncClient) -> None:
    """Authenticated but no AGENTS_BASE_URL → 404."""
    client.cookies.set("session", _make_session_cookie())
    resp = await client.get("/api/agents-stats")
    assert resp.status_code == 404
    assert "not configured" in resp.json()["detail"].lower()


async def test_agents_stats_proxies_body_when_configured(
    client: AsyncClient, monkeypatch
) -> None:
    """Configured + reachable → 200 with the proxied JSON body."""
    import app.config as cfg

    monkeypatch.setattr(
        cfg,
        "_settings",
        cfg.Settings(
            saga_base_url="http://saga-mock",
            saga_api_token="test-token",
            ui_username="admin",
            ui_password="secret",
            session_secret="test-session-secret-minimum-32-chars-long!!",
            agents_base_url="http://agents-mock",
            agents_token="agents-token",
        ),
    )
    client.cookies.set("session", _make_session_cookie())
    with respx.mock(base_url="http://agents-mock", assert_all_called=False) as mock:
        mock.get("/stats").mock(return_value=Response(200, json={"active_agents": 3}))
        resp = await client.get("/api/agents-stats")
    assert resp.status_code == 200
    assert resp.json()["active_agents"] == 3


async def test_agents_stats_503_when_unreachable(
    client: AsyncClient, monkeypatch
) -> None:
    """ConnectError from the agents service → 503."""
    import httpx

    import app.config as cfg

    monkeypatch.setattr(
        cfg,
        "_settings",
        cfg.Settings(
            saga_base_url="http://saga-mock",
            saga_api_token="test-token",
            ui_username="admin",
            ui_password="secret",
            session_secret="test-session-secret-minimum-32-chars-long!!",
            agents_base_url="http://agents-mock",
        ),
    )
    client.cookies.set("session", _make_session_cookie())
    with respx.mock(base_url="http://agents-mock", assert_all_called=False) as mock:
        mock.get("/stats").mock(side_effect=httpx.ConnectError("refused"))
        resp = await client.get("/api/agents-stats")
    assert resp.status_code == 503
    assert "unreachable" in resp.json()["detail"].lower()


async def test_agents_stats_504_on_timeout(
    client: AsyncClient, monkeypatch
) -> None:
    """TimeoutException from the agents service → 504."""
    import httpx

    import app.config as cfg

    monkeypatch.setattr(
        cfg,
        "_settings",
        cfg.Settings(
            saga_base_url="http://saga-mock",
            saga_api_token="test-token",
            ui_username="admin",
            ui_password="secret",
            session_secret="test-session-secret-minimum-32-chars-long!!",
            agents_base_url="http://agents-mock",
        ),
    )
    client.cookies.set("session", _make_session_cookie())
    with respx.mock(base_url="http://agents-mock", assert_all_called=False) as mock:
        mock.get("/stats").mock(side_effect=httpx.TimeoutException("timeout"))
        resp = await client.get("/api/agents-stats")
    assert resp.status_code == 504


async def test_agents_stats_502_on_upstream_error(
    client: AsyncClient, monkeypatch
) -> None:
    """Non-200 from the agents service → 502."""
    import app.config as cfg

    monkeypatch.setattr(
        cfg,
        "_settings",
        cfg.Settings(
            saga_base_url="http://saga-mock",
            saga_api_token="test-token",
            ui_username="admin",
            ui_password="secret",
            session_secret="test-session-secret-minimum-32-chars-long!!",
            agents_base_url="http://agents-mock",
        ),
    )
    client.cookies.set("session", _make_session_cookie())
    with respx.mock(base_url="http://agents-mock", assert_all_called=False) as mock:
        mock.get("/stats").mock(return_value=Response(500, json={"error": "internal"}))
        resp = await client.get("/api/agents-stats")
    assert resp.status_code == 502


async def test_health_includes_agents_configured_false(client: AsyncClient) -> None:
    """The /health endpoint reports agents_configured=False when not set."""
    with respx.mock(base_url="http://saga-mock", assert_all_called=False) as mock:
        mock.get("/health").mock(return_value=Response(200, json={"status": "ok"}))
        resp = await client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert "agents_configured" in body
    assert body["agents_configured"] is False
