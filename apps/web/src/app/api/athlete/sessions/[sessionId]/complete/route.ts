import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDB, safeExecute } from '@/lib/db/db';
import { publishSessionCompleted } from '@/lib/nats';

export async function POST(_req: NextRequest, { params }: { params: { sessionId: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDB();
  const completedAt = new Date().toISOString();

  await safeExecute(
    db,
    `UPDATE athlete_sessions SET completed_at = ?, status = 'completed' WHERE id = ? AND athlete_clerk_id = ?`,
    [completedAt, params.sessionId, userId]
  );

  try {
    await publishSessionCompleted(params.sessionId, userId, completedAt);
  } catch (e) {
    console.error('[NATS] publish failed', e);
  }

  return NextResponse.json({ success: true, sessionId: params.sessionId, completedAt });
}
