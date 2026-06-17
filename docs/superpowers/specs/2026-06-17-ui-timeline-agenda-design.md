# SAGA UI — Timeline & Agenda surfaces (Track E) — Design

- **Status:** Draft (approved in brainstorming, pending written-spec review)
- **Date:** 2026-06-17
- **Project:** `saga-ui` (frontend SPA + BFF)
- **Consumes:** saga-core `GET /timeline`, `GET /documents/{id}/timeline`, `GET /agenda`
  (FR-44…FR-49) via the BFF's generic `/api/*` proxy.

---

## 1. Context & goal

saga-core now exposes a full timeline subsystem — an audit stream (what happened + *why*), a
content/timeline stream (dates extracted from documents), and an agenda of upcoming
events/recurrences — over REST + MCP. None of it is visible in the web UI yet. Track E surfaces
it in `saga-ui` so a user can see, per the requirement IDs:

- the **archive-wide timeline** (audit ↔ content),
- a **document's own timeline**,
- an **agenda** of what's coming up, and
- a **folder overview + folder-scoped log**.

This is a **read/visualisation** feature only — no new mutations.

### No BFF changes needed
The BFF (`bff/app/proxy.py`) forwards `/api/{path}` transparently to saga-core, so
`/api/timeline`, `/api/documents/{id}/timeline`, and `/api/agenda` already proxy through. Track
E is **frontend-only**: types → API client → TanStack Query hooks → a shared `EventList`
component → pages + wiring.

### Decisions (from brainstorming)
- **Scope:** all four surfaces (global timeline, document-detail timeline, agenda, folder view).
- **Rendering:** one shared **date-grouped list** (`log.md`-style: events grouped under date
  headers, newest-first; category badge + type + summary + actor/relative-time per row). The
  agenda is the same list flipped to **date-ascending** with relative dates.
- **Folder view:** a **dedicated read page** `/folders/:id` (deep-linkable; separate from the
  existing `/folders` CRUD admin), reached via a "view" affordance on the folder tree.

---

## 2. Scope & non-goals

### In scope (v1)
- `EventList` shared component + `CategoryFilter` + loading/empty/error states.
- `useTimeline`, `useDocumentTimeline`, `useAgenda` hooks (TanStack Query, paged).
- Pages: `/timeline`, `/agenda`, `/folders/:id`; a "Timeline" section in `DocumentDetail`.
- Nav entries (Timeline, Agenda) + a folder-tree "view" affordance.

### Non-goals (v1)
- Any mutation from a timeline surface (read-only).
- An event-**type** filter UI (only the `category` audit/content filter).
- An agenda date-range picker (the horizon is server config).
- Folder CRUD changes (the new `/folders/:id` is read-only; admin stays at `/folders`).

---

## 3. Architecture & components

- **`frontend/src/types/api.ts`** — add:
  - `EventCategory = 'audit' | 'content'`
  - `EventType` — string union of the known types
    (`doc_ingested | placement | move | reclassification | folder_created | folder_renamed |
    dated_fact | appointment | recurring`).
  - `SagaEvent` — `{ event_id; category; event_type; document_id?: string; folder_id?: string;
    occurred_at?: string; recorded_at: string; actor: string; summary: string;
    confidence?: number; details: Record<string, unknown> }`. (Named `SagaEvent` to avoid
    clashing with the DOM `Event`.)
  - `TimelineResponse` — `{ items: SagaEvent[]; limit: number; offset: number }`.
- **`frontend/src/api/client.ts`** — a new `timeline` group using `request<T>()`:
  - `timeline.query(params)` → `/api/timeline?…` (`category?`, `event_type?`, `folder_id?`,
    `include_subtree?`, `occurred_from?`, `occurred_to?`, `expand?`, `limit`, `offset`).
  - `timeline.forDocument(id, params)` → `/api/documents/{id}/timeline?…` (`category?`,
    `limit`, `offset`).
  - `agenda.get(params)` → `/api/agenda?…` (`folder_id?`, `from?`, `to?`, `limit`, `offset`).
  - Path segments encoded individually; one client only (no raw `fetch`).
- **`frontend/src/hooks/`** — `useTimeline(params)`, `useDocumentTimeline(id, params)`,
  `useAgenda(params)`. Each wraps `useInfiniteQuery`; query keys include all params.
- **`frontend/src/components/Timeline/`** (the shared core, one responsibility each):
  - `EventList` — groups `items` by date (the event's `occurred_at` when present, else
    `recorded_at` — matching the export's `log.md` grouping) and renders date headers + rows;
    `order` (`'desc'` default | `'asc'` for agenda); handles loading/empty/error and
    "Load more".
  - `EventRow` — one event: category `Badge`, type, summary, actor + relative time, optional
    link to the document (when `document_id`) or folder; audit "why" (placement rationale from
    `details`) shown where present.
  - `CategoryFilter` — Mantine `SegmentedControl` (All · Audit · Content) → `category` param.
- **`frontend/src/pages/`** — `TimelinePage`, `AgendaPage`, `FolderViewPage`.
- **Wiring** — `DocumentDetail` gains a "Timeline" section; `AppHeader.navItems` + `BottomNav`
  gain Timeline + Agenda; the folder tree gains a "view" link → `/folders/:id`; routes added in
  `App.tsx` under `ProtectedRoute` + per-route `ErrorBoundary` (matching `/folders`,
  `/doc-types`).

---

## 4. The four surfaces

- **A · Global Timeline (`/timeline`)** — `EventList` via `useTimeline`; `CategoryFilter` maps
  to `category` (omitted = both); newest-first; "Load more" via `offset`. Rows with a
  `document_id` link into that document's detail.
- **B · Document-detail timeline** — a "Timeline" section in `DocumentDetail` using `EventList`
  via `useDocumentTimeline(id)`; same category filter, default All.
- **C · Agenda (`/agenda`)** — `EventList` in **ascending** mode, content-only, via `useAgenda`;
  each row shows a relative date ("in 12 days") + the absolute date; recurring occurrences
  appear as their own dated rows. Window = backend default (now → horizon); "Load more" via
  `offset`.
- **D · Folder view (`/folders/:id`)** — `FolderViewPage`: header (breadcrumb + name + emoji +
  description from `folders.get(id)`), a **Subfolders** list, a **Documents** list (existing
  `folders.documents(id)`), and a **Change log** section = `EventList` via
  `useTimeline({ folder_id: id })`. Read-only; separate from `/folders` admin.

---

## 5. Data flow, paging & states

- **Flow:** component → hook → `request<T>()` → BFF `/api/*` → saga-core. No browser→saga-core
  calls.
- **Paging:** `useInfiniteQuery`. The API returns `{items, limit, offset}` with no total, so a
  next page exists iff `items.length === limit`; `getNextPageParam` returns `offset + limit`
  else `undefined`. A "Load more" button calls `fetchNextPage`.
- **States (Mantine):** loading → `Skeleton` rows; empty → a quiet "No events yet"; error →
  inline `Alert` + retry. The cross-cutting 401 path is already handled by `request<T>` /
  `dispatchUnauthorized` — no extra 401 handling here.
- **Formatting:** relative dates ("in 12 days", "2h ago") added to `lib/format.ts` (pure,
  unit-tested); category → Mantine `Badge` with distinct colours for audit vs content.

---

## 6. Testing & quality gates

- **Tests (Vitest + React Testing Library, matching existing `*.test.tsx`):**
  - `EventList` — date grouping, ascending vs descending order, badges, empty state.
  - `CategoryFilter` — selection maps to the right param.
  - hooks — with the API client mocked (correct params, paging predicate).
  - one render smoke test per page (`TimelinePage`, `AgendaPage`, `FolderViewPage`) with the
    query layer mocked.
  - `lib/format` relative-date unit tests.
- **Gates (saga-ui `CLAUDE.md`):** `npm run lint` + `npm run type-check` (strict TS, **no
  `any`**), and the mandatory `docker compose build saga-ui` (exit 0). Mantine only; English
  only; one API client; API shapes only in `types/api.ts`.

---

## 7. Open questions / future work

- Event-**type** filtering and an agenda **range** picker (deferred; v1 has category-only +
  server horizon).
- Surfacing OKF **export/import** from the UI (the BFF can now proxy `GET /export/okf` /
  `POST /import/okf`) — separate later piece.
- Richer audit-rationale rendering (similar-doc links, folder-vote scores) beyond the summary.
