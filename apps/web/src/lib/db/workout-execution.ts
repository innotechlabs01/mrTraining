/**
 * Workout Execution DB functions — Turso/LibSQL
 *
 * Provides scheduled workouts, workout history, and analytics.
 */
import { getDB, generateId, mapRow, safeExecute } from './db'
import type { Row } from '@libsql/client'

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

// ============== Assigned Workouts (Coach Dashboard) ==============

export interface AssignedWorkout {
  id: string
  athleteId: string
  athleteName: string
  contentName: string
  contentType: string
  modality: string
  startDate: string
  endDate: string | null
  daysOfWeek: number[]
  status: string
  progress: number
  exercises?: AssignedWorkoutExercise[]
}

export interface AssignedWorkoutExercise {
  id: string
  workoutId: string
  name: string
  sets: number
  reps: number
  weightKg: number | null
  restSeconds: number | null
  notes: string | null
  sortOrder: number
  muscleGroups: string[]
  libraryExerciseId: string | null
}

export async function getAssignedWorkouts(coachId: string): Promise<AssignedWorkout[]> {
  const db = getDB()
  const result = await db.execute(
    `SELECT aw.*, ca.name as athlete_name
     FROM assigned_workouts aw
     INNER JOIN coach_athletes ca ON aw.athlete_id = ca.id
     WHERE ca.coach_id = ?
     ORDER BY aw.created_at DESC`,
    [coachId]
  )
  return result.rows.map((r: Row) => ({
    id: r.id as string,
    athleteId: r.athlete_id as string,
    athleteName: r.athlete_name as string,
    contentName: r.content_name as string,
    contentType: r.content_type as string,
    modality: r.modality as string,
    startDate: r.start_date as string,
    endDate: r.end_date as string | null,
    daysOfWeek: JSON.parse(r.days_of_week as string || '[]') as number[],
    status: r.status as string,
    progress: r.progress as number || 0,
  }))
}

export async function getAssignedWorkoutDetail(coachId: string, workoutId: string): Promise<AssignedWorkout | null> {
  const db = getDB()
  const result = await db.execute(
    `SELECT aw.*, ca.name as athlete_name
     FROM assigned_workouts aw
     INNER JOIN coach_athletes ca ON aw.athlete_id = ca.id
     WHERE aw.id = ? AND ca.coach_id = ?`,
    [workoutId, coachId]
  )
  if (result.rows.length === 0) return null
  const r = result.rows[0]

  const exercisesResult = await db.execute(
    'SELECT * FROM assigned_workout_exercises WHERE workout_id = ? ORDER BY sort_order',
    [workoutId]
  )
  const exercises: AssignedWorkoutExercise[] = exercisesResult.rows.map((ex: Row) => ({
    id: ex.id as string,
    workoutId: ex.workout_id as string,
    name: ex.name as string,
    sets: ex.sets as number,
    reps: ex.reps as number,
    weightKg: ex.weight_kg as number | null,
    restSeconds: ex.rest_seconds as number | null,
    notes: ex.notes as string | null,
    sortOrder: ex.sort_order as number,
    muscleGroups: ex.muscle_groups ? (ex.muscle_groups as string).split(',').filter(Boolean) : [],
    libraryExerciseId: ex.library_exercise_id as string | null,
    prog: ex.prog as string | null,
    mode: ex.mode as string | null,
    phase: ex.phase as string | null,
    supersetGroup: ex.superset_group as string | null,
    repsMin: ex.reps_min as number | null,
    repsMax: ex.reps_max as number | null,
    inc: ex.inc as number | null,
    sec: ex.sec as number | null,
    minutes: ex.minutes as number | null,
    speed: ex.speed as number | null,
    perSide: ex.per_side as number | null,
    bodyPart: ex.body_part as string | null,
  }))

  return {
    id: r.id as string,
    athleteId: r.athlete_id as string,
    athleteName: r.athlete_name as string,
    contentName: r.content_name as string,
    contentType: r.content_type as string,
    modality: r.modality as string,
    startDate: r.start_date as string,
    endDate: r.end_date as string | null,
    daysOfWeek: JSON.parse(r.days_of_week as string || '[]') as number[],
    status: r.status as string,
    progress: r.progress as number || 0,
    exercises,
  }
}

export async function saveAssignedWorkout(coachId: string, data: Record<string, unknown>): Promise<string> {
  const db = getDB()
  const workoutId = (data.id as string) || generateId()
  const now = new Date().toISOString()

  // Verify the athlete belongs to this coach
  const athleteId = data.athleteId as string
  const athleteCheck = await db.execute('SELECT id FROM coach_athletes WHERE id = ? AND coach_id = ?', [athleteId, coachId])
  if (athleteCheck.rows.length === 0) {
    throw new Error('Athlete not found or not assigned to this coach')
  }

  const existing = await db.execute('SELECT id FROM assigned_workouts WHERE id = ?', [workoutId])

  if (existing.rows.length > 0) {
    await safeExecute(
      db,
      `UPDATE assigned_workouts SET
        content_name=?, content_type=?, content_id=?, modality=?, start_date=?, end_date=?, days_of_week=?, status=?, progress=?, updated_at=?
       WHERE id=?`,
      [
        data.contentName, data.contentType, data.contentId || null, data.modality, data.startDate, data.endDate || null,
        JSON.stringify(data.daysOfWeek || []), data.status, data.progress || 0, now, workoutId
      ]
    )
  } else {
    await safeExecute(
      db,
      `INSERT INTO assigned_workouts (id, athlete_id, athlete_name, content_id, content_name, content_type, modality, start_date, end_date, days_of_week, status, progress, coach_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        workoutId, athleteId, data.athleteName || '', data.contentId || '', data.contentName, data.contentType, data.modality,
        data.startDate, data.endDate || null, JSON.stringify(data.daysOfWeek || []),
        data.status, data.progress || 0, coachId, now, now
      ]
    )
  }

  return workoutId
}

export async function saveAssignedWorkoutExercises(workoutId: string, items: Array<{
  name: string
  sets: number
  reps: number
  weightKg: number | null
  restSeconds: number | null
  notes: string | null
  sortOrder: number
  muscleGroups: string[]
  libraryExerciseId: string | null
}>): Promise<void> {
  const db = getDB()
  await db.execute('DELETE FROM assigned_workout_exercises WHERE workout_id = ?', [workoutId])
  for (const item of items) {
    await safeExecute(
      db,
      `INSERT INTO assigned_workout_exercises (id, workout_id, name, sets, reps, weight_kg, rest_seconds, notes, sort_order, muscle_groups, library_exercise_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [generateId(), workoutId, item.name, item.sets, item.reps, item.weightKg, item.restSeconds, item.notes, item.sortOrder, JSON.stringify(item.muscleGroups), item.libraryExerciseId]
    )
  }
}

export async function deleteAssignedWorkout(coachId: string, workoutId: string): Promise<void> {
  const db = getDB()
  // Verify the workout belongs to one of the coach's athletes
  const check = await db.execute(
    `SELECT aw.id FROM assigned_workouts aw
     INNER JOIN coach_athletes ca ON aw.athlete_id = ca.id
     WHERE aw.id = ? AND ca.coach_id = ?`,
    [workoutId, coachId]
  )
  if (check.rows.length === 0) {
    throw new Error('Workout not found or not assigned to this coach')
  }
  await db.execute('DELETE FROM assigned_workout_exercises WHERE workout_id = ?', [workoutId])
  await db.execute('DELETE FROM assigned_workouts WHERE id = ?', [workoutId])
}
