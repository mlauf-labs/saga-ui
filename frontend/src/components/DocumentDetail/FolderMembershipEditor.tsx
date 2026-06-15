/**
 * FolderMembershipEditor – modal to manage which folders a document belongs to
 * (n:m membership) and which one is the primary folder.
 *
 * Uses PUT /documents/{id}/folders to replace the whole membership set.
 */

import { useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Group,
  Modal,
  MultiSelect,
  Select,
  Stack,
  Text,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { IconAlertCircle } from '@tabler/icons-react'
import { ApiClientError, documents, folders } from '../../api/client'
import type { FolderRef } from '../../types/api'
import { buildFolderPathMap, folderPathOptions } from '../../lib/tree-utils'

interface FolderMembershipEditorProps {
  opened: boolean
  onClose: () => void
  documentId: string
  currentFolders: FolderRef[]
}

export default function FolderMembershipEditor({
  opened,
  onClose,
  documentId,
  currentFolders,
}: FolderMembershipEditorProps) {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<string[]>([])
  const [primary, setPrimary] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const { data: allFolders, isLoading, isError } = useQuery({
    queryKey: ['folders', 'flat'],
    queryFn: () => folders.flat(),
    enabled: opened,
  })

  // Populate fields when the modal transitions to open (render-phase state sync).
  const [wasOpen, setWasOpen] = useState(false)
  if (opened && !wasOpen) {
    setWasOpen(true)
    const ids = currentFolders.map((f) => f.folder_id)
    setSelected(ids)
    setPrimary(currentFolders.find((f) => f.is_primary)?.folder_id ?? ids[0] ?? null)
  } else if (!opened && wasOpen) {
    setWasOpen(false)
  }

  const options = useMemo(() => folderPathOptions(allFolders ?? []), [allFolders])

  const pathMap = useMemo(() => buildFolderPathMap(allFolders ?? []), [allFolders])

  const nameFor = (id: string) => pathMap.get(id) ?? id

  // Derive a valid primary: it must be one of the selected folders.
  const effectivePrimary =
    primary && selected.includes(primary) ? primary : (selected[0] ?? null)

  const handleSave = async () => {
    setSaving(true)
    try {
      await documents.membership.set(documentId, {
        folder_ids: selected,
        primary_id: selected.length > 0 ? effectivePrimary : null,
      })
      notifications.show({
        title: 'Folders updated',
        message: 'The document folder membership has been saved.',
        color: 'green',
        autoClose: 3000,
      })
      await queryClient.invalidateQueries({ queryKey: ['documents', documentId] })
      await queryClient.invalidateQueries({ queryKey: ['documents'] })
      await queryClient.invalidateQueries({ queryKey: ['folders'] })
      onClose()
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Save failed'
      notifications.show({ title: 'Save failed', message, color: 'red', autoClose: 6000 })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Edit folder membership" size="md">
      <Stack gap="md">
        {isError && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
            Failed to load folders.
          </Alert>
        )}

        <MultiSelect
          label="Folders"
          description="Folders this document belongs to."
          placeholder={selected.length === 0 ? 'Select folders…' : undefined}
          data={options}
          value={selected}
          onChange={setSelected}
          searchable
          clearable
          disabled={isLoading}
          nothingFoundMessage="No matching folders"
        />

        <Select
          label="Primary folder"
          description="The canonical folder (drives the backup layout)."
          data={selected.map((id) => ({ value: id, label: nameFor(id) }))}
          value={effectivePrimary}
          onChange={setPrimary}
          disabled={selected.length === 0}
          allowDeselect={false}
        />

        {selected.length === 0 && (
          <Text size="xs" c="dimmed" fs="italic">
            The document will not belong to any folder.
          </Text>
        )}

        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button loading={saving} onClick={handleSave}>
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
