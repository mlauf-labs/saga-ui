import { describe, expect, it } from 'vitest'
import { isTerminal } from './document-status'

describe('isTerminal', () => {
  it('is true for ready and failed', () => {
    expect(isTerminal('ready')).toBe(true)
    expect(isTerminal('failed')).toBe(true)
  })

  it('is false for in-pipeline statuses', () => {
    expect(isTerminal('pending')).toBe(false)
    expect(isTerminal('analyzing')).toBe(false)
    expect(isTerminal('summarizing')).toBe(false)
    expect(isTerminal('classifying')).toBe(false)
  })
})
