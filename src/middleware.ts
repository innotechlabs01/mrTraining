import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/(.*)',
]);

const isAuthRoute = createRouteMatcher([
  '/login(.*)',
  '/register(.*)',
  '/api/auth/clerk-webhook(.*)',
  '/api/stripe/webhook(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isAuthRoute(req)) {
    return;
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
