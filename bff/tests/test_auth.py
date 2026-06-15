"""Tests for /api/auth/* endpoints (UI-FR-1 – UI-FR-5)."""
from __future__ import annotations

from httpx import AsyncClient


class TestLogin:
    async def test_success_returns_user_and_sets_cookie(self, client: AsyncClient):
        resp = await client.post(
            "/api/auth/login", json={"username": "admin", "password": "secret"}
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["username"] == "admin"
        assert "session" in resp.cookies

    async def test_wrong_password_returns_401(self, client: AsyncClient):
        resp = await client.post(
            "/api/auth/login", json={"username": "admin", "password": "wrong"}
        )
        assert resp.status_code == 401
        assert "session" not in resp.cookies

    async def test_wrong_username_returns_401(self, client: AsyncClient):
        resp = await client.post(
            "/api/auth/login", json={"username": "hacker", "password": "secret"}
        )
        assert resp.status_code == 401

    async def test_empty_credentials_return_401(self, client: AsyncClient):
        resp = await client.post(
            "/api/auth/login", json={"username": "", "password": ""}
        )
        assert resp.status_code == 401


class TestLogout:
    async def test_logout_clears_cookie(self, authed_client: AsyncClient):
        resp = await authed_client.post("/api/auth/logout")
        assert resp.status_code == 204
        # Cookie should be cleared (max_age=0 or absent)
        cookie = resp.cookies.get("session")
        assert cookie is None or cookie == ""

    async def test_logout_without_session_returns_401(self, client: AsyncClient):
        resp = await client.post("/api/auth/logout")
        assert resp.status_code == 401


class TestMe:
    async def test_me_returns_username_when_authenticated(self, authed_client: AsyncClient):
        resp = await authed_client.get("/api/auth/me")
        assert resp.status_code == 200
        assert resp.json()["username"] == "admin"

    async def test_me_returns_401_without_session(self, client: AsyncClient):
        resp = await client.get("/api/auth/me")
        assert resp.status_code == 401
