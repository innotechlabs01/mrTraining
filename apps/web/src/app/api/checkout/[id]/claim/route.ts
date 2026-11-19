import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer } from '@/lib/api/go-client';

export const dynamic = 'force-dynamic';

/**
 * POST /api/checkout/[id]/claim — thin proxy to the Go API.
 *
 * Attaches a paid checkout to the authenticated caller: the subscription is
 * created, the coach is provisioned and the public metadata receives the role,
 * the coach code and the plan.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, getToken } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const token = await getToken?.();
  if (!token) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const checkoutId = params.id;
  if (!checkoutId) {
    return NextResponse.json({ error: 'Falta el checkout' }, { status: 400 });
  }

  try {
    const result = await goFetchServer<{
      checkout_id: string;
      coach_id: string;
      coach_code: string;
      plan_id: string;
      plan_name: string;
    }>(`/api/v1/checkouts/${encodeURIComponent(checkoutId)}/claim`, token, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno';
    const status =
      typeof error === 'object' && error !== null && 'status' in error
        ? Number((error as { status: unknown }).status)
        : 500;
    return NextResponse.json(
      { error: message },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
