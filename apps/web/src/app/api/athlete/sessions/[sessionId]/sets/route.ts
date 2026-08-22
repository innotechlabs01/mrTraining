import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAthleteByClerkId, getWorkoutSession, logWorkoutSet } from '@/lib/coaching-db';

export async function POST(req: Request, ctx: { params: { sessionId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const athlete = await getAthleteByClerkId(userId);
    if (!athlete) {
      return NextResponse.json({ error: 'Athlete profile not found' }, { status: 404 });
    }

    const session = await getWorkoutSession(ctx.params.sessionId);
    if (!session || session.athleteId !== athlete.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const body = await req.json();
    const exerciseId = body?.exerciseId;
    const setIndex = body?.setIndex;
    if (!exerciseId || setIndex === undefined || setIndex === null) {
      return NextResponse.json({ error: 'exerciseId and setIndex are required' }, { status: 400 });
    }

    // Optional training-intelligence fields (migration 010). Validated before persisting.
    const numOrNull = (v: unknown): number | null =>
      v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null;
    const phase: 'warmup' | 'work' | null = body?.phase === 'warmup' ? 'warmup' : body?.phase === 'work' ? 'work' : null;
    const rir = numOrNull(body?.rir);
    const rpe = numOrNull(body?.rpe);
    if (rir != null && (rir < 0 || rir > 10)) {
      return NextResponse.json({ error: 'rir must be between 0 and 10' }, { status: 400 });
    }
    if (rpe != null && (rpe < 1 || rpe > 10)) {
      return NextResponse.json({ error: 'rpe must be between 1 and 10' }, { status: 400 });
    }
    const extra = {
      phase,
      rir,
      rpe,
      sec: numOrNull(body?.sec),
      minutes: numOrNull(body?.minutes),
      speed: numOrNull(body?.speed),
      skipped: body?.skipped === true || body?.skipped === 1,
    };

    const set = await logWorkoutSet(
      session.id,
      exerciseId,
      setIndex,
      body?.weightKg ?? null,
      body?.reps ?? null,
      extra,
    );
    return NextResponse.json({ set }, { status: 201 });
  } catch (error) {
    console.error('Error logging workout set:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
