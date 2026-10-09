'use client';

import { useState, useEffect } from 'react';
import esCommon from '@/messages/es/common.json';
import enCommon from '@/messages/en/common.json';

export type Locale = 'es' | 'en';

interface Translations {
  [key: string]: string | Translations;
}

const translationsByLocale: Record<Locale, Translations> = {
  es: { common: esCommon as Translations },
  en: { common: enCommon as Translations },
};

const LANGUAGE_KEY = 'mr_training_language';

export function useI18n(namespace: string = 'common') {
  const [locale, setLocale] = useState<Locale>('es');
  const [translations, setTranslations] = useState<Translations>({});

  // Load saved language from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mr_training_language');
      if (saved === 'es' || saved === 'en') {
        setLocale(saved as Locale);
      }
    }
  }, []);

  // Load translations when locale changes
  useEffect(() => {
    setTranslations((translationsByLocale[locale]?.[namespace] as Translations) ?? {});
  }, [locale, namespace]);

  // Save to localStorage when language changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mr_training_language', locale);
    }
  }, [locale]);

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = translations;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }
    let result = typeof value === 'string' ? value : key;
    // Simple interpolation: replace {key} with params[key]
    if (params && typeof result === 'string') {
      Object.entries(params).forEach(([key, value]) => {
        result = result.replace(new RegExp(`\{${key}\}`, 'g'), String(value));
      });
    }
    return result;
  };

  const setLanguage = (newLocale: Locale) => {
    setLocale(newLocale);
  };

  return {
    locale,
    setLocale: setLanguage,
    t,
  };
}
