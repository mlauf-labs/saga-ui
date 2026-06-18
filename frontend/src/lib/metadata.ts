/** Helpers for editing a free-form string/string metadata map. */

export interface MetadataRow {
  _id: number
  key: string
  value: string
}

export function toMetadataRows(metadata: Record<string, string>): MetadataRow[] {
  return Object.entries(metadata).map(([key, value], i) => ({ _id: i, key, value }))
}

export function fromMetadataRows(rows: MetadataRow[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const row of rows) {
    const key = row.key.trim()
    if (key) out[key] = row.value
  }
  return out
}

/**
 * Document-metadata keys SAGA owns (the OKF-standard frontmatter keys plus the `saga_`
 * prefix). The backend rejects these with HTTP 400; we mirror the rule so a document-metadata
 * editor can warn before saving. (Folder metadata has no such restriction.)
 */
const RESERVED_METADATA_KEYS = new Set([
  'type',
  'title',
  'description',
  'tags',
  'resource',
  'timestamp',
])

export function isReservedMetadataKey(key: string): boolean {
  return RESERVED_METADATA_KEYS.has(key) || key.startsWith('saga_')
}

/** Return the first reserved metadata key among the rows, or `null` if all are allowed. */
export function findReservedMetadataKey(rows: MetadataRow[]): string | null {
  for (const row of rows) {
    const key = row.key.trim()
    if (key && isReservedMetadataKey(key)) return key
  }
  return null
}
