import { NextResponse } from 'next/server';
import { getAthleteTrainingHistory } from '@/lib/coaching-db';
import { requireCoachAthleteAccess } from '@/lib/coach-athlete-access';
import { best1RM, e1rmSeries } from '@/lib/training-engine/onerm';

// GET /api/coach/athletes/[id]/one-rm
// Per-exercise estimated 1RM: all-time best with its source set, plus the trend series.
// Reps-capped and formula-backed — the endpoint refuses to guess above 12 reps, same as the UI.
export async function GET(req: Request, ctx: { params: { id: string } }) {
  try {
    const access = await requireCoachAthleteAccess(req, ctx);
    if ('error' in access) return access.error;

    const { history, exerciseMeta } = await getAthleteTrainingHistory(access.athleteId);

    const exercises = Object.values(exerciseMeta)
      .filter(meta => meta.mode === 'reps')
      .map(meta => {
        const best = best1RM(history, meta.key);
        const series = e1rmSeries(history, meta.key).slice(-30);
        return {
          exerciseKey: meta.key,
          name: meta.name,
          best: best
            ? { est: best.est, weightKg: best.weightKg, reps: best.reps, date: best.date }
            : null,
          series,
        };
      })
      .filter(e => e.best !== null)
      .sort((a, b) => (b.best!.est ?? 0) - (a.best!.est ?? 0));

    return NextResponse.json({ athleteId: access.athleteId, exercises }, { status: 200 });
  } catch (error) {
    console.error('Error building athlete one-rm report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
