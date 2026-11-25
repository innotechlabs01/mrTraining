import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic'

const GO_API_URL = process.env.GO_API_URL || process.env.NEXT_PUBLIC_GO_API_URL || 'http://localhost:9090';
const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' };

async function getAuthToken() {
  const authResult = await auth();
  return await authResult.getToken();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const { id } = await params;
    const res = await fetch(`${GO_API_URL}/api/v1/admin/coaches/${encodeURIComponent(id)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch coach' }, { status: res.status, headers: NO_STORE_HEADERS });
    }

    const data = await res.json();
    return NextResponse.json(data, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error fetching coach:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}