# SAGA UI — Timeline & Agenda (Track E) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface saga-core's timeline subsystem in the web UI: an archive-wide Timeline page, a document-detail timeline, an Agenda of upcoming events, and a folder overview + folder log.

**Architecture:** Frontend-only (the BFF's generic `/api/*` proxy already forwards `/timeline`, `/documents/{id}/timeline`, `/agenda`). A single shared, date-grouped `EventList` component is fed by TanStack Query `useInfiniteQuery` hooks over new typed `timeline`/`agenda` API-client methods, and reused by three new pages + a section in the existing document detail. Read-only.

**Tech Stack:** React 19, TypeScript (strict, no `any`), Vite, Mantine 9, `@tabler/icons-react`, TanStack Query 5, react-router-dom 6, Vitest + React Testing Library.

**Baseline branch:** saga-ui is currently on `fix/frontend-lockfile-sync`. Branch the Track E work **from `develop`** (sync first). Do **not** run HEAD-changing git commands inside subagents; verify the branch after each commit. As the first commit, add `.superpowers/` to `.gitignore` (the brainstorm scratch dir) alongside the spec + this plan.

**Commit convention:** Conventional Commits, imperative, English. **Do not add a `Co-Authored-By: Claude` trailer.** Reference UI requirement IDs where useful.

**Spec:** `docs/superpowers/specs/2026-06-17-ui-timeline-agenda-design.md`.

**Conventions (saga-ui CLAUDE.md):** one API client (`request<T>`, no raw `fetch`); API shapes only in `types/api.ts`; Mantine only; English only; strict TS (no `any`); after every change run `npm run lint`, `npm run type-check`, and `docker compose build saga-ui` (exit 0). All frontend commands run from `frontend/`.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `frontend/src/types/api.ts` | API shapes | Add `EventCategory`, `EventType`, `SagaEvent`, `TimelineResponse`, `TimelineQueryParams`. |
| `frontend/src/api/client.ts` | Typed BFF client | Add `timeline` + `agenda` groups. |
| `frontend/src/lib/format.ts` | Pure formatters | Add `formatRelative`. |
| `frontend/src/hooks/useTimeline.ts` | Data fetching | Create `useTimeline`, `useDocumentTimeline`. |
| `frontend/src/hooks/useAgenda.ts` | Data fetching | Create `useAgenda`. |
| `frontend/src/components/Timeline/EventRow.tsx` | Render one event | Create. |
| `frontend/src/components/Timeline/CategoryFilter.tsx` | Audit/content filter | Create. |
| `frontend/src/components/Timeline/EventList.tsx` | Date-grouped list + states + load-more | Create. |
| `frontend/src/pages/TimelinePage.tsx` | `/timeline` | Create. |
| `frontend/src/pages/AgendaPage.tsx` | `/agenda` | Create. |
| `frontend/src/pages/FolderViewPage.tsx` | `/folders/:id` | Create. |
| `frontend/src/App.tsx` | Routing | Add 3 routes. |
| `frontend/src/components/Layout/AppHeader.tsx` | Desktop nav | Add Timeline + Agenda nav items. |
| `frontend/src/components/Layout/BottomNav.tsx` | Mobile nav | Add Timeline + Agenda (matching its pattern). |
| `frontend/src/components/DocumentDetail/DocumentDetailPanel.tsx` | Doc detail | Add a "Timeline" section. |
| `frontend/src/components/FolderTree/*` | Folder tree | Add a "view" affordance → `/folders/:id`. |

Tests live next to sources as `*.test.ts(x)` (Vitest), matching `lib/format.test.ts`.

---

## Task 1: Types + API client

**Files:**
- Modify: `frontend/src/types/api.ts`, `frontend/src/api/client.ts`
- Test: `frontend/src/api/client.timeline.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/api/client.timeline.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { timeline, agenda } from './client'

function mockFetchOk() {
  const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ items: [], limit: 50, offset: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  return spy
}

afterEach(() => vi.restoreAllMocks())

describe('timeline client', () => {
  it('builds the /api/timeline query string from params', async () => {
    const spy = mockFetchOk()
    await timeline.query({ category: 'audit', folderId: 'f1', limit: 50, offset: 0 })
    const url = String(spy.mock.calls[0][0])
    expect(url).toContain('/api/timeline?')
    expect(url).toContain('category=audit')
    expect(url).toContain('folder_id=f1')
    expect(url).toContain('limit=50')
    expect(url).toContain('offset=0')
  })

  it('omits undefined params and encodes the document id', async () => {
    const spy = mockFetchOk()
    await timeline.forDocument('a/b', { limit: 25, offset: 0 })
    const url = String(spy.mock.calls[0][0])
    expect(url).toContain('/api/documents/a%2Fb/timeline?')
    expect(url).not.toContain('category=')
  })

  it('builds the /api/agenda query string', async () => {
    const spy = mockFetchOk()
    await agenda.get({ limit: 50, offset: 0 })
    const url = String(spy.mock.calls[0][0])
    expect(url).toContain('/api/agenda?')
    expect(url).toContain('limit=50')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `frontend/`): `npm run test -- src/api/client.timeline.test.ts`
Expected: FAIL — `timeline`/`agenda` are not exported.

(If `npm run test` is watch-mode, use `npx vitest run src/api/client.timeline.test.ts`. Confirm the script name in `package.json`; the repo uses Vitest.)

- [ ] **Step 3: Add the types**

Append to `frontend/src/types/api.ts` (snake_case mirrors the saga-core JSON):

```ts
// ── Timeline / events ───────────────────────────────────────────────────────

export type EventCategory = 'audit' | 'content'

export type EventType =
  | 'doc_ingested'
  | 'placement'
  | 'move'
  | 'reclassification'
  | 'folder_created'
  | 'folder_renamed'
  | 'dated_fact'
  | 'appointment'
  | 'recurring'

/** A single timeline event (named SagaEvent to avoid clashing with the DOM Event). */
export interface SagaEvent {
  event_id: string
  category: EventCategory
  event_type: EventType
  document_id?: string | null
  folder_id?: string | null
  occurred_at?: string | null
  recorded_at: string
  actor: string
  summary: string
  confidence?: number | null
  details: Record<string, unknown>
}

export interface TimelineResponse {
  items: SagaEvent[]
  limit: number
  offset: number
}

export interface TimelineQueryParams {
  category?: EventCategory
  eventType?: EventType
  folderId?: string
  includeSubtree?: boolean
  occurredFrom?: string
  occurredTo?: string
  expand?: boolean
  limit: number
  offset: number
}

export interface AgendaQueryParams {
  folderId?: string
  from?: string
  to?: string
  limit: number
  offset: number
}
```

- [ ] **Step 4: Add the client methods**

In `frontend/src/api/client.ts`: extend the `import type { … } from '../types/api'` block with `TimelineResponse`, `TimelineQueryParams`, `AgendaQueryParams`. Then add this section (after the `documents` group, before `search`):

```ts
// ── Timeline / Agenda ──────────────────────────────────────────────────────

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) sp.set(key, String(value))
  }
  const qs = sp.toString()
  return qs ? `?${qs}` : ''
}

export const timeline = {
  query: (p: TimelineQueryParams) =>
    request<TimelineResponse>(
      `/api/timeline${buildQuery({
        category: p.category,
        event_type: p.eventType,
        folder_id: p.folderId,
        include_subtree: p.includeSubtree,
        occurred_from: p.occurredFrom,
        occurred_to: p.occurredTo,
        expand: p.expand,
        limit: p.limit,
        offset: p.offset,
      })}`,
    ),

  forDocument: (id: string, p: { category?: EventCategory; limit: number; offset: number }) =>
    request<TimelineResponse>(
      `/api/documents/${encodeURIComponent(id)}/timeline${buildQuery({
        category: p.category,
        limit: p.limit,
        offset: p.offset,
      })}`,
    ),
}

export const agenda = {
  get: (p: AgendaQueryParams) =>
    request<TimelineResponse>(
      `/api/agenda${buildQuery({
        folder_id: p.folderId,
        from: p.from,
        to: p.to,
        limit: p.limit,
        offset: p.offset,
      })}`,
    ),
}
```

Add `EventCategory` to the type import as well (used in `forDocument`'s signature).

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/api/client.timeline.test.ts`
Expected: PASS (3 passed).

- [ ] **Step 6: Lint + type-check + commit**

Run (from `frontend/`): `npm run lint && npm run type-check`. Both clean.

```bash
git add frontend/src/types/api.ts frontend/src/api/client.ts frontend/src/api/client.timeline.test.ts
git commit -m "feat: add timeline/agenda API types and client methods"
```

---

## Task 2: `formatRelative` date helper

**Files:**
- Modify: `frontend/src/lib/format.ts`
- Test: `frontend/src/lib/format.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `frontend/src/lib/format.test.ts`:

```ts
import { formatRelative } from './format'

describe('formatRelative', () => {
  const now = new Date('2026-06-17T12:00:00Z').getTime()

  it('formats future days', () => {
    expect(formatRelative('2026-06-29T12:00:00Z', now)).toBe('in 12 days')
  })

  it('formats past hours', () => {
    expect(formatRelative('2026-06-17T10:00:00Z', now)).toBe('2 hours ago')
  })

  it('uses auto wording for ±1 day', () => {
    expect(formatRelative('2026-06-18T12:00:00Z', now)).toBe('tomorrow')
    expect(formatRelative('2026-06-16T12:00:00Z', now)).toBe('yesterday')
  })

  it('formats future months', () => {
    expect(formatRelative('2026-09-17T12:00:00Z', now)).toBe('in 3 months')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/format.test.ts`
Expected: FAIL — `formatRelative` not exported.

- [ ] **Step 3: Implement `formatRelative`**

Add to `frontend/src/lib/format.ts` (after the date formatters):

```ts
const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 1000 * 60 * 60 * 24 * 365],
  ['month', 1000 * 60 * 60 * 24 * 30],
  ['week', 1000 * 60 * 60 * 24 * 7],
  ['day', 1000 * 60 * 60 * 24],
  ['hour', 1000 * 60 * 60],
  ['minute', 1000 * 60],
]

/** Human relative time, e.g. "in 12 days", "2 hours ago", "tomorrow". */
export function formatRelative(iso: string, now: number = Date.now()): string {
  const diffMs = new Date(iso).getTime() - now
  const absMs = Math.abs(diffMs)
  for (const [unit, unitMs] of RELATIVE_UNITS) {
    if (absMs >= unitMs) {
      return relativeFormatter.format(Math.round(diffMs / unitMs), unit)
    }
  }
  return relativeFormatter.format(Math.round(diffMs / 1000), 'second')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/format.test.ts`
Expected: PASS (existing format tests + 4 new).

NOTE: `Intl.RelativeTimeFormat` rounding is deterministic for the chosen unit. If a boundary case (e.g. exactly 30 days) yields "in 1 month" vs the test's expectation, adjust the *test's* input to an unambiguous value (e.g. 90 days for "in 3 months") rather than weakening the implementation — keep assertions exact.

- [ ] **Step 5: Commit**

Run `npm run lint && npm run type-check`, then:

```bash
git add frontend/src/lib/format.ts frontend/src/lib/format.test.ts
git commit -m "feat: add formatRelative date helper"
```

---

## Task 3: Query hooks

**Files:**
- Create: `frontend/src/hooks/useTimeline.ts`, `frontend/src/hooks/useAgenda.ts`
- Test: `frontend/src/hooks/useTimeline.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/hooks/useTimeline.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as client from '../api/client'
import { useTimeline } from './useTimeline'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

afterEach(() => vi.restoreAllMocks())

describe('useTimeline', () => {
  it('queries the client with the given params and flattens items', async () => {
    const spy = vi.spyOn(client.timeline, 'query').mockResolvedValue({
      items: [
        {
          event_id: 'e1',
          category: 'audit',
          event_type: 'placement',
          recorded_at: '2026-06-17T10:00:00Z',
          actor: 'agent',
          summary: 'Placed',
          details: {},
        },
      ],
      limit: 50,
      offset: 0,
    })

    const { result } = renderHook(() => useTimeline({ category: 'audit' }), { wrapper })
    await waitFor(() => expect(result.current.events).toHaveLength(1))

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ category: 'audit', offset: 0 }))
    expect(result.current.events[0].event_id).toBe('e1')
    expect(result.current.hasMore).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useTimeline.test.tsx`
Expected: FAIL — `useTimeline` not found.

- [ ] **Step 3: Implement the hooks**

Create `frontend/src/hooks/useTimeline.ts`:

```ts
import { useInfiniteQuery } from '@tanstack/react-query'
import { timeline } from '../api/client'
import type { EventCategory, SagaEvent, TimelineQueryParams } from '../types/api'

const PAGE_SIZE = 50

type TimelineFilters = Omit<TimelineQueryParams, 'limit' | 'offset'>

function flatten(pages: { items: SagaEvent[] }[] | undefined): SagaEvent[] {
  return (pages ?? []).flatMap((p) => p.items)
}

function nextOffset(last: { items: SagaEvent[]; limit: number; offset: number }): number | undefined {
  return last.items.length === last.limit ? last.offset + last.limit : undefined
}

export function useTimeline(filters: TimelineFilters = {}) {
  const query = useInfiniteQuery({
    queryKey: ['timeline', filters],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => timeline.query({ ...filters, limit: PAGE_SIZE, offset: pageParam }),
    getNextPageParam: nextOffset,
  })
  return {
    ...query,
    events: flatten(query.data?.pages),
    hasMore: Boolean(query.hasNextPage),
  }
}

export function useDocumentTimeline(id: string, filters: { category?: EventCategory } = {}) {
  const query = useInfiniteQuery({
    queryKey: ['document-timeline', id, filters],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      timeline.forDocument(id, { ...filters, limit: PAGE_SIZE, offset: pageParam }),
    getNextPageParam: nextOffset,
    enabled: Boolean(id),
  })
  return { ...query, events: flatten(query.data?.pages), hasMore: Boolean(query.hasNextPage) }
}
```

Create `frontend/src/hooks/useAgenda.ts`:

```ts
import { useInfiniteQuery } from '@tanstack/react-query'
import { agenda } from '../api/client'
import type { AgendaQueryParams, SagaEvent } from '../types/api'

const PAGE_SIZE = 50

type AgendaFilters = Omit<AgendaQueryParams, 'limit' | 'offset'>

export function useAgenda(filters: AgendaFilters = {}) {
  const query = useInfiniteQuery({
    queryKey: ['agenda', filters],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => agenda.get({ ...filters, limit: PAGE_SIZE, offset: pageParam }),
    getNextPageParam: (last) =>
      last.items.length === last.limit ? last.offset + last.limit : undefined,
  })
  return {
    ...query,
    events: (query.data?.pages ?? []).flatMap((p: { items: SagaEvent[] }) => p.items),
    hasMore: Boolean(query.hasNextPage),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useTimeline.test.tsx`
Expected: PASS.

- [ ] **Step 5: Lint + type-check + commit**

```bash
git add frontend/src/hooks/useTimeline.ts frontend/src/hooks/useAgenda.ts frontend/src/hooks/useTimeline.test.tsx
git commit -m "feat: add useTimeline/useDocumentTimeline/useAgenda hooks"
```

---

## Task 4: `EventRow` component

**Files:**
- Create: `frontend/src/components/Timeline/EventRow.tsx`
- Test: `frontend/src/components/Timeline/EventRow.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/Timeline/EventRow.test.tsx`:

```tsx
import { MantineProvider } from '@mantine/core'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { SagaEvent } from '../../types/api'
import { EventRow } from './EventRow'

function renderRow(event: SagaEvent) {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <EventRow event={event} />
      </MemoryRouter>
    </MantineProvider>,
  )
}

const base: SagaEvent = {
  event_id: 'e1',
  category: 'audit',
  event_type: 'placement',
  document_id: 'd1',
  recorded_at: '2026-06-17T10:00:00Z',
  actor: 'agent',
  summary: 'Placed in Finanzen',
  details: {},
}

describe('EventRow', () => {
  it('shows the summary and a category badge', () => {
    renderRow(base)
    expect(screen.getByText('Placed in Finanzen')).toBeInTheDocument()
    expect(screen.getByText('audit')).toBeInTheDocument()
  })

  it('links to the document when document_id is present', () => {
    renderRow(base)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/?doc=d1')
  })

  it('renders content events without a document link when none', () => {
    renderRow({ ...base, category: 'content', event_type: 'dated_fact', document_id: null })
    expect(screen.getByText('content')).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })
})
```

RESOLVED (confirmed in the codebase): there is **no `/documents/:id` route** — `MainPage` (the `/*` catch-all) opens a document via local state (`activeDocumentId` + `onDocumentSelect`). So the EventRow link targets **`/?doc=<id>`**, and `MainPage` is taught to honour that query param (Task 7, URL→state). That makes timeline rows deep-link into the document. The test's expected `href` is `/?doc=d1`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Timeline/EventRow.test.tsx`
Expected: FAIL — `EventRow` not found.

- [ ] **Step 3: Implement `EventRow`**

Create `frontend/src/components/Timeline/EventRow.tsx`:

```tsx
import { Anchor, Badge, Group, Stack, Text } from '@mantine/core'
import { Link } from 'react-router-dom'
import { formatRelative } from '../../lib/format'
import type { SagaEvent } from '../../types/api'

const CATEGORY_COLOR: Record<SagaEvent['category'], string> = {
  audit: 'blue',
  content: 'teal',
}

interface EventRowProps {
  event: SagaEvent
  /** Show a relative time ("in 12 days") instead of the absolute timestamp's time. */
  showRelative?: boolean
}

export function EventRow({ event, showRelative = false }: EventRowProps) {
  const when = event.occurred_at ?? event.recorded_at
  return (
    <Group align="flex-start" gap="sm" wrap="nowrap" py={4}>
      <Badge color={CATEGORY_COLOR[event.category]} variant="light" size="sm">
        {event.category}
      </Badge>
      <Stack gap={0} style={{ flex: 1 }}>
        <Text size="sm">{event.summary}</Text>
        <Text size="xs" c="dimmed">
          {event.event_type} · {event.actor}
          {showRelative ? ` · ${formatRelative(when)}` : ''}
          {event.document_id ? (
            <>
              {' · '}
              <Anchor component={Link} to={`/?doc=${event.document_id}`} size="xs">
                document
              </Anchor>
            </>
          ) : null}
        </Text>
      </Stack>
    </Group>
  )
}
```

(The `/?doc=<id>` target is wired to `MainPage` in Task 7.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Timeline/EventRow.test.tsx`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Timeline/EventRow.tsx frontend/src/components/Timeline/EventRow.test.tsx
git commit -m "feat: add EventRow component"
```

---

## Task 5: `CategoryFilter` component

**Files:**
- Create: `frontend/src/components/Timeline/CategoryFilter.tsx`
- Test: `frontend/src/components/Timeline/CategoryFilter.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/Timeline/CategoryFilter.test.tsx`:

```tsx
import { MantineProvider } from '@mantine/core'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CategoryFilter } from './CategoryFilter'

describe('CategoryFilter', () => {
  it('renders All/Audit/Content and reports selection', async () => {
    const onChange = vi.fn()
    render(
      <MantineProvider>
        <CategoryFilter value="all" onChange={onChange} />
      </MantineProvider>,
    )
    expect(screen.getByText('All')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Audit'))
    expect(onChange).toHaveBeenCalledWith('audit')
  })
})
```

(`@testing-library/user-event` ^14 is already a dev dependency — confirmed in `package.json`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Timeline/CategoryFilter.test.tsx`
Expected: FAIL — `CategoryFilter` not found.

- [ ] **Step 3: Implement `CategoryFilter`**

Create `frontend/src/components/Timeline/CategoryFilter.tsx`:

```tsx
import { SegmentedControl } from '@mantine/core'
import type { EventCategory } from '../../types/api'

export type CategorySelection = EventCategory | 'all'

interface CategoryFilterProps {
  value: CategorySelection
  onChange: (value: CategorySelection) => void
}

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <SegmentedControl
      value={value}
      onChange={(v) => onChange(v as CategorySelection)}
      data={[
        { label: 'All', value: 'all' },
        { label: 'Audit', value: 'audit' },
        { label: 'Content', value: 'content' },
      ]}
      size="sm"
    />
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Timeline/CategoryFilter.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Timeline/CategoryFilter.tsx frontend/src/components/Timeline/CategoryFilter.test.tsx
git commit -m "feat: add CategoryFilter component"
```

---

## Task 6: `EventList` component (shared core)

**Files:**
- Create: `frontend/src/components/Timeline/EventList.tsx`
- Test: `frontend/src/components/Timeline/EventList.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/Timeline/EventList.test.tsx`:

```tsx
import { MantineProvider } from '@mantine/core'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { SagaEvent } from '../../types/api'
import { EventList } from './EventList'

function ev(id: string, occurred: string, summary: string): SagaEvent {
  return {
    event_id: id,
    category: 'content',
    event_type: 'dated_fact',
    occurred_at: occurred,
    recorded_at: occurred,
    actor: 'llm',
    summary,
    details: {},
  }
}

function renderList(props: Partial<React.ComponentProps<typeof EventList>> = {}) {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <EventList events={props.events ?? []} {...props} />
      </MemoryRouter>
    </MantineProvider>,
  )
}

describe('EventList', () => {
  it('groups events under date headers, newest-first by default', () => {
    renderList({
      events: [ev('a', '2026-06-17T10:00:00Z', 'Newer'), ev('b', '2026-05-01T10:00:00Z', 'Older')],
    })
    const headers = screen.getAllByTestId('date-header').map((n) => n.textContent)
    expect(headers).toEqual(['17/06/2026', '01/05/2026'])
  })

  it('orders ascending when order="asc"', () => {
    renderList({
      events: [ev('a', '2026-06-17T10:00:00Z', 'Newer'), ev('b', '2026-05-01T10:00:00Z', 'Older')],
      order: 'asc',
    })
    const headers = screen.getAllByTestId('date-header').map((n) => n.textContent)
    expect(headers).toEqual(['01/05/2026', '17/06/2026'])
  })

  it('shows the empty message when there are no events', () => {
    renderList({ events: [], emptyMessage: 'No events yet' })
    expect(screen.getByText('No events yet')).toBeInTheDocument()
  })

  it('shows an error state with retry', () => {
    renderList({ events: [], isError: true })
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Timeline/EventList.test.tsx`
Expected: FAIL — `EventList` not found.

- [ ] **Step 3: Implement `EventList`**

Create `frontend/src/components/Timeline/EventList.tsx`:

```tsx
import { Alert, Button, Center, Skeleton, Stack, Text } from '@mantine/core'
import { formatDate } from '../../lib/format'
import type { SagaEvent } from '../../types/api'
import { EventRow } from './EventRow'

interface EventListProps {
  events: SagaEvent[]
  order?: 'asc' | 'desc'
  showRelative?: boolean
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  hasMore?: boolean
  onLoadMore?: () => void
  isLoadingMore?: boolean
  emptyMessage?: string
}

function groupKey(e: SagaEvent): string {
  return (e.occurred_at ?? e.recorded_at).slice(0, 10) // YYYY-MM-DD
}

function sortedGroups(events: SagaEvent[], order: 'asc' | 'desc'): [string, SagaEvent[]][] {
  const groups = new Map<string, SagaEvent[]>()
  for (const e of events) {
    const k = groupKey(e)
    const list = groups.get(k) ?? []
    list.push(e)
    groups.set(k, list)
  }
  const keys = [...groups.keys()].sort()
  if (order === 'desc') keys.reverse()
  return keys.map((k) => [k, groups.get(k) as SagaEvent[]])
}

export function EventList({
  events,
  order = 'desc',
  showRelative = false,
  isLoading = false,
  isError = false,
  onRetry,
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
  emptyMessage = 'No events yet.',
}: EventListProps) {
  if (isLoading) {
    return (
      <Stack gap="xs">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={32} radius="sm" />
        ))}
      </Stack>
    )
  }
  if (isError) {
    return (
      <Alert color="red" title="Failed to load timeline">
        <Button variant="light" size="xs" mt="xs" onClick={onRetry}>
          Retry
        </Button>
      </Alert>
    )
  }
  if (events.length === 0) {
    return (
      <Center py="lg">
        <Text c="dimmed" size="sm">
          {emptyMessage}
        </Text>
      </Center>
    )
  }
  return (
    <Stack gap="md">
      {sortedGroups(events, order).map(([day, items]) => (
        <Stack key={day} gap={4}>
          <Text data-testid="date-header" size="sm" fw={600} c="dimmed">
            {formatDate(day)}
          </Text>
          {items.map((e) => (
            <EventRow key={e.event_id} event={e} showRelative={showRelative} />
          ))}
        </Stack>
      ))}
      {hasMore ? (
        <Center>
          <Button variant="subtle" size="sm" loading={isLoadingMore} onClick={onLoadMore}>
            Load more
          </Button>
        </Center>
      ) : null}
    </Stack>
  )
}
```

NOTE: `formatDate` takes an ISO-ish string; `groupKey` returns `YYYY-MM-DD` which `new Date('2026-06-17')` parses as UTC midnight — `formatDate` renders it as `17/06/2026` (en-GB). If your timezone shifts the displayed day, pass the full original timestamp to `formatDate` from the group's first event instead of the date-only key. Keep the test's expected `DD/MM/YYYY` strings consistent with `formatDate`'s output.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Timeline/EventList.test.tsx`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Timeline/EventList.tsx frontend/src/components/Timeline/EventList.test.tsx
git commit -m "feat: add EventList date-grouped component"
```

---

## Task 7: TimelinePage + nav + route

**Files:**
- Create: `frontend/src/pages/TimelinePage.tsx`, `frontend/src/pages/TimelinePage.test.tsx`
- Modify: `frontend/src/App.tsx`, `frontend/src/components/Layout/AppHeader.tsx`, `frontend/src/components/Layout/BottomNav.tsx`, `frontend/src/pages/MainPage.tsx` (deep-link `?doc`)

- [ ] **Step 1: Write the failing test**

Create `frontend/src/pages/TimelinePage.test.tsx`:

```tsx
import { MantineProvider } from '@mantine/core'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as client from '../api/client'
import TimelinePage from './TimelinePage'

afterEach(() => vi.restoreAllMocks())

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MantineProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <TimelinePage />
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>,
  )
}

describe('TimelinePage', () => {
  it('renders events from the timeline endpoint', async () => {
    vi.spyOn(client.timeline, 'query').mockResolvedValue({
      items: [
        {
          event_id: 'e1',
          category: 'audit',
          event_type: 'placement',
          recorded_at: '2026-06-17T10:00:00Z',
          actor: 'agent',
          summary: 'Placed in Finanzen',
          details: {},
        },
      ],
      limit: 50,
      offset: 0,
    })
    renderPage()
    await waitFor(() => expect(screen.getByText('Placed in Finanzen')).toBeInTheDocument())
    expect(screen.getByText('All')).toBeInTheDocument() // category filter present
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/TimelinePage.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `TimelinePage`**

Create `frontend/src/pages/TimelinePage.tsx`:

```tsx
import { useState } from 'react'
import { Container, Stack, Title } from '@mantine/core'
import { CategoryFilter, type CategorySelection } from '../components/Timeline/CategoryFilter'
import { EventList } from '../components/Timeline/EventList'
import { useTimeline } from '../hooks/useTimeline'

export default function TimelinePage() {
  const [category, setCategory] = useState<CategorySelection>('all')
  const q = useTimeline(category === 'all' ? {} : { category })
  return (
    <Container size="md" py="md">
      <Stack gap="md">
        <Title order={3}>Timeline</Title>
        <CategoryFilter value={category} onChange={setCategory} />
        <EventList
          events={q.events}
          isLoading={q.isLoading}
          isError={q.isError}
          onRetry={q.refetch}
          hasMore={q.hasMore}
          onLoadMore={q.fetchNextPage}
          isLoadingMore={q.isFetchingNextPage}
        />
      </Stack>
    </Container>
  )
}
```

- [ ] **Step 4: Register the route + nav**

In `frontend/src/App.tsx`: import `TimelinePage` and add a protected route (mirroring `/doc-types`), before the catch-all `/*`:

```tsx
<Route
  path="/timeline"
  element={
    <ProtectedRoute>
      <ErrorBoundary>
        <TimelinePage />
      </ErrorBoundary>
    </ProtectedRoute>
  }
/>
```

In `frontend/src/components/Layout/AppHeader.tsx`: add `IconTimeline` to the `@tabler/icons-react` import and a `NAV_ITEMS` entry (verify `IconTimeline` is the exact tabler export; if not, pick a close timeline/history icon that exists):

```tsx
{ to: '/timeline', label: 'Timeline', icon: IconTimeline, end: false },
```

In `frontend/src/components/Layout/BottomNav.tsx`: read the file and add a Timeline entry following its existing item pattern (icon + label + onClick/navigate). Keep mobile space in mind — if the bottom bar is full, it is acceptable to add Timeline + Agenda (Task 8) and let lower-priority items wrap per the component's existing layout; do not redesign the bar.

**Deep-link wiring (so the EventRow `/?doc=<id>` link opens the document):** in `frontend/src/pages/MainPage.tsx`, `activeDocumentId` is local `useState`. Add a one-way URL→state sync: read `react-router-dom`'s `useSearchParams`, and when the `doc` param is present, initialise/update `activeDocumentId` from it. Minimal sketch (adapt to the file's existing state setup — do not change the list-driven selection):

```tsx
import { useSearchParams } from 'react-router-dom'
// …
const [searchParams] = useSearchParams()
const docParam = searchParams.get('doc')
useEffect(() => {
  if (docParam) setActiveDocumentId(docParam)
}, [docParam])
```

This is URL→state only (selecting from the list keeps working as-is; no need to push state back to the URL for v1). Keep the existing `useState` default.

- [ ] **Step 5: Run test + checks + commit**

Run: `npx vitest run src/pages/TimelinePage.test.tsx`, then `npm run lint && npm run type-check`.

```bash
git add frontend/src/pages/TimelinePage.tsx frontend/src/pages/TimelinePage.test.tsx frontend/src/App.tsx frontend/src/components/Layout/AppHeader.tsx frontend/src/components/Layout/BottomNav.tsx frontend/src/pages/MainPage.tsx
git commit -m "feat: add Timeline page, route, nav entry, and ?doc deep-link"
```

---

## Task 8: AgendaPage + nav + route

**Files:**
- Create: `frontend/src/pages/AgendaPage.tsx`, `frontend/src/pages/AgendaPage.test.tsx`
- Modify: `frontend/src/App.tsx`, `frontend/src/components/Layout/AppHeader.tsx`, `frontend/src/components/Layout/BottomNav.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/pages/AgendaPage.test.tsx`:

```tsx
import { MantineProvider } from '@mantine/core'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as client from '../api/client'
import AgendaPage from './AgendaPage'

afterEach(() => vi.restoreAllMocks())

describe('AgendaPage', () => {
  it('renders upcoming events from the agenda endpoint', async () => {
    vi.spyOn(client.agenda, 'get').mockResolvedValue({
      items: [
        {
          event_id: 'o1',
          category: 'content',
          event_type: 'recurring',
          occurred_at: '2026-07-01T00:00:00Z',
          recorded_at: '2026-06-01T00:00:00Z',
          actor: 'llm',
          summary: 'Policy renewal',
          details: { occurrence_of: 'rule-1' },
        },
      ],
      limit: 50,
      offset: 0,
    })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <MantineProvider>
        <QueryClientProvider client={qc}>
          <MemoryRouter>
            <AgendaPage />
          </MemoryRouter>
        </QueryClientProvider>
      </MantineProvider>,
    )
    await waitFor(() => expect(screen.getByText('Policy renewal')).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/AgendaPage.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `AgendaPage`**

Create `frontend/src/pages/AgendaPage.tsx`:

```tsx
import { Container, Stack, Text, Title } from '@mantine/core'
import { EventList } from '../components/Timeline/EventList'
import { useAgenda } from '../hooks/useAgenda'

export default function AgendaPage() {
  const q = useAgenda()
  return (
    <Container size="md" py="md">
      <Stack gap="md">
        <Title order={3}>Agenda</Title>
        <Text size="sm" c="dimmed">
          Upcoming appointments, deadlines, and recurring obligations.
        </Text>
        <EventList
          events={q.events}
          order="asc"
          showRelative
          isLoading={q.isLoading}
          isError={q.isError}
          onRetry={q.refetch}
          hasMore={q.hasMore}
          onLoadMore={q.fetchNextPage}
          isLoadingMore={q.isFetchingNextPage}
          emptyMessage="Nothing coming up."
        />
      </Stack>
    </Container>
  )
}
```

- [ ] **Step 4: Register route + nav**

In `App.tsx` add the `/agenda` route (mirroring `/timeline`). In `AppHeader.tsx` add `IconCalendarEvent` (verify the exact tabler export) + `{ to: '/agenda', label: 'Agenda', icon: IconCalendarEvent, end: false }`. In `BottomNav.tsx` add the Agenda entry following its pattern.

- [ ] **Step 5: Run test + checks + commit**

Run: `npx vitest run src/pages/AgendaPage.test.tsx`, then `npm run lint && npm run type-check`.

```bash
git add frontend/src/pages/AgendaPage.tsx frontend/src/pages/AgendaPage.test.tsx frontend/src/App.tsx frontend/src/components/Layout/AppHeader.tsx frontend/src/components/Layout/BottomNav.tsx
git commit -m "feat: add Agenda page, route, and nav entry"
```

---

## Task 9: FolderViewPage (`/folders/:id`) + folder-tree "view" link

**Files:**
- Create: `frontend/src/pages/FolderViewPage.tsx`, `frontend/src/pages/FolderViewPage.test.tsx`
- Modify: `frontend/src/App.tsx`, the folder-tree component under `frontend/src/components/FolderTree/`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/pages/FolderViewPage.test.tsx`:

```tsx
import { MantineProvider } from '@mantine/core'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as client from '../api/client'
import FolderViewPage from './FolderViewPage'

afterEach(() => vi.restoreAllMocks())

describe('FolderViewPage', () => {
  it('shows the folder name and its change log', async () => {
    vi.spyOn(client.folders, 'get').mockResolvedValue({
      folder_id: 'f1',
      name: 'Finanzen',
      description: 'Money',
      emoji: '💰',
      parent_id: null,
      metadata: {},
      notes: [],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    })
    vi.spyOn(client.folders, 'documents').mockResolvedValue({
      items: [],
      page: 1,
      page_size: 25,
      total: 0,
    })
    vi.spyOn(client.timeline, 'query').mockResolvedValue({
      items: [
        {
          event_id: 'e1',
          category: 'audit',
          event_type: 'folder_created',
          folder_id: 'f1',
          recorded_at: '2026-01-01T00:00:00Z',
          actor: 'user',
          summary: 'Created Finanzen',
          details: {},
        },
      ],
      limit: 50,
      offset: 0,
    })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <MantineProvider>
        <QueryClientProvider client={qc}>
          <MemoryRouter initialEntries={['/folders/f1']}>
            <Routes>
              <Route path="/folders/:id" element={<FolderViewPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </MantineProvider>,
    )
    await waitFor(() => expect(screen.getByText('Finanzen')).toBeInTheDocument())
    expect(screen.getByText('Created Finanzen')).toBeInTheDocument()
  })
})
```

NOTE: confirm the exact shapes of `folders.get` (a `Folder`) and `folders.documents` (`DocumentListResponse` with `items/page/page_size/total`) in `api/client.ts` + `types/api.ts`; adjust the mocked objects to match the real fields before relying on the test.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/FolderViewPage.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `FolderViewPage`**

Create `frontend/src/pages/FolderViewPage.tsx`:

```tsx
import { Anchor, Container, Divider, Group, Stack, Text, Title } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { folders } from '../api/client'
import { EventList } from '../components/Timeline/EventList'
import { useTimeline } from '../hooks/useTimeline'

export default function FolderViewPage() {
  const { id = '' } = useParams()
  const folderQ = useQuery({ queryKey: ['folder', id], queryFn: () => folders.get(id), enabled: Boolean(id) })
  const docsQ = useQuery({
    queryKey: ['folder-documents', id],
    queryFn: () => folders.documents(id, false, 1, 25),
    enabled: Boolean(id),
  })
  const logQ = useTimeline({ folderId: id })

  return (
    <Container size="md" py="md">
      <Stack gap="md">
        <Anchor component={Link} to="/folders" size="sm">
          ‹ Folders
        </Anchor>
        <Group gap="xs">
          {folderQ.data?.emoji ? <Text>{folderQ.data.emoji}</Text> : null}
          <Title order={3}>{folderQ.data?.name ?? '…'}</Title>
        </Group>
        {folderQ.data?.description ? <Text c="dimmed">{folderQ.data.description}</Text> : null}

        <Divider label="Documents" labelPosition="left" />
        {docsQ.data && docsQ.data.items.length > 0 ? (
          <Stack gap={2}>
            {docsQ.data.items.map((d) => (
              <Text key={d.document_id} size="sm">
                {d.title}
              </Text>
            ))}
          </Stack>
        ) : (
          <Text c="dimmed" size="sm">
            No documents in this folder.
          </Text>
        )}

        <Divider label="Change log" labelPosition="left" />
        <EventList
          events={logQ.events}
          isLoading={logQ.isLoading}
          isError={logQ.isError}
          onRetry={logQ.refetch}
          hasMore={logQ.hasMore}
          onLoadMore={logQ.fetchNextPage}
          isLoadingMore={logQ.isFetchingNextPage}
          emptyMessage="No changes recorded for this folder."
        />
      </Stack>
    </Container>
  )
}
```

NOTE: match `folders.documents`' real signature (the client shows `folders.documents(folderId, includeSubtree, page, pageSize)` returning `DocumentListResponse`); adjust the call/args to the actual one. Add a **Subfolders** list too if `folders` exposes children cheaply (e.g. from `folders.tree`); if not, omit it (YAGNI) — the spec lists subfolders but documents + log are the priority, and an extra tree fetch may be unjustified. Decide based on what the client already offers and note the choice.

- [ ] **Step 4: Register route + folder-tree "view" link**

In `App.tsx` add the `/folders/:id` route (protected + ErrorBoundary). **Order matters:** place it so it does not shadow the existing `/folders` admin route — register `/folders` (exact) and `/folders/:id` distinctly (react-router v6 matches the more specific path; keeping both as siblings works).

In the folder-tree component (`frontend/src/components/FolderTree/`), add a small "view" affordance per folder node (e.g. an `ActionIcon` with `IconEye` or making the folder label a `Link to={`/folders/${node.folder_id}`}`) — read the component and follow its existing interaction pattern; don't disrupt the existing select-to-filter behaviour.

- [ ] **Step 5: Run test + checks + commit**

Run: `npx vitest run src/pages/FolderViewPage.test.tsx`, then `npm run lint && npm run type-check`.

```bash
git add frontend/src/pages/FolderViewPage.tsx frontend/src/pages/FolderViewPage.test.tsx frontend/src/App.tsx frontend/src/components/FolderTree/
git commit -m "feat: add folder view page with overview and change log"
```

---

## Task 10: Document-detail timeline section

**Files:**
- Modify: `frontend/src/components/DocumentDetail/DocumentDetailPanel.tsx`
- Test: `frontend/src/components/DocumentDetail/DocumentTimelineSection.test.tsx` (+ a small extracted component)

- [ ] **Step 1: Write the failing test**

To keep `DocumentDetailPanel` focused, extract the timeline section into its own component and test that. Create `frontend/src/components/DocumentDetail/DocumentTimelineSection.test.tsx`:

```tsx
import { MantineProvider } from '@mantine/core'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as client from '../../api/client'
import { DocumentTimelineSection } from './DocumentTimelineSection'

afterEach(() => vi.restoreAllMocks())

describe('DocumentTimelineSection', () => {
  it('renders the document timeline', async () => {
    vi.spyOn(client.timeline, 'forDocument').mockResolvedValue({
      items: [
        {
          event_id: 'e1',
          category: 'content',
          event_type: 'dated_fact',
          document_id: 'd1',
          occurred_at: '2026-05-01T00:00:00Z',
          recorded_at: '2026-05-10T00:00:00Z',
          actor: 'llm',
          summary: 'Invoice dated 2026-05-01',
          details: {},
        },
      ],
      limit: 50,
      offset: 0,
    })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <MantineProvider>
        <QueryClientProvider client={qc}>
          <MemoryRouter>
            <DocumentTimelineSection documentId="d1" />
          </MemoryRouter>
        </QueryClientProvider>
      </MantineProvider>,
    )
    await waitFor(() => expect(screen.getByText('Invoice dated 2026-05-01')).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/DocumentDetail/DocumentTimelineSection.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the section + wire it into the detail panel**

Create `frontend/src/components/DocumentDetail/DocumentTimelineSection.tsx`:

```tsx
import { EventList } from '../Timeline/EventList'
import { useDocumentTimeline } from '../../hooks/useTimeline'

interface DocumentTimelineSectionProps {
  documentId: string
}

export function DocumentTimelineSection({ documentId }: DocumentTimelineSectionProps) {
  const q = useDocumentTimeline(documentId)
  return (
    <EventList
      events={q.events}
      isLoading={q.isLoading}
      isError={q.isError}
      onRetry={q.refetch}
      hasMore={q.hasMore}
      onLoadMore={q.fetchNextPage}
      isLoadingMore={q.isFetchingNextPage}
      emptyMessage="No timeline events for this document yet."
    />
  )
}
```

Then read `frontend/src/components/DocumentDetail/DocumentDetailPanel.tsx` and add a "Timeline" section consistent with how it already shows other sections (e.g. notes / folders). If the panel uses Mantine `Tabs`, add a `Tabs.Tab value="timeline"` + `Tabs.Panel` rendering `<DocumentTimelineSection documentId={doc.document_id} />`. If it uses stacked sections (headings), add a `Title`/`Divider` "Timeline" block rendering the same. Use the document id field name the panel already uses (`document_id`).

- [ ] **Step 4: Run test + checks + commit**

Run: `npx vitest run src/components/DocumentDetail/DocumentTimelineSection.test.tsx`, then `npm run lint && npm run type-check`.

```bash
git add frontend/src/components/DocumentDetail/DocumentTimelineSection.tsx frontend/src/components/DocumentDetail/DocumentTimelineSection.test.tsx frontend/src/components/DocumentDetail/DocumentDetailPanel.tsx
git commit -m "feat: add document-detail timeline section"
```

---

## Task 11: Final gates

**Files:** none (verification + any fixups).

- [ ] **Step 1: Full lint + type-check + test run**

From `frontend/`:
```
npm run lint
npm run type-check
npx vitest run
```
Expected: ESLint/Prettier clean; `tsc --noEmit` clean (no `any`); all tests pass.

- [ ] **Step 2: BFF check (unchanged, but confirm nothing drifted)**

From `bff/`: `uv run ruff check app/ && uv run ruff format --check app/`. Expected clean (Track E added no BFF code; this just confirms).

- [ ] **Step 3: Mandatory Docker build gate**

From the workspace root `d:\Projekte\Archiv` (or `saga-ui/`): `docker compose build saga-ui`. Expected: exit 0 (this runs `tsc -b` + Vite build — any TS error fails it).

- [ ] **Step 4: Commit any fixups**

If lint/format changed tracked files:
```bash
git add -A
git commit -m "style: lint/format Track E timeline UI"
```

---

## Self-Review

**1. Spec coverage (against `2026-06-17-ui-timeline-agenda-design.md`):**
- §3 types/client/hooks/components/pages/wiring → Tasks 1, 3, 4, 5, 6, 7–10. ✓
- §4 surface A (Timeline) → Task 7; B (doc detail) → Task 10; C (Agenda) → Task 8; D (folder view) → Task 9. ✓
- §5 paging (`useInfiniteQuery`, `items.length === limit`), states (skeleton/empty/error), relative dates (`formatRelative`) → Tasks 2, 3, 6. ✓
- §6 testing (EventList grouping/order/empty, CategoryFilter, a hook, page smoke tests, format unit) + gates (lint/type-check/docker) → Tasks 2–10, 11. ✓
- Non-goals respected: no mutations, no type filter, no agenda range picker, no folder CRUD. ✓

**2. Placeholder scan:** No "TBD"/"handle edge cases". The NOTEs flag real codebase facts the implementer must confirm (document-open mechanism, `folders.documents` signature, tabler icon names, `DocumentDetailPanel` section style, `user-event` availability) with a concrete fallback each — not vague placeholders. Every code step has complete code.

**3. Type/name consistency:** `SagaEvent` (snake_case) used uniformly. `EventList` prop names (`events, order, showRelative, isLoading, isError, onRetry, hasMore, onLoadMore, isLoadingMore, emptyMessage`) match across Tasks 6–10. Hook return surface (`events, hasMore, isLoading, isError, refetch, fetchNextPage, isFetchingNextPage`) is the spread of `useInfiniteQuery` + `events`/`hasMore`, used consistently by every page. `CategorySelection = EventCategory | 'all'` defined in Task 5 and used in Task 7. Client methods (`timeline.query`, `timeline.forDocument`, `agenda.get`) match between Task 1 and the hooks in Task 3.
