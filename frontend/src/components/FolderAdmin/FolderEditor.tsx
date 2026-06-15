import { useMemo, useState } from 'react'
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  LoadingOverlay,
  ScrollArea,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { IconAlertCircle, IconFolderPlus, IconTrash } from '@tabler/icons-react'
import { ApiClientError, folders } from '../../api/client'
import EmojiField from '../common/EmojiField'
import MetadataEditor from '../common/MetadataEditor'
import { fromMetadataRows, toMetadataRows, type MetadataRow } from '../../lib/metadata'
import NotesSection from '../common/NotesSection'
import DeleteFolderDialog from './DeleteFolderDialog'
import { formatDateTime } from '../../lib/format'
import { folderPathOptions } from '../../lib/tree-utils'

interface FolderEditorProps {
  folderId: string
  onDeleted: () => void
  onCreateChild: (parentId: string) => void
}

export default function FolderEditor({ folderId, onDeleted, onCreateChild }: FolderEditorProps) {
  const queryClient = useQueryClient()
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false)
  const [saving, setSaving] = useState(false)

  const { data: folder, isLoading, isError } = useQuery({
    queryKey: ['folders', folderId, 'detail'],
    queryFn: () => folders.get(folderId),
  })

  const { data: allFolders } = useQuery({
    queryKey: ['folders', 'flat'],
    queryFn: () => folders.flat(),
  })

  const { data: docList } = useQuery({
    queryKey: ['folders', folderId, 'documents', 1],
    queryFn: () => folders.documents(folderId, false, 1, 10),
  })

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('')
  const [parentId, setParentId] = useState<string | null>(null)
  const [metaRows, setMetaRows] = useState<MetadataRow[]>([])

  // Populate the form when the loaded folder changes (render-phase state sync).
  const [loadedId, setLoadedId] = useState<string | null>(null)
  if (folder && folder.folder_id !== loadedId) {
    setLoadedId(folder.folder_id)
    setName(folder.name)
    setDescription(folder.description ?? '')
    setEmoji(folder.emoji ?? '')
    setParentId(folder.parent_id)
    setMetaRows(toMetadataRows(folder.metadata))
  }

  const parentOptions = useMemo(
    () => folderPathOptions(allFolders ?? [], folderId),
    [allFolders, folderId],
  )

  const handleSave = async () => {
    if (!name.trim()) {
      notifications.show({
        title: 'Validation error',
        message: 'The folder name cannot be empty.',
        color: 'orange',
        autoClose: 4000,
      })
      return
    }
    setSaving(true)
    try {
      await folders.update(folderId, {
        name: name.trim(),
        description: description.trim() || null,
        parent_id: parentId,
        metadata: fromMetadataRows(metaRows),
        // Empty string clears the emoji on the server; null would leave it unchanged.
        emoji: emoji.trim(),
      })
      notifications.show({
        title: 'Folder saved',
        message: 'The folder has been updated.',
        color: 'green',
        autoClose: 3000,
      })
      await queryClient.invalidateQueries({ queryKey: ['folders'] })
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Save failed'
      notifications.show({ title: 'Save failed', message, color: 'red', autoClose: 6000 })
    } finally {
      setSaving(false)
    }
  }

  const refreshFolder = () =>
    queryClient.invalidateQueries({ queryKey: ['folders', folderId, 'detail'] })

  if (isError) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" m="md">
        Failed to load folder.
      </Alert>
    )
  }

  return (
    <Box pos="relative">
      <LoadingOverlay visible={isLoading} />

      {folder && (
        <DeleteFolderDialog
          opened={deleteOpened}
          onClose={closeDelete}
          folder={folder}
          onDeleted={onDeleted}
        />
      )}

      <ScrollArea.Autosize mah="calc(100vh - 120px)">
        <Stack gap="md" maw={680}>
          <Group justify="space-between">
            <Text fw={600}>Edit folder</Text>
            <Group gap="xs">
              <Button
                size="xs"
                variant="light"
                leftSection={<IconFolderPlus size={14} />}
                onClick={() => onCreateChild(folderId)}
              >
                New subfolder
              </Button>
              <Tooltip label="Delete folder">
                <ActionIcon color="red" variant="light" onClick={openDelete} aria-label="Delete folder">
                  <IconTrash size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>

          <TextInput
            label="Name"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            required
          />

          <Textarea
            label="Description"
            description="Context for users and the LLM (used during automatic folder placement)."
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            autosize
            minRows={2}
            maxRows={6}
          />

          <EmojiField
            value={emoji}
            onChange={setEmoji}
            description="Shown next to the folder name in the tree."
            suggest={{ kind: 'folder', name, description }}
          />

          <Select
            label="Parent folder"
            description="Move this folder under a different parent (empty = root)."
            placeholder="Root (no parent)"
            data={parentOptions}
            value={parentId}
            onChange={setParentId}
            searchable
            clearable
            nothingFoundMessage="No matching folders"
          />

          <Divider />

          <MetadataEditor rows={metaRows} onChange={setMetaRows} />

          <Group justify="flex-end">
            <Button onClick={handleSave} loading={saving}>
              Save changes
            </Button>
          </Group>

          {folder && (
            <Group gap="lg">
              <Text size="xs" c="dimmed">
                Created: {formatDateTime(folder.created_at)}
              </Text>
              <Text size="xs" c="dimmed">
                Updated: {formatDateTime(folder.updated_at)}
              </Text>
            </Group>
          )}

          <Divider />

          {folder && (
            <NotesSection
              notes={folder.notes ?? []}
              onAdd={async (content) => {
                await folders.notes.add(folderId, content)
                await refreshFolder()
              }}
              onUpdate={async (noteId, content) => {
                await folders.notes.update(folderId, noteId, content)
                await refreshFolder()
              }}
              onRemove={async (noteId) => {
                await folders.notes.remove(folderId, noteId)
                await refreshFolder()
              }}
            />
          )}

          <Divider />

          <Stack gap="xs">
            <Group gap={6}>
              <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                Documents in this folder
              </Text>
              {docList && (
                <Badge size="xs" variant="light" color="gray">
                  {docList.total}
                </Badge>
              )}
            </Group>
            {docList && docList.items.length === 0 && (
              <Text size="xs" c="dimmed" fs="italic">
                No documents directly in this folder.
              </Text>
            )}
            <Stack gap={2}>
              {docList?.items.map((d) => (
                <Text key={d.document_id} size="xs" truncate>
                  {d.title}
                </Text>
              ))}
            </Stack>
            {docList && docList.total > docList.items.length && (
              <Text size="xs" c="dimmed">
                + {docList.total - docList.items.length} more…
              </Text>
            )}
          </Stack>
        </Stack>
      </ScrollArea.Autosize>
    </Box>
  )
}
