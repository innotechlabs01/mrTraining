import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDB, safeExecute } from '@/lib/db/db';
import { publishSetLogged } from '@/lib/nats';

export async function POST(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { exerciseId, setNumber, reps, weight, rpe } = body;

  if (!exerciseId || setNumber == null) {
    return NextResponse.json({ error: 'exerciseId and setNumber required' }, { status: 400 });
  }

  const db = getDB();
  await safeExecute(
    db,
    `INSERT INTO athlete_session_sets (id, session_id, athlete_clerk_id, exercise_id, set_number, reps, weight, rpe, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(session_id, exercise_id, set_number) DO UPDATE SET reps=?, weight=?, rpe=?`,
    [crypto.randomUUID(), params.sessionId, userId, exerciseId, setNumber, reps ?? null, weight ?? null, rpe ?? null, reps ?? null, weight ?? null, rpe ?? null]
  );

  try {
    await publishSetLogged(params.sessionId, userId, exerciseId, setNumber, reps ?? null, weight ?? null, rpe ?? null);
  } catch (e) {
    console.error('[NATS] publish set logged failed', e);
  }

  return NextResponse.json({ success: true, sessionId: params.sessionId });
}
