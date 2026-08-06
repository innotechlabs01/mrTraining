'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

export interface MockUser {
  id: string
  name: string
  email: string
  role: string
  initials: string
  coachPlan?: string
  coachLevel?: string
  specialization?: string
  athletesCount?: number
  coachId?: string
}

const PREDEFINED_USERS: MockUser[] = [
  { id: 'coach-1', name: 'Alex Rivera', email: 'alex@mr-training.com', role: 'Head Coach', initials: 'AR', coachPlan: 'performance', coachLevel: 'expert', specialization: 'Sports Performance', athletesCount: 12 },
  { id: 'coach-2', name: 'María González', email: 'maria@mr-training.com', role: 'Strength Coach', initials: 'MG', coachPlan: 'strength', coachLevel: 'advanced', specialization: 'Strength & Conditioning', athletesCount: 8 },
  { id: 'coach-3', name: 'James Chen', email: 'james@mr-training.com', role: 'Performance Coach', initials: 'JC', coachPlan: 'general', coachLevel: 'intermediate', specialization: 'General Fitness', athletesCount: 5 },
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

function clerkUserToMockUser(user: {
  id: string;
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  emailAddresses: Array<{ emailAddress: string }>;
  publicMetadata?: Record<string, unknown>;
  privateMetadata?: Record<string, unknown>;
}): MockUser | null {
  const role = (user.publicMetadata?.role as string) || (user.privateMetadata?.role as string);
  if (!role) return null;
  const initials = `${(user.firstName?.[0] || '')}${(user.lastName?.[0] || '')}`.toUpperCase();
  return {
    id: user.id,
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.emailAddresses[0]?.emailAddress || '',
    email: user.emailAddresses[0]?.emailAddress || '',
    role,
    initials: initials || user.id.slice(0, 2).toUpperCase(),
    coachId: (user.publicMetadata?.coachId as string) || (user.privateMetadata?.coachId as string),
  };
}

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser()
  const [mockUser, setMockUser] = useState<MockUser | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    setMounted(true)

    if (isSignedIn && user) {
      const clerkUser = clerkUserToMockUser(user)
      if (clerkUser) {
        setMockUser(clerkUser)
        return
      }
    }

    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setMockUser(JSON.parse(stored))
      } catch { }
    }
  }, [isLoaded, isSignedIn, user])

  const login = useCallback((u: MockUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
    setMockUser(u)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setMockUser(null)
  }, [])

  return (
    <MockAuthContext.Provider value={{ user: mockUser, isLoggedIn: !!mockUser && mounted, loading: !mounted, login, logout, users: PREDEFINED_USERS }}>
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
