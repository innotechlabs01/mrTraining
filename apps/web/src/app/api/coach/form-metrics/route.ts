/**
 * GET /api/coach/form-metrics
 *
 * Returns aggregated form metrics for coach's athletes.
 * Groups by exercise, calculates trends and averages.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getDB, safeExecute } from '@/lib/db/db'

export async function GET(request: NextRequest) {
  try {
    const db = getDB()

    // Get coach ID from auth (simplified)
    const coachId = request.headers.get('x-coach-id') || 'default'

    // Get all form metrics for coach's athletes
    const result = await safeExecute(
      db,
      `SELECT
        fm.athlete_id,
        COALESCE(a.name, 'Athlete') as athlete_name,
        fm.exercise_id,
        fm.exercise_name,
        fm.form_score,
        fm.depth,
        fm.alignment,
        fm.tempo,
        fm.recorded_at
      FROM form_metrics fm
      LEFT JOIN coach_athletes a ON fm.athlete_id = a.id
      ORDER BY fm.recorded_at DESC`,
      [],
    )

    // Aggregate by exercise per athlete
    const aggregated = new Map<string, {
      exerciseId: string
      exerciseName: string
      athleteId: string
      athleteName: string
      scores: number[]
      depths: number[]
      alignments: number[]
      tempos: number[]
      timestamps: string[]
    }>()

    for (const row of result.rows) {
      const key = `${row.athlete_id}-${row.exercise_id}`
      if (!aggregated.has(key)) {
        aggregated.set(key, {
          exerciseId: row.exercise_id as string,
          exerciseName: row.exercise_name as string,
          athleteId: row.athlete_id as string,
          athleteName: row.athlete_name as string,
          scores: [],
          depths: [],
          alignments: [],
          tempos: [],
          timestamps: [],
        })
      }
      const entry = aggregated.get(key)!
      entry.scores.push(row.form_score as number)
      entry.depths.push(row.depth as number)
      entry.alignments.push(row.alignment as number)
      entry.tempos.push(row.tempo as number)
      entry.timestamps.push(row.recorded_at as string)
    }

    // Calculate stats
    const stats = Array.from(aggregated.values()).map((entry) => {
      const scores = entry.scores
      const latestScore = scores[0] || 0
      const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      const bestScore = Math.max(...scores)
      const worstScore = Math.min(...scores)

      // Determine trend (compare first half vs second half)
      let trend: 'improving' | 'declining' | 'stable' = 'stable'
      if (scores.length >= 4) {
        const mid = Math.floor(scores.length / 2)
        const firstHalf = scores.slice(0, mid)
        const secondHalf = scores.slice(mid)
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
        if (firstAvg > secondAvg + 5) trend = 'improving'
        else if (secondAvg > firstAvg + 5) trend = 'declining'
      }

      return {
        exerciseId: entry.exerciseId,
        exerciseName: entry.exerciseName,
        athleteId: entry.athleteId,
        athleteName: entry.athleteName,
        latestScore,
        avgScore,
        bestScore,
        worstScore,
        trend,
        sessions: scores.length,
        avgDepth: Math.round(entry.depths.reduce((a, b) => a + b, 0) / entry.depths.length),
        avgAlignment: Math.round(entry.alignments.reduce((a, b) => a + b, 0) / entry.alignments.length),
        avgTempo: Math.round(entry.tempos.reduce((a, b) => a + b, 0) / entry.tempos.length),
      }
    })

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching form metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 },
    )
  }
}
