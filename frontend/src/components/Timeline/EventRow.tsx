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

/** The optional human-readable rationale an audit event may carry in `details.reason`. */
function rationale(details: SagaEvent['details']): string | null {
  const reason = details.reason
  return typeof reason === 'string' && reason.trim() ? reason : null
}

export function EventRow({ event, showRelative = false }: EventRowProps) {
  const when = event.occurred_at ?? event.recorded_at
  const why = rationale(event.details)
  // Prefer the document link; fall back to the folder (e.g. folder_created or a placement
  // event with no document) so each event points at the surface that explains it.
  const target = event.document_id
    ? { to: `/?doc=${event.document_id}`, label: 'document' }
    : event.folder_id
      ? { to: `/folders/${event.folder_id}`, label: 'folder' }
      : null
  return (
    <Group align="flex-start" gap="sm" wrap="nowrap" py={4}>
      <Badge color={CATEGORY_COLOR[event.category]} variant="light" size="sm">
        {event.category}
      </Badge>
      <Stack gap={0} style={{ flex: 1 }}>
        <Text size="sm">{event.summary}</Text>
        {why ? (
          <Text size="xs" c="dimmed" fs="italic">
            {why}
          </Text>
        ) : null}
        <Text size="xs" c="dimmed">
          {event.event_type} · {event.actor}
          {showRelative ? ` · ${formatRelative(when)}` : ''}
          {target ? (
            <>
              {' · '}
              <Anchor component={Link} to={target.to} size="xs">
                {target.label}
              </Anchor>
            </>
          ) : null}
        </Text>
      </Stack>
    </Group>
  )
}
