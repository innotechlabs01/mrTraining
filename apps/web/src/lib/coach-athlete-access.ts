import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAthleteById } from '@/lib/db';

/**
 * Shared access guard for coach-scoped athlete reads (rules 05 §15):
 * auth first, actor resolved from session, and the athlete must belong to this
 * coach — out-of-scope always reads as not found.
 */
export async function requireCoachAthleteAccess(
  _req: Request,
  ctx: { params: { id: string } },
): Promise<{ coachId: string; athleteId: string } | { error: NextResponse }> {
  const { userId } = await auth();
  if (!userId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const athlete = await getAthleteById(userId, ctx.params.id);
  if (!athlete) {
    // Never leak whether the athlete exists outside this coach's scope.
    return { error: NextResponse.json({ error: 'Athlete not found' }, { status: 404 }) };
  }

  return { coachId: userId, athleteId: ctx.params.id };
}
