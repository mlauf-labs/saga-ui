import { useState } from 'react'
import { Alert, Button, Group, Modal, Radio, Stack, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useQueryClient } from '@tanstack/react-query'
import { IconAlertTriangle } from '@tabler/icons-react'
import { ApiClientError, folders } from '../../api/client'
import type { DeleteFolderStrategy, Folder } from '../../types/api'

interface DeleteFolderDialogProps {
  opened: boolean
  onClose: () => void
  folder: Folder
  onDeleted: () => void
}

const STRATEGY_OPTIONS: { value: DeleteFolderStrategy; label: string; hint: string }[] = [
  { value: 'reject', label: 'Reject if it has children', hint: 'Safest. Fails when the folder is not empty.' },
  { value: 'reparent', label: 'Reparent children', hint: 'Move child folders up to this folder\u2019s parent.' },
  { value: 'cascade', label: 'Cascade delete', hint: 'Delete this folder and its entire subtree.' },
]

export default function DeleteFolderDialog({
  opened,
  onClose,
  folder,
  onDeleted,
}: DeleteFolderDialogProps) {
  const queryClient = useQueryClient()
  const [strategy, setStrategy] = useState<DeleteFolderStrategy>('reject')
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      await folders.remove(folder.folder_id, strategy)
      notifications.show({
        title: 'Folder deleted',
        message: `"${folder.name}" has been removed.`,
        color: 'green',
        autoClose: 4000,
      })
      await queryClient.invalidateQueries({ queryKey: ['folders'] })
      await queryClient.invalidateQueries({ queryKey: ['documents'] })
      onDeleted()
      onClose()
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Delete failed'
      notifications.show({ title: 'Delete failed', message, color: 'red', autoClose: 6000 })
      setLoading(false)
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Delete folder" size="md">
      <Stack gap="md">
        <Alert icon={<IconAlertTriangle size={16} />} color="red" variant="light">
          <Text size="sm">
            Delete{' '}
            <Text span fw={600}>
              "{folder.name}"
            </Text>
            ? Choose what should happen to its child folders.
          </Text>
        </Alert>

        <Radio.Group value={strategy} onChange={(v) => setStrategy(v as DeleteFolderStrategy)}>
          <Stack gap="sm">
            {STRATEGY_OPTIONS.map((opt) => (
              <Radio
                key={opt.value}
                value={opt.value}
                label={opt.label}
                description={opt.hint}
              />
            ))}
          </Stack>
        </Radio.Group>

        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button color="red" loading={loading} onClick={handleDelete}>
            Delete
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
