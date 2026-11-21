/**
 * POST /api/athlete/form-metrics
 *
 * Receives a batch of form metrics from the athlete's device and syncs them
 * to the Go API (single source of truth). The Go handler resolves the
 * athlete_id from the authenticated session (RLS), so the client does not
 * send a trusted athlete_id.
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { goFetchServer } from '@/lib/api/go-client'

export const dynamic = 'force-dynamic'

type FormMetricEntry = {
  id: string
  exerciseId: string
  exerciseName: string
  workoutId?: string
  formScore: number
  depth: number
  alignment: number
  tempo: number
  timestamp: string
}

interface GoFormMetric {
  id: string
  exercise_id: string
  exercise_name: string
  workout_id?: string | null
  form_score: number
  depth: number
  alignment: number
  tempo: number
  recorded_at: string
}

interface GoBatchSyncRequest {
  metrics: GoFormMetric[]
}

interface GoBatchSyncResponse {
  synced: number
  failed: number
}

export async function POST(request: NextRequest) {
  try {
    const { userId, getToken } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = await getToken()
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { metrics } = body as { metrics: FormMetricEntry[] }

    if (!Array.isArray(metrics) || metrics.length === 0) {
      return NextResponse.json(
        { error: 'metrics array is required' },
        { status: 400 },
      )
    }

    // Map client camelCase entries to Go snake_case payload. athlete_id is
    // resolved server-side by Go from the authenticated session.
    const goMetrics: GoFormMetric[] = metrics.map((m) => ({
      id: m.id,
      exercise_id: m.exerciseId,
      exercise_name: m.exerciseName,
      workout_id: m.workoutId ?? null,
      form_score: m.formScore,
      depth: m.depth,
      alignment: m.alignment,
      tempo: m.tempo,
      recorded_at: m.timestamp,
    }))

    const result = await goFetchServer<GoBatchSyncResponse>(
      '/api/v1/form-metrics/sync',
      token,
      { method: 'POST', body: JSON.stringify({ metrics: goMetrics }) },
    )

    return NextResponse.json({
      success: true,
      synced: result.synced,
    })
  } catch (error) {
    console.error('Error saving form metrics:', error)
    return NextResponse.json(
      { error: 'Failed to save metrics' },
      { status: 500 },
    )
  }
}
