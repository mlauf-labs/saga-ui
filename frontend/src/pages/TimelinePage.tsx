import { useState } from 'react'
import { Container, Stack, Title } from '@mantine/core'
import { CategoryFilter, type CategorySelection } from '../components/Timeline/CategoryFilter'
import { EventList } from '../components/Timeline/EventList'
import { useTimeline } from '../hooks/useTimeline'

export default function TimelinePage() {
  const [category, setCategory] = useState<CategorySelection>('all')
  const q = useTimeline(category === 'all' ? {} : { category })
  return (
    <Container size="md" py="md">
      <Stack gap="md">
        <Title order={3}>Timeline</Title>
        <CategoryFilter value={category} onChange={setCategory} />
        <EventList
          events={q.events}
          isLoading={q.isLoading}
          isError={q.isError}
          onRetry={q.refetch}
          hasMore={q.hasMore}
          onLoadMore={q.fetchNextPage}
          isLoadingMore={q.isFetchingNextPage}
        />
      </Stack>
    </Container>
  )
}
