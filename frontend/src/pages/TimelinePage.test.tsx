import { MantineProvider } from '@mantine/core'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
