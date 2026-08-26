import { NextResponse } from 'next/server';
import { getHealthMetrics, getAthleteById } from '@/lib/db';
import { withAuth } from '@/lib/auth-middleware';
import { computeHrZones } from '@/lib/training-engine/hr-zones';

// GET /api/coach/athletes/[id]/hr-zones?from=...&to=...
// HR zone distribution for a time window (e.g., during a workout).
export const GET = withAuth(async (userId, request) => {
  const url = new URL(request.url);
  const athleteId = url.pathname.split('/').pop()!;

  const athlete = await getAthleteById(userId, athleteId);
  if (!athlete) {
    return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
  }

  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const hrMetrics = await getHealthMetrics(athleteId, {
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
    athleteId,
    window: { from: from ?? null, to: to ?? null },
    hrZones: zones,
    sampleCount: samples.length,
  }, { status: 200 });
});
