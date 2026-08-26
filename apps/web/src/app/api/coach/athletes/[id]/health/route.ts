import { NextResponse } from 'next/server';
import { getHealthMetrics, getSleepLogs, getAthleteById } from '@/lib/coaching-db';
import { withAuth } from '@/lib/auth-middleware';

// GET /api/coach/athletes/[id]/health?days=14
// The athlete's wearable-derived signals for the coach: HRV / resting-HR / steps /
// VO2max / calories series plus nightly sleep, each row carrying its source so the
// coach can tell measured data from the athlete's manual self-check-in.
export const GET = withAuth(async (userId, request) => {
  const url = new URL(request.url);
  const athleteId = url.pathname.split('/').pop()!;

  const athlete = await getAthleteById(userId, athleteId);
  if (!athlete) {
    return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
  }

  const daysParam = Number(url.searchParams.get('days') ?? 14);
  const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 90) : 14;

  // One unfiltered read grouped by type beats N queries per type.
  const [metrics, sleepLogs] = await Promise.all([
    getHealthMetrics(athleteId, { daysBack: days }),
    getSleepLogs(athleteId, days),
  ]);

  const byType = <T extends { metricType: string }>(rows: T[], type: string) =>
    rows.filter(r => r.metricType === type).map(({ metricType: _t, ...rest }) => rest);

  return NextResponse.json(
    {
      athleteId,
      windowDays: days,
      hrv: byType(metrics, 'hrv'),
      restingHr: byType(metrics, 'resting_hr'),
      steps: byType(metrics, 'steps'),
      vo2max: byType(metrics, 'vo2max'),
      activeCalories: byType(metrics, 'active_calories'),
      manualReadiness: byType(metrics, 'manual_readiness'),
      sleepLogs,
    },
    { status: 200 },
  );
});
