import { describe, expect, it, vi, afterEach } from 'vitest'
import { stats } from './client'

afterEach(() => vi.restoreAllMocks())

describe('stats client', () => {
  it('fetches /api/stats', async () => {
    const body = { snapshot: { counts: { documents_total: 1 } }, pipeline: { stages: {}, tokens: [], ingest: {} } }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    ))
    const result = await stats.get()
    expect(result.snapshot.counts.documents_total).toBe(1)
    expect(fetch).toHaveBeenCalledWith('/api/stats', expect.anything())
  })

  it('fetches /api/agents-stats', async () => {
    const body = { agents: [], proposals: {}, runtime: { agent_count: 0 } }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    ))
    const result = await stats.agents()
    expect(result.runtime.agent_count).toBe(0)
  })
})
