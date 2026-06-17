import { Container, Stack, Text, Title } from '@mantine/core'
import { EventList } from '../components/Timeline/EventList'
import { useAgenda } from '../hooks/useAgenda'

export default function AgendaPage() {
  const q = useAgenda()
  return (
    <Container size="md" py="md">
      <Stack gap="md">
        <Title order={3}>Agenda</Title>
        <Text size="sm" c="dimmed">
          Upcoming appointments, deadlines, and recurring obligations.
        </Text>
        <EventList
          events={q.events}
          order="asc"
          showRelative
          isLoading={q.isLoading}
          isError={q.isError}
          onRetry={q.refetch}
          hasMore={q.hasMore}
          onLoadMore={q.fetchNextPage}
          isLoadingMore={q.isFetchingNextPage}
          emptyMessage="Nothing coming up."
        />
      </Stack>
    </Container>
  )
}
