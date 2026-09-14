/**
 * GET /api/coach/video-analytics — Get video performance metrics for all athletes.
 * GET /api/coach/video-analytics?exerciseId=xxx — Get metrics for a specific exercise.
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getAthleteVideoPerformance, getVideoMetricsForExercise } from '@/lib/db/video-metrics'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const exerciseId = req.nextUrl.searchParams.get('exerciseId')
    if (exerciseId) {
      const metrics = await getVideoMetricsForExercise(exerciseId)
      return NextResponse.json(metrics)
    }

    const performance = await getAthleteVideoPerformance(userId)
    return NextResponse.json(performance)
  } catch (error) {
    console.error('Error fetching video analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
