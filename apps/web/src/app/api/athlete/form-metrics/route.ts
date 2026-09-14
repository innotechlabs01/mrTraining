/**
 * POST /api/athlete/form-metrics
 *
 * Receives batch of form metrics from athlete's device.
 * Stores in DB for coach analysis.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getDB, safeExecute, generateId } from '@/lib/db/db'

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { metrics } = body as { metrics: FormMetricEntry[] }

    if (!Array.isArray(metrics) || metrics.length === 0) {
      return NextResponse.json(
        { error: 'metrics array is required' },
        { status: 400 },
      )
    }

    const db = getDB()

    // Get athlete ID from auth (simplified — in real app, use Clerk)
    const athleteId = request.headers.get('x-athlete-id') || 'anonymous'

    // Insert each metric
    for (const metric of metrics) {
      const id = generateId()
      await safeExecute(
        db,
        `INSERT INTO form_metrics (
          id, athlete_id, exercise_id, exercise_name, workout_id,
          form_score, depth, alignment, tempo, recorded_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          athleteId,
          metric.exerciseId,
          metric.exerciseName,
          metric.workoutId || null,
          metric.formScore,
          metric.depth,
          metric.alignment,
          metric.tempo,
          metric.timestamp,
        ],
      )
    }

    return NextResponse.json({
      success: true,
      synced: metrics.length,
    })
  } catch (error) {
    console.error('Error saving form metrics:', error)
    return NextResponse.json(
      { error: 'Failed to save metrics' },
      { status: 500 },
    )
  }
}
