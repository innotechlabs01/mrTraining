/**
 * Workout Execution DB functions — Turso/LibSQL
 *
 * Provides scheduled workouts, workout history, and analytics.
 */
import { getDB, generateId, mapRow, safeExecute } from './db'

/** Get scheduled workouts for an athlete. */
export async function getScheduledWorkouts(athleteId: string) {
  const db = getDB()
  const result = await db.execute(
    `SELECT aw.*, wt.name as template_name
     FROM assigned_workouts aw
     LEFT JOIN workout_templates wt ON aw.template_id = wt.id
     WHERE aw.athlete_id = ?
     ORDER BY aw.scheduled_date DESC`,
    [athleteId],
  )
  return result.rows.map(mapRow(result.columns)).map((row: Record<string, unknown>) => ({
    id: row.id,
    workout: {
      id: row.templateId || row.id,
      name: row.templateName || row.name || 'Workout',
      exercises: [],
      tags: [],
      status: row.status,
    },
    athleteId: row.athleteId,
    athleteName: row.athleteName || '',
    scheduledDate: row.scheduledDate,
    scheduledTime: row.scheduledTime,
    status: row.status,
    completedAt: row.completedAt,
    reminderSent: false,
  }))
}

/** Get workout history for an athlete. */
export async function getWorkoutHistory(athleteId: string) {
  const db = getDB()
  const result = await db.execute(
    `SELECT * FROM workout_sessions
     WHERE athlete_id = ?
     ORDER BY date DESC
     LIMIT 50`,
    [athleteId],
  )
  return result.rows.map(mapRow(result.columns)).map((row: Record<string, unknown>) => ({
    id: row.id,
    workoutId: row.workoutId || '',
    workoutName: row.workoutName || 'Workout',
    date: row.date,
    duration: row.duration || 0,
    status: row.status || 'completed',
    totalVolume: row.totalVolume || 0,
    exercisesCompleted: row.exercisesCompleted || 0,
    exercisesTotal: row.exercisesTotal || 0,
    rpe: row.rpe || 0,
    soreness: row.soreness || 0,
    energy: row.energy || 0,
    notes: row.notes || '',
    tags: [],
  }))
}

/** Get workout analytics for an athlete. */
export async function getWorkoutAnalytics(athleteId: string) {
  const db = getDB()

  // Get all sessions
  const sessions = await db.execute(
    'SELECT * FROM workout_sessions WHERE athlete_id = ? ORDER BY date DESC',
    [athleteId],
  )
  const rows = sessions.rows.map(mapRow(sessions.columns))

  const total = rows.length
  const completed = rows.filter((r: Record<string, unknown>) => r.status === 'completed').length
  const missed = rows.filter((r: Record<string, unknown>) => r.status === 'missed').length
  const totalDuration = rows.reduce((sum: number, r: Record<string, unknown>) => sum + (Number(r.duration) || 0), 0)
  const totalVolume = rows.reduce((sum: number, r: Record<string, unknown>) => sum + (Number(r.totalVolume) || 0), 0)

  return {
    overview: {
      totalWorkouts: total,
      completedWorkouts: completed,
      missedWorkouts: missed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      averageDuration: completed > 0 ? Math.round(totalDuration / completed) : 0,
      totalVolume,
      totalTime: totalDuration,
    },
    volume: {
      weeklyVolume: [],
      monthlyVolume: [],
      yearlyVolume: [],
    },
    performance: {
      averageRpe: 0,
      rpeByDay: [],
      strengthProgression: [],
    },
    consistency: {
      currentStreak: 0,
      longestStreak: 0,
      weeklyFrequency: 0,
      monthlyFrequency: 0,
    },
    recentPrs: [],
  }
}
