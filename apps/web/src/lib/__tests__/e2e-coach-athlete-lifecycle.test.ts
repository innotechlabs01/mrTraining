/**
 * E2E integration test: the full coach → athlete loop.
 *
 * Verifies every data-layer boundary in the actual code path:
 *   1. Coach designs a workout template with exercises
 *   2. Coach assigns the workout to an athlete (exercises persist)
 *   3. Athlete starts session, logs enriched sets, completes
 *   4. Training history shapes correctly for the engine
 *   5. Engine produces valid prescriptions / 1RM / fatigue / effort
 *   6. Health data syncs (metrics dedupe + sleep upsert)
 *   7. Ownership boundaries reject wrong coach
 *   8. Assigned workout GET-by-ID returns exercises (was broken before fix)
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

const DB_PATH = path.join(os.tmpdir(), `e2e-lifecycle-${Date.now()}.db`);
const MIG_DIR = path.resolve(__dirname, '../../../migrations');

beforeAll(() => {
  fs.writeFileSync(DB_PATH, '');
  execSync(`sqlite3 "${DB_PATH}" < "${MIG_DIR}/002_coaching_schema.sql"`);
  execSync(`sqlite3 "${DB_PATH}" < "${MIG_DIR}/007_workout_templates.sql"`);
  execSync(`sqlite3 "${DB_PATH}" < "${MIG_DIR}/010_training_intelligence.sql"`);
  execSync(`sqlite3 "${DB_PATH}" < "${MIG_DIR}/011_exercise_library.sql"`);
  execSync(`sqlite3 "${DB_PATH}" < "${MIG_DIR}/013_health_metrics.sql"`);
  execSync(`sqlite3 "${DB_PATH}" < "${MIG_DIR}/014_workout_templates.sql"`);
  execSync(`sqlite3 "${DB_PATH}" "INSERT INTO coach_athletes (id,name,sport,email,coach_id) VALUES ('athlete-1','Test Athlete','gym','t@t.com','coach-1')"`);
  execSync(`sqlite3 "${DB_PATH}" "INSERT INTO coach_athletes (id,name,sport,email,coach_id) VALUES ('athlete-2','Athlete 2','running','t2@t.com','coach-2')"`);
  process.env.TURSO_URL = `file:${DB_PATH}`;
  process.env.TURSO_AUTH_TOKEN = '';
});

afterAll(() => { try { fs.unlinkSync(DB_PATH); } catch {} });

let db: typeof import('../coaching-db');
let engine: typeof import('../training-engine/progression');
let onerm: typeof import('../training-engine/onerm');
let fatigue: typeof import('../training-engine/fatigue');
let effort: typeof import('../training-engine/effort');

beforeAll(async () => {
  db = await import('../coaching-db');
  engine = await import('../training-engine/progression');
  onerm = await import('../training-engine/onerm');
  fatigue = await import('../training-engine/fatigue');
  effort = await import('../training-engine/effort');
});

describe('Phase 1 — Coach creates template with exercises', () => {
  it('saves template and returns its id', async () => {
    const id = await db.saveWorkoutTemplate('coach-1', {
      name: 'Push Day', description: 'chest + shoulders', goal: 'hypertrophy',
      estimatedDurationMinutes: 50,
      exercises: [
        { name: 'Bench Press', sets: 4, reps: 8, weightKg: 60, restSeconds: 90, sortOrder: 0, muscleGroups: ['chest'], mode: 'reps' },
        { name: 'Overhead Press', sets: 3, reps: 10, weightKg: 30, restSeconds: 90, sortOrder: 1, muscleGroups: ['shoulders'], mode: 'reps' },
        { name: 'Plank', sets: 3, reps: 0, restSeconds: 60, sortOrder: 2, muscleGroups: ['core'], mode: 'time', sec: 60 },
      ],
    });
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  it('lists template with correct exercise count', async () => {
    const list = await db.listWorkoutTemplates('coach-1');
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.find(t => t.name === 'Push Day')).toMatchObject({
      exerciseCount: 3, goal: 'hypertrophy', estimatedDurationMinutes: 50,
    });
  });

  it('fetches full detail with exercises', async () => {
    const list = await db.listWorkoutTemplates('coach-1');
    const detail = await db.getWorkoutTemplate('coach-1', list.find(t => t.name === 'Push Day')!.id);
    expect(detail).not.toBeNull();
    expect(detail!.exercises).toHaveLength(3);
    expect(detail!.exercises[0]).toMatchObject({ name: 'Bench Press', sets: 4, reps: 8, weightKg: 60, mode: 'reps' });
    expect(detail!.exercises[2]).toMatchObject({ name: 'Plank', mode: 'time', sec: 60 });
  });
});

describe('Phase 2 — Coach assigns workout with exercises persisted', () => {
  let assignedWorkoutId = '';

  it('creates assigned workout and exercises', async () => {
    assignedWorkoutId = await db.saveAssignedWorkout('coach-1', {
      athleteId: 'athlete-1', athleteName: 'Test Athlete',
      contentName: 'Push Day', contentId: 'push-day', contentType: 'workout',
      startDate: '2026-08-25', endDate: '2026-08-25', daysOfWeek: [1, 3, 5],
      status: 'active', progress: 0, modality: 'gym',
    });
    await db.saveWorkoutExercises(assignedWorkoutId, [
      { name: 'Bench Press', sets: 4, reps: 8, weightKg: 60, restSeconds: 90, sortOrder: 0, muscleGroups: ['chest'], prog: 'linear' },
      { name: 'Overhead Press', sets: 3, reps: 10, weightKg: 30, restSeconds: 90, sortOrder: 1, muscleGroups: ['shoulders'], prog: 'linear' },
    ]);
    const detail = await db.getAssignedWorkoutDetail('coach-1', assignedWorkoutId);
    expect(detail).not.toBeNull();
    expect(detail!.exercises).toHaveLength(2);
    expect(detail!.exercises[0].prog).toBe('linear');
  });

  it('wrong coach gets null', async () => {
    const detail = await db.getAssignedWorkoutDetail('coach-2', assignedWorkoutId);
    expect(detail).toBeNull();
  });
});

describe('Phase 3 — Athlete session, sets, complete', () => {
  let workoutId = '';
  let sessionId = '';
  let exIds: Record<string, string> = {};

  beforeAll(async () => {
    const list = await db.getAssignedWorkouts('coach-1');
    const wo = list.find(w => w.contentName === 'Push Day')!;
    workoutId = String(wo.id);
    const detail = await db.getAssignedWorkoutDetail('coach-1', workoutId);
    exIds = Object.fromEntries(detail!.exercises.map(e => [e.name, e.id]));
    const session = await db.createWorkoutSession(workoutId, 'athlete-1');
    sessionId = session.id;
  });

  it('creates a new session each call (no idempotency guard at DB layer)', async () => {
    const dup = await db.createWorkoutSession(workoutId, 'athlete-1');
    expect(dup.id).not.toBe(sessionId);
  });

  it('logs enriched sets (phase, rir, skipped)', async () => {
    // Warm-up set (should NOT poison progression later).
    await db.logWorkoutSet(sessionId, exIds['Bench Press'], 0, 20, 10, {
      phase: 'warmup', rir: null, rpe: null, sec: null, minutes: null, speed: null, skipped: false,
    });
    // Work sets with RIR.
    await db.logWorkoutSet(sessionId, exIds['Bench Press'], 0, 60, 8, {
      phase: 'work', rir: 2, rpe: null, sec: null, minutes: null, speed: null, skipped: false,
    });
    await db.logWorkoutSet(sessionId, exIds['Bench Press'], 1, 60, 8, {
      phase: 'work', rir: 3, rpe: null, sec: null, minutes: null, speed: null, skipped: false,
    });
    // Skipped set — should be excluded from done count and treated as 0 reps.
    await db.logWorkoutSet(sessionId, exIds['Bench Press'], 2, 60, 3, {
      phase: 'work', rir: null, rpe: null, sec: null, minutes: null, speed: null, skipped: true,
    });
    const logs = await db.listSessionSetLogs(sessionId);
    expect(logs.length).toBe(4);
    expect(logs[0]).toMatchObject({ phase: 'warmup', rir: null });
    expect(logs[1]).toMatchObject({ phase: 'work', rir: 2, skipped: false });
    expect(logs[3]).toMatchObject({ skipped: true });
  });

  it('completes session and marks workout progress 100', async () => {
    await db.completeWorkoutSession(sessionId);
    const detail = await db.getWorkoutDetail(workoutId);
    expect(detail!.workout.progress).toBe(100);
  });

  it('completed session no longer appears as active', async () => {
    // getActiveWorkoutSession looks for completed=0; the completed session won't match.
    // Note: the duplicate session from earlier is still active (completed=0), so we check
    // specifically that OUR sessionId is no longer the active one.
    const active = await db.getActiveWorkoutSession(workoutId, 'athlete-1');
    // There IS an active session (the duplicate), but it's not the one we completed.
    if (active) {
      expect(active.id).not.toBe(sessionId);
    }
  });
});

describe('Phase 4 — Training history shapes for engine', () => {
  it('returns correct structure', async () => {
    const { history, exerciseMeta } = await db.getAthleteTrainingHistory('athlete-1');
    // Only Bench Press has logged sets; Overhead Press has none → 1 history entry.
    expect(history).toHaveLength(1);
    expect(history[0].entries).toHaveLength(1);
    const bench = history[0].entries[0];
    expect(bench.id).toContain('bench-press');
    expect(bench.sets.length).toBeGreaterThanOrEqual(3); // warmup + 2 work + skipped
    expect(bench.target.mode).toBe('reps');
    expect(bench.target.weightKg).toBe(60);
    expect(exerciseMeta['bench-press']).toMatchObject({ name: 'Bench Press', mode: 'reps' });
  });

  it('readSession handles warmup and skipped correctly', async () => {
    const { history } = await db.getAthleteTrainingHistory('athlete-1');
    const bench = history[0].entries.find(e => e.id.includes('bench-press'))!;
    const read = engine.readSession(bench, bench.target);
    expect(read.ok).toBe(false); // skipped counted as 0 reps
    expect(read.reps).toContain(8);
    expect(read.reps).toContain(0);
  });

  it('nextPrescription returns "hold" for an exercise with one miss (skipped set)', async () => {
    const { history } = await db.getAthleteTrainingHistory('athlete-1');
    const bench = history[0].entries.find(e => e.id.includes('bench-press'))!;
    const p = engine.nextPrescription(history, {
      id: bench.id, mode: 'reps', bodyPart: 'chest',
      sets: 4, reps: 8, weightKg: 60, muscleGroups: ['chest'],
    });
    // One skipped set = one miss → hold (not first, not deload yet).
    expect(p.kind).toBe('hold');
    expect(p.policy).toBe('linear');
    expect(p.weightKg).toBe(60);
    expect(p.why?.[0]).toContain('same weight');
  });
});

describe('Phase 5 — 1RM / Effort / Fatigue from logged data', () => {
  it('best1RM returns estimate from best set', async () => {
    const { history } = await db.getAthleteTrainingHistory('athlete-1');
    const best = onerm.best1RM(history, 'bench-press');
    expect(best).not.toBeNull();
    expect(best!.weightKg).toBe(60);
    expect(best!.est).toBeCloseTo(76, 0); // Epley: 60*(1+8/30) = 76.0
  });

  it('effortSummary counts rated sets from rir values', async () => {
    const { history } = await db.getAthleteTrainingHistory('athlete-1');
    const s = effort.effortSummary(history);
    // skipped=1 is excluded by history query, so done=3 (warmup + 2 work sets with rir).
    expect(s.done).toBe(3);
    expect(s.rated).toBe(2);
    expect(s.avg).toBeNull(); // Below MIN_RATED=5 → noise, correctly null
  });

  it('fatigueByMuscle includes chest from bench volume', async () => {
    const { history } = await db.getAthleteTrainingHistory('athlete-1');
    const map = fatigue.fatigueByMuscle(history);
    expect(map.has('chest')).toBe(true);
    expect(map.get('chest')!.level).toBeGreaterThan(0);
  });
});

describe('Phase 6 — Health sync with dedupe', () => {
  it('inserts and dedupes metrics', async () => {
    const m1 = { metricType: 'hrv', value: 65, unit: 'ms', source: 'healthkit' as const, recordedAt: '2026-08-25T07:00:00Z' };
    const m2 = { metricType: 'resting_hr', value: 52, unit: 'bpm', source: 'healthkit' as const, recordedAt: '2026-08-25T07:00:00Z' };
    expect(await db.insertHealthMetrics('athlete-1', [m1, m2])).toBe(2);
    expect(await db.insertHealthMetrics('athlete-1', [m1, m2])).toBe(0); // dupe
    expect(await db.insertHealthMetrics('athlete-1', [
      { metricType: 'hrv', value: 68, unit: 'ms', source: 'healthkit', recordedAt: '2026-08-26T07:00:00Z' },
    ])).toBe(1);
    const hrv = await db.getHealthMetrics('athlete-1', { metricType: 'hrv', daysBack: 7 });
    expect(hrv.length).toBeGreaterThanOrEqual(2);
  });

  it('upserts sleep log (same date = update)', async () => {
    await db.upsertSleepLog('athlete-1', {
      date: '2026-08-24', totalMinutes: 450, deepMinutes: 90, source: 'healthkit', recordedAt: '2026-08-25T07:30:00Z',
    });
    await db.upsertSleepLog('athlete-1', {
      date: '2026-08-24', totalMinutes: 480, deepMinutes: 100, source: 'healthkit', recordedAt: '2026-08-25T08:00:00Z',
    });
    const logs = await db.getSleepLogs('athlete-1', 7);
    const night = logs.find(l => l.date === '2026-08-24');
    expect(night).toBeDefined();
    expect(night!.totalMinutes).toBe(480); // updated, not duplicated
    expect(night!.deepMinutes).toBe(100);
  });
});

describe('Phase 7 — Ownership boundaries', () => {
  it('wrong coach gets null from getWorkoutTemplate', async () => {
    const list = await db.listWorkoutTemplates('coach-1');
    const own = await db.getWorkoutTemplate('coach-1', list[0].id);
    expect(own).not.toBeNull();
    const foreign = await db.getWorkoutTemplate('coach-2', list[0].id);
    expect(foreign).toBeNull();
  });

  it('deleteWorkoutTemplate respects ownership', async () => {
    const list = await db.listWorkoutTemplates('coach-1');
    expect(await db.deleteWorkoutTemplate('coach-2', list[0].id)).toBe(false);
    expect(await db.getWorkoutTemplate('coach-1', list[0].id)).not.toBeNull();
  });
});

describe('Phase 8 — Assigned workout GET-by-ID returns exercises', () => {
  it('returns exercises through assigned workout detail', async () => {
    const list = await db.getAssignedWorkouts('coach-1');
    const wo = list.find(w => w.contentName === 'Push Day')!;
    const detail = await db.getAssignedWorkoutDetail('coach-1', String(wo.id));
    expect(detail).not.toBeNull();
    expect(detail!.exercises).toHaveLength(2);
    expect(detail!.exercises[0].prog).toBe('linear');
  });
});
