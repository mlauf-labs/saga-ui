import { useCallback, useEffect, useRef, useState } from 'react'
import { notifications } from '@mantine/notifications'
import { auth } from '../api/client'
import { AuthContext } from './auth-context'
import { onUnauthorized } from '../lib/auth-events'
import type { UserInfo } from '../types/api'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  // Prevent duplicate session-expired toasts
  const expiredNotified = useRef(false)

  // Initial session check
  useEffect(() => {
    auth
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  // Global 401 listener: clear session and notify the user
  useEffect(() => {
    const unsubscribe = onUnauthorized(() => {
      setUser((prev) => {
        if (prev !== null && !expiredNotified.current) {
          expiredNotified.current = true
          notifications.show({
            id: 'session-expired',
            title: 'Session expired',
            message: 'Please sign in again.',
            color: 'orange',
            autoClose: 6000,
          })
        }
        return null
      })
    })
    return unsubscribe
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const info = await auth.login(username, password)
    expiredNotified.current = false
    setUser(info)
  }, [])

  const logout = useCallback(async () => {
    try {
      await auth.logout()
    } catch {
      // Clear local state regardless of server errors
    }
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
