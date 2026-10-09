import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en-US', 'en-GB', 'es-ES', 'es-MX', 'es-AR', 'en', 'es'],
  defaultLocale: 'en-US',
  localePrefix: 'as-needed',
});

export type Locale = (typeof routing.locales)[number];
export const SUPPORTED_LOCALES = routing.locales;
export const DEFAULT_LOCALE = routing.defaultLocale;