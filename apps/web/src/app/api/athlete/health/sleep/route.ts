import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAthleteByClerkId, upsertSleepLog, getSleepLogs } from '@/lib/db';

const VALID_SOURCES = ['healthkit', 'healthconnect', 'garmin'];
const MAX_BATCH = 60; // ~2 months of nights

function parseSleepLog(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return 'entry must be an object';
  const s = raw as Record<string, unknown>;
  if (typeof s.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.date)) return 'date must be YYYY-MM-DD';
  const total = Number(s.totalMinutes);
  if (!Number.isFinite(total) || total <= 0 || total > 24 * 60) return 'totalMinutes must be 1..1440';
  for (const field of ['deepMinutes', 'remMinutes', 'lightMinutes', 'awakeMinutes']) {
    if (s[field] != null && (!Number.isFinite(Number(s[field])) || Number(s[field]) < 0)) {
      return `${field} must be a non-negative number`;
    }
  }
  for (const field of ['efficiency', 'score']) {
    if (s[field] != null && (!Number.isFinite(Number(s[field])) || Number(s[field]) < 0 || Number(s[field]) > 100)) {
      return `${field} must be between 0 and 100`;
    }
  }
  if (typeof s.source !== 'string' || !VALID_SOURCES.includes(s.source)) {
    return `source must be one of: ${VALID_SOURCES.join(', ')}`;
  }
  if (typeof s.recordedAt !== 'string' || Number.isNaN(Date.parse(s.recordedAt))) {
    return 'recordedAt must be an ISO timestamp';
  }
  return null;
}

// POST /api/athlete/health/sleep — sync sleep logs (upsert per athlete+date+source).
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const athlete = await getAthleteByClerkId(userId);
    if (!athlete) return NextResponse.json({ error: 'Athlete profile not found' }, { status: 404 });

    const body = await req.json().catch(() => null);
    const rawLogs = Array.isArray(body?.sleepLogs) ? body.sleepLogs : [];
    if (rawLogs.length === 0) {
      return NextResponse.json({ error: 'sleepLogs array is required' }, { status: 400 });
    }
    if (rawLogs.length > MAX_BATCH) {
      return NextResponse.json({ error: `sleepLogs batch too large (max ${MAX_BATCH})` }, { status: 400 });
    }

    // Validate all rows first; reject the batch with the first problem found.
    const parsed = [];
    for (let i = 0; i < rawLogs.length; i++) {
      const error = parseSleepLog(rawLogs[i]);
      if (error) {
        return NextResponse.json({ error: `sleepLogs[${i}]: ${error}` }, { status: 400 });
      }
      const s = rawLogs[i];
      parsed.push({
        date: s.date,
        totalMinutes: Number(s.totalMinutes),
        deepMinutes: s.deepMinutes != null ? Number(s.deepMinutes) : null,
        remMinutes: s.remMinutes != null ? Number(s.remMinutes) : null,
        lightMinutes: s.lightMinutes != null ? Number(s.lightMinutes) : null,
        awakeMinutes: s.awakeMinutes != null ? Number(s.awakeMinutes) : null,
        efficiency: s.efficiency != null ? Number(s.efficiency) : null,
        score: s.score != null ? Number(s.score) : null,
        source: s.source,
        recordedAt: new Date(s.recordedAt).toISOString(),
      });
    }

    for (const log of parsed) {
      await upsertSleepLog(athlete.id, log);
    }

    return NextResponse.json({ received: parsed.length, upserted: parsed.length }, { status: 201 });
  } catch (error) {
    console.error('Error syncing sleep logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/athlete/health/sleep?days=30
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const athlete = await getAthleteByClerkId(userId);
    if (!athlete) return NextResponse.json({ error: 'Athlete profile not found' }, { status: 404 });

    const url = new URL(req.url);
    const daysParam = Number(url.searchParams.get('days') ?? 30);
    const logs = await getSleepLogs(athlete.id, Number.isFinite(daysParam) ? daysParam : 30);
    return NextResponse.json({ sleepLogs: logs }, { status: 200 });
  } catch (error) {
    console.error('Error reading sleep logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
