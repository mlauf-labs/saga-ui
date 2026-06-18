# CLAUDE.md

Guidance for Claude / AI coding agents working in **SAGA UI** — the web interface for **SAGA**
(*Self-organizing Archive for Generative Agents*). Read this before making any change. Keep
changes small, focused, typed, linted, and consistent with the conventions below.

## Project overview

SAGA UI is a browser UI for the SAGA document archive, in two parts:

| Component | Technology | Location |
|-----------|-----------|----------|
| Frontend SPA | React 19, Vite, TypeScript, Mantine 9, TanStack Query | `frontend/` |
| BFF (Backend-for-Frontend) | Python 3.12, FastAPI, httpx, itsdangerous, slowapi | `bff/` |

The **BFF is the only service the frontend talks to.** The BFF authenticates the user and
proxies calls to the upstream SAGA REST API using a static Bearer token that **never leaves
the server**. The browser must never call SAGA directly.

## Repository structure

```
frontend/
  src/
    api/         typed BFF API client (client.ts — single source of truth)
    components/  reusable UI (CategoryTree/, DocumentList/, Layout/)
    contexts/    React context (auth)
    lib/         pure utilities (format, tree-utils, auth-events)
    pages/       top-level route components
    types/       shared TypeScript interfaces (api.ts)
  vite.config.ts · package.json
bff/
  app/
    main.py      FastAPI app factory + lifespan
    auth.py      /api/auth/* endpoints
    proxy.py     generic /api/* → SAGA proxy
    config.py    Settings (pydantic-settings)
    saga_client.py  shared httpx.AsyncClient
  pyproject.toml
docs/            requirements + planning
```

## Commands

```powershell
# BFF (run in bff/)
cd bff; uv sync
uv run uvicorn app.main:app --reload --port 8088

# Frontend (run in frontend/)
cd frontend; npm install
npm run dev            # → http://localhost:5173 (Vite proxies /api + /health to :8088)

# Checks — run after changes, fix all errors before finishing
cd frontend; npm run lint; npm run type-check     # ESLint/Prettier + tsc --noEmit
cd bff; uv run ruff check app/; uv run ruff format --check app/
```

Copy `.env.example` to `bff/.env` and set real values before starting the BFF.

### Mandatory Docker build check

After **every** change to frontend or BFF code, build the image and verify it succeeds:

```powershell
docker compose build saga-ui     # from the workspace root or saga-ui/
```

It must exit with code **0**. A non-zero exit means a TypeScript compile error (`tsc -b`) or
Vite build failure — resolve all of them. Never suppress TS errors with `@ts-ignore` or `any`.

## Key constraints (watch out for these)

- **No direct SAGA calls from the browser** — always go through the BFF.
- **No hard-coded secrets** (tokens, passwords, session secrets). BFF: never log secrets, not
  even partially; use `secrets.compare_digest` for credentials; keep cookie attributes
  consistent between `set_cookie`/`delete_cookie`.
- **One API client.** `frontend/src/api/client.ts` is the single source of truth — use the
  `request<T>()` helper, not raw `fetch`. A 401 (outside auth endpoints) auto-dispatches via
  `dispatchUnauthorized()`; don't add extra 401 handling. Encode path segments individually.
- **API shapes live in `frontend/src/types/api.ts`** — don't duplicate them.
- **English only** — code, comments, UI strings, docs, commits. No German anywhere.
- **No second UI library** — use Mantine + its design tokens.

## Coding conventions

**Frontend (TypeScript/React)**
- Strict TS (`strict: true`); avoid `any` (justify with a comment if unavoidable). `interface`
  for object shapes, `type` for unions.
- Functional components only; follow the Rules of Hooks; avoid `useEffect` for state
  computable during render. Server state via TanStack Query (`useQuery`/`useMutation`); local
  state via `useState`/`useReducer`.
- One component per file (PascalCase); utilities lowercase-hyphen. A file exporting a React
  component must not also export non-component values (Fast Refresh) — split hooks out.

**BFF (Python)**
- Python 3.12+, every file starts with `from __future__ import annotations`. Ruff lint+format;
  type hints on all signatures; Pydantic for all request/response schemas.
- FastAPI: `APIRouter` per feature included in `main.py`; `Depends()` for shared deps; raise
  `HTTPException(...) from exc` with English `detail`; map `httpx.ConnectError` → 503,
  `httpx.TimeoutException` → 504.

## Adding a feature

1. Check `docs/requirements/` + `docs/planning/implementation-plan.md`.
2. Update types in `frontend/src/types/api.ts` → API client in `api/client.ts` → BFF route in
   a router included by `main.py` → React component(s) → wire into the page.
3. Run lint + type-check + the Docker build; mark the plan step done.

## Git workflow — branching, commits, PRs

**`main` and `develop` are protected**: pull requests are required, and only the repository
**admin/owner** may push directly (force-push and deletion are blocked). **Do not push
directly to `main`/`develop`** — always use a feature branch + PR.

- `main` — stable/release branch. `develop` — integration branch; feature work branches here.

```bash
git switch develop && git pull
git switch -c feature/<short-description>   # or fix/… , docs/… , chore/… , refactor/…
# …focused commits…
git push -u origin feature/<short-description>
gh pr create --base develop --fill          # PR targets develop
```

After review + green CI, **squash-merge** into `develop`. Promote to `main` via a
`develop → main` PR; tag `vX.Y.Z` on `main` for releases.

**Commits**
- Only commit or push **when the human explicitly asks.** If you're on `main`/`develop`,
  branch first.
- **Conventional Commits**, imperative, English (`feat:`, `fix:`, `docs:`, `refactor:`,
  `test:`, `chore:`, `ci:`). Reference requirement IDs (e.g. `UI-FR-20`) where useful.
- Never commit `.env`, `node_modules/`, `dist/`, `__pycache__/` (all git-ignored) or any secret.

## What agents must not do

No German text · no hard-coded secrets · no direct SAGA calls from the browser · no extra UI
library · no `any` without justification · don't skip linting · don't rewrite working code
unless the task requires it.

## CI

`.github/workflows/ci.yml` runs on push/PR to `main` and `develop`. Keep it green; update the
workflow in the same PR as the code it covers.
