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
