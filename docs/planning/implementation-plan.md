# Implementation Plan – Saga UI

> Status: Draft v1. Step-by-step plan for implementing the requirements from
> [`../requirements/01-functional-requirements.md`](../requirements/01-functional-requirements.md).
> Each step has a clear **goal**, **tasks**, **Definition of Done (DoD)** and lists
> the requirements it covers.

**Tech stack (decided):** React + Vite + TypeScript (frontend), FastAPI (BFF, Python),
Docker. All communication goes through the Saga REST API via BFF proxy. Mantine as
UI library, TanStack Query as data layer.

---

## Step 0 – Project Skeleton & Tooling ✅
**Goal:** A running monorepo skeleton with frontend and BFF.  
**Tasks:**
- `frontend/` with Vite (React + TS), ESLint / Prettier, Mantine, React Router,
  TanStack Query, base layout (AppShell, empty 3-column shell).
- `bff/` with FastAPI, `httpx`, `pydantic-settings`, Ruff, `/health` endpoint.
- `.env.example`, `.gitignore`, `LICENSE`, root `README.md`.
- Dev setup: Vite dev server with proxy to BFF (`/api`).

**DoD:** `npm run dev` shows empty layout; BFF `/health` returns `ok`; lint passes.  
**Requirements:** UI-NFR-22/23/24/32.

---

## Step 1 – BFF: Saga Client & Proxy ✅
**Goal:** The BFF can communicate with and proxy the Saga (without auth yet).  
**Tasks:**
- `config.py`: load `SAGA_BASE_URL`, `SAGA_API_TOKEN`, … via environment
  variables (see Architecture §5).
- `saga_client.py`: `httpx.AsyncClient` (pooling, timeouts), attaches Bearer token.
- Generic **proxy routes** `/api/...` → Saga, including streaming passthrough for
  `/documents/{id}/file` and multipart uploads.
- Error mapping: forward Saga `code`/`message` envelope unchanged.

**DoD:** `GET /api/health`, `GET /api/documents`, `GET /api/categories/tree` return real
Saga data through the BFF (against a local test Saga).  
**Requirements:** UI-FR-35, UI-NFR-1/2/3/5/13/19; API mapping (Architecture §4).

---

## Step 2 – Authentication (Static Login + Session) ✅
**Goal:** Static username/password login with a server-side session.  
**Tasks:**
- BFF: `POST /api/auth/login` (constant-time compare against `UI_USERNAME`/`UI_PASSWORD`),
  `POST /api/auth/logout`, `GET /api/auth/me`.
- Session via signed HttpOnly cookies (`SameSite`, `Secure` over HTTPS),
  `SESSION_SECRET`, `SESSION_MAX_AGE`.
- Session guard for all `/api/*` proxy routes (401 without session).
- Login rate limiting; no passwords in logs.
- Frontend: login page, auth context, protected routes, redirect logic, logout.

**DoD:** Without login → redirect to login; after login access to protected routes;
401 from BFF triggers re-authentication.  
**Requirements:** UI-FR-1/2/3/4/5, UI-NFR-5/6/7/8/9/10.

---

## Step 3 – Category Tree (Left Column) ✅
**Goal:** Hierarchical tree view of documents.  
**Tasks:**
- Frontend: Mantine `Tree` from `GET /api/categories/tree`; display `name` +
  `document_count`; expand / collapse.
- Progressive loading of deep branches via `prefix`/`max_depth` (if needed).
- Selecting a node sets the active category path (state).
- Client-side search / filter for the tree.

**DoD:** Tree renders correctly; nodes are clickable; counts are visible.  
**Requirements:** UI-FR-6/7/8/11.

---

## Step 4 – Document List (Centre Column) ✅
**Goal:** List documents for a category or "All Documents".  
**Tasks:**
- `GET /api/categories/{path}/documents` (with `include_subtree`, pagination) and
  `GET /api/documents` (full list).
- Paginated, performant list (TanStack Query, caching, loading / empty states).
- Selecting a list item sets the active document (opens right column).

**DoD:** Selecting a node in the tree fills the list; pagination works; empty category
shows empty state.  
**Requirements:** UI-FR-9/10, UI-NFR-11/12/14.

---

## Step 5 – Detail & Metadata Panel (Right Column) ✅
**Goal:** Show metadata and status of a document.  
**Tasks:**
- `GET /api/documents/{id}` → title, MIME, size, `doc_type`, `extracted_values`,
  `category_paths`, timestamps.
- Status display + polling via `GET /api/documents/{id}/status` until
  `ready`/`failed` (TanStack Query `refetchInterval`).
- Error display on `failed`.

**DoD:** Detail panel shows complete metadata; status updates automatically; extracted
values are displayed as a list.  
**Requirements:** UI-FR-16/17/18/19, UI-FR-11.

---

## Step 6 – Preview (PDF, Image, Markdown) ✅
**Goal:** Display document content inline.  
**Tasks:**
- PDF: `react-pdf` via `GET /api/documents/{id}/file` (BFF sets `inline` disposition).
- Images: `<img>` via the same stream.
- Markdown / text: render `content_markdown` from the detail call with `react-markdown`
  (sanitised).
- Type detection via `mime_type`; fallback to Markdown + download prompt.

**DoD:** PDF, image and Markdown are displayed correctly; unsupported types fall back
cleanly to Markdown / download.  
**Requirements:** UI-FR-20/21/22/23/24.

---

## Step 7 – Search ✅
**Goal:** Hybrid search with results list.  
**Tasks:**
- Search field + filters (`doc_type`, `category_path`, `top_k`) → `POST /api/search`.
- Results list with snippet, title, type, category, score; click opens document in
  detail / preview.
- Loading / empty states.

**DoD:** Search returns results; filters work; results link to the document.  
**Requirements:** UI-FR-12/13/14/15.

---

## Step 8 – Document Management (Upload / Replace / Delete / Download) ✅
**Goal:** CRUD actions on documents.  
**Tasks:**
- Upload via Mantine `Dropzone` (multipart) → `POST /api/documents`; status tracking.
- Replace → `PUT /api/documents/{id}`.
- Delete with confirmation dialog → `DELETE /api/documents/{id}`; invalidate tree / list.
- Download → `GET /api/documents/{id}/file` (attachment).
- Client-side size validation; toast feedback; error mapping (`validation_error`,
  `conflict`).

**DoD:** Upload file → appears with status `pending`, becomes `ready`; replace, delete
and download work; errors are displayed meaningfully.  
**Requirements:** UI-FR-25/26/27/28/29/30.

---

## Step 9 – UX Polish & Cross-Cutting ✅
**Goal:** Best-practice UI.  
**Tasks:**
- Responsive 3-column layout, collapsible columns; light / dark mode.
- Global error / connection status display (`GET /api/health`), 401 handling.
- Accessibility (keyboard, ARIA), skeletons, consistent toasts.
- i18n foundation (English as default).

**DoD:** UI is usable on desktop / tablet; core paths are keyboard-accessible;
connection failure is visible.  
**Requirements:** UI-FR-31/32/33/34, UI-NFR-15/16/17/18/19.

---

## Step 10 – Tests ✅
**Goal:** Core functions are covered by tests.  
**Tasks:**
- BFF: 15 pytest tests covering auth (login/logout/me), proxy forwarding, error mapping
  (503 unreachable, 504 timeout), Bearer token injection, and health reporting.
  Uses `respx` to mock Saga HTTP calls; `pytest-asyncio` with `asyncio_mode=auto`.
- Frontend: 31 Vitest tests (jsdom + Testing Library) covering `format.ts` utilities,
  `tree-utils.ts` (toTreeData, filterTree), and `LoginPage` component
  (render, submit, error states, rate-limit message).
- E2E tests require a live Saga instance; deferred to CI with a running test stack.

**DoD:** All 46 automated tests pass green.  
**Requirements:** UI-NFR-21/22.

---

## Step 11 – Containerisation & Documentation ✅
**Goal:** A self-contained, deployable artefact.  
**Tasks:**
- Multi-stage `Dockerfile`: Stage 1 builds the React SPA with `node:22-alpine`;
  Stage 2 installs Python deps via `uv` from `uv.lock`, copies BFF source and the
  built frontend, runs as a non-root user.
- `docker-compose.yml`: single `saga-ui` service, configurable port via `BFF_PORT`,
  reads `.env`, built-in health check.
- `.dockerignore`: excludes `.venv`, `node_modules`, `dist`, tests, docs.
- Static path in `bff/app/main.py` updated to resolve correctly inside Docker
  (`/app/frontend/dist/`).
- `README.md` rewritten: architecture diagram, Docker quick-start, dev setup, full
  configuration reference, project structure overview.

**DoD:** `docker compose up -d --build` starts the UI; BFF serves the SPA and proxies
all `/api/*` calls to the configured Saga.  
**Requirements:** UI-NFR-25/26/27/28/29/32/33; UI-FR-35.

---

## Step 12 – GitHub Publication (Preparation) ✅
**Goal:** Repository ready for public release.  
**Tasks:**
- `LICENSE` (MIT) added.
- `CONTRIBUTING.md`: dev setup, test instructions, coding conventions, PR guidelines.
- `.gitignore` updated: added `.cursor/` and verified `.env`/`.env.*` are excluded.
- `.github/workflows/ci.yml`: three jobs that run on push and PR to `main`:
  - **BFF** – `ruff check` lint + `pytest -v` (15 tests).
  - **Frontend** – `eslint`, `tsc --noEmit`, `vitest run` (31 tests), `vite build`.
  - **Docker** – multi-stage image build verification (no push); runs after BFF and
    frontend pass; uses GitHub Actions cache for layers.
- All CI steps verified locally – 46 tests pass, lint clean, type-check clean.

**DoD:** Repo is clean, documented and buildable; ready for `git push` to GitHub.  
**Requirements:** UI-NFR-33.

---

## Optional Follow-Up Steps (depending on Saga)
See [`../api-gaps.md`](../api-gaps.md):
- Title / metadata filter search (requires Saga extension of `GET /documents`).
- `inline` disposition at `/file` (otherwise BFF workaround).
- Dashboard with aggregate metrics (requires `GET /stats`).
- Manual re-categorisation (requires `PATCH /documents/{id}`).

---

## Recommended Order / Milestones
- **M1 (Skeleton + visible):** Steps 0–4 → login, tree, list. ✅
- **M2 (Core value):** Steps 5–8 → detail, preview, search, management. ✅
- **M3 (Production-ready):** Steps 9–12 → UX polish, tests, Docker, GitHub. ✅ **COMPLETE**
