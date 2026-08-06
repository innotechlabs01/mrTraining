'use client'

import { useState, useEffect, useCallback } from 'react'
import type { PublicPageConfig } from '@/features/coach/types'
import { coachingApi } from '@/features/shared/api/client'

export const DEFAULT_PUBLIC_PAGE: PublicPageConfig = {
  brandName: 'MR Training',
  tagline: 'Entrenamiento de alto rendimiento',
  welcomeMessage: '',
  footerText: 'Registro publico - MR Training',
}

export function usePublicPageConfig() {
  const [config, setConfig] = useState<PublicPageConfig>(DEFAULT_PUBLIC_PAGE)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    coachingApi.getPublicPageConfig<PublicPageConfig | null>()
      .then(data => {
        if (data) setConfig(data)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const save = useCallback(async (next: PublicPageConfig) => {
    setConfig(next)
    await coachingApi.updatePublicPageConfig<{ ok: boolean }>(next)
  }, [])

  return { config, isLoading, save }
}
