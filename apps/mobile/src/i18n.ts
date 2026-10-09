import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

// Import locale resources
import enUSCommon from './locales/en-US/common.json';
import enGBCommon from './locales/en-GB/common.json';
import esESCommon from './locales/es-ES/common.json';
import esMXCommon from './locales/es-MX/common.json';
import esARCommon from './locales/es-AR/common.json';
import enCommon from './locales/en/common.json';
import esCommon from './locales/es/common.json';

const resources = {
  'en-US': { common: enUSCommon },
  'en-GB': { common: enGBCommon },
  'es-ES': { common: esESCommon },
  'es-MX': { common: esMXCommon },
  'es-AR': { common: esARCommon },
  'en': { common: enCommon },
  'es': { common: esCommon },
};

// Fallback chain: locale -> base language -> en-US
const fallbackChain: Record<string, string[]> = {
  'en-US': ['en-US'],
  'en-GB': ['en-GB', 'en-US'],
  'es-ES': ['es-ES', 'es', 'en-US'],
  'es-MX': ['es-MX', 'es', 'en-US'],
  'es-AR': ['es-AR', 'es', 'en-US'],
  'en': ['en', 'en-US'],
  'es': ['es', 'en-US'],
};

// Detect device locale with country code using expo-localization
const deviceLocale = Localization.locale; // e.g., "en-US", "es-AR"
const supportedLocales = [
  'en-US', 'en-GB', 'es-ES', 'es-MX', 'es-AR', 'en', 'es'
] as const;

const initLng = supportedLocales.includes(deviceLocale as any)
  ? deviceLocale
  : 'en-US';

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    lng: initLng,
    fallbackLng: (code) => {
      const chain = fallbackChain[code] ?? [code, 'en-US'];
      return chain;
    },
    supportedLngs: [...supportedLocales, 'en-US', 'en', 'es'],
    resources,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export default i18n;