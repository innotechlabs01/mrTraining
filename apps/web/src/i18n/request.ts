import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import { getMessages } from '@/lib/messages';

const SUPPORTED_LOCALES = ['en-US', 'en-GB', 'es-ES', 'es-MX', 'es-AR', 'en', 'es'];
const DEFAULT_LOCALE = 'es';

export default getRequestConfig(async ({ requestLocale }) => {
  // Resolve the locale. When the next-intl middleware does not run (locales are
  // resolved page-level via src/config/languages + LanguageSwitcher), requestLocale
  // is undefined, so we fall back to the default instead of 404-ing.
  const requested = await requestLocale;
  const locale = requested && SUPPORTED_LOCALES.includes(requested) ? requested : DEFAULT_LOCALE;

  const messages = getMessages(locale);

  if (Object.keys(messages).length === 0) {
    notFound();
  }

  return {
    locale,
    messages,
  };
});