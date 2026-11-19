import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer } from '@/lib/api/go-client';

export const dynamic = 'force-dynamic';

/**
 * POST /api/coach/activate — thin proxy to the Go API.
 *
 * The Go API is the only holder of the Clerk secret key, so it is the only
 * party that can decide the role and mirror it into Clerk's PUBLIC metadata.
 * This route just forwards the caller's Clerk token.
 */
export async function POST(req: NextRequest) {
  const { userId, getToken } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const token = await getToken?.();
  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    const result = await goFetchServer<{
      coach_id: string;
      coach_code: string;
      role: string;
      created: boolean;
    }>('/api/v1/coach/activate', token, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    const status = typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status: unknown }).status)
      : 500;
    return NextResponse.json({ error: message }, { status: status >= 400 && status < 600 ? status : 500 });
  }
}
