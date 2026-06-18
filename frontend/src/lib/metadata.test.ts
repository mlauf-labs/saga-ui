import { describe, expect, it } from 'vitest'
import {
  findReservedMetadataKey,
  fromMetadataRows,
  isReservedMetadataKey,
  toMetadataRows,
  type MetadataRow,
} from './metadata'

describe('metadata helpers', () => {
  it('round-trips a record through rows', () => {
    const record = { owner: 'me', project: 'Apollo' }
    const rows = toMetadataRows(record)
    expect(rows.map((r) => [r.key, r.value])).toEqual([
      ['owner', 'me'],
      ['project', 'Apollo'],
    ])
    expect(fromMetadataRows(rows)).toEqual(record)
  })

  it('drops blank keys and trims keys when building a record', () => {
    const rows: MetadataRow[] = [
      { _id: 1, key: ' owner ', value: 'me' },
      { _id: 2, key: '', value: 'ignored' },
    ]
    expect(fromMetadataRows(rows)).toEqual({ owner: 'me' })
  })

  it('flags reserved and saga_-prefixed keys', () => {
    expect(isReservedMetadataKey('type')).toBe(true)
    expect(isReservedMetadataKey('title')).toBe(true)
    expect(isReservedMetadataKey('saga_id')).toBe(true)
    expect(isReservedMetadataKey('owner')).toBe(false)
  })

  it('returns the first reserved key among rows, else null', () => {
    expect(findReservedMetadataKey([{ _id: 1, key: 'owner', value: 'me' }])).toBeNull()
    expect(
      findReservedMetadataKey([
        { _id: 1, key: 'owner', value: 'me' },
        { _id: 2, key: 'resource', value: 'x' },
      ]),
    ).toBe('resource')
  })
})
