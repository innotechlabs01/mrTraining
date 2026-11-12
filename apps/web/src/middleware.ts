import { clerkClient, clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Single middleware for apps/web (Next resolves `src/middleware.ts` over the
 * root file — this is the ONLY middleware that runs).
 *
 * Responsibilities:
 * 1. Resolve the Clerk session on every matched request.
 * 2. Redirect unauthenticated users away from private routes (/coach, /nutrition).
 * 3. STRICT, disjoint role gates: /admin is super-admin-only, /coach is
 *    coach-only. A super admin does not hold role 'coach' and is blocked from
 *    the coach area, exactly as a coach is blocked from /admin.
 * 4. Wrong-role users are sent to their own home — never to /sign-in, which
 *    would bounce authenticated users back and loop.
 * 5. The public coach landing (/coach/:username, marketing group) stays public;
 *    single-segment dashboard slugs are reserved and fail closed.
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
const PRIVATE_PREFIXES = ['/coach', '/nutrition', '/admin', '/payment'];

/** Remove a leading locale segment from a pathname (`/es-AR/coach` → `/coach`). */
function stripLocale(pathname: string): string {
  const [, first, ...rest] = pathname.split('/');
  if (SUPPORTED_LOCALES.includes(first)) return '/' + rest.join('/');
  return pathname;
}

/**
 * The default Clerk session token does NOT carry `publicMetadata` — a decoded
 * token only has {exp,fva,iat,iss,nbf,sid,sts,sub,v}. So `sessionClaims.publicMetadata`
 * is undefined for EVERY user and any role check built on it silently fails
 * (that is why /coach and /admin gates never worked). Resolve the role from the
 * Clerk Backend API instead, cached per user so the extra round-trip happens at
 * most once per TTL. If the instance session token is later customized to embed
 * `publicMetadata`, the claim short-circuits and no request is made.
 */
const ROLE_CACHE_TTL_MS = 60_000;
const roleCache = new Map<string, { role?: string; at: number }>();

async function resolveRole(
  userId: string,
  sessionClaims: unknown
): Promise<string | undefined> {
  const claimRole = (
    sessionClaims as { publicMetadata?: Record<string, unknown> } | undefined
  )?.publicMetadata?.role;
  if (typeof claimRole === 'string') return claimRole;

  const now = Date.now();
  const hit = roleCache.get(userId);
  if (hit && now - hit.at < ROLE_CACHE_TTL_MS) return hit.role;

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const raw = (user.publicMetadata as Record<string, unknown> | undefined)?.role;
    const role = typeof raw === 'string' ? raw : undefined;
    roleCache.set(userId, { role, at: now });
    return role;
  } catch {
    // Clerk unreachable: keep serving the last known role instead of locking
    // everyone out on a transient error. First-time failure fails closed (no
    // role) which is the safe default for /admin and /coach.
    return hit?.role;
  }
}

export default clerkMiddleware(async (auth, request) => {
  const { userId, sessionClaims } = await auth();

  const path = stripLocale(request.nextUrl.pathname);

  // API routes (Clerk webhooks, SSR data) enforce their own auth — never redirect them.
  const isApiRoute = path.startsWith('/api');
  const isPrivate = PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

  // Public coach landing: /coach/:username renders the (marketing) profile page.
  // CRITICAL: that shape ALSO matches dashboard routes sitting at a single
  // segment (/coach/today, /coach/users, /coach/earnings, ...). Those must stay
  // protected, so we fail CLOSED against an explicit list of reserved slugs.
  // The public landing is also served independently at /l/[slug].
  const COACH_DASHBOARD_SLUGS = new Set([
    'events', 'landing-builder', 'users', 'earnings', 'agendamiento', 'support',
    'planes', 'landing', 'blog', 'ally', 'settings', 'ventas', 'plans',
    'live-session', 'polizas', 'today', 'video-analytics', 'workouts',
    'challenges', 'training', 'plan',
  ]);
  const coachSlug = path.match(/^\/coach\/([^/]+)$/)?.[1];
  const isPublicCoachPage = coachSlug !== undefined && !COACH_DASHBOARD_SLUGS.has(coachSlug);

  // Auth pages - accessible without auth
  const isAuthPage = path === '/sign-in' || path === '/sign-up';

  // Block unauthenticated access to private routes
  if (!isApiRoute && isPrivate && !userId && !isPublicCoachPage && !isAuthPage) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirect_url', request.url);
    return NextResponse.redirect(signInUrl);
  }

  if (!userId) {
    return NextResponse.next();
  }

  // Only pay for a role lookup where a role actually decides the outcome.
  const needsRole =
    !isApiRoute && ((isPrivate && !isPublicCoachPage && !isAuthPage) || path === '/');
  if (!needsRole) {
    return NextResponse.next();
  }

  const role = await resolveRole(userId, sessionClaims);

  // Super admin: Clerk publicMetadata OR the env allow-list (kept in sync with
  // the sign-in page so both layers agree and never fight each other).
  const SUPER_ADMIN_IDS = (process.env.NEXT_PUBLIC_SUPER_ADMIN_CLERK_IDS || '').split(',').filter(Boolean);
  const isSuperAdminUser = role === 'super_admin' || SUPER_ADMIN_IDS.includes(userId);
  const isCoachUser = role === 'coach';

  /**
   * Where a signed-in user belongs. NEVER '/sign-in': that page bounces
   * authenticated users back to redirect_url, which produced an infinite
   * /sign-in <-> /coach loop for users without the coach role.
   */
  // Athletes use the mobile app, never the web dashboard: anything that is not
  // super admin or coach belongs on the public landing page.
  const homeForRole = (r?: string): string => {
    if (isSuperAdminUser) return '/admin/dashboard';
    if (r === 'coach') return '/coach/plan';
    return '/'; // athlete / no role -> public landing page
  };

  // Strict, disjoint role gates: /admin is super-admin-only and /coach is
  // coach-only. A super admin does NOT hold role 'coach', so the old blanket
  // super-admin bypass that opened /coach to everyone is gone.
  if (isPrivate && !isPublicCoachPage && !isAuthPage) {
    if (path.startsWith('/admin') && !isSuperAdminUser) {
      return NextResponse.redirect(new URL(homeForRole(role), request.url));
    }
    if (path.startsWith('/coach') && !isCoachUser) {
      return NextResponse.redirect(new URL(homeForRole(role), request.url));
    }
  }

  // Landing page: route by role; authenticated users never go to /sign-in.
  // No-role users belong on the landing itself -> no redirect, avoids loop.
  if (path === '/') {
    const home = homeForRole(role);
    if (home !== '/') return NextResponse.redirect(new URL(home, request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/', '/(api|trpc)(.*)'],
};