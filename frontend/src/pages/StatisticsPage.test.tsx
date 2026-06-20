import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext, type AuthState } from '../contexts/auth-context'
import StatisticsPage from './StatisticsPage'
import * as client from '../api/client'

const authValue: AuthState = {
  user: { username: 'tester' },
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MantineProvider>
        <AuthContext.Provider value={authValue}>
          <MemoryRouter>
            <StatisticsPage />
          </MemoryRouter>
        </AuthContext.Provider>
      </MantineProvider>
    </QueryClientProvider>,
  )
}

describe('StatisticsPage', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('renders document totals', async () => {
    vi.spyOn(client.stats, 'get').mockResolvedValue({
      snapshot: {
        counts: { documents_total: 42, documents_by_status: { ready: 40, failed: 2 }, documents_by_doc_type: {}, documents_by_mime: {}, documents_without_folder: 0, documents_without_doc_type: 0, folders_total: 5, doc_types_total: 3, events_by_category: {}, document_notes_total: 0, folder_notes_total: 0, size_bytes_sum: 1000, size_bytes_max: 500, size_bytes_avg: 250 },
        storage: { postgres_bytes: 1, opensearch_bytes: 2, opensearch_docs: 3, minio_bytes: 4, minio_objects: 5, redis_bytes: 6, queue_depth: 0 },
        chunks_total: 10,
      },
      pipeline: { stages: {}, tokens: [], ingest: { success: 40, failed: 2 } },
    })
    vi.spyOn(client.stats, 'agents').mockRejectedValue(new Error('404'))
    renderPage()
    await waitFor(() => expect(screen.getByText('42')).toBeInTheDocument())
  })
})
