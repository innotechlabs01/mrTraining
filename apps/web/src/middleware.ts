import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Single middleware for apps/web (Next resolves `src/middleware.ts` over the
 * root file — this is the ONLY middleware that runs).
 *
 * Responsibilities:
 * 1. Resolve the Clerk session on every matched request.
 * 2. Redirect unauthenticated users away from private app routes (/coach, /nutrition).
 * 3. Role-based redirect: coaches landing on `/` go to `/coach`.
 *
 * NOTE: there is intentionally NO next-intl middleware here. Locale routing is
 * resolved page-level (`src/app/[locale]` + LanguageSwitcher). The old root
 * `middleware.ts` (next-intl) was shadowed by this file and never executed;
 * enabling it would redirect non-[locale] routes (e.g. `/coach`) to non-existent
 * `/[locale]/coach` pages and 404 the whole app.
 */

/** Locales that may appear as a leading path segment. Keep in sync with src/config/languages. */
const SUPPORTED_LOCALES = ['en-US', 'en-GB', 'es-ES', 'es-MX', 'es-AR', 'en', 'es'];

/** Route prefixes that require an authenticated session (matched after stripping any locale prefix). */
const PRIVATE_PREFIXES = ['/coach', '/nutrition'];

/** Remove a leading locale segment from a pathname (`/es-AR/coach` → `/coach`). */
function stripLocale(pathname: string): string {
  const [, first, ...rest] = pathname.split('/');
  if (SUPPORTED_LOCALES.includes(first)) return '/' + rest.join('/');
  return pathname;
}

export default clerkMiddleware(async (auth, request) => {
  const { userId, sessionClaims } = await auth();

  const path = stripLocale(request.nextUrl.pathname);

  // API routes (Clerk webhooks, SSR data) enforce their own auth — never redirect them.
  const isApiRoute = path.startsWith('/api');
  const isPrivate = PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

  if (!isApiRoute && isPrivate && !userId) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirect_url', request.url);
    return NextResponse.redirect(signInUrl);
  }

  if (!userId) {
    return NextResponse.next();
  }

  const role = ((sessionClaims as { publicMetadata?: Record<string, unknown> } | undefined)?.publicMetadata)
    ?.role as string | undefined;

  if (path === '/' && role === 'coach') {
    return NextResponse.redirect(new URL('/coach', request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/', '/(api|trpc)(.*)'],
};