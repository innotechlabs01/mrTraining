import { getDB, generateId, safeExecute } from './db'
import type { Row } from '@libsql/client'

export interface WorkoutTemplate {
  id: string
  coachId: string
  name: string
  description: string
  goal: string
  estimatedDurationMinutes: number | null
  exercises: TemplateExercise[]
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
}

export async function listWorkoutTemplates(coachId: string): Promise<WorkoutTemplate[]> {
  const db = getDB()
  const result = await db.execute(
    'SELECT * FROM workout_templates WHERE coach_id = ? ORDER BY created_at DESC',
    [coachId]
  )

  const templates: WorkoutTemplate[] = []
  for (const r of result.rows) {
    const templateId = r.id as string
    const exercisesResult = await db.execute(
      'SELECT * FROM workout_template_exercises WHERE template_id = ? ORDER BY sort_order',
      [templateId]
    )
    const exercises: TemplateExercise[] = exercisesResult.rows.map((ex: Row) => ({
      name: ex.name as string,
      sets: ex.sets as number,
      reps: ex.reps as number,
      weightKg: ex.weight_kg as number | null,
      restSeconds: ex.rest_seconds as number | null,
      notes: ex.notes as string | null,
      sortOrder: ex.sort_order as number,
      muscleGroups: ex.muscle_groups ? JSON.parse(ex.muscle_groups as string) : [],
      libraryExerciseId: ex.library_exercise_id as string | null,
    }))

    templates.push({
      id: r.id as string,
      coachId: r.coach_id as string,
      name: r.name as string,
      description: r.description as string,
      goal: r.goal as string,
      estimatedDurationMinutes: r.estimated_duration_minutes as number | null,
      exercises,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    })
  }
  return templates
}

export async function saveWorkoutTemplate(coachId: string, data: {
  id?: string
  name: string
  description: string
  goal: string
  estimatedDurationMinutes: number | null
  exercises: TemplateExercise[]
}): Promise<string> {
  const db = getDB()
  const templateId = data.id || generateId()
  const now = new Date().toISOString()

  const existing = await db.execute('SELECT id FROM workout_templates WHERE id = ? AND coach_id = ?', [templateId, coachId])

  if (existing.rows.length > 0) {
    await safeExecute(
      db,
      `UPDATE workout_templates SET name=?, description=?, goal=?, estimated_duration_minutes=?, updated_at=? WHERE id=? AND coach_id=?`,
      [data.name, data.description, data.goal, data.estimatedDurationMinutes, now, templateId, coachId]
    )
  } else {
    await safeExecute(
      db,
      `INSERT INTO workout_templates (id, coach_id, name, description, goal, estimated_duration_minutes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [templateId, coachId, data.name, data.description, data.goal, data.estimatedDurationMinutes, now, now]
    )
  }

  // Replace exercises
  await db.execute('DELETE FROM workout_template_exercises WHERE template_id = ?', [templateId])
  for (const ex of data.exercises) {
    await safeExecute(
      db,
      `INSERT INTO workout_template_exercises (id, template_id, name, sets, reps, weight_kg, rest_seconds, notes, sort_order, muscle_groups, library_exercise_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [generateId(), templateId, ex.name, ex.sets, ex.reps, ex.weightKg, ex.restSeconds, ex.notes, ex.sortOrder, JSON.stringify(ex.muscleGroups), ex.libraryExerciseId]
    )
  }

  return templateId
}