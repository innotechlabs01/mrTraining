export const SUPPORTED_LOCALES = [
  { code: 'en-US', label: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GB', label: 'English (UK)', flag: '🇬🇧' },
  { code: 'es-ES', label: 'Español (España)', flag: '🇪🇸' },
  { code: 'es-MX', label: 'Español (México)', flag: '🇲🇽' },
  { code: 'es-AR', label: 'Español (Argentina)', flag: '🇦🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
] as const;

export type LocaleCode = typeof SUPPORTED_LOCALES[number]['code'];

// Legacy alias for backward compatibility
export const SUPPORTED_LANGS = SUPPORTED_LOCALES;
export type LangCode = LocaleCode;