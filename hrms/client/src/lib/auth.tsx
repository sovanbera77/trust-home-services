import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from './api'

interface User {
  id: number
  email: string
  role: string
  first_name: string
  last_name: string
  phone?: string
  avatar_url?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  hasRole: (...roles: string[]) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('hrms_user')
    return stored ? JSON.parse(stored) : null
  })
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('hrms_token')
  })

  useEffect(() => {
    if (token && !user) {
      api.getMe()
        .then((u) => {
          setUser(u)
          localStorage.setItem('hrms_user', JSON.stringify(u))
        })
        .catch(() => {
          localStorage.removeItem('hrms_token')
          localStorage.removeItem('hrms_user')
          setToken(null)
        })
    }
  }, [token])

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password)
    localStorage.setItem('hrms_token', res.token)
    localStorage.setItem('hrms_user', JSON.stringify(res.user))
    setToken(res.token)
    setUser(res.user)
  }

  const logout = () => {
    localStorage.removeItem('hrms_token')
    localStorage.removeItem('hrms_user')
    setToken(null)
    setUser(null)
  }

  const hasRole = (...roles: string[]) => {
    if (!user) return false
    return roles.includes(user.role)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
