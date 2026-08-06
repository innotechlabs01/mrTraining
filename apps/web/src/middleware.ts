import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export default clerkMiddleware((auth, request) => {
  const { sessionClaims, isSignedIn } = auth as unknown as {
    sessionClaims: { publicMetadata?: Record<string, unknown> } | undefined;
    isSignedIn: boolean;
  };

  if (!isSignedIn) {
    return NextResponse.next();
  }

  const role = (sessionClaims?.publicMetadata as Record<string, unknown>)?.role as string | undefined;
  const pathname = request.nextUrl.pathname;

  if (pathname === '/' && role === 'coach') {
    return NextResponse.redirect(new URL('/coach', request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/', '/(api|trpc)(.*)'],
};