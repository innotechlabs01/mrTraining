import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

const GO_API_URL = process.env.GO_API_URL || process.env.NEXT_PUBLIC_GO_API_URL || 'http://localhost:9090';
const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' };

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { getToken } = await auth();
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const { id } = await params;
    const res = await fetch(`${GO_API_URL}/api/v1/admin/tickets/${id}/reopen`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to reopen ticket' }));
      return NextResponse.json(error, { status: res.status, headers: NO_STORE_HEADERS });
    }

    const data = await res.json().catch(() => ({ ok: true }));
    return NextResponse.json(data, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error reopening ticket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
