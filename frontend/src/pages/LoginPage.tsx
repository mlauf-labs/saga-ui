import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Anchor,
  Box,
  Button,
  Center,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconAlertCircle, IconDatabase, IconLock } from '@tabler/icons-react'
import { useAuth } from '../contexts/useAuth'
import { ApiClientError } from '../api/client'
import { useHealthCheck } from '../hooks/useHealthCheck'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { data: healthData } = useHealthCheck()
  const storeName = healthData?.store_name ?? 'Saga'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(username, password)
      notifications.show({
        title: 'Welcome!',
        message: `Signed in as ${username}`,
        color: 'green',
        autoClose: 3000,
      })
      navigate('/', { replace: true })
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 429) {
        setError('Too many login attempts. Please wait a moment.')
      } else {
        setError('Invalid username or password.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Center h="100vh" bg="var(--mantine-color-gray-0)">
      <Box w={380}>
        <Stack gap="lg" align="center" mb="xl">
          <IconDatabase size={48} color="var(--mantine-color-blue-6)" />
          <Box ta="center">
            <Title order={2}>{storeName}</Title>
            <Text c="dimmed" size="sm" mt={4}>
              Sign in to continue
            </Text>
          </Box>
        </Stack>

        <Paper shadow="md" p="xl" radius="md" withBorder>
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              {error && (
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  color="red"
                  variant="light"
                  role="alert"
                >
                  {error}
                </Alert>
              )}

              <TextInput
                label="Username"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.currentTarget.value)}
                required
                autoComplete="username"
                autoFocus
                aria-label="Username"
              />

              <PasswordInput
                label="Password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
                autoComplete="current-password"
                leftSection={<IconLock size={16} />}
                aria-label="Password"
              />

              <Button type="submit" fullWidth loading={loading} mt="sm">
                Sign In
              </Button>
            </Stack>
          </form>
        </Paper>

        <Text ta="center" size="xs" c="dimmed" mt="lg">
          <Anchor
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            size="xs"
          >
            {storeName} UI
          </Anchor>{' '}
          · Open Source
        </Text>
      </Box>
    </Center>
  )
}
