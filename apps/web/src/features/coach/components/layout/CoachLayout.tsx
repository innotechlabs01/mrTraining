'use client'

import { useCallback, useMemo, useState } from 'react'
import type { PanelState, PanelType } from '../../types'
import { useRequireAuth } from '@/features/auth/contexts/MockAuthContext'
import { CoachProfileProvider } from '@/features/coach/contexts/CoachProfileContext'
import type { CoachPlan, CoachLevel } from '@/features/coach/contexts/CoachProfileContext'
import { CoachPanelContext } from './CoachPanelContext'
import { CoachSidebar } from '../navigation/CoachSidebar'
import { TopBar } from './TopBar'
import { RightPanel } from './RightPanel'

export { useCoachPanel } from './CoachPanelContext'

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const { user } = useRequireAuth()
  const [panel, setPanel] = useState<PanelState>({ type: null, data: {} })
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
    const u = user as unknown as Record<string, unknown>
    return {
      id: (u.id as string) ?? '',
      name: (u.name as string) ?? '',
      specialization: (u.specialization as string) ?? '',
      plan: (u.coachPlan as CoachPlan) ?? 'general',
      level: (u.coachLevel as CoachLevel) ?? 'intermediate',
      athletesCount: (u.athletesCount as number) ?? 0,
      certifications: (u.certifications as string[]) ?? [],
      coachCode: (u.coachCode as string) ?? '',
      createdAt: '',
    }
  }, [user])

  return (
    <CoachPanelContext.Provider value={value}>
      <CoachProfileProvider initialProfile={coachProfile}>
        <div className="relative min-h-screen bg-surface-0">
          <CoachSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <TopBar onMenuClick={() => setSidebarOpen(true)} user={user} />
          <main className="pt-14 min-h-screen lg:ml-60">{children}</main>
          <RightPanel />
        </div>
      </CoachProfileProvider>
    </CoachPanelContext.Provider>
  )
}
