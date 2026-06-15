import { useState } from 'react'
import { Alert, Button, Group, List, Modal, Stack, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { IconAlertTriangle } from '@tabler/icons-react'
import { ApiClientError, docTypes } from '../../api/client'
import type { DocType } from '../../types/api'

interface DeleteDocTypeDialogProps {
  opened: boolean
  onClose: () => void
  docType: DocType
}

export default function DeleteDocTypeDialog({ opened, onClose, docType }: DeleteDocTypeDialogProps) {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const inUse = docType.document_count > 0

  // When the doc-type is in use, show the affected documents to support reassignment.
  const { data: docList } = useQuery({
    queryKey: ['docTypes', docType.doc_type_id, 'documents'],
    queryFn: () => docTypes.documents(docType.doc_type_id, 1, 10),
    enabled: opened && inUse,
  })

  const handleDelete = async () => {
    setLoading(true)
    try {
      await docTypes.remove(docType.doc_type_id)
      notifications.show({
        title: 'Doc-type deleted',
        message: `"${docType.name}" has been removed.`,
        color: 'green',
        autoClose: 4000,
      })
      await queryClient.invalidateQueries({ queryKey: ['docTypes'] })
      onClose()
    } catch (err) {
      let message = 'Delete failed'
      if (err instanceof ApiClientError) {
        message =
          err.status === 409
            ? 'This doc-type is still assigned to documents. Reassign them first.'
            : err.message
      }
      notifications.show({ title: 'Delete failed', message, color: 'red', autoClose: 6000 })
      setLoading(false)
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Delete doc-type" size="md">
      <Stack gap="md">
        {inUse ? (
          <Alert icon={<IconAlertTriangle size={16} />} color="orange" variant="light">
            <Text size="sm">
              <Text span fw={600}>
                "{docType.name}"
              </Text>{' '}
              is still assigned to {docType.document_count}{' '}
              {docType.document_count === 1 ? 'document' : 'documents'}. Reassign them to another
              type before deleting (deletion is only allowed when the type is unused).
            </Text>
          </Alert>
        ) : (
          <Alert icon={<IconAlertTriangle size={16} />} color="red" variant="light">
            <Text size="sm">
              Delete{' '}
              <Text span fw={600}>
                "{docType.name}"
              </Text>
              ? This action cannot be undone.
            </Text>
          </Alert>
        )}

        {inUse && docList && docList.items.length > 0 && (
          <Stack gap={4}>
            <Text size="xs" fw={600} c="dimmed" tt="uppercase">
              Affected documents
            </Text>
            <List size="xs" spacing={2}>
              {docList.items.map((d) => (
                <List.Item key={d.document_id}>{d.title}</List.Item>
              ))}
            </List>
            {docList.total > docList.items.length && (
              <Text size="xs" c="dimmed">
                + {docList.total - docList.items.length} more…
              </Text>
            )}
          </Stack>
        )}

        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button color="red" loading={loading} onClick={handleDelete} disabled={inUse}>
            Delete
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
