# Functional Requirements – Saga UI

> Status: Draft v1 · Project: **Saga UI** – Web interface for the
> [Saga](https://github.com/) document store.

This document describes **what** the web UI must do. The **how** is in
[`03-architecture.md`](03-architecture.md); the step-by-step implementation plan is in
[`../planning/implementation-plan.md`](../planning/implementation-plan.md). Gaps in the
Saga API are in [`../api-gaps.md`](../api-gaps.md).

Requirements have stable IDs (`UI-FR-x`) so they can be referenced from code, tests,
commits and pull requests. Where a requirement uses a Saga API endpoint, it is
stated explicitly.

---

## 1. Vision & Scope

The Saga UI is a **self-contained web application** that lets a user **manage, find,
view and download** documents from a Saga server. It communicates exclusively via the
Saga **REST API** and is decoupled enough that the Saga can run on a **separate
server**.

The UI is intentionally a **separate repository / separate deployment** and does not
modify Saga itself. Required Saga extensions are documented separately as optional
proposals (see [`../api-gaps.md`](../api-gaps.md)).

### Scope v1
- Sign-in with **one static username / password**.
- Display documents in a **tree hierarchy** (Saga category tree).
- **Search** (Saga hybrid keyword + semantic search).
- **Add, replace, delete** documents.
- **Metadata view** and **preview** (PDF, images, converted Markdown text).
- **Download** the original file.

### Out of scope for v1
- Multi-user management, roles / permissions, tenancy.
- Manual re-categorisation / moving documents (Saga categories are LLM-generated and
  read-only, see [`../api-gaps.md`](../api-gaps.md)).
- In-place editing of document content.
- Native rendering of Office documents (DOCX/XLSX/PPTX) – download + Markdown preview only.

---

## 2. Actors

| Actor | Description |
|-------|-------------|
| **User** | Signs in and manages / searches / views documents. |
| **Saga Server** | Provides the REST API; may run on a different host. |
| **Operator** | Deploys and operates the UI (Docker). |

---

## 3. Authentication & Session

- **UI-FR-1 Static login** — The user signs in via a login page with a **configurable
  static username and password**. Credentials are set server-side (BFF) via environment
  variables, never embedded in browser code.
- **UI-FR-2 Session** — After a successful login the browser receives an **HttpOnly,
  SameSite session cookie**. The Saga Bearer token **never** leaves the server.
- **UI-FR-3 Logout** — The user can sign out; the session is invalidated server-side.
- **UI-FR-4 Protected routes** — All pages except login require a valid session;
  unauthenticated requests are redirected to the login page (UI) or answered with `401`
  (BFF API).
- **UI-FR-5 Error message** — Invalid credentials produce a clear, non-revealing error
  message ("Invalid username or password.").

---

## 4. Navigation & Tree Hierarchy

- **UI-FR-6 Category tree** — The **left panel** shows the hierarchical category
  structure as a collapsible tree.  
  → `GET /categories/tree`.
- **UI-FR-7 Node metadata** — Each tree node shows its name and the number of contained
  documents (`document_count`, including subtree).
- **UI-FR-8 Lazy / partial loading** — Deep trees can be loaded progressively via
  `prefix`/`max_depth` to keep large structures performant.
- **UI-FR-9 Document list per category** — Selecting a node lists the documents in that
  branch (paginated).  
  → `GET /categories/{path}/documents` (`include_subtree`, `page`, `page_size`).
- **UI-FR-10 All documents** — An "All Documents" view lists all documents paginated,
  newest first.  
  → `GET /documents`.
- **UI-FR-11 Multi-categorisation hint** — Because a document can appear in multiple
  branches, all `category_paths` are shown in the detail view.

---

## 5. Search

- **UI-FR-12 Hybrid search** — A search field triggers the hybrid keyword + semantic
  search and shows a results list.  
  → `POST /search`.
- **UI-FR-13 Result display** — Each result shows a **snippet**, document title,
  document type, category path(s) and relevance score. Results link to the
  detail / preview view of the corresponding document.
- **UI-FR-14 Search filters** — Optional filters: document type (`doc_type`), category
  path (`category_path`) and number of results (`top_k`).
- **UI-FR-15 Empty states** — "No results" and loading states are communicated clearly.

> Note: The Saga search returns **chunk snippets** (semantic), not a filename search.
> Title-based filtering is not included in v1 (see [`../api-gaps.md`](../api-gaps.md),
> optional for later).

---

## 6. Document Detail View (Right Panel)

- **UI-FR-16 Metadata panel** — The right panel shows metadata of the selected document:
  title, MIME type, size, status, document type, extracted values (`extracted_values`),
  category paths, timestamps.  
  → `GET /documents/{id}`.
- **UI-FR-17 Extracted values** — `extracted_values` are displayed as a list of
  key/value pairs (including type and normalised value where available).
- **UI-FR-18 Status display** — Processing status (`pending`, `converting`, `analyzing`,
  `indexing`, `ready`, `failed`) is visible; the error message is shown on `failed`.  
  → `GET /documents/{id}/status`.
- **UI-FR-19 Status polling** — While a document is not yet `ready`/`failed`, the status
  is polled periodically until a terminal state is reached.

---

## 7. Preview

- **UI-FR-20 PDF preview** — PDF documents are displayed inline in the browser (PDF.js).  
  → `GET /documents/{id}/file`.
- **UI-FR-21 Image preview** — Images (PNG, JPG, TIFF, BMP, WEBP) are displayed inline.  
  → `GET /documents/{id}/file`.
- **UI-FR-22 Markdown / text preview** — For all document types, the Saga-converted
  content (`content_markdown`) is rendered, making a content preview possible for Office
  formats too.  
  → `GET /documents/{id}?include_content=true`.
- **UI-FR-23 Fallback** — If no native preview is available, the Markdown text and a
  download prompt are offered.
- **UI-FR-24 Secure delivery** — Preview / binary data is served via the BFF (proxy),
  not directly from the browser to Saga.

---

## 8. Document Management

- **UI-FR-25 Upload** — The user can upload one or more files by selection or
  drag-and-drop. After acceptance (`202`) the document is shown with status `pending`
  and its status is tracked.  
  → `POST /documents`.
- **UI-FR-26 Replace** — An existing file can be replaced with a new one (delete +
  recreate in Saga).  
  → `PUT /documents/{id}`.
- **UI-FR-27 Delete** — A document can be deleted after a **confirmation dialog**; the
  list / tree is refreshed.  
  → `DELETE /documents/{id}`.
- **UI-FR-28 Download** — The original file can be downloaded (correct filename +
  MIME type).  
  → `GET /documents/{id}/file`.
- **UI-FR-29 Upload validation** — The UI validates file size client-side against a
  configurable limit and displays API errors (`validation_error`, `conflict` on
  duplicates) in a user-friendly way.
- **UI-FR-30 Progress & feedback** — Upload progress and success/failure are communicated
  via toast notifications.

---

## 9. Cross-Cutting / UX

- **UI-FR-31 Three-column layout** — Default layout: **left** tree, **centre** document
  list / results, **right** metadata + preview. Collapsible on small screens.
- **UI-FR-32 Error handling** — Saga API errors (`code`/`message` envelope) are
  mapped to clear UI messages; `401` leads to a sign-in redirect.
- **UI-FR-33 Connection status** — Saga reachability is checked via `GET /health`
  and an outage is shown to the user.
- **UI-FR-34 Internationalisation** — UI texts are centrally maintainable; default
  language is **English** (extensible, no hard v1 constraint).
- **UI-FR-35 Configurability** — Saga base URL, Bearer token, and login credentials
  are configurable via BFF environment variables (see
  [`03-architecture.md`](03-architecture.md)).

---

## 10. Requirement Traceability

| User need | Requirement(s) |
|-----------|----------------|
| Best-practice UI | UI-FR-31, NFR (see 02) |
| Manage / find / add / delete | UI-FR-9/10, UI-FR-12, UI-FR-25/26/27 |
| Searchable | UI-FR-12 – UI-FR-15 |
| Tree hierarchy | UI-FR-6 – UI-FR-11 |
| Static login | UI-FR-1 – UI-FR-5 |
| Document display | UI-FR-20 – UI-FR-23 |
| Left: tree, right: metadata + preview | UI-FR-31, UI-FR-16, UI-FR-20 |
| Download | UI-FR-28 |
| Communication via REST API | UI-FR-35, all API-referenced requirements |
| Standalone, Saga on another server | UI-FR-2, UI-FR-35, Architecture §BFF |
