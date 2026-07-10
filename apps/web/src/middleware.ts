import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

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

const isAuthEntryRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/welcome',
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  if (userId && isAuthEntryRoute(req)) {
    return NextResponse.redirect(new URL('/coach', req.url));
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/', '/(api|trpc)(.*)'],
};
