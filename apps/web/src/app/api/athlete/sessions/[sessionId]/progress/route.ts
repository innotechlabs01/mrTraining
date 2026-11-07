import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const GO = process.env.NEXT_PUBLIC_GO_API_URL || '';

async function goFetchJson(token: string, path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${GO}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string>),
    },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`Go API ${path}: ${res.status}`);
  }
  return res.json();
}

export async function POST(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { totalVolume, durationSeconds, notes } = body;

  try {
    // Go exposes session progress updates via the session complete endpoint
    // (duration_seconds). totalVolume and notes are not part of the Go session
    // contract for this slice and are intentionally not forwarded.
    await goFetchJson(
      token,
      `/api/v1/workouts/sessions/${params.sessionId}/complete`,
      {
        method: 'POST',
        body: JSON.stringify({ durationSeconds: durationSeconds ?? 0 }),
      },
    );
    return NextResponse.json({ success: true, sessionId: params.sessionId });
  } catch (error) {
    console.error('Error updating session progress:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
