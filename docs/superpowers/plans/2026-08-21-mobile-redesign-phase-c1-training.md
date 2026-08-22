# Mobile Redesign — Phase C1 Complete Training Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete athlete training loop across the web API and the mobile app: a workout detail screen (exercises, sets×reps, target weight, rest), a per-set execution screen with progress bar and local resume, and the backend model + endpoints that make it persist (workout exercises bound to an assigned workout, an in-progress session, and per-set logs).

**Architecture:** Because `assigned_workouts` has no exercise model, we add three tables — `workout_exercises` (exercises per assigned workout), `workout_session_logs` (one row per in-progress/completed session), and `workout_set_logs` (one row per logged set). New routes: `GET /api/athlete/workouts/[id]` (detail), `POST /api/athlete/workouts/[id]/session` (idempotent create/resume), and per-session `sets` / `progress` / `complete` routes. Mobile adds `WorkoutDetailScreen` + `WorkoutExecutionScreen`, both registered as full-screen modals, with AsyncStorage resume keyed on the session id. The exercise model attaches exercises directly to the `assigned_workouts` row so it works regardless of the opaque `content_type`/`content_id`.

**Tech Stack:** Next.js API routes (`apps/web`, Clerk auth, `@libsql/client`), SQL migrations (`apps/web/migrations`), Expo SDK 54 mobile (`apps/mobile`, npm, TS strict, React Query, AsyncStorage, Volt tokens + UI kit).

**Source spec:** `docs/superpowers/specs/2026-08-21-mobile-redesign-design.md` §5.1.

**Key decisions:**
1. Exercise data binds to the `assigned_workouts` row (not content templates) → works with existing opaque `content_id`/`content_type`; no big gym-plan system added.
2. Session creation is idempotent per athlete+workout: an existing incomplete session is returned instead of duplicated, which also gives resume for free.
3. Resume = keys the AsyncStorage `mr_training.workoutSession.v1` on the session id + re-queries the session on mount; if it exists and `current_exercise_index > 0`, offer "Reanudar".
4. Auth: mirror the athlete-id resolution already used by `GET /api/athlete/workouts` (Clerk session → athlete id via the existing helper in `coaching-db.ts`).

---

## Task 0 — DB migration: workout_exercises, workout_session_logs, workout_set_logs

**Files:**
- Create: `apps/web/migrations/005_workout_templates.sql`

- [ ] Create `apps/web/migrations/005_workout_templates.sql`:

```sql
-- Phase C1: per-exercise data for assigned workouts, plus in-progress/completed
-- workout sessions and per-set logs. Exercises bind directly to an assigned workout
-- so they work regardless of the opaque content_type/content_id.

CREATE TABLE IF NOT EXISTS workout_exercises (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL REFERENCES assigned_workouts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sets INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight_kg REAL,
  rest_seconds INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS workout_session_logs (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL REFERENCES assigned_workouts(id) ON DELETE CASCADE,
  athlete_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  current_exercise_index INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workout_set_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES workout_session_logs(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_index INTEGER NOT NULL,
  weight_kg REAL,
  reps REAL,
  completed INTEGER NOT NULL DEFAULT 0,
  logged_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workout_session_athlete ON workout_session_logs(athlete_id, workout_id);
CREATE INDEX IF NOT EXISTS idx_set_log_session ON workout_set_logs(session_id);
```

- [ ] Apply the migration manually against the DB (the project has no migrate script; existing migrations live in `apps/web/migrations/` and are applied via `npx turso db shell < db.sql` against the configured LibSQL/Turso DB, or via the local `file:local.db`). Confirm the three new tables exist after applying.
- [ ] Commit: `feat(web): add workout exercises, session logs and set logs schema`

## Task 1 — DB helpers for workout detail, session, set log

**Files:**
- Modify: `apps/web/src/lib/coaching-db.ts`

- [ ] Read the file; locate `getAthleteAssignedWorkouts` (~line 1503) and the athlete-id/auth helper used by athlete routes. Add these exports following the existing `type` + function style, using `db` / row helpers already present:

```ts
export type WorkoutExercise = {
  id: string;
  workoutId: string;
  name: string;
  sets: number;
  reps: number;
  weightKg: number | null;
  restSeconds: number | null;
  sortOrder: number;
  notes: string | null;
};

export type WorkoutSession = {
  id: string;
  workoutId: string;
  athleteId: string;
  startedAt: string;
  completed: number;
  completedAt: string | null;
  currentExerciseIndex: number;
  durationSeconds: number;
};

export type WorkoutSetLog = {
  id: string;
  sessionId: string;
  exerciseId: string;
  setIndex: number;
  weightKg: number | null;
  reps: number | null;
  completed: number;
  loggedAt: string;
};

export async function getWorkoutDetail(workoutId: string): Promise<{ workout: { id: string; contentName: string; status: string; progress: number }; exercises: WorkoutExercise[] } | null> {
  // SELECT assigned_workouts row by id, then SELECT workout_exercises ORDER BY sort_order.
  // Return null if workout not found.
}

export async function getActiveWorkoutSession(workoutId: string, athleteId: string): Promise<WorkoutSession | null> {
  // SELECT * FROM workout_session_logs WHERE workout_id = ? AND athlete_id = ? AND completed = 0 ORDER BY started_at DESC LIMIT 1.
}

export async function createWorkoutSession(workoutId: string, athleteId: string): Promise<WorkoutSession> {
  // INSERT a new row (id = crypto.randomUUID(), started_at = now ISO). Return the row.
}

export async function getWorkoutSession(sessionId: string): Promise<WorkoutSession | null> {
  // SELECT * WHERE id = ?.
}

export async function updateWorkoutSessionProgress(sessionId: string, currentExerciseIndex: number, durationSeconds: number): Promise<void> {
  // UPDATE workout_session_logs SET current_exercise_index = ?, duration_seconds = ? WHERE id = ?.
}

export async function logWorkoutSet(sessionId: string, exerciseId: string, setIndex: number, weightKg: number | null, reps: number | null): Promise<WorkoutSetLog> {
  // INSERT a new row. Returns the row.
}

export async function completeWorkoutSession(sessionId: string): Promise<void> {
  // UPDATE workout_session_logs SET completed = 1, completed_at = now WHERE id = ?.
  // UPDATE assigned_workouts SET progress = 100 WHERE id = (SELECT workout_id FROM workout_session_logs WHERE id = ?).
}
```

- [ ] Run `cd apps/web && npx tsc --noEmit` (or the web typecheck script) — EXPECT PASS.
- [ ] Commit: `feat(web): add workout detail, session and set-log DB helpers`

## Task 2 — GET /api/athlete/workouts/[id] (detail)

**Files:**
- Create: `apps/web/src/app/api/athlete/workouts/[id]/route.ts`

- [ ] Read `apps/web/src/app/api/athlete/workouts/route.ts` to mirror the auth + response pattern. Create `apps/web/src/app/api/athlete/workouts/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { useAuth } from '@clerk/nextjs'; // or the established auth helper — mirror the list route
import { getWorkoutDetail } from '@/lib/coaching-db';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await useAuth();
  const athleteId = auth.userId; // mirror how /api/athlete/workouts derives athlete id and verifies ownership
  if (!athleteId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const detail = await getWorkoutDetail(params.id);
  if (!detail) return NextResponse.json({ error: 'not found' }, { status: 404 });
  // Ownership check: ensure the assigned_workouts row athlete_id === athleteId (return 404 otherwise).
  return NextResponse.json(detail);
}
```

(Adjust the exact athlete-id derivation and ownership check to match the real auth pattern in the file you read — report the actual mechanism.)

- [ ] Verify route compiles and the expected response shape matches `{ workout, exercises }`.
- [ ] Commit: `feat(web): add athlete workout detail endpoint`

## Task 3 — POST /api/athlete/workouts/[id]/session (idempotent create/resume)

**Files:**
- Create: `apps/web/src/app/api/athlete/workouts/[id]/session/route.ts`

- [ ] Create the route: resolve athlete, `getActiveWorkoutSession` → if found return it (200), else `createWorkoutSession` and return it (201). Body empty.
- [ ] Commit: `feat(web): add idempotent athlete workout session endpoint`

## Task 4 — per-session sets / progress / complete routes

**Files:**
- Create: `apps/web/src/app/api/athlete/sessions/[sessionId]/sets/route.ts`
- Create: `apps/web/src/app/api/athlete/sessions/[sessionId]/progress/route.ts`
- Create: `apps/web/src/app/api/athlete/sessions/[sessionId]/complete/route.ts`

- [ ] `sets/route.ts` — `POST`, body `{ exerciseId, setIndex, weightKg?, reps? }`. Verify the session belongs to the athlete, call `logWorkoutSet`, return the set. 400 on missing exerciseId/setIndex; 404 if session not found/chowned.
- [ ] `progress/route.ts` — `POST`, body `{ currentExerciseIndex, durationSeconds }`. Verify ownership, call `updateWorkoutSessionProgress`, return 204.
- [ ] `complete/route.ts` — `POST`, no body. Verify ownership, call `completeWorkoutSession`, return `{ ok: true }`.
- [ ] `cd apps/web && npx tsc --noEmit` — EXPECT PASS.
- [ ] Commit: `feat(web): add workout set logging, progress and completion endpoints`

## Task 5 — Mobile: WorkoutDetailScreen

**Files:**
- Create: `apps/mobile/src/features/training/presentation/screens/WorkoutDetailScreen.tsx`

- [ ] Add a route-fetch with React Query on `GET /api/athlete/workouts/[id]`. Typed param list via `NativeStackScreenProps<RootStackParamList, 'WorkoutDetail'>`. Use `Card` for each exercise row showing `name`, `sets × reps`, target `weight_kg`, `rest_seconds`; `ProgressBar`; a `PrimaryButton` "Comenzar" that POSTs `/session` then navigates to `WorkoutExecution` with `{ sessionId }`. Show loading (EmptyState variant loading) and error+retry (EmptyState variant error).
- [ ] `cd apps/mobile && npx tsc --noEmit` — EXPECT PASS.
- [ ] Commit: `feat(mobile): add workout detail screen`

## Task 6 — Mobile: WorkoutExecutionScreen (per-set + resume)

**Files:**
- Create: `apps/mobile/src/features/training/presentation/screens/WorkoutExecutionScreen.tsx`
- Create: `apps/mobile/src/features/training/presentation/screens/executionResume.ts` (AsyncStorage helpers)

- [ ] `executionResume.ts`: `saveSessionResume(sessionId, currentExerciseIndex)`, `getSessionResume()`, `clearSessionResume()` using key `mr_training.workoutSession.v1` (mirror the onboardingPending pattern). Include a unit test.
- [ ] `WorkoutExecutionScreen.tsx`: one exercise per step. For each set of the current exercise show weight/reps Inputs (numbers), a big "Siguiente serie" Pressable (minHeight 48, Volt) that POSTs the set to `/sets` then advances `currentExerciseIndex`/into the next set — on finishing all sets of an exercise, POST `/progress` and advance. Top: `ProgressBar` (sets-finished / total-sets). On mount: `getSessionResume()` → if exists and >0, show a "Reanudar" prompt; also re-query the session via `getWorkoutSession` to restore state. On last set of last exercise: POST `/complete`, show a completion summary, `clearSessionResume()`. Local resume via `saveSessionResume` on each advance.
- [ ] `cd apps/mobile && npx tsc --noEmit` and `npx jest` — EXPECT PASS (add a test for executionResume).
- [ ] Commit: `feat(mobile): add workout execution screen with per-set logging and resume`

## Task 7 — Navigation + card wiring

**Files:**
- Modify: `apps/mobile/src/navigation/Navigation.tsx`
- Modify: `apps/mobile/src/features/training/presentation/screens/HistoryScreen.tsx`
- Modify: `apps/mobile/src/features/training/presentation/screens/TodayScreen.tsx`

- [ ] Add `WorkoutDetail: { workoutId: string }` and `WorkoutExecution: { sessionId: string }` to `RootStackParamList` and register both as full-screen modal `Stack.Screen`s in the signed-in stack (inside the tab navigator's parent stack, so they can push over the tab bar). Optional: `presentation: 'modal'` / `animation` for execution.
- [ ] In `HistoryScreen.tsx`: make each workout card pressable → `navigation.navigate('WorkoutDetail', { workoutId })`.
- [ ] In `TodayScreen.tsx`: make each active workout card pressable → `navigation.navigate('WorkoutDetail', { workoutId })`.
- [ ] `cd apps/mobile && npx tsc --noEmit` — EXPECT PASS.
- [ ] Commit: `feat(mobile): wire workout detail and execution into navigation`

## Task 8 — Final verification

- [ ] `cd apps/web && npx tsc --noEmit` — EXPECT PASS.
- [ ] `cd apps/mobile && npx jest` — EXPECT PASS (all suites).
- [ ] `cd apps/mobile && npx tsc --noEmit` — EXPECT PASS.
- [ ] Grep check: no `darkTheme`/raw hex introduced in the two new screens: `grep -rnE "darkTheme|#[0-9a-fA-F]{3,8}" apps/mobile/src/features/training/presentation/screens/WorkoutDetailScreen.tsx apps/mobile/src/features/training/presentation/screens/WorkoutExecutionScreen.tsx` → 0 matches.
- [ ] Cross-check the route names and shapes are consistent between the web routes written and the mobile `apiClient` calls.
- [ ] Commit: `chore: verify phase C1 complete training flow`

---

## Post-conditions

- `GET /api/athlete/workouts/[id]` returns `{ workout, exercises }`.
- Starting a workout creates/returns an idempotent session; each set POSTs to `/sets`; progress advances via `/progress`; completing POSTs `/complete` and sets the workout `progress = 100`.
- The mobile `WorkoutDetailScreen` lists exercises; `WorkoutExecutionScreen` walks one exercise per step, records weight/reps per set, resumes after app-kill via AsyncStorage, and shows a completion summary.
- `npx tsc --noEmit` passes in both apps; mobile jest green; no raw hex/darkTheme in the new screens.
