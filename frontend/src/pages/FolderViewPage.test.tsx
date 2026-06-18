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
