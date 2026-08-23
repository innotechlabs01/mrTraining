import { NextResponse } from 'next/server';
import { getHealthMetrics, getSleepLogs } from '@/lib/coaching-db';
import { requireCoachAthleteAccess } from '@/lib/coach-athlete-access';

// GET /api/coach/athletes/[id]/health?days=14
// The athlete's wearable-derived signals for the coach: HRV / resting-HR / steps /
// VO2max / calories series plus nightly sleep, each row carrying its source so the
// coach can tell measured data from the athlete's manual self-check-in.
export async function GET(req: Request, ctx: { params: { id: string } }) {
  try {
    const access = await requireCoachAthleteAccess(req, ctx);
    if ('error' in access) return access.error;

    const url = new URL(req.url);
    const daysParam = Number(url.searchParams.get('days') ?? 14);
    const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 90) : 14;

    // One unfiltered read grouped by type beats N queries per type.
    const [metrics, sleepLogs] = await Promise.all([
      getHealthMetrics(access.athleteId, { daysBack: days }),
      getSleepLogs(access.athleteId, days),
    ]);

    const byType = <T extends { metricType: string }>(rows: T[], type: string) =>
      rows.filter(r => r.metricType === type).map(({ metricType: _t, ...rest }) => rest);

    return NextResponse.json(
      {
        athleteId: access.athleteId,
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
  } catch (error) {
    console.error('Error building athlete health report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
