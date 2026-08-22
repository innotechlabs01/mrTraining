import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getAthleteByClerkId,
  insertHealthMetrics,
  getHealthMetrics,
  markDeviceSynced,
  type IncomingHealthMetric,
} from '@/lib/coaching-db';

// 'manual_readiness' lets the athlete's self-check-in live beside wearable data
// without either overwriting the other.
const VALID_TYPES = ['resting_hr', 'hrv', 'steps', 'vo2max', 'active_calories', 'workout_duration', 'manual_readiness'];
const VALID_UNITS = ['bpm', 'ms', 'steps', 'ml/kg/min', 'kcal', 'minutes', 'score'];
const VALID_SOURCES = ['healthkit', 'healthconnect', 'garmin', 'manual'];
const MAX_BATCH = 500;

function parseMetric(raw: unknown): IncomingHealthMetric | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  if (typeof m.metricType !== 'string' || !VALID_TYPES.includes(m.metricType)) return null;
  const value = Number(m.value);
  if (!Number.isFinite(value) || value < 0) return null;
  if (typeof m.unit !== 'string' || !VALID_UNITS.includes(m.unit)) return null;
  if (typeof m.source !== 'string' || !VALID_SOURCES.includes(m.source)) return null;
  if (typeof m.recordedAt !== 'string' || Number.isNaN(Date.parse(m.recordedAt))) return null;
  return {
    metricType: m.metricType,
    value,
    unit: m.unit,
    source: m.source as import('@/lib/coaching-db').HealthPlatform,
    sourceWorkoutId: typeof m.sourceWorkoutId === 'string' ? m.sourceWorkoutId : null,
    recordedAt: new Date(m.recordedAt).toISOString(),
  };
}

// POST /api/athlete/health/metrics — batch sync from the mobile health bridge.
// Idempotent: duplicates on (athlete, type, recorded_at) are ignored and reported.
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const athlete = await getAthleteByClerkId(userId);
    if (!athlete) return NextResponse.json({ error: 'Athlete profile not found' }, { status: 404 });

    const body = await req.json().catch(() => null);
    const rawMetrics = Array.isArray(body?.metrics) ? body.metrics : [];
    if (rawMetrics.length === 0) {
      return NextResponse.json({ error: 'metrics array is required' }, { status: 400 });
    }
    if (rawMetrics.length > MAX_BATCH) {
      return NextResponse.json({ error: `metrics batch too large (max ${MAX_BATCH})` }, { status: 400 });
    }

    // Validate every row before touching the database; report invalid ones by index.
    const parsed: IncomingHealthMetric[] = [];
    const invalidIndexes: number[] = [];
    rawMetrics.forEach((raw: unknown, i: number) => {
      const metric = parseMetric(raw);
      if (metric) parsed.push(metric);
      else invalidIndexes.push(i);
    });

    const inserted = await insertHealthMetrics(athlete.id, parsed);

    // Mark the source device as synced so the app can compute incremental windows.
    const sources = [...new Set(parsed.map(m => m.source))];
    for (const source of sources) {
      await markDeviceSynced(athlete.id, source as never);
    }

    return NextResponse.json(
      {
        received: rawMetrics.length,
        valid: parsed.length,
        inserted,
        duplicatesIgnored: parsed.length - inserted,
        ...(invalidIndexes.length > 0 ? { invalidIndexes } : {}),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error syncing health metrics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/athlete/health/metrics?type=hrv&days=30
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const athlete = await getAthleteByClerkId(userId);
    if (!athlete) return NextResponse.json({ error: 'Athlete profile not found' }, { status: 404 });

    const url = new URL(req.url);
    const type = url.searchParams.get('type') ?? undefined;
    const daysParam = Number(url.searchParams.get('days') ?? 30);
    if (type && !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: `invalid metric type: ${type}` }, { status: 400 });
    }

    const metrics = await getHealthMetrics(athlete.id, {
      metricType: type || undefined,
      daysBack: Number.isFinite(daysParam) ? daysParam : 30,
    });
    return NextResponse.json({ metrics }, { status: 200 });
  } catch (error) {
    console.error('Error reading health metrics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
