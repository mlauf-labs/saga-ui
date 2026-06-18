import { describe, expect, it } from 'vitest'
import { rangeToBounds } from './date-range'

describe('rangeToBounds', () => {
  it('returns undefined bounds for an empty range', () => {
    expect(rangeToBounds([null, null])).toEqual({ from: undefined, to: undefined })
  })

  it('passes the start date through and extends the end to end-of-day', () => {
    expect(rangeToBounds(['2026-01-01', '2026-12-31'])).toEqual({
      from: '2026-01-01',
      to: '2026-12-31T23:59:59',
    })
  })

  it('handles a half-open range (start only)', () => {
    expect(rangeToBounds(['2026-06-01', null])).toEqual({ from: '2026-06-01', to: undefined })
  })
})
