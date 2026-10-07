import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  // Order = fallback priority (most specific first)
  locales: ['en-US', 'en-GB', 'es-ES', 'es-MX', 'es-AR', 'en', 'es'],
  defaultLocale: 'en-US',
  localePrefix: 'always',
});

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)']
};