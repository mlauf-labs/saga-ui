# Contributing to Saga UI

Thank you for your interest in contributing! This document explains how to set up the
development environment, the coding conventions we follow, and how to submit changes.

---

## Development Setup

### Prerequisites

| Tool | Minimum version |
|------|----------------|
| Python | 3.11 |
| [uv](https://docs.astral.sh/uv/) | latest |
| Node.js | 22 |
| npm | 10 |
| Docker + Compose v2 | 24 |

### 1. Clone & configure

```bash
git clone https://github.com/mlauf-labs/saga-ui.git
cd saga-ui
cp .env.example .env   # fill in your Saga URL and credentials
```

### 2. Start the BFF

```bash
cd bff
uv sync
uv run uvicorn app.main:app --reload --port 8088
```

### 3. Start the frontend (separate terminal)

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

---

## Running Tests

```bash
# BFF
cd bff && uv run pytest -v

# Frontend
cd frontend && npm test
```

All tests must pass before opening a pull request. The CI pipeline runs the same
commands automatically on every push.

---

## Code Conventions

### Python (BFF)

- Formatter / linter: **Ruff** (`uv run ruff check app/ --fix`)
- Type hints: required for all public functions.
- Async: use `async/await` throughout (no synchronous blocking calls).
- Error handling: map Saga errors to appropriate HTTP status codes in `proxy.py`.

### TypeScript / React (Frontend)

- Formatter: **Prettier** (`npm run format` inside `frontend/`)
- Linter: **ESLint** (`npm run lint`)
- Type-check: `npm run type-check`
- Components: functional components with hooks only (no class components).
- State: server state via TanStack Query; UI state via `useState`/`useReducer`.
- Comments: explain *why*, not *what* – avoid obvious narration.

---

## Pull Request Guidelines

1. **Branch** from `main` with a descriptive name, e.g. `feat/bulk-download` or `fix/pdf-worker`.
2. **Keep PRs small** – one logical change per PR.
3. **Tests** – add or update tests for every changed behaviour.
4. **No secrets** – never commit `.env`, tokens or passwords. CI checks this.
5. **Changelog** – briefly describe your change in the PR description.
6. After review, a maintainer will **squash-merge** into `main`.

---

## Project Conventions for AI Agents

See [`AGENTS.md`](AGENTS.md) for how AI coding agents should work in this project.
