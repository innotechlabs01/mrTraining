'use client'

import { useMemo, useCallback } from 'react'
import type { AiSuggestion, AiProgramParams, AiGeneratedProgram } from '../types'
import { MOCK_AI_SUGGESTED_MESSAGES } from '../data/_mocks'

export function useAI() {
  const suggestedMessages = useMemo(() => MOCK_AI_SUGGESTED_MESSAGES, [])

  const generateProgram = useCallback(
    (_params: AiProgramParams): Promise<AiGeneratedProgram> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: 'gen-prog-1',
            days: _params.days,
            focus: _params.focus,
            intensity: _params.intensity,
            sessions: _params.days.map((day) => ({
              day,
              exercises: [
                { id: `gen-${day}-1`, name: 'Dynamic Warmup', sets: 1, reps: 10, rest: 0 },
                { id: `gen-${day}-2`, name: 'Main Movement', sets: 4, reps: 6, rest: 120 },
                { id: `gen-${day}-3`, name: 'Accessory', sets: 3, reps: 10, rest: 60 },
                { id: `gen-${day}-4`, name: 'Core Work', sets: 3, reps: 15, rest: 45 },
              ],
            })),
            reasoning: `This program focuses on ${_params.focus} at ${_params.intensity} intensity across ${_params.days.length} days. Periodized to build progressively with adequate recovery.`,
          })
        }, 2000)
      })
    },
    [],
  )

  return {
    suggestedMessages,
    generateProgram,
  }
}
