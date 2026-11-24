'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { PanelState, PanelType } from '../../types'
import { useUser } from '@clerk/nextjs'
import { useSessionTimeout } from '@/features/auth/hooks/useSessionTimeout'
import { CoachProfileProvider } from '@/features/coach/contexts/CoachProfileContext'
import type { CoachPlan, CoachLevel } from '@/features/coach/contexts/CoachProfileContext'
import { CoachPanelContext } from './CoachPanelContext'
import { CoachSidebar } from '../navigation/CoachSidebar'
import { TopBar } from './TopBar'
import { RightPanel } from './RightPanel'
import { useMembershipStatus } from '@/features/coach/hooks/useMembershipStatus'
import { usePlanEntitlements } from '@/features/coach/hooks/usePlanEntitlements'

export { useCoachPanel } from './CoachPanelContext'

interface PlatformSubscriptionState {
  status: string
  plan_id?: string
  plan_name?: string
}

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const pathname = usePathname()
  const { status: membershipStatus } = useMembershipStatus()
  const entitlements = usePlanEntitlements()
  useSessionTimeout()
  const [panel, setPanel] = useState<PanelState>({ type: null, data: {} })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [platformSub, setPlatformSub] = useState<PlatformSubscriptionState | null>(null)

  useEffect(() => {
    if (!user) return
    let active = true
    fetch('/api/coach/subscription/status', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: PlatformSubscriptionState | null) => {
        if (active && data && typeof data.status === 'string') {
          setPlatformSub(data)
        }
      })
      .catch(() => {
        // Non-blocking: fall back to existing Clerk metadata entitlements
      })
    return () => {
      active = false
    }
  }, [user, pathname])

  const isOnPlanPage = pathname?.startsWith('/coach/plan') ?? false
  const isTrialExpired = platformSub?.status === 'expired'
  const isInTrial = platformSub?.status === 'trial'
  const payPlanHref = platformSub?.plan_id
    ? `/coach/plan?plan=${encodeURIComponent(platformSub.plan_id)}`
    : '/coach/plan'

  const openPanel = useCallback((type: PanelType, data: Record<string, unknown>) => {
    setPanel({ type, data })
  }, [])

  const closePanel = useCallback(() => {
    setPanel({ type: null, data: {} })
  }, [])

  const value = useMemo(
    () => ({ panel, openPanel, closePanel }),
    [panel, openPanel, closePanel],
  )

  const coachProfile = useMemo(() => {
    if (!user) return null
    const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
    const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    const u = user as unknown as Record<string, unknown>
    return {
      id: (u.id as string) ?? '',
      name,
      initials,
      specialization: (u.specialization as string) ?? '',
      plan: (u.coachPlan as CoachPlan) ?? 'general',
      level: (u.coachLevel as CoachLevel) ?? 'intermediate',
      athletesCount: (u.athletesCount as number) ?? 0,
      certifications: (u.certifications as string[]) ?? [],
      coachCode: (u.coachCode as string) ?? '',
      createdAt: '',
      membershipStatus,
      subscription: entitlements,
    }
  }, [user, membershipStatus, entitlements])

  return (
    <CoachPanelContext.Provider value={value}>
      <CoachProfileProvider initialProfile={coachProfile}>
        <div className="relative min-h-screen bg-surface-0">
          {!isTrialExpired && (
            <CoachSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} membershipStatus={membershipStatus} />
          )}
          <TopBar onMenuClick={() => setSidebarOpen(true)} user={coachProfile} membershipStatus={membershipStatus} />
          <main className={`pt-14 min-h-screen ${isTrialExpired ? '' : 'lg:ml-60'}`}>
            {isInTrial && (
              <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs sm:text-sm text-amber-200">
                  Estás en tu periodo de prueba de 5 días
                  {platformSub?.plan_name ? ` (${platformSub.plan_name})` : ''}. Paga tu membresía para evitar el bloqueo de tu cuenta.
                </p>
                <Link
                  href={payPlanHref}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-primary px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-primary/90 transition-colors"
                >
                  Pagar membresía
                </Link>
              </div>
            )}

            {isTrialExpired && !isOnPlanPage ? (
              <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
                <div className="w-full max-w-md rounded-2xl border border-surface-6 bg-surface-2 p-8 text-center shadow-xl">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-400">
                    <span className="text-xl font-bold">!</span>
                  </div>
                  <h1 className="text-xl font-bold text-white">Periodo de prueba finalizado</h1>
                  <p className="mt-2 text-sm text-gray-300">
                    Han pasado más de 5 días desde que iniciaste tu prueba
                    {platformSub?.plan_name ? ` de ${platformSub.plan_name}` : ''} sin completar el pago.
                    Tu panel está bloqueado hasta activar tu membresía.
                  </p>
                  <Link
                    href={payPlanHref}
                    className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-white hover:bg-brand-primary/90 transition-colors"
                  >
                    Pagar membresía
                  </Link>
                </div>
              </div>
            ) : (
              children
            )}
          </main>
          <RightPanel />
        </div>
      </CoachProfileProvider>
    </CoachPanelContext.Provider>
  )
}
