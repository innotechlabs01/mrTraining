import { getDB, generateId } from './db'

// ============== Exercise Library (migration 011/012) ==============

export type ExerciseLibraryItem = {
  id: string
  slug: string
  name: string
  description: string
  mode: 'reps' | 'time' | 'cardio'
  bodyPart: string | null
  muscleGroups: string[]
  secondaryMuscles: string[]
  equipment: string | null
  difficulty: string | null
  category: string | null
  instructions: string[]
  defaultSec: number | null
  videoUrl: string | null
  isCustom: boolean
  coachId: string | null
}

function mapExerciseLibraryItem(r: Record<string, unknown>): ExerciseLibraryItem {
  const splitCsv = (v: unknown) => String(v || '').split(',').map(s => s.trim()).filter(Boolean)
  return {
    id: r.id as string,
    slug: r.slug as string,
    name: r.name as string,
    description: (r.description as string) || '',
    mode: (r.mode as 'reps' | 'time' | 'cardio') || 'reps',
    bodyPart: (r.body_part as string) || null,
    muscleGroups: splitCsv(r.muscle_groups),
    secondaryMuscles: splitCsv(r.secondary_muscles),
    equipment: (r.equipment as string) || null,
    difficulty: (r.difficulty as string) || null,
    category: (r.category as string) || null,
    instructions: String(r.instructions || '').split('\n').map(s => s.trim()).filter(Boolean),
    defaultSec: (r.default_sec as number) ?? null,
    videoUrl: (r.video_url as string) || null,
    isCustom: r.is_custom === 1 || r.is_custom === true,
    coachId: (r.coach_id as string) || null,
  }
}

/** Global library plus this coach's custom exercises. */
export async function listExerciseLibrary(coachId?: string): Promise<ExerciseLibraryItem[]> {
  const db = getDB()
  const rows = coachId
    ? await db.execute('SELECT * FROM exercise_library WHERE coach_id IS NULL OR coach_id = ? ORDER BY name', [coachId])
    : await db.execute('SELECT * FROM exercise_library WHERE coach_id IS NULL ORDER BY name')
  return rows.rows.map(mapExerciseLibraryItem)
}

export async function getExerciseBySlug(slug: string): Promise<ExerciseLibraryItem | null> {
  const db = getDB()
  const result = await db.execute('SELECT * FROM exercise_library WHERE slug = ? LIMIT 1', [slug])
  if (result.rows.length === 0) return null
  return mapExerciseLibraryItem(result.rows[0])
}

/** Match a set of incoming names against the library (case-insensitive, trimmed). */
export async function findExercisesByNames(names: string[]): Promise<Map<string, ExerciseLibraryItem>> {
  const out = new Map<string, ExerciseLibraryItem>()
  const wanted = [...new Set(names.map(n => n.trim().toLowerCase()).filter(Boolean))]
  if (wanted.length === 0) return out
  for (const name of wanted) {
    const result = await getDB().execute(
      'SELECT * FROM exercise_library WHERE LOWER(name) = ? LIMIT 1',
      [name],
    )
    if (result.rows.length > 0) {
      const item = mapExerciseLibraryItem(result.rows[0])
      // Keyed by the lower-cased requested name so callers can resolve their input.
      out.set(name, item)
    }
  }
  return out
}

export async function createCustomExercise(coachId: string, data: {
  name: string; description?: string; mode?: 'reps' | 'time' | 'cardio';
  bodyPart?: string; muscleGroups?: string[]; equipment?: string;
  difficulty?: string; category?: string; instructions?: string[]; defaultSec?: number;
}): Promise<ExerciseLibraryItem> {
  const db = getDB()
  const id = generateId()
  const baseSlug = data.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'exercise'
  const slug = `${baseSlug}-${id.slice(0, 8)}`
  await db.execute(
    `INSERT INTO exercise_library
       (id, slug, name, description, mode, body_part, muscle_groups, secondary_muscles,
        equipment, difficulty, category, instructions, default_sec, is_custom, coach_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)`,
    [
      id, slug, data.name.trim(), data.description ?? '', data.mode ?? 'reps',
      data.bodyPart ?? null, (data.muscleGroups ?? []).join(','), '',
      data.equipment ?? null, data.difficulty ?? null, data.category ?? null,
      (data.instructions ?? []).join('\n'), data.defaultSec ?? null, coachId,
    ],
  )
  const created = await db.execute('SELECT * FROM exercise_library WHERE id = ?', [id])
  return mapExerciseLibraryItem(created.rows[0])
}

/**
 * Replace the full exercise list of an assigned workout. Delete-then-insert keeps
 * sort_order authoritative; call only before athletes have logged sessions.
 * Returns the created rows (with their generated ids) so callers can link set logs.
 */
export async function saveWorkoutExercises(workoutId: string, items: Array<{
  name: string; sets: number; reps: number; weightKg?: number | null; restSeconds?: number | null;
  notes?: string | null; sortOrder: number;
  mode?: 'reps' | 'time' | 'cardio'; phase?: 'work' | 'warmup'; supersetGroup?: string | null;
  repsMin?: number | null; repsMax?: number | null; prog?: string;
  inc?: number | null; sec?: number | null; minutes?: number | null; speed?: number | null;
  perSide?: boolean; bodyPart?: string | null; muscleGroups?: string[];
  libraryExerciseId?: string | null;
}>): Promise<Array<{ id: string; name: string }>> {
  const db = getDB()
  await db.execute('DELETE FROM workout_exercises WHERE workout_id = ?', [workoutId])
  const created: Array<{ id: string; name: string }> = []
  for (const it of items) {
    const id = generateId()
    await db.execute(
      `INSERT INTO workout_exercises
         (id, workout_id, name, sets, reps, weight_kg, rest_seconds, sort_order, notes,
          mode, phase, superset_group, reps_min, reps_max, prog, inc, sec, minutes, speed,
          per_side, body_part, muscle_groups, library_exercise_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id, workoutId, it.name, it.sets, it.reps,
        it.weightKg ?? null, it.restSeconds ?? null, it.sortOrder, it.notes ?? null,
        it.mode ?? 'reps', it.phase ?? 'work', it.supersetGroup ?? null,
        it.repsMin ?? null, it.repsMax ?? null, it.prog ?? null, it.inc ?? null,
        it.sec ?? null, it.minutes ?? null, it.speed ?? null,
        it.perSide ? 1 : 0, it.bodyPart ?? null, (it.muscleGroups ?? []).join(','),
        it.libraryExerciseId ?? null,
      ],
    )
    created.push({ id, name: it.name })
  }
  return created
}
