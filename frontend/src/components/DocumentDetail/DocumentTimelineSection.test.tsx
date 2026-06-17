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
