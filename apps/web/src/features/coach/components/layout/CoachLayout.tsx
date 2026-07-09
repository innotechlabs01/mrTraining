'use client'

import { useCallback, useMemo, useState } from 'react'
import type { PanelState, PanelType } from '../../types'
import { CoachPanelContext } from './CoachPanelContext'
import { TimelineSidebar } from './TimelineSidebar'
import { TopBar } from './TopBar'
import { RightPanel } from './RightPanel'

export { useCoachPanel } from './CoachPanelContext'

export default function CoachLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <CoachPanelContext.Provider value={value}>
      <div className="relative min-h-screen bg-surface-0">
        <TimelineSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="pt-14 min-h-screen lg:ml-60">{children}</main>
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        <RightPanel />
      </div>
    </CoachPanelContext.Provider>
  )
}
