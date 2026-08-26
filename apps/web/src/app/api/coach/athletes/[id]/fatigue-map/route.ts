import { NextResponse } from 'next/server';
import { getAthleteTrainingHistory, getAthleteById } from '@/lib/coaching-db';
import { withAuth } from '@/lib/auth-middleware';
import { fatigueByMuscle, neglectedMuscles } from '@/lib/training-engine/fatigue';

// GET /api/coach/athletes/[id]/fatigue-map?days=7
// Muscle-level fatigue and retained strength derived from logged volume (36h decay
// half-life), plus the muscles the athlete's plan references but the training window
// has not touched — the "what have I been neglecting" answer.
export const GET = withAuth(async (userId, request) => {
  const url = new URL(request.url);
  const athleteId = url.pathname.split('/').pop()!;

  const athlete = await getAthleteById(userId, athleteId);
  if (!athlete) {
    return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
  }

  const daysParam = Number(url.searchParams.get('days') ?? 7);
  const days = Number.isFinite(daysParam) && [1, 7, 30].includes(daysParam) ? daysParam : 7;

  const { history, exerciseMeta } = await getAthleteTrainingHistory(athleteId);

  const fatigueMap = fatigueByMuscle(history);
  const muscles = [...fatigueMap.values()].sort((a, b) => b.level - a.level);

  const planMuscles = [
    ...new Set(Object.values(exerciseMeta).flatMap(m => m.muscleGroups)),
  ];
  const neglected = neglectedMuscles(planMuscles, history, days);

  return NextResponse.json(
    {
      athleteId,
      windowDays: days,
      muscles,
      neglectedMuscles: neglected,
    },
    { status: 200 },
  );
});
