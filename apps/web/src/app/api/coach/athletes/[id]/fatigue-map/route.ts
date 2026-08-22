import { NextResponse } from 'next/server';
import { getAthleteTrainingHistory } from '@/lib/coaching-db';
import { requireCoachAthleteAccess } from '@/lib/coach-athlete-access';
import { fatigueByMuscle, neglectedMuscles } from '@/lib/training-engine/fatigue';

// GET /api/coach/athletes/[id]/fatigue-map?days=7
// Muscle-level fatigue and retained strength derived from logged volume (36h decay
// half-life), plus the muscles the athlete's plan references but the training window
// has not touched — the "what have I been neglecting" answer.
export async function GET(req: Request, ctx: { params: { id: string } }) {
  try {
    const access = await requireCoachAthleteAccess(req, ctx);
    if ('error' in access) return access.error;

    const daysParam = Number(new URL(req.url).searchParams.get('days') ?? 7);
    const days = Number.isFinite(daysParam) && [1, 7, 30].includes(daysParam) ? daysParam : 7;

    const { history, exerciseMeta } = await getAthleteTrainingHistory(access.athleteId);

    const fatigueMap = fatigueByMuscle(history);
    const muscles = [...fatigueMap.values()].sort((a, b) => b.level - a.level);

    const planMuscles = [
      ...new Set(Object.values(exerciseMeta).flatMap(m => m.muscleGroups)),
    ];
    const neglected = neglectedMuscles(planMuscles, history, days);

    return NextResponse.json(
      {
        athleteId: access.athleteId,
        windowDays: days,
        muscles,
        neglectedMuscles: neglected,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error building athlete fatigue map:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
