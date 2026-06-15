/**
 * ErrorBoundary – catches unhandled React render errors and shows a
 * graceful fallback instead of a blank screen.
 */

import { Component } from 'react'
import { Alert, Button, Center, Stack, Text, Title } from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'

interface Props {
  children: React.ReactNode
  /** Optional custom fallback; receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console; replace with a real error tracker in production
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state

    if (!error) return this.props.children

    if (this.props.fallback) return this.props.fallback(error, this.reset)

    return (
      <Center h="100vh">
        <Stack align="center" gap="md" maw={480} px="xl">
          <Alert
            icon={<IconAlertTriangle size={20} />}
            color="red"
            variant="light"
            w="100%"
          >
            <Title order={4} mb={4}>
              Something went wrong
            </Title>
            <Text size="sm" c="dimmed" mb="sm">
              {error.message}
            </Text>
            <Button size="xs" variant="light" color="red" onClick={this.reset}>
              Try again
            </Button>
          </Alert>
        </Stack>
      </Center>
    )
  }
}
