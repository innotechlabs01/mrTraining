/**
 * Live Workout DB functions — PostgreSQL
 *
 * Fetches the assigned workout plan for live execution.
 */
import { safeExecute } from './db'

/** Get today's assigned workout for an athlete (for live execution). */
export async function getLiveWorkoutPlan(athleteId: string) {
  // Get the most recent assigned workout that hasn't been completed
  const result = await safeExecute(
    `SELECT aw.*, wt.name as template_name, wt.focus, wt.coach_name, wt.coach_initials, wt.estimated_duration
     FROM assigned_workouts aw
     LEFT JOIN workout_templates wt ON aw.template_id = wt.id
     WHERE aw.athlete_id = $1 AND aw.status != 'completed'
     ORDER BY aw.scheduled_date DESC, aw.scheduled_time DESC
     LIMIT 1`,
    [athleteId],
  )

  if (result.rows.length === 0) return null

  const row = result.rows[0]

  // Get exercises for this workout
  const exercises = await safeExecute(
    'SELECT * FROM workout_exercises WHERE workout_id = $1 ORDER BY sort_order',
    [row.id],
  )

  return {
    id: row.id,
    name: row.templateName || row.name || 'Workout',
    focus: row.focus || 'General Training',
    coachName: row.coachName || 'Coach',
    coachInitials: row.coachInitials || 'C',
    estimatedDuration: row.estimatedDuration || 30,
    exercises: exercises.rows.map((ex: Record<string, unknown>) => ({
      id: ex.id as string,
      name: (ex.name as string) || 'Exercise',
      section: 'main' as const,
      sets: Number(ex.sets) || 3,
      duration: 45,
      rest: Number(ex.restSeconds) || 60,
      muscleGroups: (ex.muscleGroups as string[]) || [],
      equipment: undefined,
      videoUrl: undefined,
      formTips: [],
      cues: [
        { id: `c-${ex.id}-1`, tone: 'motivation' as const, text: 'Stay focused. Quality over speed.' },
      ],
    })),
    playlist: [],
  }
}
