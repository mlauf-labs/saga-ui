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

  it('uses a surface-specific error title when given', () => {
    renderList({ events: [], isError: true, errorTitle: 'Failed to load agenda' })
    expect(screen.getByText('Failed to load agenda')).toBeInTheDocument()
  })
})
