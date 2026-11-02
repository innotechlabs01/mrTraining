import { safeExecute, generateId } from './db'

export interface WorkoutTemplate {
  id: string
  coachId: string
  name: string
  description: string
  goal: string
  estimatedDurationMinutes: number | null
  exercises: TemplateExercise[]
  exerciseCount: number
  createdAt: string
  updatedAt: string
}

export interface TemplateExercise {
  name: string
  sets: number
  reps: number
  weightKg: number | null
  restSeconds: number | null
  notes: string | null
  sortOrder: number
  muscleGroups: string[]
  libraryExerciseId: string | null
  mode?: string
  phase?: string
  supersetGroup?: string | null
  repsMin?: number | null
  repsMax?: number | null
  prog?: string | null
  inc?: number | null
  sec?: number | null
  minutes?: number | null
  speed?: number | null
  perSide?: number
  bodyPart?: string | null
}

export async function listWorkoutTemplates(coachId: string): Promise<WorkoutTemplate[]> {
  const result = await safeExecute(
    'SELECT * FROM workout_templates WHERE coach_id = $1 ORDER BY created_at DESC',
    [coachId],
  )

  const templates: WorkoutTemplate[] = []
  for (const r of result.rows) {
    const templateId = r.id as string
    const exercisesResult = await safeExecute(
      'SELECT * FROM workout_template_exercises WHERE template_id = $1 ORDER BY sort_order',
      [templateId],
    )
    const exercises: TemplateExercise[] = exercisesResult.rows.map((ex: Record<string, unknown>) => ({
      name: ex.name as string,
      sets: ex.sets as number,
      reps: ex.reps as number,
      weightKg: ex.weight_kg as number | null,
      restSeconds: ex.rest_seconds as number | null,
      notes: ex.notes as string | null,
      sortOrder: ex.sort_order as number,
      muscleGroups: ex.muscle_groups ? JSON.parse(ex.muscle_groups as string) : [],
      libraryExerciseId: ex.library_exercise_id as string | null,
      mode: ex.mode as string,
      phase: ex.phase as string,
      supersetGroup: ex.superset_group as string | null,
      repsMin: ex.reps_min as number | null,
      repsMax: ex.reps_max as number | null,
      prog: ex.prog as string | null,
      inc: ex.inc as number | null,
      sec: ex.sec as number | null,
      minutes: ex.minutes as number | null,
      speed: ex.speed as number | null,
      perSide: ex.per_side as number,
      bodyPart: ex.body_part as string | null,
    }))

    templates.push({
      id: r.id as string,
      coachId: r.coach_id as string,
      name: r.name as string,
      description: r.description as string,
      goal: r.goal as string,
      estimatedDurationMinutes: r.estimated_duration_minutes as number | null,
      exercises,
      exerciseCount: exercises.length,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    })
  }
  return templates
}

export async function getWorkoutTemplate(coachId: string, templateId: string): Promise<WorkoutTemplate | null> {
  const result = await safeExecute(
    'SELECT * FROM workout_templates WHERE id = $1 AND coach_id = $2',
    [templateId, coachId],
  )

  if (result.rows.length === 0) return null

  const r = result.rows[0]
  const exercisesResult = await safeExecute(
    'SELECT * FROM workout_template_exercises WHERE template_id = $1 ORDER BY sort_order',
    [templateId],
  )
  const exercises: TemplateExercise[] = exercisesResult.rows.map((ex: Record<string, unknown>) => ({
    name: ex.name as string,
    sets: ex.sets as number,
    reps: ex.reps as number,
    weightKg: ex.weight_kg as number | null,
    restSeconds: ex.rest_seconds as number | null,
    notes: ex.notes as string | null,
    sortOrder: ex.sort_order as number,
    muscleGroups: ex.muscle_groups ? JSON.parse(ex.muscle_groups as string) : [],
    libraryExerciseId: ex.library_exercise_id as string | null,
    mode: ex.mode as string,
    phase: ex.phase as string,
    supersetGroup: ex.superset_group as string | null,
    repsMin: ex.reps_min as number | null,
    repsMax: ex.reps_max as number | null,
    prog: ex.prog as string | null,
    inc: ex.inc as number | null,
    sec: ex.sec as number | null,
    minutes: ex.minutes as number | null,
    speed: ex.speed as number | null,
    perSide: ex.per_side as number,
    bodyPart: ex.body_part as string | null,
  }))

  return {
    id: r.id as string,
    coachId: r.coach_id as string,
    name: r.name as string,
    description: r.description as string,
    goal: r.goal as string,
    estimatedDurationMinutes: r.estimated_duration_minutes as number | null,
    exercises,
    exerciseCount: exercises.length,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

export async function saveWorkoutTemplate(coachId: string, data: {
  id?: string
  name: string
  description: string
  goal: string
  estimatedDurationMinutes: number | null
  exercises: TemplateExercise[]
}): Promise<string> {
  const templateId = data.id || generateId()
  const now = new Date().toISOString()

  const existing = await safeExecute('SELECT id FROM workout_templates WHERE id = $1 AND coach_id = $2', [templateId, coachId])

  if (existing.rows.length > 0) {
    await safeExecute(
      `UPDATE workout_templates SET name=$1, description=$2, goal=$3, estimated_duration_minutes=$4, updated_at=$5 WHERE id=$6 AND coach_id=$7`,
      [data.name, data.description, data.goal, data.estimatedDurationMinutes, now, templateId, coachId]
    )
  } else {
    await safeExecute(
      `INSERT INTO workout_templates (id, coach_id, name, description, goal, estimated_duration_minutes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [templateId, coachId, data.name, data.description, data.goal, data.estimatedDurationMinutes, now, now]
    )
  }

  // Replace exercises
  await safeExecute('DELETE FROM workout_template_exercises WHERE template_id = $1', [templateId])
  for (const ex of data.exercises) {
    await safeExecute(
      `INSERT INTO workout_template_exercises (id, template_id, name, sets, reps, weight_kg, rest_seconds, notes, sort_order, muscle_groups, library_exercise_id, mode, phase, superset_group, reps_min, reps_max, prog, inc, sec, minutes, speed, per_side, body_part)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`,
      [
        generateId(),
        templateId,
        ex.name,
        ex.sets ?? 0,
        ex.reps ?? 0,
        ex.weightKg ?? null,
        ex.restSeconds ?? null,
        ex.notes ?? null,
        ex.sortOrder ?? 0,
        JSON.stringify(ex.muscleGroups ?? []),
        ex.libraryExerciseId ?? null,
        ex.mode ?? 'reps',
        ex.phase ?? 'work',
        ex.supersetGroup ?? null,
        ex.repsMin ?? null,
        ex.repsMax ?? null,
        ex.prog ?? null,
        ex.inc ?? null,
        ex.sec ?? null,
        ex.minutes ?? null,
        ex.speed ?? null,
        ex.perSide ?? 0,
        ex.bodyPart ?? null
      ]
    )
  }

  return templateId
}

export async function deleteWorkoutTemplate(coachId: string, templateId: string): Promise<boolean> {
  const result = await safeExecute(
    'DELETE FROM workout_templates WHERE id = $1 AND coach_id = $2',
    [templateId, coachId]
  )
  return (result.rowCount ?? 0) > 0
}
