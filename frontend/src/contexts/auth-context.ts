import { createContext } from 'react'
import type { UserInfo } from '../types/api'

export interface AuthState {
  user: UserInfo | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)
