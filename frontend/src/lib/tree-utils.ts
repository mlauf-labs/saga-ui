import type { TreeNodeData } from '@mantine/core'
import type { Folder, FolderNode } from '../types/api'

/** Minimal shape needed to resolve a folder's full path. */
interface FolderPathItem {
  folder_id: string
  name: string
  parent_id: string | null
}

/**
 * Builds a Map<folder_id, fullPath> from a flat folder list by walking up the
 * parent chain. The path uses " / " as a separator, e.g. "HR / Payroll / 2024".
 * Cycles and missing parents are handled gracefully.
 */
export function buildFolderPathMap(folders: FolderPathItem[]): Map<string, string> {
  const byId = new Map<string, FolderPathItem>()
  for (const f of folders) byId.set(f.folder_id, f)

  const cache = new Map<string, string>()

  const resolve = (id: string, seen: Set<string>): string => {
    const cached = cache.get(id)
    if (cached !== undefined) return cached
    const folder = byId.get(id)
    if (!folder) return id
    if (folder.parent_id && !seen.has(folder.parent_id)) {
      seen.add(folder.parent_id)
      const parentPath = resolve(folder.parent_id, seen)
      const path = parentPath ? `${parentPath} / ${folder.name}` : folder.name
      cache.set(id, path)
      return path
    }
    cache.set(id, folder.name)
    return folder.name
  }

  for (const f of folders) resolve(f.folder_id, new Set([f.folder_id]))
  return cache
}

/** Convenience: Select options ({ value, label }) with full-path labels, sorted by path. */
export function folderPathOptions(
  folders: Folder[],
  excludeId?: string,
): { value: string; label: string }[] {
  const pathMap = buildFolderPathMap(folders)
  return folders
    .filter((f) => f.folder_id !== excludeId)
    .map((f) => ({ value: f.folder_id, label: pathMap.get(f.folder_id) ?? f.name }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

/** Per-folder metadata needed when rendering a tree node. */
export interface FolderMeta {
  name: string
  emoji?: string | null
  documentCount: number
  description: string | null
}

/**
 * Converts the Saga FolderNode tree into Mantine TreeNodeData.
 * Also builds a flat Map<folder_id, FolderMeta> for fast lookup in renderNode.
 */
export function toTreeData(
  nodes: FolderNode[],
  metaMap: Map<string, FolderMeta>,
): TreeNodeData[] {
  return nodes.map((node) => {
    metaMap.set(node.folder_id, {
      name: node.name,
      emoji: node.emoji ?? null,
      documentCount: node.document_count,
      description: node.description,
    })
    const children =
      node.children.length > 0 ? toTreeData(node.children, metaMap) : undefined
    return { value: node.folder_id, label: node.name, children }
  })
}

/**
 * Recursively filters TreeNodeData by node label.
 * A node is kept if its own label matches OR any descendant matches
 * (so the path to matching leaves stays visible).
 */
export function filterTree(nodes: TreeNodeData[], query: string): TreeNodeData[] {
  if (!query.trim()) return nodes
  const q = query.toLowerCase()
  return nodes.reduce<TreeNodeData[]>((acc, node) => {
    const label = (typeof node.label === 'string' ? node.label : String(node.value)).toLowerCase()
    const filteredChildren = node.children ? filterTree(node.children, q) : undefined
    if (label.includes(q) || (filteredChildren && filteredChildren.length > 0)) {
      acc.push({ ...node, children: filteredChildren ?? [] })
    }
    return acc
  }, [])
}
