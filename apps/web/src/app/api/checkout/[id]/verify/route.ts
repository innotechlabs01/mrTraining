import { NextRequest, NextResponse } from 'next/server';

const GO_API_URL = process.env.GO_API_URL || process.env.NEXT_PUBLIC_GO_API_URL || 'http://localhost:9090';
const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' };

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400, headers: NO_STORE_HEADERS });
  }

  try {
    const res = await fetch(
      `${GO_API_URL}/public/checkouts/${encodeURIComponent(params.id)}/verify`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        typeof data?.error === 'string'
          ? data.error
          : data?.error?.message ?? 'No se pudo verificar el pago';
      return NextResponse.json({ error: message }, { status: res.status, headers: NO_STORE_HEADERS });
    }

    return NextResponse.json(data, { headers: NO_STORE_HEADERS });
  } catch {
    return NextResponse.json({ error: 'No se pudo verificar el pago' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
