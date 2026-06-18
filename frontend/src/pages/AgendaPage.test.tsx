import { MantineProvider } from '@mantine/core'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as client from '../api/client'
import { AuthContext, type AuthState } from '../contexts/auth-context'
import AgendaPage from './AgendaPage'

afterEach(() => vi.restoreAllMocks())

const authValue: AuthState = {
  user: { username: 'tester' },
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
}

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
      documents: {},
    })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <MantineProvider>
        <QueryClientProvider client={qc}>
          <AuthContext.Provider value={authValue}>
            <MemoryRouter>
              <AgendaPage />
            </MemoryRouter>
          </AuthContext.Provider>
        </QueryClientProvider>
      </MantineProvider>,
    )
    await waitFor(() => expect(screen.getByText('Policy renewal')).toBeInTheDocument())
  })
})
