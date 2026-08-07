'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

const INACTIVITY_TIMEOUT = 15 * 60 * 1000 // 15 minutes
const SESSION_MAX_DURATION = 6 * 60 * 60 * 1000 // 6 hours

const ACTIVITY_EVENTS = [
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'mousemove',
  'click',
] as const

export function useSessionTimeout() {
  const { signOut } = useClerk()
  const router = useRouter()
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionStart = useRef<number>(Date.now())

  const handleLogout = useCallback(async () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    if (sessionTimer.current) clearTimeout(sessionTimer.current)
    await signOut()
    router.replace('/sign-in')
  }, [signOut, router])

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    inactivityTimer.current = setTimeout(handleLogout, INACTIVITY_TIMEOUT)
  }, [handleLogout])

  useEffect(() => {
    sessionStart.current = Date.now()

    // Max session duration: 6 hours regardless of activity
    sessionTimer.current = setTimeout(handleLogout, SESSION_MAX_DURATION)

    // Start inactivity timer
    resetInactivityTimer()

    // Listen for user activity
    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, resetInactivityTimer, { passive: true })
    }

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
      if (sessionTimer.current) clearTimeout(sessionTimer.current)
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, resetInactivityTimer)
      }
    }
  }, [resetInactivityTimer, handleLogout])
}
