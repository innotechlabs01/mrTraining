/**
 * GET /api/coach/form-metrics
 *
 * Returns aggregated form metrics for coach's athletes.
 * Groups by athlete+exercise, calculates trends and averages.
 * Proxies to Go API /coach/form-metrics.
 */
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { goFetchServer } from '@/lib/api/go-client'

interface FormMetricStat {
  athlete_id: string;
  athlete_name: string;
  exercise_id: string;
  exercise_name: string;
  latest_score: number;
  avg_score: number;
  best_score: number;
  worst_score: number;
  trend: string;
  sessions: number;
  avg_depth: number;
  avg_alignment: number;
  avg_tempo: number;
}

export async function GET() {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await goFetchServer<FormMetricStat[]>(
      `/api/v1/coach/form-metrics`,
      token,
    );
    return NextResponse.json(stats ?? [], { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } });
  } catch (error) {
    console.error('Error fetching form metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 },
    )
  }
}
