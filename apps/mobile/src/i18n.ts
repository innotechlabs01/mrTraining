import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'react-native-localize';

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

// Detect device locale with country code
const deviceLocales = Localization.getLocales();
const deviceLocale = deviceLocales[0];
const deviceLang = deviceLocale?.languageCode ?? 'en';
const deviceCountry = deviceLocale?.countryCode ?? 'US';
const deviceLocaleCode = `${deviceLang}-${deviceCountry}`.toLowerCase().replace('_', '-');

const supportedLocales = [
  'en-US', 'en-GB', 'es-ES', 'es-MX', 'es-AR', 'en', 'es'
] as const;

const initLng = (supportedLocales as readonly string[]).includes(deviceLocaleCode)
  ? deviceLocaleCode
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

// System locale change listener (optional - requires react-native-localize v2+)
// if (typeof Localization.addEventListener === 'function') {
//   Localization.addEventListener('change', () => {
//     const newLocales = Localization.getLocales();
//     const newLocale = newLocales[0];
//     const newLang = newLocale?.languageCode ?? 'en';
//     const newCountry = newLocale?.countryCode ?? 'US';
//     const newLocaleCode = `${newLang}-${newCountry}`.toLowerCase().replace('_', '-');
//     
//     if ((supportedLocales as readonly string[]).includes(`${newLocale?.languageCode}-${newLocale?.countryCode ?? ''}`)) {
//       i18n.changeLanguage(`${newLang}-${newCountry}`.toLowerCase().replace('_', '-'));
//     } else if ((supportedLocales as readonly string[]).includes(newLang)) {
//       i18n.changeLanguage(newLang);
//     }
//   });
// }

export default i18n;