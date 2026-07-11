'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

export interface MockUser {
  id: string
  name: string
  email: string
  role: string
  initials: string
}

const PREDEFINED_USERS: MockUser[] = [
  { id: 'coach-1', name: 'Alex Rivera', email: 'alex@mr-training.com', role: 'Head Coach', initials: 'AR' },
  { id: 'coach-2', name: 'María González', email: 'maria@mr-training.com', role: 'Strength Coach', initials: 'MG' },
  { id: 'coach-3', name: 'James Chen', email: 'james@mr-training.com', role: 'Performance Coach', initials: 'JC' },
]

interface MockAuthContextValue {
  user: MockUser | null
  isLoggedIn: boolean
  loading: boolean
  login: (user: MockUser) => void
  logout: () => void
  users: MockUser[]
}

const MockAuthContext = createContext<MockAuthContextValue | null>(null)

const STORAGE_KEY = 'mr-training-mock-user'

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch { }
    }
    setMounted(true)
  }, [])

  const login = useCallback((u: MockUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
    setUser(u)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [])

  return (
    <MockAuthContext.Provider value={{ user, isLoggedIn: !!user && mounted, loading: !mounted, login, logout, users: PREDEFINED_USERS }}>
      {children}
    </MockAuthContext.Provider>
  )
}

export function useMockAuth(): MockAuthContextValue {
  const ctx = useContext(MockAuthContext)
  if (!ctx) throw new Error('useMockAuth must be used within MockAuthProvider')
  return ctx
}

export function useRequireAuth() {
  const auth = useMockAuth()
  const router = useRouter()

  useEffect(() => {
    if (auth.loading) return
    if (!auth.isLoggedIn) {
      router.replace('/coach/login')
    }
  }, [auth.isLoggedIn, auth.loading, router])

  return auth
}
