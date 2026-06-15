"""Shared async httpx client for Saga REST-API calls."""

from __future__ import annotations

import httpx

from app.config import Settings

_client: httpx.AsyncClient | None = None


def build_client(settings: Settings) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        base_url=settings.saga_base_url,
        headers={"Authorization": f"Bearer {settings.saga_api_token}"},
        timeout=httpx.Timeout(connect=5.0, read=60.0, write=30.0, pool=5.0),
        limits=httpx.Limits(max_connections=50, max_keepalive_connections=20),
    )


def get_client() -> httpx.AsyncClient:
    if _client is None:
        raise RuntimeError("Saga client not initialised – app not started yet.")
    return _client


async def init_client(settings: Settings) -> None:
    global _client
    _client = build_client(settings)


async def close_client() -> None:
    global _client
    if _client:
        await _client.aclose()
        _client = None
