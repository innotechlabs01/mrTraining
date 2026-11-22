import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

const GO_API_URL = process.env.GO_API_URL || process.env.NEXT_PUBLIC_GO_API_URL || 'http://localhost:9090';
const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' };

async function getAuthToken() {
  const authResult = await auth();
  return await authResult.getToken();
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const { id } = await params;
    const res = await fetch(`${GO_API_URL}/api/v1/admin/tickets/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to fetch ticket' }));
      return NextResponse.json(error, { status: res.status, headers: NO_STORE_HEADERS });
    }

    const data = await res.json();
    return NextResponse.json(data, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const { id } = await params;
    const body = await request.json();

    const res = await fetch(`${GO_API_URL}/api/v1/admin/tickets/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to update ticket' }));
      return NextResponse.json(error, { status: res.status, headers: NO_STORE_HEADERS });
    }

    const data = await res.json();
    return NextResponse.json(data, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error updating ticket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const { id } = await params;
    const body = await request.json();

    const res = await fetch(`${GO_API_URL}/api/v1/admin/tickets/${id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to add message' }));
      return NextResponse.json(error, { status: res.status, headers: NO_STORE_HEADERS });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 201, headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error adding message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
