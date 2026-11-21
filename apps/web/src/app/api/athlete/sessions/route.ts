import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic'

const GO = process.env.NEXT_PUBLIC_GO_API_URL || '';


async function goFetchJson(token: string, path: string): Promise<unknown> {
  const res = await fetch(`${GO}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Go API ${path}: ${res.status}`);
  }
  return res.json();
}

export async function GET() {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await goFetchJson(token, '/api/v1/athletes/sessions');
    const sessions = Array.isArray(data) ? data : (data as { data?: unknown[] }).data ?? [];
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error fetching athlete sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
