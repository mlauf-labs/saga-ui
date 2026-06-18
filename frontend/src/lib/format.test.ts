import { describe, expect, it } from 'vitest'
import { formatBytes, formatDate, getMimeLabel, STATUS_COLOR, STATUS_LABEL, formatRelative } from './format'

// ── formatBytes ───────────────────────────────────────────────────────────────

describe('formatBytes', () => {
  it('returns "0 B" for 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  it('formats bytes without decimal', () => {
    expect(formatBytes(512)).toBe('512 B')
  })

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(1536)).toBe('1.5 KB')
  })

  it('formats megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB')
    expect(formatBytes(5.5 * 1024 * 1024)).toBe('5.5 MB')
  })

  it('formats gigabytes', () => {
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe('2.0 GB')
  })
})

// ── formatDate ────────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('returns a non-empty string for a valid ISO date', () => {
    const result = formatDate('2024-06-04T10:00:00Z')
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('contains the year', () => {
    expect(formatDate('2024-06-04T10:00:00Z')).toContain('2024')
  })
})

// ── getMimeLabel ──────────────────────────────────────────────────────────────

describe('getMimeLabel', () => {
  it('returns "PDF" for application/pdf', () => {
    expect(getMimeLabel('application/pdf')).toBe('PDF')
  })

  it('returns "Image" for image/* types', () => {
    expect(getMimeLabel('image/png')).toBe('Image')
    expect(getMimeLabel('image/jpeg')).toBe('Image')
    expect(getMimeLabel('IMAGE/PNG')).toBe('Image')
  })

  it('returns "Word" for docx MIME type', () => {
    expect(getMimeLabel('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('Word')
  })

  it('returns "Text" for text/* types', () => {
    expect(getMimeLabel('text/plain')).toBe('Text')
  })

  it('returns "JSON" for application/json', () => {
    expect(getMimeLabel('application/json')).toBe('JSON')
  })

  it('returns "E-Mail" for message/rfc822', () => {
    expect(getMimeLabel('message/eml')).toBe('E-Mail')
  })

  it('uppercases unknown subtypes as fallback', () => {
    // "application/xyz" → "XYZ"
    expect(getMimeLabel('application/xyz')).toBe('XYZ')
  })
})

// ── STATUS_COLOR and STATUS_LABEL ────────────────────────────────────────────

describe('STATUS_COLOR', () => {
  it('covers all statuses', () => {
    const statuses = ['pending', 'converting', 'analyzing', 'indexing', 'ready', 'failed'] as const
    for (const s of statuses) {
      expect(STATUS_COLOR[s]).toBeTruthy()
    }
  })

  it('maps ready to green and failed to red', () => {
    expect(STATUS_COLOR.ready).toBe('green')
    expect(STATUS_COLOR.failed).toBe('red')
  })
})

describe('STATUS_LABEL', () => {
  it('returns English labels', () => {
    expect(STATUS_LABEL.ready).toBe('Ready')
    expect(STATUS_LABEL.failed).toBe('Failed')
    expect(STATUS_LABEL.pending).toBe('Pending')
  })
})

// ── formatRelative ────────────────────────────────────────────────────────────

describe('formatRelative', () => {
  const now = new Date('2026-06-17T12:00:00Z').getTime()

  it('formats future days', () => {
    // 5 days ahead — clearly in the "day" bucket (< 7 days, > 1 day)
    expect(formatRelative('2026-06-22T12:00:00Z', now)).toBe('in 5 days')
  })

  it('formats past hours', () => {
    expect(formatRelative('2026-06-17T10:00:00Z', now)).toBe('2 hours ago')
  })

  it('uses auto wording for ±1 day', () => {
    expect(formatRelative('2026-06-18T12:00:00Z', now)).toBe('tomorrow')
    expect(formatRelative('2026-06-16T12:00:00Z', now)).toBe('yesterday')
  })

  it('formats future months', () => {
    expect(formatRelative('2026-09-17T12:00:00Z', now)).toBe('in 3 months')
  })
})
