import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const GO_API_BASE = process.env.GO_API_URL || process.env.NEXT_PUBLIC_GO_API_URL || 'http://localhost:9090';

/**
 * Proxy a Next.js API request to the Go backend with Clerk JWT forwarding.
 * Returns a NextResponse. If Go returns 404, returns null to signal fallback.
 */
export async function proxyToGo(
  req: NextRequest,
  pathSegments: string[]
): Promise<NextResponse | null> {
  const effectiveSegments = pathSegments[0] === 'v1' ? pathSegments.slice(1) : pathSegments;
  const path = `/api/v1/${effectiveSegments.join('/')}`;
  const goUrl = `${GO_API_BASE}${path}${req.nextUrl.search}`;

  // Get Clerk session JWT if Authorization header is missing
  let authHeader = req.headers.get('authorization');

  if (!authHeader) {
    try {
      const { getToken } = await auth();
      const token = await getToken();
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      authHeader = `Bearer ${token}`;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const headers: HeadersInit = {
    'Content-Type': req.headers.get('content-type') || 'application/json',
    Authorization: authHeader,
  };

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const goResponse = await fetch(goUrl, {
    method: req.method,
    headers,
    body: hasBody ? await req.arrayBuffer() : undefined,
    cache: 'no-store',
  });

  // If Go returns 404, return null to signal fallback to direct handling
  if (goResponse.status === 404) {
    return null;
  }

  const data = await goResponse.json().catch(() => ({}));
  return NextResponse.json(data, {
    status: goResponse.status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
