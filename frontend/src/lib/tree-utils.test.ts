import { describe, expect, it } from 'vitest'
import { filterTree, toTreeData, type FolderMeta } from './tree-utils'
import type { FolderNode } from '../types/api'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function node(partial: Partial<FolderNode> & Pick<FolderNode, 'folder_id' | 'name'>): FolderNode {
  return {
    description: null,
    parent_id: null,
    metadata: {},
    document_count: 0,
    children: [],
    ...partial,
  }
}

const FLAT_TREE: FolderNode[] = [
  node({ folder_id: 'invoices', name: 'Invoices', document_count: 5 }),
  node({ folder_id: 'contracts', name: 'Contracts', document_count: 3 }),
]

const NESTED_TREE: FolderNode[] = [
  node({
    folder_id: 'finance',
    name: 'Finance',
    document_count: 10,
    children: [
      node({ folder_id: 'finance-invoices', name: 'Invoices', parent_id: 'finance', document_count: 5 }),
      node({ folder_id: 'finance-reports', name: 'Reports', parent_id: 'finance', document_count: 5 }),
    ],
  }),
  node({ folder_id: 'legal', name: 'Legal', document_count: 2 }),
]

// ── toTreeData ────────────────────────────────────────────────────────────────

describe('toTreeData', () => {
  it('converts flat nodes to TreeNodeData with correct value/label', () => {
    const map = new Map<string, FolderMeta>()
    const result = toTreeData(FLAT_TREE, map)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ value: 'invoices', label: 'Invoices' })
    expect(result[1]).toMatchObject({ value: 'contracts', label: 'Contracts' })
  })

  it('populates the metaMap with all folder ids', () => {
    const map = new Map<string, FolderMeta>()
    toTreeData(FLAT_TREE, map)
    expect(map.get('invoices')?.documentCount).toBe(5)
    expect(map.get('contracts')?.documentCount).toBe(3)
  })

  it('converts nested nodes recursively', () => {
    const map = new Map<string, FolderMeta>()
    const result = toTreeData(NESTED_TREE, map)
    expect(result).toHaveLength(2)
    expect(result[0].children).toHaveLength(2)
    expect(result[0].children![0]).toMatchObject({ value: 'finance-invoices', label: 'Invoices' })
  })

  it('populates metaMap for nested folder ids', () => {
    const map = new Map<string, FolderMeta>()
    toTreeData(NESTED_TREE, map)
    expect(map.get('finance')?.documentCount).toBe(10)
    expect(map.get('finance-invoices')?.documentCount).toBe(5)
    expect(map.get('finance-reports')?.documentCount).toBe(5)
    expect(map.get('legal')?.documentCount).toBe(2)
  })

  it('sets children to undefined for leaf nodes', () => {
    const map = new Map<string, FolderMeta>()
    const result = toTreeData(FLAT_TREE, map)
    expect(result[0].children).toBeUndefined()
  })
})

// ── filterTree ────────────────────────────────────────────────────────────────

describe('filterTree', () => {
  it('returns all nodes when query is empty', () => {
    const map = new Map<string, FolderMeta>()
    const data = toTreeData(FLAT_TREE, map)
    expect(filterTree(data, '')).toHaveLength(2)
    expect(filterTree(data, '   ')).toHaveLength(2)
  })

  it('filters by label (case-insensitive)', () => {
    const map = new Map<string, FolderMeta>()
    const data = toTreeData(FLAT_TREE, map)
    const result = filterTree(data, 'invoice')
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe('invoices')
  })

  it('keeps parent when a child matches', () => {
    const map = new Map<string, FolderMeta>()
    const data = toTreeData(NESTED_TREE, map)
    const result = filterTree(data, 'reports')
    // "Finance" parent must be kept because child "Reports" matches
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe('finance')
    expect(result[0].children).toHaveLength(1)
    expect(result[0].children![0].value).toBe('finance-reports')
  })

  it('returns empty array when nothing matches', () => {
    const map = new Map<string, FolderMeta>()
    const data = toTreeData(FLAT_TREE, map)
    expect(filterTree(data, 'zzz-no-match')).toHaveLength(0)
  })

  it('matches partial strings', () => {
    const map = new Map<string, FolderMeta>()
    const data = toTreeData(FLAT_TREE, map)
    expect(filterTree(data, 'cont')).toHaveLength(1)
    expect(filterTree(data, 'cont')[0].value).toBe('contracts')
    expect(filterTree(data, 'invo')).toHaveLength(1)
    expect(filterTree(data, 'invo')[0].value).toBe('invoices')
  })
})
