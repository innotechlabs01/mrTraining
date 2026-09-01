import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const GO_API_BASE = process.env.NEXT_PUBLIC_GO_API_URL || 'http://localhost:3001';

/**
 * Proxy a Next.js API request to the Go backend with Clerk JWT forwarding.
 * Returns a NextResponse. If Go returns 404, returns null to signal fallback.
 */
export async function proxyToGo(
  req: NextRequest,
  pathSegments: string[]
): Promise<NextResponse | null> {
  const path = `/api/v1/${pathSegments.join('/')}`;
  const url = `${GO_API_BASE}${path}`;

  // Get Clerk session to forward JWT if Authorization header is missing
  let authHeader = req.headers.get('authorization');

  if (!authHeader) {
    // Try to get Clerk user ID for forwarding
    try {
      const { userId } = await auth();
      if (userId) {
        authHeader = `Bearer ${userId}`;
      }
    } catch {
      // If auth fails, continue without header — Go will handle auth
    }
  }

  const goUrl = `${url}`;

  // Build headers, omitting Authorization if missing
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (authHeader) {
    headers.Authorization = authHeader;
  }

  const goResponse = await fetch(goUrl, {
    method: req.method,
    headers,
  });

  // If Go returns 404, return null to signal fallback to direct handling
  if (goResponse.status === 404) {
    return null;
  }

  return NextResponse.json(
    await goResponse.json(),
    { status: goResponse.status }
  );
}