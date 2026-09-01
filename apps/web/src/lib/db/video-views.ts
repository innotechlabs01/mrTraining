import { getDB, generateId } from './db'

// ============== Video View Tracking (migration 016) ==============

export type VideoViewLog = {
  id: string
  exerciseId: string
  athleteId: string
  startedAt: string
  lastPositionSec: number
  totalDurationSec: number | null
  completed: boolean
  completedAt: string | null
}

/** Start a new view session; returns the view id for subsequent progress updates. */
export async function startVideoView(exerciseId: string, athleteId: string): Promise<string> {
  const db = getDB()
  const id = generateId()
  await db.execute(
    'INSERT INTO exercise_video_views (id, exercise_id, athlete_id, started_at, last_position_sec, completed) VALUES (?,?,?,datetime(\'now\'),0,0)',
    [id, exerciseId, athleteId],
  )
  return id
}

/** Update progress and optionally mark as completed (>= 90% of duration). */
export async function updateVideoView(
  viewId: string,
  positionSec: number,
  totalDurationSec: number,
  completed: boolean,
): Promise<void> {
  const db = getDB()
  await db.execute(
    `UPDATE exercise_video_views
     SET last_position_sec = ?, total_duration_sec = ?, completed = ?, completed_at = CASE WHEN ? = 1 THEN datetime('now') ELSE completed_at END
     WHERE id = ?`,
    [positionSec, totalDurationSec, completed ? 1 : 0, completed ? 1 : 0, viewId],
  )
}

export type VideoAnalytics = {
  exerciseId: string
  exerciseName: string
  totalViews: number
  completedViews: number
  completionRate: number | null
  avgPositionPct: number | null
  lastViewedAt: string | null
}

/** Coach analytics: aggregate view stats per exercise. */
export async function getVideoAnalytics(coachId: string): Promise<VideoAnalytics[]> {
  const db = getDB()
  const result = await db.execute(
    `SELECT
       v.exercise_id,
       el.name AS exercise_name,
       COUNT(*) AS total_views,
       SUM(CASE WHEN v.completed = 1 THEN 1 ELSE 0 END) AS completed_views,
       ROUND(AVG(CASE WHEN v.total_duration_sec > 0 THEN v.last_position_sec / v.total_duration_sec ELSE 0 END), 2) AS avg_position_pct,
       MAX(v.started_at) AS last_viewed_at
     FROM exercise_video_views v
     JOIN exercise_library el ON el.id = v.exercise_id
     WHERE el.coach_id = ? OR el.coach_id IS NULL
     GROUP BY v.exercise_id
     ORDER BY total_views DESC`,
    [coachId],
  )
  return result.rows.map(r => ({
    exerciseId: r.exercise_id as string,
    exerciseName: r.exercise_name as string,
    totalViews: r.total_views as number,
    completedViews: r.completed_views as number,
    completionRate: (r.total_views as number) > 0 ? Math.round((r.completed_views as number) / (r.total_views as number) * 100) : null,
    avgPositionPct: (r.avg_position_pct as number) ?? null,
    lastViewedAt: (r.last_viewed_at as string) || null,
  }))
}
