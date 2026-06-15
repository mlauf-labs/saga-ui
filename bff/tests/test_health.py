"""Tests for the /health endpoint (UI-FR-33)."""
from __future__ import annotations

import respx
from httpx import AsyncClient, Response


async def test_health_returns_ok(client: AsyncClient):
    with respx.mock(base_url="http://saga-mock", assert_all_called=False) as mock:
        mock.get("/health").mock(return_value=Response(200, json={"status": "ok"}))
        resp = await client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert "version" in body
    assert "saga_reachable" in body


async def test_health_reports_saga_unreachable(client: AsyncClient):
    import httpx

    with respx.mock(base_url="http://saga-mock", assert_all_called=False) as mock:
        mock.get("/health").mock(side_effect=httpx.ConnectError("refused"))
        resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["saga_reachable"] is False
