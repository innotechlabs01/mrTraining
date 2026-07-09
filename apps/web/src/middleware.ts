import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/welcome',
  '/forgot-password',
  '/verify(.*)',
  '/mfa(.*)',
  '/role-selection',
  '/setup',
  '/onboarding(.*)',
  '/invite(.*)',
  '/welcome-dashboard',
  '/api(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/', '/(api|trpc)(.*)'],
};
