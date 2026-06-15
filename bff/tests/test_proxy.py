"""Tests for the generic proxy router (UI-NFR-3, UI-NFR-13)."""
from __future__ import annotations

import pytest
import respx
from httpx import AsyncClient, Response


@pytest.fixture(autouse=True)
def mock_saga():
    """Intercept all outbound HTTP calls to the mock Saga base URL."""
    with respx.mock(base_url="http://saga-mock", assert_all_called=False) as mock:
        yield mock


class TestProxyAuth:
    async def test_unauthenticated_proxy_returns_401(self, client: AsyncClient):
        resp = await client.get("/api/documents")
        assert resp.status_code == 401

    async def test_authenticated_request_is_forwarded(
        self, authed_client: AsyncClient, mock_saga: respx.MockRouter
    ):
        mock_saga.get("/documents").mock(
            return_value=Response(
                200, json={"items": [], "page": 1, "page_size": 25, "total": 0}
            )
        )
        resp = await authed_client.get("/api/documents")
        assert resp.status_code == 200
        assert resp.json()["total"] == 0


class TestProxyErrorMapping:
    async def test_saga_unreachable_returns_503(
        self, authed_client: AsyncClient, mock_saga: respx.MockRouter
    ):
        import httpx

        mock_saga.get("/documents").mock(side_effect=httpx.ConnectError("refused"))
        resp = await authed_client.get("/api/documents")
        assert resp.status_code == 503
        assert "unreachable" in resp.json()["detail"].lower()

    async def test_saga_timeout_returns_504(
        self, authed_client: AsyncClient, mock_saga: respx.MockRouter
    ):
        import httpx

        mock_saga.get("/documents").mock(side_effect=httpx.TimeoutException("timeout"))
        resp = await authed_client.get("/api/documents")
        assert resp.status_code == 504

    async def test_bearer_token_attached_to_upstream_request(
        self, authed_client: AsyncClient, mock_saga: respx.MockRouter
    ):
        """The Saga Bearer token must be added by the BFF, not the browser."""
        captured: list[str] = []

        def capture(request: respx.models.Request, route: respx.Route) -> Response:
            captured.append(request.headers.get("authorization", ""))
            return Response(200, json={"items": [], "page": 1, "page_size": 25, "total": 0})

        mock_saga.get("/documents").mock(side_effect=capture)
        await authed_client.get("/api/documents")
        assert len(captured) == 1
        assert captured[0] == "Bearer test-token"
