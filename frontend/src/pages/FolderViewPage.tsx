import { Anchor, Divider, Group, Stack, Text, Title } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { folders } from '../api/client'
import AdminLayout from '../components/Layout/AdminLayout'
import { EventList } from '../components/Timeline/EventList'
import { useTimeline } from '../hooks/useTimeline'

export default function FolderViewPage() {
  const { id = '' } = useParams()

  const folderQ = useQuery({
    queryKey: ['folder', id],
    queryFn: () => folders.get(id),
    enabled: Boolean(id),
  })

  const docsQ = useQuery({
    queryKey: ['folder-documents', id],
    queryFn: () => folders.documents(id, false, 1, 25),
    enabled: Boolean(id),
  })

  const logQ = useTimeline({ folderId: id })

  return (
    <AdminLayout>
      <Stack gap="md">
        <Anchor component={Link} to="/folders" size="sm">
          ‹ Folders
        </Anchor>

        <Group gap="xs">
          {folderQ.data?.emoji ? <Text>{folderQ.data.emoji}</Text> : null}
          <Title order={3}>{folderQ.data?.name ?? '…'}</Title>
        </Group>

        {folderQ.data?.description ? (
          <Text c="dimmed">{folderQ.data.description}</Text>
        ) : null}

        <Divider label="Documents" labelPosition="left" />

        {docsQ.data && docsQ.data.items.length > 0 ? (
          <Stack gap={2}>
            {docsQ.data.items.map((d) => (
              <Text key={d.document_id} size="sm">
                {d.title}
              </Text>
            ))}
          </Stack>
        ) : (
          <Text c="dimmed" size="sm">
            No documents in this folder.
          </Text>
        )}

        <Divider label="Change log" labelPosition="left" />

        <EventList
          events={logQ.events}
          documents={logQ.documents}
          isLoading={logQ.isLoading}
          isError={logQ.isError}
          onRetry={logQ.refetch}
          hasMore={logQ.hasMore}
          onLoadMore={logQ.fetchNextPage}
          isLoadingMore={logQ.isFetchingNextPage}
          emptyMessage="No changes recorded for this folder."
          errorTitle="Failed to load the folder change log"
        />
      </Stack>
    </AdminLayout>
  )
}
