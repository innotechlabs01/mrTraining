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
  const { exerciseId, setNumber, reps, weight, rpe } = body;

  if (!exerciseId || setNumber == null) {
    return NextResponse.json({ error: 'exerciseId and setNumber required' }, { status: 400 });
  }

  try {
    const data = await goFetchJson(
      token,
      `/api/v1/workouts/${params.sessionId}/sets`,
      {
        method: 'POST',
        body: JSON.stringify({
          athleteId: userId,
          exerciseId,
          setIndex: setNumber,
          weightKg: weight ?? null,
          reps: reps ?? null,
          phase: 'work',
          rpe: rpe ?? null,
        }),
      },
    );
    return NextResponse.json({ success: true, sessionId: params.sessionId, ...(data as object) });
  } catch (error) {
    console.error('Error logging set:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
