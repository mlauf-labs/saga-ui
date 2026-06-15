import { Center, Loader, Stack, Text } from '@mantine/core'

interface LoadingScreenProps {
  message?: string
}

export default function LoadingScreen({ message = 'Loading…' }: LoadingScreenProps) {
  return (
    <Center h="100vh">
      <Stack align="center" gap="md">
        <Loader size="lg" />
        <Text size="sm" c="dimmed">
          {message}
        </Text>
      </Stack>
    </Center>
  )
}
