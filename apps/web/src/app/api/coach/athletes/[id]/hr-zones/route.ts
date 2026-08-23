import { NextResponse } from 'next/server';
import { getHealthMetrics } from '@/lib/coaching-db';
import { requireCoachAthleteAccess } from '@/lib/coach-athlete-access';
import { computeHrZones } from '@/lib/training-engine/hr-zones';

// GET /api/coach/athletes/[id]/hr-zones?from=...&to=...
// HR zone distribution for a time window (e.g., during a workout).
export async function GET(req: Request, ctx: { params: { id: string } }) {
  try {
    const access = await requireCoachAthleteAccess(req, ctx);
    if ('error' in access) return access.error;

    const url = new URL(req.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    const hrMetrics = await getHealthMetrics(access.athleteId, {
      metricType: 'resting_hr',
      daysBack: 1,
    });

    const filtered = hrMetrics.filter(m => {
      if (from && m.recordedAt < from) return false;
      if (to && m.recordedAt > to) return false;
      return true;
    });

    const samples = filtered.map(m => ({ bpm: m.value, timestamp: m.recordedAt }));
    const zones = computeHrZones(samples);

    return NextResponse.json({
      athleteId: access.athleteId,
      window: { from: from ?? null, to: to ?? null },
      hrZones: zones,
      sampleCount: samples.length,
    }, { status: 200 });
  } catch (error) {
    console.error('Error computing HR zones:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
