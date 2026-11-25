import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

const GO_API_URL = process.env.GO_API_URL || process.env.NEXT_PUBLIC_GO_API_URL || 'http://localhost:9090';
const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' };

export async function GET(req: NextRequest) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const token = await getToken?.();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const { searchParams } = new URL(req.url);
    const params = new URLSearchParams();
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);

    const query = params.toString();
    const url = `${GO_API_URL}/api/v1/progress/summary${query ? `?${query}` : ''}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error || 'Failed to fetch progress summary' },
        { status: res.status, headers: NO_STORE_HEADERS },
      );
    }

    return NextResponse.json(data, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error fetching athlete progress summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
