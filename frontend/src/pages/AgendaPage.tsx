import { useState } from 'react'
import { Group, Stack, Text, Title } from '@mantine/core'
import AdminLayout from '../components/Layout/AdminLayout'
import { DateRangeFilter } from '../components/Timeline/DateRangeFilter'
import { rangeToBounds, type DateRange } from '../lib/date-range'
import { EventList } from '../components/Timeline/EventList'
import { useAgenda } from '../hooks/useAgenda'

export default function AgendaPage() {
  const [range, setRange] = useState<DateRange>([null, null])
  const q = useAgenda(rangeToBounds(range))
  return (
    <AdminLayout>
      <Stack gap="md">
        <Title order={3}>Agenda</Title>
        <Text size="sm" c="dimmed">
          Upcoming appointments, deadlines, and recurring obligations.
        </Text>
        <Group>
          <DateRangeFilter value={range} onChange={setRange} label="Limit to a date range" />
        </Group>
        <EventList
          events={q.events}
          documents={q.documents}
          order="asc"
          showRelative
          isLoading={q.isLoading}
          isError={q.isError}
          onRetry={q.refetch}
          hasMore={q.hasMore}
          onLoadMore={q.fetchNextPage}
          isLoadingMore={q.isFetchingNextPage}
          emptyMessage="Nothing coming up."
          errorTitle="Failed to load agenda"
        />
      </Stack>
    </AdminLayout>
  )
}
