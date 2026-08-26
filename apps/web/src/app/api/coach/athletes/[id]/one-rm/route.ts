import { NextResponse } from 'next/server';
import { getAthleteTrainingHistory, getAthleteById } from '@/lib/db';
import { withAuth } from '@/lib/auth-middleware';
import { best1RM, e1rmSeries } from '@/lib/training-engine/onerm';

// GET /api/coach/athletes/[id]/one-rm
// Per-exercise estimated 1RM: all-time best with its source set, plus the trend series.
// Reps-capped and formula-backed — the endpoint refuses to guess above 12 reps, same as the UI.
export const GET = withAuth(async (userId, request) => {
  const url = new URL(request.url);
  const athleteId = url.pathname.split('/').pop()!;

  const athlete = await getAthleteById(userId, athleteId);
  if (!athlete) {
    return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
  }

  const { history, exerciseMeta } = await getAthleteTrainingHistory(athleteId);

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

  return NextResponse.json({ athleteId, exercises }, { status: 200 });
});
