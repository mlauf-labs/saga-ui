/**
 * DocumentDetailPanel – right column (Steps 5, 6 & 8).
 *
 * Displays metadata, status, inline preview, and management actions
 * (download, replace, delete) for the selected document.
 * Polls the document endpoint every 3 seconds while non-terminal.
 */

import { useRef, useState } from 'react'
import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Center,
  Code,
  Divider,
  Group,
  Loader,
  Modal,
  ScrollArea,
  Select,
  Skeleton,
  Stack,
  Table,
  Tabs,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core'
import { useDisclosure, useMediaQuery } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  IconAlertTriangle,
  IconCalendar,
  IconCircleCheck,
  IconClock,
  IconDownload,
  IconEdit,
  IconEye,
  IconFile,
  IconFileText,
  IconFileTypePdf,
  IconFolder,
  IconFolders,
  IconHash,
  IconHistory,
  IconLayoutSidebarRight,
  IconNotes,
  IconPhoto,
  IconRefresh,
  IconRefreshDot,
  IconReplace,
  IconStarFilled,
  IconTag,
  IconTrash,
} from '@tabler/icons-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ApiClientError, docTypes, documents } from '../../api/client'
import EditMetadataModal from './EditMetadataModal'
import FolderMembershipEditor from './FolderMembershipEditor'
import NotesSection from '../common/NotesSection'
import {
  formatBytes,
  formatDateTime,
  getMimeLabel,
  STATUS_COLOR,
  STATUS_LABEL,
} from '../../lib/format'
import type { DocumentResponse, DocumentStatus } from '../../types/api'
import DocumentPreview, { DocumentMarkdownExpandButton } from './DocumentPreview'
import { DocumentTimelineSection } from './DocumentTimelineSection'

// ── Helpers ───────────────────────────────────────────────────────────────────

const TERMINAL_STATUSES: DocumentStatus[] = ['ready', 'failed']

function isTerminal(status: DocumentStatus): boolean {
  return TERMINAL_STATUSES.includes(status)
}

function MimeIcon({ mimeType, size = 20 }: { mimeType: string; size?: number }) {
  const t = mimeType.toLowerCase()
  if (t === 'application/pdf') return <IconFileTypePdf size={size} />
  if (t.startsWith('image/')) return <IconPhoto size={size} />
  if (t.startsWith('text/')) return <IconFileText size={size} />
  return <IconFile size={size} />
}

// ── Status indicator ─────────────────────────────────────────────────────────

/** Processing is considered stuck if it hasn't advanced in more than this many ms. */
const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

function StatusRow({
  status,
  error,
  updatedAt,
}: {
  status: DocumentStatus
  error: string | null
  updatedAt: string
}) {
  const terminal = isTerminal(status)
  const isStuck =
    // eslint-disable-next-line react-hooks/purity -- intentional wall-clock read for a "stuck" UI hint
    !terminal && Date.now() - new Date(updatedAt).getTime() > PROCESSING_TIMEOUT_MS

  return (
    <Stack gap="xs">
      <Group gap="xs" align="center">
        {!terminal && <Loader size={14} color={STATUS_COLOR[status]} />}
        {terminal && status === 'ready' && (
          <ThemeIcon size={18} radius="xl" color="green" variant="light">
            <IconCircleCheck size={12} />
          </ThemeIcon>
        )}
        {terminal && status === 'failed' && (
          <ThemeIcon size={18} radius="xl" color="red" variant="light">
            <IconAlertTriangle size={12} />
          </ThemeIcon>
        )}
        <Badge color={STATUS_COLOR[status]} variant="light" size="sm">
          {STATUS_LABEL[status]}
        </Badge>
        {!terminal && (
          <Text size="xs" c="dimmed">
            Processing…
          </Text>
        )}
      </Group>

      {status === 'failed' && error && (
        <Alert icon={<IconAlertTriangle size={14} />} color="red" variant="light" p="xs">
          <Text size="xs">{error}</Text>
        </Alert>
      )}

      {isStuck && (
        <Alert icon={<IconAlertTriangle size={14} />} color="yellow" variant="light" p="xs">
          <Text size="xs" fw={600}>
            Processing is taking longer than expected.
          </Text>
          <Text size="xs" mt={2}>
            The LLM backend may be overloaded or the model may not support structured output.
            Check the worker logs for details. You can delete and re-upload the document once
            the issue is resolved.
          </Text>
        </Alert>
      )}
    </Stack>
  )
}

// ── Metadata rows ─────────────────────────────────────────────────────────────

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Group gap="xs" wrap="nowrap" align="flex-start">
      <Text size="xs" c="dimmed" w={100} style={{ flexShrink: 0 }}>
        {label}
      </Text>
      <Box flex={1} style={{ minWidth: 0 }}>
        {children}
      </Box>
    </Group>
  )
}

// ── Extracted values table ────────────────────────────────────────────────────

function ExtractedValuesSection({ doc }: { doc: DocumentResponse }) {
  if (!doc.extracted_values || doc.extracted_values.length === 0) return null
  return (
    <Stack gap="xs">
      <Group gap={4}>
        <IconTag size={14} color="var(--mantine-color-dimmed)" />
        <Text size="xs" fw={600} c="dimmed" tt="uppercase">
          Extracted Values
        </Text>
      </Group>
      <ScrollArea type="auto" scrollbars="x" styles={{ root: { width: '100%' } }}>
        <Table
          striped
          withTableBorder
          withColumnBorders
          fz="xs"
          style={{ tableLayout: 'auto', whiteSpace: 'nowrap' }}
          styles={{ td: { padding: '4px 8px' }, th: { padding: '4px 8px' } }}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Key</Table.Th>
              <Table.Th>Value</Table.Th>
              <Table.Th>Type</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {doc.extracted_values.map((ev, i) => (
              <Table.Tr key={i}>
                <Table.Td>
                  <Code fz="xs">{ev.key}</Code>
                </Table.Td>
                <Table.Td>
                  <Text size="xs">{ev.normalized ?? ev.value}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" c="dimmed">
                    {ev.type}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Stack>
  )
}

// ── Folders (membership) ───────────────────────────────────────────────────────

function FoldersSection({ doc, onEdit }: { doc: DocumentResponse; onEdit: () => void }) {
  const primaryPath = doc.primary_folder_path ?? []
  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Group gap={4}>
          <IconFolders size={14} color="var(--mantine-color-dimmed)" />
          <Text size="xs" fw={600} c="dimmed" tt="uppercase">
            Folders
          </Text>
        </Group>
        <Button
          size="compact-xs"
          variant="light"
          leftSection={<IconEdit size={12} />}
          onClick={onEdit}
        >
          Manage
        </Button>
      </Group>

      {primaryPath.length > 0 && (
        <Group gap={2} wrap="wrap">
          {primaryPath.map((segment, idx, arr) => (
            <span key={idx}>
              <Text size="xs" span c={idx === arr.length - 1 ? undefined : 'dimmed'}>
                {segment}
              </Text>
              {idx < arr.length - 1 && (
                <Text size="xs" span c="dimmed">
                  {' / '}
                </Text>
              )}
            </span>
          ))}
        </Group>
      )}

      {doc.folders.length > 0 ? (
        <Group gap={6} wrap="wrap">
          {doc.folders.map((f) => (
            <Badge
              key={f.folder_id}
              size="sm"
              variant={f.is_primary ? 'filled' : 'light'}
              color={f.is_primary ? 'blue' : 'gray'}
              leftSection={
                f.is_primary ? <IconStarFilled size={10} /> : <IconFolder size={10} />
              }
            >
              {f.emoji ? `${f.emoji} ` : ''}{f.name}
            </Badge>
          ))}
        </Group>
      ) : (
        <Text size="xs" c="dimmed" fs="italic">
          Not assigned to any folder.
        </Text>
      )}
    </Stack>
  )
}

// ── Delete confirmation modal ─────────────────────────────────────────────────

interface DeleteModalProps {
  opened: boolean
  onClose: () => void
  doc: DocumentResponse
  onDeleted: () => void
}

function DeleteModal({ opened, onClose, doc, onDeleted }: DeleteModalProps) {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      await documents.delete(doc.document_id)
      notifications.show({
        title: 'Document deleted',
        message: `"${doc.title}" has been removed.`,
        color: 'green',
        autoClose: 4000,
      })
      queryClient.removeQueries({ queryKey: ['documents', doc.document_id] })
      await queryClient.invalidateQueries({ queryKey: ['documents'] })
      await queryClient.invalidateQueries({ queryKey: ['folders'] })
      onDeleted()
      onClose()
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Delete failed'
      notifications.show({ title: 'Delete failed', message, color: 'red', autoClose: 6000 })
      setLoading(false)
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Delete document" size="sm">
      <Stack gap="md">
        <Alert icon={<IconAlertTriangle size={16} />} color="red" variant="light">
          <Text size="sm">
            Are you sure you want to delete{' '}
            <Text span fw={600}>
              "{doc.title}"
            </Text>
            ? This action cannot be undone.
          </Text>
        </Alert>
        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button color="red" loading={loading} onClick={handleDelete} leftSection={<IconTrash size={14} />}>
            Delete
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <Stack gap="md" p="md">
      <Skeleton height={22} w="70%" radius="sm" />
      <Skeleton height={14} w="40%" radius="sm" />
      <Divider />
      <Stack gap="sm">
        {Array.from({ length: 5 }).map((_, i) => (
          <Group key={i} gap="xs">
            <Skeleton height={12} w={90} radius="sm" />
            <Skeleton height={12} w="50%" radius="sm" />
          </Group>
        ))}
      </Stack>
    </Stack>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <Center h="100%">
      <Stack align="center" gap="xs" c="dimmed" p="xl">
        <IconLayoutSidebarRight size={36} />
        <Text size="sm" ta="center">
          Select a document to view its details.
        </Text>
      </Stack>
    </Center>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface DocumentDetailPanelProps {
  documentId: string | null
  onDocumentDeleted?: () => void
}

export default function DocumentDetailPanel({
  documentId,
  onDocumentDeleted,
}: DocumentDetailPanelProps) {
  const isMobile = useMediaQuery('(max-width: 48em)')
  const [mobileTab, setMobileTab] = useState('info')

  const queryClient = useQueryClient()
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false)
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false)
  const [foldersOpened, { open: openFolders, close: closeFolders }] = useDisclosure(false)
  const [replacing, setReplacing] = useState(false)
  const [reanalyzing, setReanalyzing] = useState(false)
  const [docTypeChanging, setDocTypeChanging] = useState(false)
  const replaceInputRef = useRef<HTMLInputElement>(null)

  const {
    data: doc,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['documents', documentId],
    queryFn: () => documents.get(documentId!, false),
    enabled: !!documentId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (!status || isTerminal(status)) return false
      return 3000
    },
  })

  const { data: docTypeList } = useQuery({
    queryKey: ['doc-types'],
    queryFn: () => docTypes.list(),
    staleTime: 60_000,
  })

  const docTypeOptions = (docTypeList ?? []).map((dt) => ({
    value: dt.doc_type_id,
    label: `${dt.emoji ? dt.emoji + ' ' : ''}${dt.name}`,
  }))

  // ── Reanalyze handler ─────────────────────────────────────────────────────

  const handleReanalyze = async () => {
    if (!documentId) return
    setReanalyzing(true)
    try {
      await documents.reanalyze(documentId)
      notifications.show({
        title: 'Re-analysis started',
        message: 'The document is being re-analyzed. The status will update automatically.',
        color: 'blue',
        autoClose: 4000,
      })
      await queryClient.invalidateQueries({ queryKey: ['documents', documentId] })
      await queryClient.invalidateQueries({ queryKey: ['documents'] })
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Re-analysis failed to start'
      notifications.show({ title: 'Re-analysis failed', message, color: 'red', autoClose: 6000 })
    } finally {
      setReanalyzing(false)
    }
  }

  // ── Replace handler ───────────────────────────────────────────────────────

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !documentId) return
    // Reset the input so the same file can be chosen again
    e.target.value = ''
    setReplacing(true)
    try {
      await documents.replace(documentId, file)
      notifications.show({
        title: 'Document replaced',
        message: `"${file.name}" is now processing.`,
        color: 'blue',
        autoClose: 4000,
      })
      await queryClient.invalidateQueries({ queryKey: ['documents', documentId] })
      await queryClient.invalidateQueries({ queryKey: ['documents'] })
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Replace failed'
      notifications.show({ title: 'Replace failed', message, color: 'red', autoClose: 6000 })
    } finally {
      setReplacing(false)
    }
  }

  // ── Doc-type inline change ────────────────────────────────────────────────

  const handleDocTypeChange = async (newDocTypeId: string | null) => {
    if (!doc) return
    setDocTypeChanging(true)
    try {
      await documents.update(doc.document_id, { doc_type_id: newDocTypeId })
      await queryClient.invalidateQueries({ queryKey: ['documents', documentId] })
      await queryClient.invalidateQueries({ queryKey: ['documents'] })
      await queryClient.invalidateQueries({ queryKey: ['doc-types'] })
      await queryClient.invalidateQueries({ queryKey: ['docTypes'] })
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Failed to update document type'
      notifications.show({ title: 'Update failed', message, color: 'red', autoClose: 6000 })
    } finally {
      setDocTypeChanging(false)
    }
  }

  // ── Note handlers ─────────────────────────────────────────────────────────

  const refreshDoc = () =>
    queryClient.invalidateQueries({ queryKey: ['documents', documentId] })

  const handleAddNote = async (content: string) => {
    if (!documentId) return
    await documents.notes.add(documentId, content)
    await refreshDoc()
  }

  const handleUpdateNote = async (noteId: string, content: string) => {
    if (!documentId) return
    await documents.notes.update(documentId, noteId, content)
    await refreshDoc()
  }

  const handleRemoveNote = async (noteId: string) => {
    if (!documentId) return
    await documents.notes.remove(documentId, noteId)
    await refreshDoc()
  }

  // ── Guards ────────────────────────────────────────────────────────────────

  if (!documentId) return <EmptyState />
  if (isLoading) return <DetailSkeleton />

  if (isError) {
    return (
      <Center p="xl">
        <Alert icon={<IconAlertTriangle size={16} />} color="red" variant="light">
          Failed to load document details.{' '}
          <Anchor size="xs" onClick={() => refetch()}>
            Retry
          </Anchor>
        </Alert>
      </Center>
    )
  }

  if (!doc) return null

  return (
    <>
      {/* Hidden file input for replace */}
      <input
        ref={replaceInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleReplaceFile}
        aria-label="Choose replacement file"
      />

      {/* Delete confirmation */}
      <DeleteModal
        opened={deleteOpened}
        onClose={closeDelete}
        doc={doc}
        onDeleted={() => onDocumentDeleted?.()}
      />

      {/* Edit metadata */}
      <EditMetadataModal opened={editOpened} onClose={closeEdit} doc={doc} />

      {/* Edit folder membership */}
      <FolderMembershipEditor
        opened={foldersOpened}
        onClose={closeFolders}
        documentId={doc.document_id}
        currentFolders={doc.folders}
      />

      <Stack gap={0} h="100%">
        {/* ── Header ──────────────────────────────────────────────── */}
        <Box px="md" py="sm">
          <Group gap="sm" wrap="nowrap" align="flex-start">
            <Box c="blue" pt={2} style={{ flexShrink: 0 }}>
              <MimeIcon mimeType={doc.mime_type} />
            </Box>
            <Stack gap={2} flex={1} style={{ minWidth: 0 }}>
              <Tooltip label={doc.title} openDelay={600} disabled={doc.title.length < 30}>
                <Text fw={600} size="sm" lineClamp={2}>
                  {doc.title}
                </Text>
              </Tooltip>
              <Text size="xs" c="dimmed">
                {getMimeLabel(doc.mime_type)} · {formatBytes(doc.size_bytes)}
              </Text>
            </Stack>

            {/* Action buttons */}
            <Group gap={4} style={{ flexShrink: 0 }}>
              {!isTerminal(doc.status) && (
                <Tooltip label="Refresh status">
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    onClick={() => refetch()}
                    aria-label="Refresh status"
                  >
                    <IconRefresh size={14} />
                  </ActionIcon>
                </Tooltip>
              )}

              <Tooltip label="Edit metadata">
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  onClick={openEdit}
                  aria-label="Edit metadata"
                >
                  <IconEdit size={14} />
                </ActionIcon>
              </Tooltip>

              {isTerminal(doc.status) && (
                <Tooltip label="Re-analyze (re-run classification & extraction)">
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    loading={reanalyzing}
                    onClick={handleReanalyze}
                    aria-label="Re-analyze document"
                  >
                    <IconRefreshDot size={14} />
                  </ActionIcon>
                </Tooltip>
              )}

              <Tooltip label="Download">
                <ActionIcon
                  component="a"
                  href={documents.fileUrl(doc.document_id)}
                  download
                  variant="subtle"
                  size="sm"
                  disabled={doc.status !== 'ready'}
                  aria-label="Download original file"
                >
                  <IconDownload size={14} />
                </ActionIcon>
              </Tooltip>

              <Tooltip label="Replace file">
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  loading={replacing}
                  onClick={() => replaceInputRef.current?.click()}
                  aria-label="Replace file"
                >
                  <IconReplace size={14} />
                </ActionIcon>
              </Tooltip>

              <Tooltip label="Delete document">
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  color="red"
                  onClick={openDelete}
                  aria-label="Delete document"
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        </Box>

        <Divider />

        {/* ── Mobile tab bar ───────────────────────────────────────── */}
        {isMobile && (
          <Tabs
            value={mobileTab}
            onChange={(v) => setMobileTab(v ?? 'info')}
            styles={{ root: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' } }}
          >
            <Tabs.List>
              <Tabs.Tab value="info" leftSection={<IconTag size={14} />}>
                Info
              </Tabs.Tab>
              <Tabs.Tab value="notes" leftSection={<IconNotes size={14} />}>
                Notes
              </Tabs.Tab>
              <Tabs.Tab value="preview" leftSection={<IconEye size={14} />}>
                Preview
              </Tabs.Tab>
              <Tabs.Tab value="timeline" leftSection={<IconHistory size={14} />}>
                Timeline
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="info" style={{ flex: 1, overflow: 'auto' }}>
              <Stack gap="lg" p="md">
                <StatusRow status={doc.status} error={doc.error} updatedAt={doc.updated_at} />
                <Divider />
                <Stack gap="sm">
                  <MetaRow label="Document type">
                    <Select
                      size="xs"
                      variant="unstyled"
                      data={docTypeOptions}
                      value={doc.doc_type_id ?? null}
                      onChange={handleDocTypeChange}
                      placeholder="Kein Typ gesetzt"
                      searchable
                      clearable
                      disabled={docTypeChanging}
                      nothingFoundMessage="Keine Dokumenttypen vorhanden"
                      styles={{ input: { color: 'var(--mantine-color-blue-6)', paddingLeft: 0, fontSize: 'var(--mantine-font-size-xs)' } }}
                    />
                  </MetaRow>
                  <MetaRow label="Filename">
                    <Group gap={4} wrap="nowrap" style={{ minWidth: 0 }}>
                      <IconFile size={12} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0 }} />
                      <Tooltip label={doc.filename} openDelay={400} disabled={doc.filename.length < 40}>
                        <Text size="xs" truncate>{doc.filename}</Text>
                      </Tooltip>
                    </Group>
                  </MetaRow>
                  <MetaRow label="MIME type">
                    <Text size="xs" ff="monospace" c="dimmed">{doc.mime_type}</Text>
                  </MetaRow>
                  <MetaRow label="File size">
                    <Text size="xs">{formatBytes(doc.size_bytes)}</Text>
                  </MetaRow>
                  <MetaRow label="Created">
                    <Group gap={4}>
                      <IconCalendar size={12} color="var(--mantine-color-dimmed)" />
                      <Text size="xs">{formatDateTime(doc.created_at)}</Text>
                    </Group>
                  </MetaRow>
                  <MetaRow label="Updated">
                    <Group gap={4}>
                      <IconClock size={12} color="var(--mantine-color-dimmed)" />
                      <Text size="xs">{formatDateTime(doc.updated_at)}</Text>
                    </Group>
                  </MetaRow>
                </Stack>
                {doc.summary && (
                  <>
                    <Divider />
                    <Stack gap="xs">
                      <Text size="xs" fw={600} c="dimmed" tt="uppercase">Summary</Text>
                      <Box fz="xs" style={{ lineHeight: 1.5 }} className="markdown-preview markdown-preview--compact">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.summary}</ReactMarkdown>
                      </Box>
                    </Stack>
                  </>
                )}
                <Divider />
                <FoldersSection doc={doc} onEdit={openFolders} />
                {doc.extracted_values.length > 0 && (
                  <>
                    <Divider />
                    <ExtractedValuesSection doc={doc} />
                  </>
                )}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="notes" style={{ flex: 1, overflow: 'auto' }}>
              <Stack gap="lg" p="md">
                <NotesSection
                  notes={doc.notes ?? []}
                  onAdd={handleAddNote}
                  onUpdate={handleUpdateNote}
                  onRemove={handleRemoveNote}
                />
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="preview" style={{ flex: 1, overflow: 'auto' }}>
              <Stack gap="xs" p="md">
                <Group justify="space-between" align="center">
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase">Preview</Text>
                  <DocumentMarkdownExpandButton doc={doc} />
                </Group>
                <DocumentPreview doc={doc} />
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="timeline" style={{ flex: 1, overflow: 'auto' }}>
              <Stack gap="xs" p="md">
                <DocumentTimelineSection documentId={doc.document_id} />
              </Stack>
            </Tabs.Panel>
          </Tabs>
        )}

        {/* ── Desktop: scrollable body ─────────────────────────────── */}
        {!isMobile && (
          <ScrollArea flex={1} p={0}>
            <Stack gap="lg" p="md">
              {/* Status */}
              <StatusRow status={doc.status} error={doc.error} updatedAt={doc.updated_at} />

              <Divider />

              {/* Core metadata */}
              <Stack gap="sm">
                <MetaRow label="Document type">
                  <Select
                    size="xs"
                    variant="unstyled"
                    data={docTypeOptions}
                    value={doc.doc_type_id ?? null}
                    onChange={handleDocTypeChange}
                    placeholder="Kein Typ gesetzt"
                    searchable
                    clearable
                    disabled={docTypeChanging}
                    nothingFoundMessage="Keine Dokumenttypen vorhanden"
                    styles={{ input: { color: 'var(--mantine-color-blue-6)', paddingLeft: 0, fontSize: 'var(--mantine-font-size-xs)' } }}
                  />
                </MetaRow>
                <MetaRow label="Filename">
                  <Group gap={4} wrap="nowrap" style={{ minWidth: 0 }}>
                    <IconFile size={12} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0 }} />
                    <Tooltip label={doc.filename} openDelay={400} disabled={doc.filename.length < 40}>
                      <Text size="xs" truncate>
                        {doc.filename}
                      </Text>
                    </Tooltip>
                  </Group>
                </MetaRow>
                <MetaRow label="MIME type">
                  <Text size="xs" ff="monospace" c="dimmed">
                    {doc.mime_type}
                  </Text>
                </MetaRow>
                <MetaRow label="File size">
                  <Text size="xs">{formatBytes(doc.size_bytes)}</Text>
                </MetaRow>
                <MetaRow label="ID">
                  <Tooltip label={doc.document_id} openDelay={400}>
                    <Code fz="xs">{doc.document_id.slice(0, 16)}…</Code>
                  </Tooltip>
                </MetaRow>
                {doc.content_hash && (
                  <MetaRow label="SHA-256">
                    <Tooltip label={doc.content_hash} openDelay={400}>
                      <Group gap={4} wrap="nowrap">
                        <IconHash size={11} color="var(--mantine-color-dimmed)" />
                        <Code fz="xs">{doc.content_hash.slice(0, 16)}…</Code>
                      </Group>
                    </Tooltip>
                  </MetaRow>
                )}
                <MetaRow label="Created">
                  <Group gap={4}>
                    <IconCalendar size={12} color="var(--mantine-color-dimmed)" />
                    <Text size="xs">{formatDateTime(doc.created_at)}</Text>
                  </Group>
                </MetaRow>
                <MetaRow label="Updated">
                  <Group gap={4}>
                    <IconClock size={12} color="var(--mantine-color-dimmed)" />
                    <Text size="xs">{formatDateTime(doc.updated_at)}</Text>
                  </Group>
                </MetaRow>
              </Stack>

              {/* Summary */}
              {doc.summary && (
                <>
                  <Divider />
                  <Stack gap="xs">
                    <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                      Summary
                    </Text>
                    <Box fz="xs" style={{ lineHeight: 1.5 }} className="markdown-preview markdown-preview--compact">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.summary}</ReactMarkdown>
                    </Box>
                  </Stack>
                </>
              )}

              {/* Folders (membership) */}
              <Divider />
              <FoldersSection doc={doc} onEdit={openFolders} />

              {/* Extracted values */}
              <Divider />
              {doc.extracted_values.length > 0 ? (
                <ExtractedValuesSection doc={doc} />
              ) : (
                <Stack gap="xs">
                  <Group gap={4}>
                    <IconTag size={14} color="var(--mantine-color-dimmed)" />
                    <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                      Extracted Values
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed" fs="italic">
                    No values extracted
                  </Text>
                </Stack>
              )}

              {/* Notes */}
              <Divider />
              <NotesSection
                notes={doc.notes ?? []}
                onAdd={handleAddNote}
                onUpdate={handleUpdateNote}
                onRemove={handleRemoveNote}
              />

              {/* Timeline */}
              <Divider />
              <Stack gap="xs">
                <Group gap={4}>
                  <IconHistory size={14} color="var(--mantine-color-dimmed)" />
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                    Timeline
                  </Text>
                </Group>
                <DocumentTimelineSection documentId={doc.document_id} />
              </Stack>

              {/* Preview */}
              <Divider />
              <Stack gap="xs">
                <Group justify="space-between" align="center">
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                    Preview
                  </Text>
                  <DocumentMarkdownExpandButton doc={doc} />
                </Group>
                <DocumentPreview doc={doc} />
              </Stack>
            </Stack>
          </ScrollArea>
        )}
      </Stack>
    </>
  )
}
