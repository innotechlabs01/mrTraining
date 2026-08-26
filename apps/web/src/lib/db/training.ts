// @ts-nocheck — libsql InValue type is too strict for Record<string, unknown> dynamic params.
import { getDB, generateId } from './db'
import type { WorkoutExercise } from './workouts'

// ============== Athlete Training History (training intelligence) ==============

export type EngineSet = {
  completed?: boolean | number
  skipped?: boolean | number
  phase?: 'work' | 'warmup' | null
  weightKg?: number | null
  reps?: number | null
  sec?: number | null
  minutes?: number | null
  speed?: number | null
  rir?: number | null
  rpe?: number | null
}

export type AthleteExerciseMeta = {
  key: string
  name: string
  libraryExerciseId: string | null
  muscleGroups: string[]
  bodyPart: string | null
  mode: 'reps' | 'time' | 'cardio'
}

export type AthleteTrainingHistory = {
  /** Engine-shaped history, oldest first. Entry ids are stable exercise keys. */
  history: Array<{
    date: string
    startedAt: number
    workoutName: string
    entries: Array<{ id: string; target: Record<string, unknown>; sets: EngineSet[] }>
  }>
  /** Identity metadata per exercise key (for labels in coach views). */
  exerciseMeta: Record<string, AthleteExerciseMeta>
}

function exerciseKey(libraryExerciseId: unknown, name: unknown): string {
  if (libraryExerciseId) return String(libraryExerciseId)
  return String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

/**
 * Completed sessions of one athlete shaped for the training engine.
 * Exercises are grouped by library id when present, else by normalized name, so the same
 * lift keeps one identity across different assigned workouts — that is what makes
 * progression / 1RM / fatigue derivable from history at all.
 */
export async function getAthleteTrainingHistory(athleteId: string): Promise<AthleteTrainingHistory> {
  const db = getDB()
  const result = await db.execute(
    `SELECT s.id AS session_id, s.started_at, w.content_name,
            we.name AS exercise_name, we.library_exercise_id, we.muscle_groups,
            we.body_part, we.mode AS ex_mode, we.sets AS target_sets,
            we.reps AS target_reps, we.sec AS target_sec, we.weight_kg AS target_weight_kg,
            sl.set_index, sl.weight_kg, sl.reps, sl.completed, sl.phase, sl.rir, sl.rpe,
            sl.sec, sl.minutes, sl.speed, sl.skipped
     FROM workout_set_logs sl
     JOIN workout_session_logs s ON sl.session_id = s.id
     JOIN assigned_workouts w ON s.workout_id = w.id
     JOIN workout_exercises we ON sl.exercise_id = we.id
     WHERE s.athlete_id = ? AND s.completed = 1
     ORDER BY s.started_at ASC, sl.logged_at ASC`,
    [athleteId],
  )

  const sessions = new Map<string, AthleteTrainingHistory['history'][number]>()
  const entryIndex = new Map<string, Map<string, AthleteTrainingHistory['history'][number]['entries'][number]>>()
  const exerciseMeta: Record<string, AthleteExerciseMeta> = {}

  for (const r of result.rows) {
    const sid = r.session_id as string
    let session = sessions.get(sid)
    if (!session) {
      const startedAt = Date.parse(r.started_at as string)
      session = {
        date: new Date(Number.isFinite(startedAt) ? startedAt : Date.now()).toISOString().slice(0, 10),
        startedAt,
        workoutName: (r.content_name as string) || '',
        entries: [],
      }
      sessions.set(sid, session)
      entryIndex.set(sid, new Map())
    }

    const key = exerciseKey(r.library_exercise_id, r.exercise_name)
    const perSession = entryIndex.get(sid)!
    let entry = perSession.get(key)
    if (!entry) {
      entry = {
        id: key,
        target: {
          sets: (r.target_sets as number) ?? undefined,
          reps: (r.target_reps as number) ?? undefined,
          sec: (r.target_sec as number) ?? undefined,
          weightKg: (r.target_weight_kg as number) ?? undefined,
          mode: (r.ex_mode as string) || undefined,
          muscleGroups: String(r.muscle_groups || '').split(',').map(s => s.trim()).filter(Boolean),
          bodyPart: (r.body_part as string) || undefined,
        },
        sets: [],
      }
      perSession.set(key, entry)
      session.entries.push(entry)

      if (!exerciseMeta[key]) {
        exerciseMeta[key] = {
          key,
          name: (r.exercise_name as string) || key,
          libraryExerciseId: (r.library_exercise_id as string) || null,
          muscleGroups: String(r.muscle_groups || '').split(',').map(s => s.trim()).filter(Boolean),
          bodyPart: (r.body_part as string) || null,
          mode: ((r.ex_mode as string) || 'reps') as AthleteExerciseMeta['mode'],
        }
      }
    }

    entry.sets.push({
      setIndex: r.set_index as number,
      completed: r.completed as number,
      skipped: r.skipped as number,
      phase: (r.phase as string) || null,
      weightKg: (r.weight_kg as number) ?? null,
      reps: (r.reps as number) ?? null,
      rir: (r.rir as number) ?? null,
      rpe: (r.rpe as number) ?? null,
      sec: (r.sec as number) ?? null,
      minutes: (r.minutes as number) ?? null,
      speed: (r.speed as number) ?? null,
    } as EngineSet & { setIndex: number })
  }

  return { history: [...sessions.values()], exerciseMeta }
}

// ============== Workout Templates (migration 014) ==============

export type WorkoutTemplateExercise = Omit<WorkoutExercise, 'workoutId'> & { templateId?: string }

export type WorkoutTemplateSummary = {
  id: string
  coachId: string
  name: string
  description: string
  goal: string
  estimatedDurationMinutes: number | null
  exerciseCount: number
  createdAt: string
}

export type WorkoutTemplateDetail = WorkoutTemplateSummary & {
  exercises: WorkoutTemplateExercise[]
}

/** List the coach's templates with an exercise count (single aggregate query). */
export async function listWorkoutTemplates(coachId: string): Promise<WorkoutTemplateSummary[]> {
  const db = getDB()
  const result = await db.execute(
    `SELECT t.*, COUNT(e.id) AS exercise_count
     FROM workout_templates t
     LEFT JOIN workout_template_exercises e ON e.template_id = t.id
     WHERE t.coach_id = ?
     GROUP BY t.id
     ORDER BY t.created_at DESC`,
    [coachId],
  )
  return result.rows.map(r => ({
    id: r.id as string,
    coachId: r.coach_id as string,
    name: r.name as string,
    description: (r.description as string) || '',
    goal: (r.goal as string) || '',
    estimatedDurationMinutes: (r.estimated_duration_minutes as number) ?? null,
    exerciseCount: r.exercise_count as number,
    createdAt: r.created_at as string,
  }))
}

/**
 * Create a template with its exercises in one call. Exercises accept the same shapes as
 * assignment payloads (enriched or legacy builder), mapped once here.
 */
export async function saveWorkoutTemplate(coachId: string, data: {
  id?: string; name: string; description?: string; goal?: string;
  estimatedDurationMinutes?: number | null;
  exercises?: Array<Record<string, unknown>>;
}): Promise<string> {
  const db = getDB()
  const id = data.id || generateId()
  const existing = await db.execute('SELECT id FROM workout_templates WHERE id = ? AND coach_id = ?', [id, coachId])
  if (existing.rows.length > 0) {
    await db.execute(
      "UPDATE workout_templates SET name=?, description=?, goal=?, estimated_duration_minutes=?, updated_at=datetime('now') WHERE id=? AND coach_id=?",
      [data.name, data.description ?? '', data.goal ?? '', data.estimatedDurationMinutes ?? null, id, coachId],
    )
  } else {
    await db.execute(
      'INSERT INTO workout_templates (id, coach_id, name, description, goal, estimated_duration_minutes) VALUES (?,?,?,?,?,?)',
      [id, coachId, data.name, data.description ?? '', data.goal ?? '', data.estimatedDurationMinutes ?? null],
    )
  }
  if (Array.isArray(data.exercises)) {
    await db.execute('DELETE FROM workout_template_exercises WHERE template_id = ?', [id])
    for (let idx = 0; idx < data.exercises.length; idx++) {
      const raw = data.exercises[idx] as Record<string, unknown>
      const name = String(raw?.name ?? raw?.exerciseName ?? '').trim()
      if (!name) continue
      const setsRaw = raw?.sets
      const setArray = Array.isArray(setsRaw) ? setsRaw : null
      const setsCount = setArray ? setArray.length || 1 : Number(setsRaw ?? 1)
      await db.execute(
        `INSERT INTO workout_template_exercises
           (id, template_id, name, sets, reps, weight_kg, rest_seconds, sort_order, notes,
            mode, phase, superset_group, reps_min, reps_max, prog, inc, sec, minutes, speed,
            per_side, body_part, muscle_groups, library_exercise_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          generateId(), id, name,
          Number.isFinite(setsCount) && setsCount > 0 ? setsCount : 1,
          Number(raw?.reps ?? 0),
          (raw?.weightKg as number) ?? (raw?.weight as number) ?? null,
          (raw?.restSeconds as number) ?? (raw?.rest as number) ?? null,
          Number(raw?.sortOrder ?? raw?.order ?? idx),
          typeof raw?.notes === 'string' ? raw.notes : null,
          (raw?.mode as string) || 'reps',
          (raw?.phase as string) || 'work',
          (raw?.supersetGroup as string) || null,
          (raw?.repsMin as number) ?? null,
          (raw?.repsMax as number) ?? null,
          (raw?.prog as string) ?? null,
          (raw?.inc as number) ?? null,
          (raw?.sec as number) ?? null,
          (raw?.minutes as number) ?? null,
          (raw?.speed as number) ?? null,
          raw?.perSide ? 1 : 0,
          (raw?.bodyPart as string) || null,
          Array.isArray(raw?.muscleGroups) ? (raw.muscleGroups as string[]).join(',') : '',
          typeof raw?.libraryExerciseId === 'string' ? raw.libraryExerciseId : null,
        ],
      )
    }
  }
  return id
}

/** Ownership-checked detail read: out-of-scope reads as not found. */
export async function getWorkoutTemplate(coachId: string, templateId: string): Promise<WorkoutTemplateDetail | null> {
  const db = getDB()
  const head = await db.execute('SELECT * FROM workout_templates WHERE id = ? AND coach_id = ?', [templateId, coachId])
  if (head.rows.length === 0) return null
  const t = head.rows[0]
  const exResult = await db.execute(
    'SELECT * FROM workout_template_exercises WHERE template_id = ? ORDER BY sort_order',
    [templateId],
  )
  return {
    id: t.id as string,
    coachId: t.coach_id as string,
    name: t.name as string,
    description: (t.description as string) || '',
    goal: (t.goal as string) || '',
    estimatedDurationMinutes: (t.estimated_duration_minutes as number) ?? null,
    exerciseCount: exResult.rows.length,
    createdAt: t.created_at as string,
    exercises: exResult.rows.map(e => ({
      id: e.id as string,
      templateId: e.template_id as string,
      name: e.name as string,
      sets: e.sets as number,
      reps: e.reps as number,
      weightKg: (e.weight_kg as number) ?? null,
      restSeconds: (e.rest_seconds as number) ?? null,
      sortOrder: e.sort_order as number,
      notes: (e.notes as string) ?? null,
      mode: ((e.mode as string) || 'reps') as WorkoutExercise['mode'],
      phase: ((e.phase as string) || 'work') as WorkoutExercise['phase'],
      supersetGroup: (e.superset_group as string) || null,
      repsMin: (e.reps_min as number) ?? null,
      repsMax: (e.reps_max as number) ?? null,
      prog: (e.prog as WorkoutExercise['prog']) ?? null,
      inc: (e.inc as number) ?? null,
      sec: (e.sec as number) ?? null,
      minutes: (e.minutes as number) ?? null,
      speed: (e.speed as number) ?? null,
      perSide: e.per_side === 1,
      bodyPart: (e.body_part as string) || null,
      muscleGroups: String(e.muscle_groups || '').split(',').map(s => s.trim()).filter(Boolean),
      libraryExerciseId: (e.library_exercise_id as string) || null,
    })),
  }
}

export async function deleteWorkoutTemplate(coachId: string, templateId: string): Promise<boolean> {
  const db = getDB()
  const result = await db.execute('DELETE FROM workout_templates WHERE id = ? AND coach_id = ?', [templateId, coachId])
  return (result.rowsAffected ?? 0) > 0
}

/** Ownership-checked assignment detail (coach scope) — powers past-workout reassignment. */
export async function getAssignedWorkoutDetail(coachId: string, workoutId: string) {
  const db = getDB()
  const head = await db.execute('SELECT * FROM assigned_workouts WHERE id = ? AND coach_id = ?', [workoutId, coachId])
  if (head.rows.length === 0) return null
  const w = head.rows[0]
  const exResult = await db.execute(
    'SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY sort_order',
    [workoutId],
  )
  return {
    id: w.id as string,
    athleteId: w.athlete_id as string,
    athleteName: (w.athlete_name as string) || '',
    contentName: (w.content_name as string) || '',
    contentType: (w.content_type as string) || 'workout',
    modality: (w.modality as string) || '',
    startDate: w.start_date as string,
    endDate: w.end_date as string,
    status: w.status as string,
    progress: (w.progress as number) || 0,
    exercises: exResult.rows.map(e => ({
      id: e.id as string,
      name: e.name as string,
      sets: e.sets as number,
      reps: e.reps as number,
      weightKg: (e.weight_kg as number) ?? null,
      restSeconds: (e.rest_seconds as number) ?? null,
      sortOrder: e.sort_order as number,
      notes: (e.notes as string) ?? null,
      mode: ((e.mode as string) || 'reps') as WorkoutExercise['mode'],
      phase: ((e.phase as string) || 'work') as WorkoutExercise['phase'],
      supersetGroup: (e.superset_group as string) || null,
      repsMin: (e.reps_min as number) ?? null,
      repsMax: (e.reps_max as number) ?? null,
      prog: (e.prog as string) ?? null,
      inc: (e.inc as number) ?? null,
      sec: (e.sec as number) ?? null,
      minutes: (e.minutes as number) ?? null,
      speed: (e.speed as number) ?? null,
      perSide: e.per_side === 1 || e.per_side === true,
      bodyPart: (e.body_part as string) || null,
      muscleGroups: String(e.muscle_groups || '').split(',').map(s => s.trim()).filter(Boolean),
      libraryExerciseId: (e.library_exercise_id as string) || null,
    })),
  }
}
