import { NextResponse } from 'next/server';
import { getAthleteTrainingHistory, getAthleteById } from '@/lib/coaching-db';
import { withAuth } from '@/lib/auth-middleware';
import {
  effortSummary,
  effortWeeks,
  effortHistogram,
  hasEffort,
  HARD_RIR,
} from '@/lib/training-engine/effort';

// GET /api/coach/athletes/[id]/effort?days=28
// Aggregated RIR/RPE feedback for one athlete: how hard they train, how much of it was
// hard (<= HARD_RIR), the weekly trend, and the histogram. Averages below MIN_RATED rated
// sets come back null — noise is never dressed up as a finding.
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

  if (!hasEffort(history)) {
    return NextResponse.json(
      { athleteId, enabled: false },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      athleteId,
      enabled: true,
      windowDays: days,
      hardRirThreshold: HARD_RIR,
      summary: effortSummary(history, days),
      weeks: effortWeeks(history, days),
      histogram: effortHistogram(history, days),
    },
    { status: 200 },
  );
});
