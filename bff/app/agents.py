"""Optional saga-agents proxy: /api/agents-stats → {AGENTS_BASE_URL}/stats."""

from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import CurrentUser, get_current_user
from app.config import get_settings

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["agents"], dependencies=[Depends(get_current_user)])


@router.get("/agents-stats")
async def agents_stats(_user: CurrentUser) -> dict[str, object]:
    settings = get_settings()
    if not settings.agents_base_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agents not configured.")
    headers = {"Authorization": f"Bearer {settings.agents_token}"} if settings.agents_token else {}
    try:
        async with httpx.AsyncClient(base_url=settings.agents_base_url, timeout=5.0) as client:
            resp = await client.get("/stats", headers=headers)
    except httpx.ConnectError as exc:
        raise HTTPException(status_code=503, detail="Agents service unreachable.") from exc
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=504, detail="Agents service timed out.") from exc
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Agents service error.")
    return resp.json()
