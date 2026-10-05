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
    `SELECT * FROM workout_session_logs
     WHERE athlete_id = ?
     ORDER BY started_at DESC
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

/** Create a new workout session for an athlete. */
export async function createWorkoutSession(workoutId: string, athleteId: string) {
  const db = getDB()
  const id = generateId()
  const now = new Date().toISOString()
  await safeExecute(
    db,
    `INSERT INTO workout_session_logs (id, workout_id, athlete_id, started_at, completed, completed_at, current_exercise_index, duration_seconds)
     VALUES (?, ?, ?, ?, 0, NULL, 0, 0)`,
    [id, workoutId, athleteId, now],
  )
  return { id, workoutId, athleteId, startedAt: now, completed: false, currentExerciseIndex: 0, durationSeconds: 0 }
}

/** Complete a workout session and mark progress 100. */
export async function completeWorkoutSession(sessionId: string) {
  const db = getDB()
  const now = new Date().toISOString()
  await safeExecute(
    db,
    `UPDATE workout_session_logs SET completed = 1, completed_at = ? WHERE id = ?`,
    [now, sessionId],
  )
  // Mark progress 100% when session is completed
  const session = await db.execute('SELECT workout_id FROM workout_session_logs WHERE id = ?', [sessionId])
  if (session.rows.length > 0) {
    const workoutId = session.rows[0].workout_id as string
    await safeExecute(db, `UPDATE assigned_workouts SET progress = 100 WHERE id = ?`, [workoutId])
  }
}

/** Get workout detail with progress. */
export async function getWorkoutDetail(workoutId: string) {
  const db = getDB()
  const result = await db.execute('SELECT * FROM assigned_workouts WHERE id = ?', [workoutId])
  if (result.rows.length === 0) return null
  const w = result.rows[0]
  return {
    id: w.id,
    workout: {
      id: w.id,
      name: w.content_name,
      progress: w.progress,
    },
  }
}

/** Log a workout set with enriched data. */
export async function logWorkoutSet(
  sessionId: string,
  exerciseId: string,
  setIndex: number,
  weightKg: number,
  reps: number,
  options: {
    phase?: 'work' | 'warmup'
    rir?: number | null
    rpe?: number | null
    sec?: number | null
    minutes?: number | null
    speed?: number | null
    skipped?: boolean
  } = {}
) {
  const db = getDB()
  const id = generateId()
  const now = new Date().toISOString()
  await safeExecute(
    db,
    `INSERT INTO workout_set_logs (id, session_id, exercise_id, set_index, weight_kg, reps, completed, logged_at, phase, rir, rpe, sec, skipped)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, sessionId, exerciseId, setIndex, weightKg, reps, 1, now,
     options.phase || 'work', options.rir ?? null, options.rpe ?? null, options.sec ?? null, options.skipped ? 1 : 0],
  )
  return { id, sessionId, exerciseId, setIndex, weightKg, reps, ...options, loggedAt: now }
}

/** List all set logs for a session. */
export async function listSessionSetLogs(sessionId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM workout_set_logs WHERE session_id = ? ORDER BY exercise_id, set_index, logged_at',
    [sessionId],
  )
  return result.rows.map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    exerciseId: r.exercise_id,
    setIndex: r.set_index,
    weightKg: r.weight_kg,
    reps: r.reps,
    completed: r.completed,
    loggedAt: r.logged_at,
    phase: r.phase,
    rir: r.rir,
    rpe: r.rpe,
    sec: r.sec,
    skipped: Boolean(r.skipped),
  }))
}

/** Get training history for an athlete (for engine). */
export async function getAthleteTrainingHistory(athleteId: string) {
  const db = getDB()
  // Get all completed sessions for this athlete
  const sessions = await db.execute(
    `SELECT * FROM workout_session_logs WHERE athlete_id = ? AND completed = 1 ORDER BY started_at`,
    [athleteId],
  )
  const history = []
  const exerciseMeta: Record<string, { name: string; mode: string }> = {}
  for (const s of sessions.rows) {
    const startedAt: string = (s.started_at as string) || new Date().toISOString()
    const logs = await db.execute('SELECT * FROM workout_set_logs WHERE session_id = ? ORDER BY exercise_id, set_index', [s.id])
    
    // Group logs by exercise_id
    const logsByExercise = new Map<string, typeof logs.rows>()
    for (const l of logs.rows) {
      const exId = l.exercise_id as string | null
      if (!exId) continue
      if (!logsByExercise.has(exId)) {
        logsByExercise.set(exId, [])
      }
      logsByExercise.get(exId)!.push(l)
    }
    
    const entries = []
    for (const [exerciseId, exerciseLogs] of logsByExercise) {
      // Get exercise name from assigned_workout_exercises
      const exResult = await db.execute('SELECT name, muscle_groups, mode, phase, prog FROM assigned_workout_exercises WHERE id = ?', [exerciseId])
      let name = exerciseId
      let muscleGroups: string[] = []
      let mode = 'reps'
      let phase = 'work'
      let prog = 'linear'
      if (exResult.rows.length > 0) {
        const ex = exResult.rows[0]
        name = ex.name as string
        const mg = ex.muscle_groups as string | null
        muscleGroups = mg ? mg.split(',').filter(Boolean) : []
        mode = (ex.mode as string) || 'reps'
        phase = (ex.phase as string) || 'work'
        prog = (ex.prog as string) || 'linear'
      }
      
      // Build slug for exerciseMeta
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      exerciseMeta[slug] = { name, mode }
      
      // Get prescription weight from first work set
      const workSets = exerciseLogs.filter(l => l.phase === 'work' && !l.skipped)
      const firstWorkSet = workSets[0]
      const weightKg = firstWorkSet?.weight_kg ?? null
      
      entries.push({
        id: slug,
        target: {
          id: exerciseId,
          mode: mode as 'reps' | 'time' | 'cardio',
          phase: phase as 'work' | 'warmup',
          sets: exerciseLogs.filter(l => !l.skipped).length,
          reps: firstWorkSet?.reps ?? null,
          weightKg,
          prog: prog as 'linear' | 'double' | 'greyskull' | 'time' | 'off',
          muscleGroups,
        },
        sets: exerciseLogs.map(l => ({
          completed: Boolean(l.completed),
          skipped: Boolean(l.skipped),
          phase: (l.phase as 'work' | 'warmup') || 'work',
          weightKg: l.weight_kg,
          reps: l.reps,
          sec: l.sec,
          minutes: l.minutes,
          speed: l.speed,
          rir: l.rir,
          rpe: l.rpe,
        })),
      })
    }
    
    history.push({
      date: startedAt.split('T')[0],
      startedAt: new Date(startedAt).getTime(),
      entries,
    })
  }
  
  return { history, exerciseMeta }
}

/** Get active workout session for an athlete and workout. */
export async function getActiveWorkoutSession(workoutId: string, athleteId: string) {
  const db = getDB()
  const result = await db.execute(
    `SELECT * FROM workout_session_logs WHERE workout_id = ? AND athlete_id = ? AND completed = 0 ORDER BY started_at DESC LIMIT 1`,
    [workoutId, athleteId],
  )
  if (result.rows.length === 0) return null
  const s = result.rows[0]
  return {
    id: s.id,
    workoutId: s.workout_id,
    athleteId: s.athlete_id,
    startedAt: s.started_at,
    completed: Boolean(s.completed),
    completedAt: s.completed_at,
    currentExerciseIndex: s.current_exercise_index,
    durationSeconds: s.duration_seconds,
  }
}
