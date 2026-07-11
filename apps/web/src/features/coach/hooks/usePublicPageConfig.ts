'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PublicPageConfig } from '@/features/coach/types';

const STORAGE_KEY = 'mr-training-public-page';

export const DEFAULT_PUBLIC_PAGE: PublicPageConfig = {
  brandName: 'MR Training',
  tagline: 'Entrenamiento de alto rendimiento',
  welcomeMessage: '',
  footerText: 'Registro público · MR Training',
};

function load(): PublicPageConfig {
  if (typeof window === 'undefined') return DEFAULT_PUBLIC_PAGE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PUBLIC_PAGE;
    return { ...DEFAULT_PUBLIC_PAGE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PUBLIC_PAGE;
  }
}

export function usePublicPageConfig() {
  const [config, setConfig] = useState<PublicPageConfig>(DEFAULT_PUBLIC_PAGE);

  useEffect(() => {
    setConfig(load());
  }, []);

  const save = useCallback((next: PublicPageConfig) => {
    setConfig(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore storage errors */
    }
  }, []);

  return { config, save };
}
