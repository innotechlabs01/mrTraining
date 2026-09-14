/**
 * GET /api/coach/athletes/[id]/form-metrics
 *
 * Returns form metrics for a specific athlete, grouped by exercise.
 * Shows trends, history, and improvement areas.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getDB, safeExecute } from '@/lib/db/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const athleteId = params.id
    const db = getDB()

    // Get all form metrics for this athlete
    const result = await safeExecute(
      db,
      `SELECT
        exercise_id,
        exercise_name,
        form_score,
        depth,
        alignment,
        tempo,
        recorded_at
      FROM form_metrics
      WHERE athlete_id = ?
      ORDER BY recorded_at DESC`,
      [athleteId],
    )

    // Group by exercise
    const exerciseMap = new Map<string, {
      exerciseId: string
      exerciseName: string
      scores: number[]
      depths: number[]
      alignments: number[]
      tempos: number[]
      dates: string[]
    }>()

    for (const row of result.rows) {
      const exId = row.exercise_id as string
      if (!exerciseMap.has(exId)) {
        exerciseMap.set(exId, {
          exerciseId: exId,
          exerciseName: row.exercise_name as string,
          scores: [],
          depths: [],
          alignments: [],
          tempos: [],
          dates: [],
        })
      }
      const entry = exerciseMap.get(exId)!
      entry.scores.push(row.form_score as number)
      entry.depths.push(row.depth as number)
      entry.alignments.push(row.alignment as number)
      entry.tempos.push(row.tempo as number)
      entry.dates.push(row.recorded_at as string)
    }

    // Calculate stats per exercise
    const stats = Array.from(exerciseMap.values()).map((entry) => {
      const scores = entry.scores
      const latest_score = scores[0] || 0
      const avg_score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      const best_score = Math.max(...scores)
      const worst_score = Math.min(...scores)

      // Determine trend
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

      // Build history (date, score pairs)
      const history = entry.dates.map((date, i) => ({
        date,
        score: scores[i],
      }))

      return {
        exercise_id: entry.exerciseId,
        exercise_name: entry.exerciseName,
        latest_score,
        avg_score,
        best_score,
        worst_score,
        trend,
        sessions: scores.length,
        avg_depth: Math.round(entry.depths.reduce((a, b) => a + b, 0) / entry.depths.length),
        avg_alignment: Math.round(entry.alignments.reduce((a, b) => a + b, 0) / entry.alignments.length),
        avg_tempo: Math.round(entry.tempos.reduce((a, b) => a + b, 0) / entry.tempos.length),
        history,
      }
    })

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching athlete form metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 },
    )
  }
}
