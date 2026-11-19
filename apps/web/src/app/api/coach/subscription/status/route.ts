import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer } from '@/lib/api/go-client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/coach/subscription/status — thin proxy to the Go API.
 *
 * The payment provider confirms the payment asynchronously through the
 * webhook, so the frontend polls this endpoint instead of trusting the
 * redirect the payer came back with.
 */
export async function GET() {
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
      status: string;
      reference?: string;
      plan_id?: string;
      plan_name?: string;
    }>('/api/v1/coach/subscription/status', token, { method: 'GET' });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    const status = typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status: unknown }).status)
      : 500;
    return NextResponse.json({ error: message }, { status: status >= 400 && status < 600 ? status : 500 });
  }
}
