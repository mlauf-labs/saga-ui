import { Alert, Button, Center, Skeleton, Stack, Text } from '@mantine/core'
import { formatDate } from '../../lib/format'
import type { SagaEvent } from '../../types/api'
import { EventRow } from './EventRow'

interface EventListProps {
  events: SagaEvent[]
  order?: 'asc' | 'desc'
  showRelative?: boolean
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  hasMore?: boolean
  onLoadMore?: () => void
  isLoadingMore?: boolean
  emptyMessage?: string
  /** Surface-specific error heading (this component renders timelines and the agenda). */
  errorTitle?: string
  /** Map of document id → title, forwarded to each row to label the document link. */
  documents?: Record<string, string>
}

function groupKey(e: SagaEvent): string {
  return (e.occurred_at ?? e.recorded_at).slice(0, 10) // YYYY-MM-DD
}

function sortedGroups(events: SagaEvent[], order: 'asc' | 'desc'): [string, SagaEvent[]][] {
  const groups = new Map<string, SagaEvent[]>()
  for (const e of events) {
    const k = groupKey(e)
    const list = groups.get(k) ?? []
    list.push(e)
    groups.set(k, list)
  }
  const keys = [...groups.keys()].sort()
  if (order === 'desc') keys.reverse()
  return keys.map((k) => [k, groups.get(k) as SagaEvent[]])
}

export function EventList({
  events,
  order = 'desc',
  showRelative = false,
  isLoading = false,
  isError = false,
  onRetry,
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
  emptyMessage = 'No events yet.',
  errorTitle = 'Failed to load timeline',
  documents,
}: EventListProps) {
  if (isLoading) {
    return (
      <Stack gap="xs">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={32} radius="sm" />
        ))}
      </Stack>
    )
  }
  if (isError) {
    return (
      <Alert color="red" title={errorTitle}>
        <Button variant="light" size="xs" mt="xs" onClick={onRetry}>
          Retry
        </Button>
      </Alert>
    )
  }
  if (events.length === 0) {
    return (
      <Center py="lg">
        <Text c="dimmed" size="sm">
          {emptyMessage}
        </Text>
      </Center>
    )
  }
  return (
    <Stack gap="md">
      {sortedGroups(events, order).map(([day, items]) => (
        <Stack key={day} gap={4}>
          <Text data-testid="date-header" size="sm" fw={600} c="dimmed">
            {formatDate(items[0].occurred_at ?? items[0].recorded_at)}
          </Text>
          {items.map((e) => (
            <EventRow
              key={e.event_id}
              event={e}
              showRelative={showRelative}
              documents={documents}
            />
          ))}
        </Stack>
      ))}
      {hasMore ? (
        <Center>
          <Button variant="subtle" size="sm" loading={isLoadingMore} onClick={onLoadMore}>
            Load more
          </Button>
        </Center>
      ) : null}
    </Stack>
  )
}
