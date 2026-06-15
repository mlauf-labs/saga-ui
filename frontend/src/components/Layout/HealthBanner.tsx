/**
 * HealthBanner – shows a sticky warning strip when the Saga backend is
 * unreachable (UI-FR-33). Hidden when everything is healthy.
 */
import { useState } from 'react'
import { Alert, CloseButton, Group, Text } from '@mantine/core'
import { IconWifiOff } from '@tabler/icons-react'
import { useHealthCheck } from '../../hooks/useHealthCheck'

export default function HealthBanner() {
  const { data, isError } = useHealthCheck()
  const [dismissed, setDismissed] = useState(false)

  const sagaDown = isError || data?.saga_reachable === false
  const storeName = data?.store_name ?? 'Saga'

  if (!sagaDown || dismissed) return null

  return (
    <Alert
      icon={<IconWifiOff size={16} />}
      color="orange"
      variant="filled"
      radius={0}
      p="xs"
      role="status"
      aria-live="polite"
    >
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Text size="xs" fw={500}>
          {storeName} is unreachable. The document list and preview may be unavailable
          until the connection is restored.
        </Text>
        <CloseButton
          size="xs"
          variant="transparent"
          c="white"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss warning"
        />
      </Group>
    </Alert>
  )
}
