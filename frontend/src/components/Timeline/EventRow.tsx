import { Anchor, Badge, Group, Stack, Text } from '@mantine/core'
import { Link } from 'react-router-dom'
import { formatRelative } from '../../lib/format'
import { describeRecurrence } from '../../lib/recurrence'
import type { SagaEvent } from '../../types/api'

const CATEGORY_COLOR: Record<SagaEvent['category'], string> = {
  audit: 'blue',
  content: 'teal',
}

/** The recurrence cadence for a recurring event, e.g. "Every month · until 01/06/2090". */
function recurrence(event: SagaEvent): string | null {
  const rule = event.details.recurrence
  if (event.event_type !== 'recurring' && typeof rule !== 'string') return null
  const end = typeof event.details.end_date === 'string' ? event.details.end_date : undefined
  return describeRecurrence(typeof rule === 'string' ? rule : undefined, end)
}

interface EventRowProps {
  event: SagaEvent
  /** Show a relative time ("in 12 days") instead of the absolute timestamp's time. */
  showRelative?: boolean
  /** Map of document id → title, used to label the document link. */
  documents?: Record<string, string>
}

/** The optional human-readable rationale an audit event may carry in `details.reason`. */
function rationale(details: SagaEvent['details']): string | null {
  const reason = details.reason
  return typeof reason === 'string' && reason.trim() ? reason : null
}

export function EventRow({ event, showRelative = false, documents }: EventRowProps) {
  const when = event.occurred_at ?? event.recorded_at
  const why = rationale(event.details)
  const cadence = recurrence(event)
  // Prefer the resolved document title; fall back to a generic "document" label.
  const title = event.document_id ? documents?.[event.document_id] : undefined
  // Prefer the document link; fall back to the folder (e.g. folder_created or a placement
  // event with no document) so each event points at the surface that explains it.
  const target = event.document_id
    ? { to: `/?doc=${event.document_id}`, label: title ?? 'document' }
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
        {cadence ? (
          <Text size="xs" c="teal.7" fw={500}>
            🔁 {cadence}
          </Text>
        ) : null}
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
              <Anchor
                component={Link}
                to={target.to}
                size="xs"
                style={{ display: 'inline-block', maxWidth: 320, verticalAlign: 'bottom' }}
                truncate="end"
              >
                {target.label}
              </Anchor>
            </>
          ) : null}
        </Text>
      </Stack>
    </Group>
  )
}
