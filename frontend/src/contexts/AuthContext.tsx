import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { apiClient } from '../api/client'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  hasRole: (roles: string[]) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('aicte_token')
  )
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // On mount, if a token exists, fetch the current user
  useEffect(() => {
    const storedToken = localStorage.getItem('aicte_token')
    if (!storedToken) {
      setIsLoading(false)
      return
    }

    apiClient
      .get<User>('/auth/me')
      .then((res) => {
        setUser(res.data)
        setToken(storedToken)
      })
      .catch(() => {
        // Token invalid or expired — clear it
        localStorage.removeItem('aicte_token')
        setToken(null)
        setUser(null)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const formData = new FormData()
    formData.append('username', email)
    formData.append('password', password)

    const res = await apiClient.post<{ access_token: string; token_type: string }>(
      '/auth/login',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )

    const accessToken = res.data.access_token
    localStorage.setItem('aicte_token', accessToken)
    setToken(accessToken)

    // Fetch user profile immediately after login
    const meRes = await apiClient.get<User>('/auth/me')
    setUser(meRes.data)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('aicte_token')
    setToken(null)
    setUser(null)
    window.location.href = '/login'
  }, [])

  const hasRole = useCallback(
    (roles: string[]) => {
      if (!user) return false
      return roles.includes(user.role)
    },
    [user]
  )

  const value: AuthContextValue = {
    user,
    token,
    isLoading,
    isAuthenticated: user !== null,
    login,
    logout,
    hasRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return ctx
}
