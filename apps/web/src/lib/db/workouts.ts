import { getDB, generateId } from './db'

// ============== Assigned Workouts ==============

export async function getAssignedWorkouts(coachId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM assigned_workouts WHERE coach_id = ? ORDER BY created_at DESC',
    [coachId],
  )
  return result.rows.map(r => ({
    id: r.id, athleteId: r.athlete_id, athleteName: r.athlete_name,
    contentId: r.content_id, contentType: r.content_type, contentName: r.content_name,
    modality: r.modality, startDate: r.start_date, endDate: r.end_date,
    daysOfWeek: JSON.parse(r.days_of_week as string) as number[],
    status: r.status, progress: r.progress,
  }))
}

export async function saveAssignedWorkout(coachId: string, data: Record<string, unknown>) {
  const db = getDB()
  const id = (data.id as string) || generateId()
  // Resolve athleteName if not provided
  let athleteName = (data.athleteName as string | undefined) ?? null
  if (!athleteName && data.athleteId) {
    try {
      const r = await db.execute('SELECT name FROM coach_athletes WHERE id = ? AND coach_id = ? LIMIT 1', [data.athleteId as string, coachId])
      athleteName = (r.rows[0]?.name as string) ?? null
    } catch { /* ignore */ }
  }
  const params = [
    data.athleteId ?? null,
    athleteName,
    data.contentId ?? null,
    data.contentType ?? null,
    data.contentName ?? (data.name as string) ?? null,
    data.modality ?? (data.sportType as string) ?? null,
    data.startDate ?? (data.scheduledDate as string) ?? null,
    data.endDate ?? (data.scheduledDate as string) ?? null,
    JSON.stringify((data.daysOfWeek as unknown[]) || []),
    data.status ?? 'active',
    data.progress ?? 0,
  ]
  const existing = await db.execute('SELECT id FROM assigned_workouts WHERE id = ? AND coach_id = ?', [id, coachId])
  if (existing.rows.length > 0) {
    await db.execute(
      'UPDATE assigned_workouts SET athlete_id=?, athlete_name=?, content_id=?, content_type=?, content_name=?, modality=?, start_date=?, end_date=?, days_of_week=?, status=?, progress=?, updated_at=datetime(\'now\') WHERE id=? AND coach_id=?',
      [...params, id, coachId],
    )
  } else {
    await db.execute(
      'INSERT INTO assigned_workouts (id, athlete_id, athlete_name, content_id, content_type, content_name, modality, start_date, end_date, days_of_week, status, progress, coach_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [id, ...params, coachId],
    )
  }
  return id
}

export async function deleteAssignedWorkout(coachId: string, workoutId: string) {
  const db = getDB()
  await db.execute('DELETE FROM assigned_workouts WHERE id = ? AND coach_id = ?', [workoutId, coachId])
}

// ============== Workout Templates & Session Logs ==============

export type WorkoutExercise = {
  id: string
  workoutId: string
  name: string
  sets: number
  reps: number
  weightKg: number | null
  restSeconds: number | null
  sortOrder: number
  notes: string | null
  // Training-intelligence fields (migration 010). Legacy rows fall back to defaults.
  mode: 'reps' | 'time' | 'cardio'
  phase: 'work' | 'warmup'
  supersetGroup: string | null
  repsMin: number | null
  repsMax: number | null
  prog: 'off' | 'linear' | 'greyskull' | 'double' | 'time' | null
  inc: number | null
  sec: number | null
  minutes: number | null
  speed: number | null
  perSide: boolean
  bodyPart: string | null
  muscleGroups: string[]
  libraryExerciseId: string | null
}

export type WorkoutSession = {
  id: string
  workoutId: string
  athleteId: string
  startedAt: string
  completed: number
  completedAt: string | null
  currentExerciseIndex: number
  durationSeconds: number
}

export type WorkoutSetLog = {
  id: string
  sessionId: string
  exerciseId: string
  setIndex: number
  weightKg: number | null
  reps: number | null
  completed: number
  loggedAt: string
  // Training-intelligence fields (migration 010). Legacy rows leave these undefined.
  phase?: 'work' | 'warmup' | null
  rir?: number | null
  rpe?: number | null
  sec?: number | null
  minutes?: number | null
  speed?: number | null
  skipped?: boolean
}

export type SetLogExtra = {
  phase?: 'work' | 'warmup' | null
  rir?: number | null
  rpe?: number | null
  sec?: number | null
  minutes?: number | null
  speed?: number | null
  skipped?: boolean
}

function mapWorkoutSession(r: Record<string, unknown>): WorkoutSession {
  return {
    id: r.id as string,
    workoutId: r.workout_id as string,
    athleteId: r.athlete_id as string,
    startedAt: r.started_at as string,
    completed: r.completed as number,
    completedAt: r.completed_at as string | null,
    currentExerciseIndex: r.current_exercise_index as number,
    durationSeconds: r.duration_seconds as number,
  }
}

export async function getWorkoutDetail(workoutId: string) {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM assigned_workouts WHERE id = ?',
    [workoutId],
  )
  if (result.rows.length === 0) return null
  const r = result.rows[0]
  const workout = {
    id: r.id as string,
    athleteId: r.athlete_id as string,
    athleteName: r.athlete_name as string || '',
    contentId: r.content_id as string,
    contentType: r.content_type as string,
    contentName: r.content_name as string,
    modality: r.modality as string,
    startDate: r.start_date as string,
    endDate: r.end_date as string,
    daysOfWeek: JSON.parse(r.days_of_week as string || '[]') as number[],
    status: r.status as string,
    progress: r.progress as number || 0,
    coachId: r.coach_id as string,
  }
  const exercisesResult = await db.execute(
    'SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY sort_order',
    [workoutId],
  )
  const exercises: WorkoutExercise[] = exercisesResult.rows.map(e => ({
    id: e.id as string,
    workoutId: e.workout_id as string,
    name: e.name as string,
    sets: e.sets as number,
    reps: e.reps as number,
    weightKg: e.weight_kg as number | null,
    restSeconds: e.rest_seconds as number | null,
    sortOrder: e.sort_order as number,
    notes: e.notes as string | null,
    mode: (e.mode as 'reps' | 'time' | 'cardio') || 'reps',
    phase: (e.phase as 'work' | 'warmup') || 'work',
    supersetGroup: (e.superset_group as string) || null,
    repsMin: (e.reps_min as number) ?? null,
    repsMax: (e.reps_max as number) ?? null,
    prog: (e.prog as WorkoutExercise['prog']) ?? null,
    inc: (e.inc as number) ?? null,
    sec: (e.sec as number) ?? null,
    minutes: (e.minutes as number) ?? null,
    speed: (e.speed as number) ?? null,
    perSide: e.per_side === 1 || e.per_side === true,
    bodyPart: (e.body_part as string) || null,
    muscleGroups: String(e.muscle_groups || '').split(',').map(s => s.trim()).filter(Boolean),
    libraryExerciseId: (e.library_exercise_id as string) || null,
  }))
  return { workout, exercises }
}

export async function getActiveWorkoutSession(workoutId: string, athleteId: string): Promise<WorkoutSession | null> {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM workout_session_logs WHERE workout_id = ? AND athlete_id = ? AND completed = 0 ORDER BY started_at DESC LIMIT 1',
    [workoutId, athleteId],
  )
  if (result.rows.length === 0) return null
  return mapWorkoutSession(result.rows[0])
}

export async function createWorkoutSession(workoutId: string, athleteId: string): Promise<WorkoutSession> {
  const db = getDB()
  const id = generateId()
  const now = new Date().toISOString()
  await db.execute(
    'INSERT INTO workout_session_logs (id, workout_id, athlete_id, started_at, completed, current_exercise_index, duration_seconds) VALUES (?,?,?,?,0,0,0)',
    [id, workoutId, athleteId, now],
  )
  return { id, workoutId, athleteId, startedAt: now, completed: 0, completedAt: null, currentExerciseIndex: 0, durationSeconds: 0 }
}

export async function getWorkoutSession(sessionId: string): Promise<WorkoutSession | null> {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM workout_session_logs WHERE id = ?',
    [sessionId],
  )
  if (result.rows.length === 0) return null
  return mapWorkoutSession(result.rows[0])
}

export async function updateWorkoutSessionProgress(sessionId: string, currentExerciseIndex: number, durationSeconds: number) {
  const db = getDB()
  await db.execute(
    'UPDATE workout_session_logs SET current_exercise_index = ?, duration_seconds = ? WHERE id = ?',
    [currentExerciseIndex, durationSeconds, sessionId],
  )
}

export async function logWorkoutSet(
  sessionId: string,
  exerciseId: string,
  setIndex: number,
  weightKg: number | null,
  reps: number | null,
  extra: SetLogExtra = {},
): Promise<WorkoutSetLog> {
  const db = getDB()
  const id = generateId()
  const now = new Date().toISOString()
  await db.execute(
    `INSERT INTO workout_set_logs
       (id, session_id, exercise_id, set_index, weight_kg, reps, completed, logged_at,
        phase, rir, rpe, sec, minutes, speed, skipped)
     VALUES (?,?,?,?,?,?,1,?,?,?,?,?,?,?,?)`,
    [
      id, sessionId, exerciseId, setIndex, weightKg, reps, now,
      extra.phase ?? null, extra.rir ?? null, extra.rpe ?? null,
      extra.sec ?? null, extra.minutes ?? null, extra.speed ?? null,
      extra.skipped ? 1 : 0,
    ],
  )
  return {
    id, sessionId, exerciseId, setIndex, weightKg, reps, completed: 1, loggedAt: now,
    phase: extra.phase ?? null, rir: extra.rir ?? null, rpe: extra.rpe ?? null,
    sec: extra.sec ?? null, minutes: extra.minutes ?? null, speed: extra.speed ?? null,
    skipped: !!extra.skipped,
  }
}

export function mapWorkoutSetLog(r: Record<string, unknown>): WorkoutSetLog {
  return {
    id: r.id as string,
    sessionId: r.session_id as string,
    exerciseId: r.exercise_id as string,
    setIndex: r.set_index as number,
    weightKg: (r.weight_kg as number) ?? null,
    reps: (r.reps as number) ?? null,
    completed: r.completed as number,
    loggedAt: r.logged_at as string,
    phase: (r.phase as 'work' | 'warmup') || null,
    rir: (r.rir as number) ?? null,
    rpe: (r.rpe as number) ?? null,
    sec: (r.sec as number) ?? null,
    minutes: (r.minutes as number) ?? null,
    speed: (r.speed as number) ?? null,
    skipped: r.skipped === 1 || r.skipped === true,
  }
}

/** Every set log in one session, ordered by exercise then set. */
export async function listSessionSetLogs(sessionId: string): Promise<WorkoutSetLog[]> {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM workout_set_logs WHERE session_id = ? ORDER BY exercise_id, set_index',
    [sessionId],
  )
  return result.rows.map(mapWorkoutSetLog)
}

export async function completeWorkoutSession(sessionId: string) {
  const db = getDB()
  const now = new Date().toISOString()
  const result = await db.execute(
    'SELECT workout_id FROM workout_session_logs WHERE id = ?',
    [sessionId],
  )
  if (result.rows.length > 0) {
    const workoutId = result.rows[0].workout_id as string
    await db.execute('UPDATE assigned_workouts SET progress = 100 WHERE id = ?', [workoutId])
  }
  await db.execute('UPDATE workout_session_logs SET completed = 1, completed_at = ? WHERE id = ?', [now, sessionId])
}
