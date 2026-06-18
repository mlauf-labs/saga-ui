import { useState } from 'react'
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Center,
  Divider,
  Group,
  Pagination,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { useQuery } from '@tanstack/react-query'
import { IconUpload } from '@tabler/icons-react'
import {
  IconAlertCircle,
  IconFile,
  IconFileText,
  IconFileTypePdf,
  IconInbox,
  IconPhoto,
} from '@tabler/icons-react'
import { docTypes, documents, folders } from '../../api/client'
import { formatBytes, formatDate, getMimeLabel, STATUS_COLOR, STATUS_LABEL } from '../../lib/format'
import { isTerminal } from '../../lib/document-status'
import type { DocumentResponse, DocumentStatus } from '../../types/api'

const PAGE_SIZE = 25

// ── MIME icon helper ─────────────────────────────────────────────────────────

function MimeIcon({ mimeType, size = 18 }: { mimeType: string; size?: number }) {
  const t = mimeType.toLowerCase()
  if (t === 'application/pdf') return <IconFileTypePdf size={size} />
  if (t.startsWith('image/')) return <IconPhoto size={size} />
  if (t.startsWith('text/')) return <IconFileText size={size} />
  return <IconFile size={size} />
}

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <Badge size="xs" color={STATUS_COLOR[status]} variant="light">
      {STATUS_LABEL[status]}
    </Badge>
  )
}

// ── Single document row ──────────────────────────────────────────────────────

function DocumentRow({
  doc,
  selected,
  onSelect,
  docTypeEmojiMap,
}: {
  doc: DocumentResponse
  selected: boolean
  onSelect: () => void
  docTypeEmojiMap: Map<string, string | null>
}) {
  return (
    <UnstyledButton
      onClick={onSelect}
      w="100%"
      px="md"
      py="sm"
      style={{
        borderRadius: 6,
        backgroundColor: selected ? 'var(--mantine-color-blue-light)' : undefined,
        transition: 'background-color 0.1s',
      }}
      aria-selected={selected}
      aria-label={`Document: ${doc.title}`}
    >
      <Group gap="sm" wrap="nowrap" align="flex-start">
        {/* MIME icon */}
        <Box pt={2} c={selected ? 'blue' : 'dimmed'} style={{ flexShrink: 0 }}>
          <MimeIcon mimeType={doc.mime_type} />
        </Box>

        {/* Title + metadata */}
        <Stack gap={2} flex={1} style={{ minWidth: 0 }}>
          <Tooltip label={doc.title} disabled={doc.title.length < 40} openDelay={600}>
            <Text size="sm" fw={selected ? 600 : 400} truncate>
              {doc.title}
            </Text>
          </Tooltip>
          <Group gap="xs" wrap="nowrap">
            {doc.doc_type && (
              <Text size="xs" c="dimmed" truncate style={{ maxWidth: 100 }}>
                {docTypeEmojiMap.get(doc.doc_type) ? `${docTypeEmojiMap.get(doc.doc_type)} ` : ''}{doc.doc_type}
              </Text>
            )}
            <Text size="xs" c="dimmed">
              {getMimeLabel(doc.mime_type)}
            </Text>
            <Text size="xs" c="dimmed">
              {formatBytes(doc.size_bytes)}
            </Text>
            <Text size="xs" c="dimmed">
              {formatDate(doc.created_at)}
            </Text>
          </Group>
        </Stack>

        {/* Status badge */}
        <Box style={{ flexShrink: 0 }}>
          <StatusBadge status={doc.status} />
        </Box>
      </Group>
    </UnstyledButton>
  )
}

// ── Loading skeletons ────────────────────────────────────────────────────────

function DocumentRowSkeleton() {
  return (
    <Group gap="sm" px="md" py="sm" wrap="nowrap" align="flex-start">
      <Skeleton circle height={18} mt={2} />
      <Stack gap={4} flex={1}>
        <Skeleton height={14} w="60%" radius="sm" />
        <Skeleton height={11} w="40%" radius="sm" />
      </Stack>
      <Skeleton height={18} w={60} radius="xl" />
    </Group>
  )
}

// ── Panel header ─────────────────────────────────────────────────────────────

function PanelHeader({
  folderName,
  total,
  isLoading,
  onUploadClick,
  hideUpload,
}: {
  folderName: string | null
  total: number | null
  isLoading: boolean
  onUploadClick: () => void
  hideUpload?: boolean
}) {
  const label = folderName ?? 'All Documents'

  return (
    <Box px="md" py="sm">
      <Group gap="xs" wrap="nowrap">
        <Tooltip label={label} disabled={!folderName} openDelay={400}>
          <Text fw={600} size="sm" truncate flex={1}>
            {label}
          </Text>
        </Tooltip>
        {!isLoading && total !== null && (
          <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
            {total} {total === 1 ? 'document' : 'documents'}
          </Text>
        )}
        {isLoading && <Skeleton height={14} w={60} radius="sm" />}
        {!hideUpload && (
          <Tooltip label="Upload documents">
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={onUploadClick}
              aria-label="Upload documents"
              style={{ flexShrink: 0 }}
            >
              <IconUpload size={14} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
    </Box>
  )
}

// ── Main panel ───────────────────────────────────────────────────────────────

interface DocumentListPanelProps {
  activeFolderId: string | null
  activeFolderName: string | null
  activeDocumentId: string | null
  onDocumentSelect: (id: string) => void
  /** Called when the upload button is clicked. If provided, no internal UploadModal is rendered. */
  onUploadClick?: () => void
}

export default function DocumentListPanel({
  activeFolderId,
  activeFolderName,
  activeDocumentId,
  onDocumentSelect,
  onUploadClick,
}: DocumentListPanelProps) {
  const isMobile = useMediaQuery('(max-width: 48em)')

  // Track {folderId, page} together so page resets automatically
  // when the folder changes – without a useEffect (update-during-render pattern)
  const [listState, setListState] = useState<{ folderId: string | null; page: number }>({
    folderId: activeFolderId,
    page: 1,
  })

  const page = listState.folderId === activeFolderId ? listState.page : 1
  const setPage = (p: number) => setListState({ folderId: activeFolderId, page: p })

  const { data, isLoading, isError } = useQuery({
    queryKey: activeFolderId
      ? ['folders', activeFolderId, 'documents', page]
      : ['documents', 'list', page],
    queryFn: () =>
      activeFolderId
        ? folders.documents(activeFolderId, true, page, PAGE_SIZE)
        : documents.list(page, PAGE_SIZE),
    placeholderData: (prev) => prev,
    // Poll while any listed document is still going through the pipeline, so the
    // overview's status badges update live like the detail view does.
    refetchInterval: (query) => {
      const items = query.state.data?.items
      return items?.some((d) => !isTerminal(d.status)) ? 3000 : false
    },
  })

  const { data: docTypeList } = useQuery({
    queryKey: ['doc-types'],
    queryFn: () => docTypes.list(),
    staleTime: 60_000,
  })

  const docTypeEmojiMap = new Map<string, string | null>(
    (docTypeList ?? []).map((dt) => [dt.name, dt.emoji ?? null])
  )

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0

  return (
    <Stack gap={0} h="100%">
        {/* Header */}
        <PanelHeader
          folderName={activeFolderName}
          total={data?.total ?? null}
          isLoading={isLoading}
          onUploadClick={onUploadClick ?? (() => {})}
          hideUpload={isMobile}
        />
      <Divider />

      {/* Document rows */}
      <ScrollArea flex={1}>
        <Stack gap={2} p="xs">
          {/* Loading */}
          {isLoading &&
            Array.from({ length: 8 }).map((_, i) => <DocumentRowSkeleton key={i} />)}

          {/* Error */}
          {isError && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" m="sm">
              Failed to load documents.
            </Alert>
          )}

          {/* Empty */}
          {!isLoading && !isError && data?.items.length === 0 && (
            <Center py="xl">
              <Stack align="center" gap="xs" c="dimmed">
                <IconInbox size={36} />
                <Text size="sm">No documents found.</Text>
              </Stack>
            </Center>
          )}

          {/* Rows */}
          {!isLoading &&
            data?.items.map((doc) => (
              <DocumentRow
                key={doc.document_id}
                doc={doc}
                selected={doc.document_id === activeDocumentId}
                onSelect={() => onDocumentSelect(doc.document_id)}
                docTypeEmojiMap={docTypeEmojiMap}
              />
            ))}
        </Stack>
      </ScrollArea>

      {/* Pagination */}
      {totalPages > 1 && (
        <>
          <Divider />
          <Group justify="center" py="sm">
            <Pagination
              total={totalPages}
              value={page}
              onChange={setPage}
              size="sm"
              siblings={1}
              boundaries={1}
            />
          </Group>
        </>
      )}
    </Stack>
  )
}
