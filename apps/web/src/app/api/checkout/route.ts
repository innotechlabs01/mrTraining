import { NextRequest, NextResponse } from 'next/server';

const GO_API_URL = process.env.NEXT_PUBLIC_GO_API_URL || 'http://localhost:9090';

export const dynamic = 'force-dynamic';

/**
 * POST /api/checkout — thin proxy to the Go API.
 *
 * Starts a payment BEFORE the buyer has an account: the Go API creates the
 * pending checkout and issues the Wompi link.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  try {
    const res = await fetch(`${GO_API_URL}/public/checkouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        typeof data?.error === 'string'
          ? data.error
          : data?.error?.message ?? 'No se pudo iniciar el pago';
      return NextResponse.json({ error: message }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'No se pudo iniciar el pago' }, { status: 500 });
  }
}
