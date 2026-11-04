import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

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

export async function GET(_req: NextRequest, { params }: { params: { sessionId: string } }) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await goFetchJson(token, `/api/v1/workouts/sessions/${params.sessionId}`);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
