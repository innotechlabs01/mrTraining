import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getAthleteByClerkId,
  listExerciseLibrary,
  createCustomExercise,
  saveAssignedWorkout,
  saveWorkoutExercises,
  createWorkoutSession,
  logWorkoutSet,
  completeWorkoutSession,
} from '@/lib/db';
import { parseWorkoutCsv, matchToLibrary, inferMode } from '@/lib/training-engine/importers';

// POST /api/athlete/import
// One-time onboarding import from Strong / Hevy / FitNotes CSV exports. Matched exercise
// names link to the library; anything unmatched becomes a custom exercise so nothing in
// the file is silently dropped.
export async function POST(req: Request) {
  try {
    // 1. AUTH FIRST
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. RESOLVE ACTOR FROM SESSION
    const athlete = await getAthleteByClerkId(userId);
    if (!athlete) return NextResponse.json({ error: 'Athlete profile not found' }, { status: 404 });

    // 4. VALIDATE INPUT before touching the database.
    const body = await req.json().catch(() => null);
    const csv = typeof body?.csv === 'string' ? body.csv : '';
    if (!csv.trim()) return NextResponse.json({ error: 'csv is required' }, { status: 400 });

    let rows;
    try {
      rows = parseWorkoutCsv(csv);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid CSV' }, { status: 400 });
    }

    // 5. DATA LAYER WORK
    const uniqueNames = [...new Set(rows.map(r => r.exerciseName).filter(Boolean))];
    const library = await listExerciseLibrary(athlete.coachId);
    const { matched, unmatched } = matchToLibrary(uniqueNames, library);

    // Unmatched names become custom exercises under the athlete's coach.
    const createdExercises: string[] = [];
    for (const name of unmatched) {
      const created = await createCustomExercise(athlete.coachId, { name });
      createdExercises.push(created.name);
      matched.set(name.trim().toLowerCase().replace(/[^a-z0-9]+/g, ''), created);
    }

    // Resolve each row to its exercise identity.
    const resolve = (name: string) => {
      const norm = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
      return matched.get(norm) ?? null;
    };

    // Group into one imported session per (date, workoutName).
    const groups = new Map<string, typeof rows>();
    for (const r of rows) {
      if (!r.exerciseName) continue;
      const key = `${r.date}|${r.workoutName}`;
      const g = groups.get(key) ?? [];
      g.push(r);
      groups.set(key, g);
    }

    let sessionsImported = 0;
    let setsImported = 0;

    for (const [key, groupRows] of groups) {
      const [date, workoutName] = key.split('|');
      const workoutId = await saveAssignedWorkout(athlete.coachId, {
        athleteId: athlete.id,
        athleteName: athlete.name,
        contentId: 'import',
        contentType: 'workout',
        contentName: workoutName || `Imported ${date}`,
        modality: 'gym',
        startDate: date,
        endDate: date,
        daysOfWeek: [],
        status: 'completed',
        progress: 100,
      });

      // One workout_exercises row per distinct exercise in this session.
      const byExercise = new Map<string, typeof rows>();
      for (const r of groupRows) {
        const list = byExercise.get(r.exerciseName) ?? [];
        list.push(r);
        byExercise.set(r.exerciseName, list);
      }

      const items: Parameters<typeof saveWorkoutExercises>[1] = [];
      let sortOrder = 0;
      for (const [name, exRows] of byExercise) {
        const libItem = resolve(name);
        items.push({
          name,
          sets: Math.max(...exRows.map(r => r.setIndex)),
          reps: libItem?.mode === 'time' ? 0 : Math.max(...exRows.map(r => r.reps ?? 0)),
          weightKg: null,
          sortOrder: sortOrder++,
          mode: libItem?.mode ?? inferMode(exRows),
          muscleGroups: libItem?.muscleGroups ?? [],
          libraryExerciseId: libItem?.id ?? null,
        });
      }
      const createdRows = await saveWorkoutExercises(workoutId, items);
      const exerciseRowIds = new Map(createdRows.map(row => [row.name, row.id]));

      const session = await createWorkoutSession(workoutId, athlete.id);
      for (const r of groupRows) {
        const exId = exerciseRowIds.get(r.exerciseName)!;
        await logWorkoutSet(session.id, exId, r.setIndex - 1, r.weightKg, r.reps, {
          rir: null,
          rpe: r.rpe,
          sec: r.sec,
          minutes: r.minutes,
          speed: null,
        });
        setsImported++;
      }
      await completeWorkoutSession(session.id);
      sessionsImported++;
    }

    return NextResponse.json(
      {
        sessionsImported,
        setsImported,
        exercisesCreated: createdExercises.length ? createdExercises : undefined,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error importing athlete workouts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
