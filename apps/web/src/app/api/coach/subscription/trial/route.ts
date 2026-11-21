import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer } from '@/lib/api/go-client';

export const dynamic = 'force-dynamic';

/**
 * POST /api/coach/subscription/trial — thin proxy to the Go API.
 * Starts a 7-day free trial subscription for the authenticated coach.
 */
export async function POST(req: Request) {
  const { userId, getToken } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const token = await getToken?.();
  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const result = await goFetchServer<{
      id: string;
      status: string;
      plan_id: string;
      plan_name: string;
    }>('/api/v1/coach/subscription/trial', token, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    const status =
      typeof error === 'object' && error !== null && 'status' in error
        ? Number((error as { status: unknown }).status)
        : 500;
    return NextResponse.json({ error: message }, { status: status >= 400 && status < 600 ? status : 500 });
  }
}
