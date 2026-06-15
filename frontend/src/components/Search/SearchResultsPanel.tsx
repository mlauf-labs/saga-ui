/**
 * SearchResultsPanel – centre column in search mode.
 *
 * Calls POST /api/search (fused hybrid: keyword + semantic via RRF) and
 * displays document-level result cards: title, snippet, summary, doc_type,
 * folders and the fused relevance score. Supports the full filter set the
 * API exposes (doc-type, folder + subtree, status, date range, top_k and
 * extracted-value field filters).
 */

import { useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Collapse,
  Divider,
  Group,
  NativeSelect,
  ScrollArea,
  Select,
  Skeleton,
  Stack,
  Switch,
  TagsInput,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from '@mantine/core'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useDisclosure } from '@mantine/hooks'
import { useQuery } from '@tanstack/react-query'
import {
  IconAdjustmentsHorizontal,
  IconAlertCircle,
  IconFolder,
  IconSearch,
  IconTag,
} from '@tabler/icons-react'
import { docTypes, folders, search } from '../../api/client'
import { STATUS_LABEL } from '../../lib/format'
import type { DocumentStatus, SearchResultItem } from '../../types/api'

const STATUS_OPTIONS = (Object.keys(STATUS_LABEL) as DocumentStatus[]).map((s) => ({
  value: s,
  label: STATUS_LABEL[s],
}))

// ── Hit card ──────────────────────────────────────────────────────────────────

function HitCard({
  hit,
  folderNames,
  folderEmojis,
  docTypeEmojis,
  selected,
  onSelect,
}: {
  hit: SearchResultItem
  folderNames: Map<string, string>
  folderEmojis: Map<string, string | null>
  docTypeEmojis: Map<string, string | null>
  selected: boolean
  onSelect: () => void
}) {
  return (
    <UnstyledButton
      onClick={onSelect}
      w="100%"
      p="sm"
      style={{
        borderRadius: 8,
        border: `1px solid ${
          selected ? 'var(--mantine-color-blue-5)' : 'var(--mantine-color-default-border)'
        }`,
        backgroundColor: selected ? 'var(--mantine-color-blue-light)' : undefined,
        transition: 'background-color 0.1s, border-color 0.1s',
      }}
      aria-selected={selected}
      aria-label={`Search result: ${hit.title}`}
    >
      <Stack gap={6}>
        {/* Title row */}
        <Group gap="xs" wrap="nowrap" justify="space-between">
          <Tooltip label={hit.title} openDelay={600} disabled={hit.title.length < 50}>
            <Text size="sm" fw={600} truncate flex={1}>
              {hit.title}
            </Text>
          </Tooltip>
          <Tooltip label={`Fused relevance score: ${hit.score.toFixed(4)}`} openDelay={300}>
            <Badge size="xs" variant="light" color="blue" style={{ flexShrink: 0 }}>
              {hit.score.toFixed(3)}
            </Badge>
          </Tooltip>
        </Group>

        {/* Snippet / summary */}
        {(hit.snippet || hit.summary) && (
          <Box fz="xs" c="dimmed" className="markdown-preview markdown-preview--compact markdown-preview--clamp3">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{hit.snippet || hit.summary || ''}</ReactMarkdown>
          </Box>
        )}

        {/* Metadata row */}
        <Group gap={6} wrap="wrap">
          {hit.doc_type && (
            <Badge size="xs" variant="outline" color="blue" leftSection={<IconTag size={10} />}>
              {docTypeEmojis.get(hit.doc_type) ? `${docTypeEmojis.get(hit.doc_type)} ` : ''}{hit.doc_type}
            </Badge>
          )}
          {hit.folder_ids.slice(0, 3).map((id) => (
            <Badge
              key={id}
              size="xs"
              variant="light"
              color="gray"
              leftSection={<IconFolder size={10} />}
            >
              {folderEmojis.get(id) ? `${folderEmojis.get(id)} ` : ''}{folderNames.get(id) ?? id}
            </Badge>
          ))}
          {hit.folder_ids.length > 3 && (
            <Badge size="xs" variant="light" color="gray">
              +{hit.folder_ids.length - 3} more
            </Badge>
          )}
        </Group>
      </Stack>
    </UnstyledButton>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function HitSkeleton() {
  return (
    <Box p="sm" style={{ borderRadius: 8, border: '1px solid var(--mantine-color-default-border)' }}>
      <Stack gap={6}>
        <Skeleton height={14} w="60%" radius="sm" />
        <Skeleton height={11} w="100%" radius="sm" />
        <Skeleton height={11} w="80%" radius="sm" />
        <Group gap={6}>
          <Skeleton height={18} w={60} radius="xl" />
          <Skeleton height={18} w={80} radius="xl" />
        </Group>
      </Stack>
    </Box>
  )
}

// ── Filters ───────────────────────────────────────────────────────────────────

interface Filters {
  docType: string | null
  folderId: string | null
  includeSubtree: boolean
  status: string | null
  createdFrom: string
  createdTo: string
  topK: number
  fieldFilters: string[]
}

const EMPTY_FILTERS: Filters = {
  docType: null,
  folderId: null,
  includeSubtree: true,
  status: null,
  createdFrom: '',
  createdTo: '',
  topK: 10,
  fieldFilters: [],
}

function parseFieldFilters(pairs: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const pair of pairs) {
    const idx = pair.indexOf('=')
    if (idx > 0) {
      const key = pair.slice(0, idx).trim()
      const value = pair.slice(idx + 1).trim()
      if (key) out[key] = value
    }
  }
  return out
}

function FiltersBar({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  const [advancedOpen, { toggle }] = useDisclosure(false)

  const { data: docTypeList } = useQuery({ queryKey: ['docTypes'], queryFn: () => docTypes.list() })
  const { data: folderList } = useQuery({ queryKey: ['folders', 'flat'], queryFn: () => folders.flat() })

  const docTypeOptions = useMemo(
    () => (docTypeList ?? []).map((dt) => ({ value: dt.name, label: dt.name })),
    [docTypeList],
  )
  const folderOptions = useMemo(
    () => (folderList ?? []).map((f) => ({ value: f.folder_id, label: f.name })),
    [folderList],
  )

  return (
    <Stack gap="xs" px="md" py="xs">
      <Group gap="sm" wrap="nowrap">
        <Select
          placeholder="Any type"
          data={docTypeOptions}
          value={filters.docType}
          onChange={(v) => onChange({ ...filters, docType: v })}
          leftSection={<IconTag size={14} />}
          size="xs"
          clearable
          searchable
          style={{ flex: 1 }}
          aria-label="Filter by document type"
        />
        <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
          <NativeSelect
            value={String(filters.topK)}
            onChange={(e) => onChange({ ...filters, topK: Number(e.currentTarget.value) })}
            data={['5', '10', '20', '50']}
            size="xs"
            aria-label="Maximum results"
          />
          <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
            results
          </Text>
        </Group>
        <Button
          size="compact-xs"
          variant="subtle"
          leftSection={<IconAdjustmentsHorizontal size={14} />}
          onClick={toggle}
          style={{ flexShrink: 0 }}
        >
          Filters
        </Button>
      </Group>

      <Collapse expanded={advancedOpen}>
        <Stack gap="xs" pt="xs">
          <Group gap="sm" grow>
            <Select
              label="Folder"
              placeholder="Any folder"
              data={folderOptions}
              value={filters.folderId}
              onChange={(v) => onChange({ ...filters, folderId: v })}
              size="xs"
              clearable
              searchable
            />
            <Select
              label="Status"
              placeholder="Any status"
              data={STATUS_OPTIONS}
              value={filters.status}
              onChange={(v) => onChange({ ...filters, status: v })}
              size="xs"
              clearable
            />
          </Group>

          {filters.folderId && (
            <Switch
              label="Include subfolders"
              checked={filters.includeSubtree}
              onChange={(e) => onChange({ ...filters, includeSubtree: e.currentTarget.checked })}
              size="xs"
            />
          )}

          <Group gap="sm" grow>
            <TextInput
              label="Created from"
              type="date"
              value={filters.createdFrom}
              onChange={(e) => onChange({ ...filters, createdFrom: e.currentTarget.value })}
              size="xs"
            />
            <TextInput
              label="Created to"
              type="date"
              value={filters.createdTo}
              onChange={(e) => onChange({ ...filters, createdTo: e.currentTarget.value })}
              size="xs"
            />
          </Group>

          <TagsInput
            label="Field filters"
            description="Match extracted values as key=value (e.g. invoice_number=INV-1)."
            placeholder="key=value"
            value={filters.fieldFilters}
            onChange={(v) => onChange({ ...filters, fieldFilters: v })}
            size="xs"
            splitChars={[',']}
            clearable
          />
        </Stack>
      </Collapse>
    </Stack>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface SearchResultsPanelProps {
  query: string
  activeDocumentId: string | null
  onDocumentSelect: (id: string) => void
}

export default function SearchResultsPanel({
  query,
  activeDocumentId,
  onDocumentSelect,
}: SearchResultsPanelProps) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)

  const { data: folderList } = useQuery({
    queryKey: ['folders', 'flat'],
    queryFn: () => folders.flat(),
  })
  const folderNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const f of folderList ?? []) map.set(f.folder_id, f.name)
    return map
  }, [folderList])

  const folderEmojis = useMemo(() => {
    const map = new Map<string, string | null>()
    for (const f of folderList ?? []) map.set(f.folder_id, f.emoji ?? null)
    return map
  }, [folderList])

  const { data: docTypeList } = useQuery({
    queryKey: ['doc-types'],
    queryFn: () => docTypes.list(),
    staleTime: 60_000,
  })
  const docTypeEmojis = useMemo(() => {
    const map = new Map<string, string | null>()
    for (const dt of docTypeList ?? []) map.set(dt.name, dt.emoji ?? null)
    return map
  }, [docTypeList])

  const fieldFilters = useMemo(
    () => parseFieldFilters(filters.fieldFilters),
    [filters.fieldFilters],
  )

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['search', query, filters],
    queryFn: () =>
      search.hybrid({
        keyword_query: query,
        semantic_query: query,
        top_k: filters.topK,
        include_subtree: filters.includeSubtree,
        ...(filters.docType ? { doc_type: filters.docType } : {}),
        ...(filters.folderId ? { folder_id: filters.folderId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.createdFrom ? { created_from: filters.createdFrom } : {}),
        ...(filters.createdTo ? { created_to: filters.createdTo } : {}),
        ...(Object.keys(fieldFilters).length > 0 ? { filters: fieldFilters } : {}),
      }),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
    enabled: query.trim().length > 0,
  })

  const results = data?.results ?? []

  return (
    <Stack gap={0} h="100%">
      {/* Header */}
      <Box px="md" py="sm">
        <Group gap="xs" wrap="nowrap">
          <IconSearch size={14} color="var(--mantine-color-blue-6)" style={{ flexShrink: 0 }} />
          <Text fw={600} size="sm" truncate flex={1}>
            "{query}"
          </Text>
          {!isLoading && data && (
            <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
              {results.length} {results.length === 1 ? 'result' : 'results'}
              {isFetching ? ' …' : ''}
            </Text>
          )}
        </Group>
      </Box>

      <Divider />

      {/* Filters */}
      <FiltersBar filters={filters} onChange={setFilters} />

      <Divider />

      {/* Results */}
      <ScrollArea flex={1}>
        <Stack gap={6} p="sm">
          {isLoading && Array.from({ length: 5 }).map((_, i) => <HitSkeleton key={i} />)}

          {isError && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" m="sm">
              Search failed. Please try again.
            </Alert>
          )}

          {!isLoading && !isError && results.length === 0 && (
            <Center py="xl">
              <Stack align="center" gap="xs" c="dimmed">
                <IconSearch size={36} />
                <Text size="sm">No results for "{query}".</Text>
                <Text size="xs">Try different keywords or remove filters.</Text>
              </Stack>
            </Center>
          )}

          {results.map((hit) => (
            <HitCard
              key={hit.document_id}
              hit={hit}
              folderNames={folderNames}
              folderEmojis={folderEmojis}
              docTypeEmojis={docTypeEmojis}
              selected={hit.document_id === activeDocumentId}
              onSelect={() => onDocumentSelect(hit.document_id)}
            />
          ))}
        </Stack>
      </ScrollArea>
    </Stack>
  )
}
