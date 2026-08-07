'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  initials: string
  coachId?: string
  coachCode?: string
}

interface AuthContextValue {
  user: AuthUser | null
  isLoggedIn: boolean
  loading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function clerkUserToAuthUser(user: {
  id: string
  firstName: string | null | undefined
  lastName: string | null | undefined
  emailAddresses: Array<{ emailAddress: string }>
  publicMetadata?: Record<string, unknown>
  privateMetadata?: Record<string, unknown>
}): AuthUser {
  const role = (user.publicMetadata?.role as string) || (user.privateMetadata?.role as string) || 'coach'
  const initials = `${(user.firstName?.[0] || '')}${(user.lastName?.[0] || '')}`.toUpperCase()
  return {
    id: user.id,
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.emailAddresses[0]?.emailAddress || '',
    email: user.emailAddresses[0]?.emailAddress || '',
    role,
    initials: initials || user.id.slice(0, 2).toUpperCase(),
    coachId: (user.publicMetadata?.coachId as string) || (user.privateMetadata?.coachId as string),
    coachCode: (user.publicMetadata?.coachCode as string) || undefined,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    setMounted(true)

    if (isSignedIn && user) {
      const mapped = clerkUserToAuthUser(user)
      setAuthUser(mapped)

      if (!user.publicMetadata?.role) {
        fetch('/api/user/sync-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        }).catch(() => {});
      }
    } else {
      setAuthUser(null)
    }
  }, [isLoaded, isSignedIn, user])

  const logout = useCallback(async () => {
    setAuthUser(null)
    await signOut()
    router.replace('/sign-in')
  }, [signOut, router])

  const isLoggedIn = mounted && !!isSignedIn

  return (
    <AuthContext.Provider value={{ user: authUser, isLoggedIn, loading: !mounted, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function useRequireAuth() {
  const auth = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (auth.loading) return
    if (!auth.isLoggedIn) {
      router.replace('/sign-in')
    }
  }, [auth.isLoggedIn, auth.loading, router])

  return auth
}
