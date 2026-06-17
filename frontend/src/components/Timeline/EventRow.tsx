import { Anchor, Badge, Group, Stack, Text } from '@mantine/core'
import { Link } from 'react-router-dom'
import { formatRelative } from '../../lib/format'
import type { SagaEvent } from '../../types/api'

const CATEGORY_COLOR: Record<SagaEvent['category'], string> = {
  audit: 'blue',
  content: 'teal',
}

interface EventRowProps {
  event: SagaEvent
  /** Show a relative time ("in 12 days") instead of the absolute timestamp's time. */
  showRelative?: boolean
}

export function EventRow({ event, showRelative = false }: EventRowProps) {
  const when = event.occurred_at ?? event.recorded_at
  return (
    <Group align="flex-start" gap="sm" wrap="nowrap" py={4}>
      <Badge color={CATEGORY_COLOR[event.category]} variant="light" size="sm">
        {event.category}
      </Badge>
      <Stack gap={0} style={{ flex: 1 }}>
        <Text size="sm">{event.summary}</Text>
        <Text size="xs" c="dimmed">
          {event.event_type} · {event.actor}
          {showRelative ? ` · ${formatRelative(when)}` : ''}
          {event.document_id ? (
            <>
              {' · '}
              <Anchor component={Link} to={`/?doc=${event.document_id}`} size="xs">
                document
              </Anchor>
            </>
          ) : null}
        </Text>
      </Stack>
    </Group>
  )
}
