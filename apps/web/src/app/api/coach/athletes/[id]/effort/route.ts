import { NextResponse } from 'next/server';
import { getAthleteTrainingHistory } from '@/lib/coaching-db';
import { requireCoachAthleteAccess } from '@/lib/coach-athlete-access';
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
export async function GET(req: Request, ctx: { params: { id: string } }) {
  try {
    const access = await requireCoachAthleteAccess(req, ctx);
    if ('error' in access) return access.error;

    const daysParam = Number(new URL(req.url).searchParams.get('days') ?? 28);
    const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 365) : 28;

    const { history } = await getAthleteTrainingHistory(access.athleteId);

    if (!hasEffort(history)) {
      return NextResponse.json(
        { athleteId: access.athleteId, enabled: false },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        athleteId: access.athleteId,
        enabled: true,
        windowDays: days,
        hardRirThreshold: HARD_RIR,
        summary: effortSummary(history, days),
        weeks: effortWeeks(history, days),
        histogram: effortHistogram(history, days),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error building athlete effort report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
