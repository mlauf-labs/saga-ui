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
