# Non-Functional Requirements – Saga UI

> Status: Draft v1. Stable IDs `UI-NFR-x`.

---

## 1. Architecture & Decoupling

- **UI-NFR-1 Self-contained** — The UI is a separate repository and a separate
  deployment. It communicates with Saga **exclusively** via its REST API and has no
  knowledge of internal details (OpenSearch, MinIO, Redis).
- **UI-NFR-2 Location independence** — Saga can run on a different host. The base
  URL is configurable at runtime (no compile-time binding).
- **UI-NFR-3 BFF pattern** — A Backend-for-Frontend encapsulates authentication and
  keeps the Saga token server-side; the browser communicates only with the BFF.
- **UI-NFR-4 No forced store changes** — The UI works with the existing API. Optional
  store extensions are clearly marked as optional
  ([`../api-gaps.md`](../api-gaps.md)).

## 2. Security

- **UI-NFR-5 Token confidentiality** — The Saga Bearer token is known only to the
  BFF and is never sent to the browser.
- **UI-NFR-6 Session cookies** — Session cookies are `HttpOnly`, `SameSite=Lax`
  (or `Strict`) and `Secure` when served over HTTPS.
- **UI-NFR-7 Secret handling** — Credentials and tokens are injected via environment
  variables / `.env`, never committed to the repository. A `.env.example` documents all
  variables.
- **UI-NFR-8 CSRF protection** — State-changing BFF endpoints are protected against CSRF
  (SameSite cookies + optional CSRF token).
- **UI-NFR-9 Password comparison** — Password checks use constant-time comparison;
  passwords are never logged in plain text.
- **UI-NFR-10 Login rate limiting** — Login attempts are rate-limited to hamper
  brute-force attacks.

## 3. Performance

- **UI-NFR-11 Responsiveness** — Interactions (navigation, preview start) feel fluid;
  lists and trees are paginated / partially loaded.
- **UI-NFR-12 Caching** — Repeated reads (tree, lists) are cached client-side
  (stale-while-revalidate via TanStack Query).
- **UI-NFR-13 Large file streaming** — Downloads / previews of large binary files are
  streamed through the BFF rather than held entirely in memory.
- **UI-NFR-14 Bounded requests** — `top_k` / `page_size` are limited to sensible maxima
  (aligned with Saga limits).

## 4. Usability / Best Practice

- **UI-NFR-15 Modern UI** — Clean three-column interface with a consistent component
  design system, light and dark mode.
- **UI-NFR-16 Accessibility** — Keyboard navigability and ARIA compliance for tree,
  dialogs and forms (WCAG AA as target).
- **UI-NFR-17 Responsive** — Usable from desktop to tablet; columns collapse on small
  viewports.
- **UI-NFR-18 Feedback** — Loading, empty, success and error states are explicitly
  designed everywhere (skeletons, toasts, confirmation dialogs).
- **UI-NFR-19 Meaningful errors** — Saga error codes are mapped to clear,
  actionable messages.

## 5. Maintainability & Quality

- **UI-NFR-20 Type safety** — Consistent TypeScript in the frontend; typed API clients
  (ideally generated from the Saga OpenAPI schema).
- **UI-NFR-21 Tests** — Unit tests for core logic, component tests for key views, at
  least one E2E happy path (login → tree → preview → download).
- **UI-NFR-22 Linting / formatting** — Consistent lint and format rules (ESLint, Prettier
  for the frontend; Ruff for the Python BFF) enforced in CI.
- **UI-NFR-23 Structure** — Clear separation between API client, data / state layer and
  presentation components.
- **UI-NFR-24 Configuration** — All environment-dependent values via environment
  variables; no hard-coded hosts or tokens.

## 6. Operations & Deployment

- **UI-NFR-25 Containerisation** — The UI (static frontend) and BFF are packaged as
  Docker images; a `docker-compose.yml` starts the UI standalone and connects to an
  externally reachable Saga.
- **UI-NFR-26 Health check** — The BFF exposes its own `/health` endpoint and optionally
  checks Saga reachability.
- **UI-NFR-27 Logging** — Structured logging in the BFF (without secrets); configurable
  log level.
- **UI-NFR-28 Reproducibility** — Dependencies are pinned with lockfiles; images are
  version-pinnable for production.
- **UI-NFR-29 12-Factor** — Strict separation of code and configuration; stateless
  except for the session.

## 7. Compatibility

- **UI-NFR-30 Browsers** — Current versions of Chrome, Firefox, Edge and Safari.
- **UI-NFR-31 API version** — The UI tolerates additive API changes; the OpenAPI schema
  version used is documented.

## 8. Documentation & Open Source

- **UI-NFR-32 README & setup** — Complete guide for local development and Docker
  operation.
- **UI-NFR-33 Licence & GitHub** — Repository prepared for publication (LICENSE,
  `.gitignore`, `.env.example`, no secrets in git history).
