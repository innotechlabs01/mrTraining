import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDB, safeExecute } from '@/lib/db/db';
import { publishSessionProgress } from '@/lib/nats';

export async function POST(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { totalVolume, durationSeconds, notes } = body;

  const db = getDB();
  await safeExecute(
    db,
    `UPDATE athlete_sessions SET total_volume = COALESCE(?, total_volume), duration_seconds = COALESCE(?, duration_seconds), notes = COALESCE(?, notes) WHERE id = ? AND athlete_clerk_id = ?`,
    [totalVolume ?? null, durationSeconds ?? null, notes ?? null, params.sessionId, userId]
  );

  try {
    await publishSessionProgress(params.sessionId, userId, totalVolume ?? null, durationSeconds ?? null);
  } catch (e) {
    console.error('[NATS] publish progress failed', e);
  }

  return NextResponse.json({ success: true, sessionId: params.sessionId });
}
