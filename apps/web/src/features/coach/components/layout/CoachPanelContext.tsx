'use client'

import { createContext, useContext } from 'react'
import type { PanelType } from '../../types'

export interface CoachPanelContextValue {
  panel: { type: PanelType; data: Record<string, unknown> }
  openPanel: (type: PanelType, data: Record<string, unknown>) => void
  closePanel: () => void
}

export const CoachPanelContext = createContext<CoachPanelContextValue>({
  panel: { type: null, data: {} },
  openPanel: () => {},
  closePanel: () => {},
})

export function useCoachPanel() {
  return useContext(CoachPanelContext)
}
