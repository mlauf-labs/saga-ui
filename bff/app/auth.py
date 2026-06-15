"""Static username/password login with signed session cookies (UI-FR-1 to UI-FR-5)."""

from __future__ import annotations

import logging
import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import Settings, get_settings

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

_limiter = Limiter(key_func=get_remote_address)

_COOKIE_NAME = "session"
_COOKIE_PATH = "/"


class LoginRequest(BaseModel):
    username: str
    password: str


class UserInfo(BaseModel):
    username: str


def _cookie_kwargs(settings: Settings) -> dict:
    """Shared cookie attributes – must be identical on set and delete."""
    return {
        "key": _COOKIE_NAME,
        "path": _COOKIE_PATH,
        "httponly": True,
        "samesite": "lax",
        # Enable `secure` when the app is served over HTTPS (behind a reverse proxy).
        # For local development this stays False so plain HTTP works.
        "secure": False,
        "max_age": settings.session_max_age,
    }


def _set_session(response: Response, username: str, settings: Settings) -> None:
    from itsdangerous import URLSafeTimedSerializer

    s = URLSafeTimedSerializer(settings.session_secret)
    token = s.dumps({"u": username})
    response.set_cookie(value=token, **_cookie_kwargs(settings))


def get_current_user(request: Request, settings: Annotated[Settings, Depends(get_settings)]) -> str:
    """Validate the session cookie and return the username, or raise 401."""
    from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

    token = request.cookies.get(_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    s = URLSafeTimedSerializer(settings.session_secret)
    try:
        data = s.loads(token, max_age=settings.session_max_age)
    except SignatureExpired as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired"
        ) from exc
    except BadSignature as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session"
        ) from exc
    return data["u"]


CurrentUser = Annotated[str, Depends(get_current_user)]


@router.post("/login")
@_limiter.limit("10/minute")
async def login(
    request: Request,
    body: LoginRequest,
    settings: Annotated[Settings, Depends(get_settings)],
) -> JSONResponse:
    username_ok = secrets.compare_digest(body.username, settings.ui_username)
    password_ok = secrets.compare_digest(body.password, settings.ui_password)
    if not (username_ok and password_ok):
        # Log failed attempt with username but never the password (UI-NFR-9)
        log.warning("login_failed username=%r ip=%s", body.username, request.client and request.client.host)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )
    log.info("login_ok username=%r ip=%s", body.username, request.client and request.client.host)
    response = JSONResponse(content={"username": settings.ui_username})
    _set_session(response, settings.ui_username, settings)
    return response


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    settings: Annotated[Settings, Depends(get_settings)],
    user: CurrentUser,
) -> Response:
    log.info("logout username=%r", user)
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    # Must use the same path/domain/samesite attributes to ensure the
    # browser actually removes the cookie (UI-FR-3)
    kwargs = _cookie_kwargs(settings)
    kwargs["max_age"] = 0
    response.set_cookie(value="", **kwargs)
    return response


@router.get("/me", response_model=UserInfo)
async def me(user: CurrentUser) -> UserInfo:
    return UserInfo(username=user)
