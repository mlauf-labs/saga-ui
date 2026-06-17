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
