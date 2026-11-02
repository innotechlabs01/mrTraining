# T-045 — Mobile Running Flow Repair Plan (read-only architect output)

**Context:** PR #4, branch `feature/mobile-design-system`, task T-045 (not present in BOARD.md — added here). User requests all repairs necessary for functional `apps/mobile` running workflow. Coordinator already fixed most TS errors and has uncommitted edits to `RunningWorkoutListScreen`, `RunningWorkoutDetailScreen`, `RunningSessionSummaryScreen` and `screensTexts.ts` — **DO NOT EDIT THESE OR ANY CODE.** This document is a decomposition + dev ownership + acceptance criteria + risks only. No schema changes, no branches/worktrees/commits.

---

## Reviewed artifacts

Mobile:
- `apps/mobile/src/features/training/presentation/screens/RunningExecutionScreen.tsx`
- `apps/mobile/src/features/training/presentation/screens/RunningWorkoutListScreen.tsx` (untouched — coordinator-owned)
- `apps/mobile/src/features/training/presentation/screens/RunningWorkoutDetailScreen.tsx` (untouched — coordinator-owned)
- `apps/mobile/src/features/training/presentation/screens/RunningSessionSummaryScreen.tsx` (untouched — coordinator-owned)
- `apps/mobile/src/features/training/hooks/useGpsTracking.ts`
- `apps/mobile/src/shared/i18n/screensTexts.ts` running sections (untouched — coordinator-owned)
- `apps/mobile/src/navigation/Navigation.tsx` route registry (RunningExecution = `{sessionId, workoutId}`, RunningSessionSummary = `{sessionId}`)

API (Go, source of truth for data):
- `apps/api/internal/interfaces/http/handlers/running_workouts.go` — `StartSession` (282), `CompleteSession` (315)
- `apps/api/internal/application/running/service.go` — `LogRunningSession`, `CompleteSession`, `ImportDeviceSessions`
- `apps/api/internal/domain/running/running.go` — `RunningSession`, `GpsPoint`, source constants
- `apps/api/migrations/postgres/001_running_sessions.sql` — schema (no change needed)
- `apps/api/internal/interfaces/http/routes/routes.go` — `POST /running/workouts/sessions/start` (233), `POST /running/workouts/sessions/:id/complete` (234), `POST /running/sessions/:id/live-location` (198)

Rules read: `MASTER_PROMPT.md`, `00-mobile-architecture.md`, `05-backend-architecture.md`, `08-api-specification.md`, `apps/mobile/AGENTS.md`, `apps/api/AGENTS.md`, `14-team-workflow.md`.

---

## Running workflow (current, intended)

1. `RunningWorkoutListScreen` → `GET /running/workouts/assignments` → tap → `RunningWorkoutDetail` (`assignmentId`).
2. `RunningWorkoutDetailScreen` → `GET /running/workouts/assignments/:id` + `GET /running/workouts/templates/:id` → "Start" → `POST /running/workouts/sessions/start` `{assignment_id}` → `{session_id}` → navigate `RunningExecution` `{sessionId: res.session_id, workoutId: assignment!.id}`.
3. `RunningExecutionScreen` → live GPS + timer + pause/resume → Finish → navigate `RunningSessionSummary` `{sessionId}`.
4. `RunningSessionSummaryScreen` → `GET /running/sessions/:id` → show real metrics → Done → `RunningWorkoutList`.

---

## Decomposition — repairs needed

### A. RunningExecutionScreen.tsx (5 defects)

1. **Undefined queries / missing state.** Render references `isLoading`, `templateLoading`, `isError`, `assignment`, `template`, `tw` (lines 81, 90, 104-108) but none are declared. `tw = texts.screens.runningExecution` is never assigned. → runtime crash / wrong empty/error state on entry.
2. **Wrong imports / route params.** `useGpsTracking({ workoutId, exerciseId: sessionId, ... })`. Here `workoutId` is the *assignment* ID (detail screen passes `workoutId: assignment!.id`). The hook then uploads live-location under that id and to a non-Go-API path (see C). Should use the real `sessionId` for the session-scoped GPS endpoint.
3. **Timer feedback loop.** `useEffect` (lines 70-79) lists `timer` in its deps while calling `setTimer(setInterval(...))` inside → effect re-runs every time `timer` changes → multiple overlapping `setInterval`s, duration drift, battery drain, UI jank.
4. **Placeholder metrics.** Distance/pace/HR/cadence hardcoded (`0.00 km`, `--:-- min/km`, `-- bpm`, `-- spm`, lines 118-131) — never derived from `points`/session. Real metrics not shown during execution.
5. **Finish never persists.** `handleFinish` (lines 58-64) only `syncPendingPoints(sessionId)` then navigates to summary. Never calls `POST /api/v1/running/workouts/sessions/:id/complete` (CompleteSession) to persist final metrics (distance, duration, pace, calories, heart rate, cadence, gps_route). Session is never marked completed in the backend → lost workout data.

### B. useGpsTracking.ts (2 defects)

6. **Lifecycle restart.** `stopTracking` `useCallback` deps on `[sendBatch]`, but `sendBatch` is not memoized (recreated every render) → effect deps `[enabled, isTracking, startTracking, stopTracking]` change every render → effect re-runs every render → GPS watcher stop/start churn (restart loop).
7. **Wrong session upload risks.** `sendBatch` POSTs to `/athlete/running/sessions/${workoutId}/live-location` with `session_id: workoutId` — wrong base route (not the Go API), wrong id (assignment id instead of real `sessionId`), conflates assignment vs session. GPS points risk being orphaned/misattributed; route map broken. Correct path per routes.go: `POST /api/v1/running/sessions/:id/live-location` (`LogGpsPoint`), keyed by real `sessionId`.

### C. CompleteSession ownership / metadata integrity (API — verified, no fix needed)

Handler `CompleteSession` (running_workouts.go:315):
- Auth: `RequireAthlete()` + `RequireActiveMembership`; `userID` from Clerk JWT.
- Loads existing session via `GetSession`; enforces `existing.UserID != userID` → `403` ("session does not belong to user"). **Ownership is enforced.**
- Builds `domain.RunningSession` preserving `Date`, `Source`, `CreatedAt` from existing; updates only `Distance/Duration/Pace/Calories/Elevation/HeartRate/Cadence/GPSRoute`. **Immutable metadata (date, source, created_at) preserved.**
- Route registered: `POST /running/workouts/sessions/:id/complete` (routes.go:234).

Conclusion: API-side ownership/metadata integrity is sound. The mobile side simply never invokes it (defect A5).

---

## Dev ownership

| Area | Owner | What |
|------|-------|------|
| Mobile execution screen | Mobile Engineer | Fix A1–A5 (declare `tw`/loading/error state or remove dead branches, fix timer loop, compute real metrics, persist finish via CompleteSession) |
| Mobile GPS hook | Mobile Engineer | Fix B6–B7 (memoize `sendBatch`/`stopTracking`, POST to `POST /api/v1/running/sessions/:id/live-location` with real `sessionId`) |
| API CompleteSession | Backend Engineer | No change required (ownership/metadata already correct); optionally add a test asserting 403 on foreign user + immutable-field preservation |
| QA / device | QA Engineer | Real-device validation: GPS recording, timer accuracy, finish→summary persistence, summary metrics match |

---

## Acceptance criteria (Definition of Done for T-045)

1. `cd apps/mobile && npx tsc --noEmit` → 0 errors; `npm test` → 353/353 green.
2. `RunningExecutionScreen` mounts without crash: `tw`, loading/error/assignment/template state defined or error/loading branches removed.
3. Timer increments exactly once per second, no overlapping intervals; pause/resume correct; duration reflects real elapsed time.
4. Execution metrics (distance, pace, HR, cadence) derived from GPS points / session — no hardcoded placeholders.
5. Finish invokes `POST /api/v1/running/workouts/sessions/:id/complete` with real metrics (distance, duration, pace, calories, heart rate, cadence, gps_route), then navigates to `RunningSessionSummary`; backend marks session `completed` and preserves `date`/`source`/`created_at`.
6. `useGpsTracking` uploads live-location to `POST /api/v1/running/sessions/:id/live-location` keyed by the real `sessionId`, batched, no restart loop; points attributed to correct session (ownership).
7. End-to-end flow: list → detail → start → execute (GPS + timer) → finish → summary shows real metrics → done → list.

---

## Risks

- **Data loss:** finish not persisting (A5) means completed runs are never stored; athlete loses workout history and coach never receives the session.
- **Misattributed/orphaned GPS:** wrong session id and wrong route (B7) → route map broken, points not linked to the session, summary distance/pace cannot be reconstructed.
- **Timer/battery:** feedback loop (A3) → multiple intervals, inflated duration, excessive wakeups/battery drain on device.
- **Crash on entry:** undefined state (A1) → execution screen errors/white-screen, blocking the whole running flow.
- **No schema changes needed** — all repairs are client-side; API `CompleteSession` ownership/metadata integrity already verified sound.

---

## Deliberately NOT touched (per instruction)

`RunningWorkoutListScreen.tsx`, `RunningWorkoutDetailScreen.tsx`, `RunningSessionSummaryScreen.tsx`, `screensTexts.ts` — coordinator-owned uncommitted edits; no edits to any code from this read-only architect task.
