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
