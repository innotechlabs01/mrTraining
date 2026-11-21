/**
 * GET /api/coach/athletes/[id]/form-metrics
 *
 * Returns form metrics for a specific athlete, grouped by exercise.
 * Proxies to the Go API coach endpoint GET /form-metrics/athlete/:id.
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { goFetchServer } from '@/lib/api/go-client'

export const dynamic = 'force-dynamic'

interface GoExerciseFormStats {
  exercise_id: string
  exercise_name: string
  latest_score: number
  avg_score: number
  best_score: number
  worst_score: number
  trend: string
  sessions: number
  avg_depth: number
  avg_alignment: number
  avg_tempo: number
  history: Array<{ date: string; score: number }>
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { userId, getToken } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = await getToken()
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const athleteId = params.id
    const stats = await goFetchServer<GoExerciseFormStats[]>(
      `/api/v1/form-metrics/athlete/${athleteId}`,
      token,
    )

    return NextResponse.json(stats, { status: 200 })
  } catch (error) {
    console.error('Error fetching athlete form metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 },
    )
  }
}
