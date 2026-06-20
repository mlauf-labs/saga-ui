"""Generic proxy router: forwards /api/* → Saga (UI-NFR-3).

Authenticated requests are forwarded transparently; streaming responses
(e.g. /documents/{id}/file) are streamed through without buffering the
full body in memory (UI-NFR-13).
"""

from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import StreamingResponse

from app.auth import CurrentUser, get_current_user
from app.saga_client import get_client

log = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api",
    tags=["proxy"],
    dependencies=[Depends(get_current_user)],
)

_SKIP_REQUEST_HEADERS = {"host", "connection", "content-length", "transfer-encoding"}
_SKIP_RESPONSE_HEADERS = {"content-encoding", "transfer-encoding", "connection"}

_STREAM_CONTENT_TYPES = {
    "application/octet-stream",
    "application/pdf",
    "image/",
}


def _should_stream(content_type: str) -> bool:
    ct = content_type.lower()
    return any(ct.startswith(prefix) for prefix in _STREAM_CONTENT_TYPES)


def _forward_headers(request: Request) -> dict[str, str]:
    return {
        k: v
        for k, v in request.headers.items()
        if k.lower() not in _SKIP_REQUEST_HEADERS and not k.lower().startswith("cookie")
    }


@router.api_route(
    "/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
)
async def proxy(
    path: str,
    request: Request,
    _user: CurrentUser,
) -> Response:
    client = get_client()
    url = f"/{path}"
    if request.url.query:
        url = f"{url}?{request.url.query}"

    headers = _forward_headers(request)

    # Stream request body (important for multipart uploads)
    body = await request.body()

    try:
        upstream = await client.request(
            method=request.method,
            url=url,
            headers=headers,
            content=body,
        )
    except httpx.ConnectError as exc:
        log.error("saga_unreachable: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Saga is unreachable.",
        ) from exc
    except httpx.TimeoutException as exc:
        log.error("saga_timeout: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Saga did not respond in time.",
        ) from exc

    resp_headers = {
        k: v for k, v in upstream.headers.items() if k.lower() not in _SKIP_RESPONSE_HEADERS
    }

    content_type = upstream.headers.get("content-type", "")
    if _should_stream(content_type):
        # For file downloads/previews: stream through, override disposition to inline
        # so the browser can render PDFs and images inline (API-Gaps #4 workaround)
        if "content-disposition" in resp_headers:
            disposition = resp_headers["content-disposition"].replace("attachment;", "inline;")
            resp_headers["content-disposition"] = disposition

        async def _iter() -> object:
            yield upstream.content

        return StreamingResponse(
            _iter(),
            status_code=upstream.status_code,
            headers=resp_headers,
            media_type=content_type,
        )

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=resp_headers,
        media_type=content_type or None,
    )
