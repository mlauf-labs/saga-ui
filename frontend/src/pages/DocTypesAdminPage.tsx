import { useState } from 'react'
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useQuery } from '@tanstack/react-query'
import { IconAlertCircle, IconEdit, IconPlus, IconTag, IconTrash } from '@tabler/icons-react'
import AdminLayout from '../components/Layout/AdminLayout'
import DocTypeFormModal from '../components/DocTypeAdmin/DocTypeFormModal'
import DeleteDocTypeDialog from '../components/DocTypeAdmin/DeleteDocTypeDialog'
import { docTypes } from '../api/client'
import type { DocType } from '../types/api'

export default function DocTypesAdminPage() {
  const [formOpened, { open: openForm, close: closeForm }] = useDisclosure(false)
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false)
  const [editing, setEditing] = useState<DocType | null>(null)
  const [deleting, setDeleting] = useState<DocType | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['docTypes'],
    queryFn: () => docTypes.list(),
  })

  const handleCreate = () => {
    setEditing(null)
    openForm()
  }

  const handleEdit = (dt: DocType) => {
    setEditing(dt)
    openForm()
  }

  const handleDelete = (dt: DocType) => {
    setDeleting(dt)
    openDelete()
  }

  return (
    <AdminLayout>
      <DocTypeFormModal opened={formOpened} onClose={closeForm} docType={editing} />
      {deleting && (
        <DeleteDocTypeDialog opened={deleteOpened} onClose={closeDelete} docType={deleting} />
      )}

      <Stack gap="lg">
        <Group justify="space-between">
          <Group gap="xs">
            <IconTag size={22} />
            <Title order={3}>Document Types</Title>
          </Group>
          <Button leftSection={<IconPlus size={16} />} onClick={handleCreate}>
            New doc-type
          </Button>
        </Group>

        {isError && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
            Failed to load doc-types.
          </Alert>
        )}

        {isLoading && (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={120} radius="md" />
            ))}
          </SimpleGrid>
        )}

        {!isLoading && !isError && data && data.length === 0 && (
          <Center h="50vh">
            <Stack align="center" gap="sm" c="dimmed">
              <IconTag size={40} />
              <Text size="sm">No document types yet.</Text>
              <Button variant="light" leftSection={<IconPlus size={16} />} onClick={handleCreate}>
                Create the first one
              </Button>
            </Stack>
          </Center>
        )}

        {!isLoading && data && data.length > 0 && (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            {data.map((dt) => (
              <Card key={dt.doc_type_id} withBorder padding="md" radius="md">
                <Stack gap="xs" h="100%">
                  <Group justify="space-between" wrap="nowrap">
                    <Text fw={600} truncate>
                      {dt.emoji ? `${dt.emoji} ` : ''}{dt.name}
                    </Text>
                    <Group gap={2} style={{ flexShrink: 0 }}>
                      <Tooltip label="Edit">
                        <ActionIcon variant="subtle" onClick={() => handleEdit(dt)} aria-label="Edit doc-type">
                          <IconEdit size={15} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Delete">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => handleDelete(dt)}
                          aria-label="Delete doc-type"
                        >
                          <IconTrash size={15} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>

                  <Text size="xs" c="dimmed" lineClamp={3} flex={1}>
                    {dt.description || 'No description.'}
                  </Text>

                  <Badge size="sm" variant="light" color="gray">
                    {dt.document_count} {dt.document_count === 1 ? 'document' : 'documents'}
                  </Badge>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </AdminLayout>
  )
}
