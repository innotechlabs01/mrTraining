'use client'

import { useState, useEffect } from 'react'
import type { AiSuggestion } from '../types'
import { coachingApi } from '@/features/shared/api/client'

export function useAI() {
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSuggestions = () => {
    setIsLoading(true)
    coachingApi.getAISuggestions<AiSuggestion[]>()
      .then(data => setSuggestions(data))
      .catch(() => setError('Failed to load AI suggestions'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadSuggestions()
  }, [])

  const addSuggestion = async (suggestion: AiSuggestion) => {
    return coachingApi.saveAISuggestion<{ id: string }>(suggestion).then(res => {
      setSuggestions(prev => [...prev, { ...suggestion, id: res.id }])
      return res.id
    })
  }

  return {
    suggestions,
    isLoading,
    error,
    addSuggestion,
    refresh: loadSuggestions,
  }
}
