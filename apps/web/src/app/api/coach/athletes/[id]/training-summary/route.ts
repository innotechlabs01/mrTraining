import { NextResponse } from 'next/server';
import { getAthleteTrainingHistory, getAthleteById } from '@/lib/coaching-db';
import { withAuth } from '@/lib/auth-middleware';
import { setStimulusKg } from '@/lib/training-engine/fatigue';
import { isDone } from '@/lib/training-engine/workout-model';

// GET /api/coach/athletes/[id]/training-summary?days=28
// What the coach needs at a glance: adherence, volume, and the recent sessions of one
// athlete, all derived from logged history — never from self-reported numbers.
export const GET = withAuth(async (userId, request) => {
  const url = new URL(request.url);
  const athleteId = url.pathname.split('/').pop()!;

  const athlete = await getAthleteById(userId, athleteId);
  if (!athlete) {
    return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
  }

  const daysParam = Number(url.searchParams.get('days') ?? 28);
  const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 365) : 28;

  const { history } = await getAthleteTrainingHistory(athleteId);

  const cutoff = Date.now() - days * 86400000;
  const recent = history.filter(s => s.startedAt >= cutoff);

  let totalVolumeKg = 0;
  let totalSets = 0;
  for (const session of recent) {
    for (const entry of session.entries) {
      for (let i = 0; i < entry.sets.length; i++) {
        totalSets += isDone(entry.sets[i]) ? 1 : 0;
        totalVolumeKg += setStimulusKg(entry, i);
      }
    }
  }

  return NextResponse.json(
    {
      athleteId,
      windowDays: days,
      sessions: recent.length,
      avgSessionsPerWeek: recent.length / (days / 7),
      totalSets,
      totalVolumeKg: Math.round(totalVolumeKg),
      recentSessions: [...history]
        .reverse()
        .slice(0, 5)
        .map(s => ({
          date: s.date,
          workoutName: s.workoutName,
          exercises: s.entries.length,
        })),
    },
    { status: 200 },
  );
});
