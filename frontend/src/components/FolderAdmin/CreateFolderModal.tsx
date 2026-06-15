import { useMemo, useState } from 'react'
import { Button, Group, Modal, Select, Stack, Textarea, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiClientError, folders } from '../../api/client'
import EmojiField from '../common/EmojiField'
import { folderPathOptions } from '../../lib/tree-utils'

interface CreateFolderModalProps {
  opened: boolean
  onClose: () => void
  /** Preselected parent folder id (null = root). */
  defaultParentId?: string | null
  onCreated?: (folderId: string) => void
}

export default function CreateFolderModal({
  opened,
  onClose,
  defaultParentId = null,
  onCreated,
}: CreateFolderModalProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('')
  const [parentId, setParentId] = useState<string | null>(defaultParentId)
  const [saving, setSaving] = useState(false)

  const { data: allFolders } = useQuery({
    queryKey: ['folders', 'flat'],
    queryFn: () => folders.flat(),
    enabled: opened,
  })

  // Reset fields when the modal transitions to open (render-phase state sync).
  const [wasOpen, setWasOpen] = useState(false)
  if (opened && !wasOpen) {
    setWasOpen(true)
    setName('')
    setDescription('')
    setEmoji('')
    setParentId(defaultParentId)
  } else if (!opened && wasOpen) {
    setWasOpen(false)
  }

  const parentOptions = useMemo(() => folderPathOptions(allFolders ?? []), [allFolders])

  const handleCreate = async () => {
    if (!name.trim()) {
      notifications.show({
        title: 'Validation error',
        message: 'A folder name is required.',
        color: 'orange',
        autoClose: 4000,
      })
      return
    }
    setSaving(true)
    try {
      const created = await folders.create({
        name: name.trim(),
        description: description.trim() || null,
        parent_id: parentId,
        emoji: emoji.trim() || null,
      })
      notifications.show({
        title: 'Folder created',
        message: `"${created.name}" has been created.`,
        color: 'green',
        autoClose: 3000,
      })
      await queryClient.invalidateQueries({ queryKey: ['folders'] })
      onCreated?.(created.folder_id)
      onClose()
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Create failed'
      notifications.show({ title: 'Create failed', message, color: 'red', autoClose: 6000 })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="New folder" size="md">
      <Stack gap="md">
        <TextInput
          label="Name"
          placeholder="Folder name"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          required
          autoFocus
        />
        <Textarea
          label="Description"
          description="Context for users and the LLM."
          placeholder="What belongs in this folder?"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          autosize
          minRows={2}
          maxRows={5}
        />
        <EmojiField
          value={emoji}
          onChange={setEmoji}
          description="Shown next to the folder name in the tree."
          suggest={{ kind: 'folder', name, description }}
        />
        <Select
          label="Parent folder"
          description="Leave empty to create a root folder."
          placeholder="Root (no parent)"
          data={parentOptions}
          value={parentId}
          onChange={setParentId}
          searchable
          clearable
          nothingFoundMessage="No matching folders"
        />
        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleCreate} loading={saving}>
            Create
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
