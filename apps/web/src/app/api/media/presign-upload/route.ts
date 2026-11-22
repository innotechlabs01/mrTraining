import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { goFetchServer, GoApiError } from '@/lib/api/go-client';

/**
 * POST /api/media/presign-upload
 * Thin Clerk-authenticated Vercel route: forwards only small JSON metadata
 * to Go API to obtain a Cloudflare R2 SigV4 PUT URL. Zero media bytes touch Vercel.
 */
export async function POST(req: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const result = await goFetchServer<unknown>('/api/v1/media/presign-upload', token, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof GoApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Failed to presign upload' }, { status: 500 });
  }
}
