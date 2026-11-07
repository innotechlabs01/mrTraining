# Coach -> Athlete Training Lifecycle Certification (2026-11-06)

Scope: end-to-end principal cycle for a coach-authored running routine assigned to an athlete, executed/persisted by the athlete, then read by the coach, with cross-user isolation verified. Non-running `training` package attempt included separately.

## Package

- New package: `apps/api/internal/integration/principalcycle`
- Tests:
  - `TestPrincipalCycle_RunningLifecycleAndIsolation` — **PASS**
  - `TestPrincipalCycle_TrainingLifecycleAndIsolation` — **SKIP (blocker documented below)**

## Runtime

- Database: local PostgreSQL `mr_training_migration` (`127.0.0.1:5435`)
- Role for RLS/read paths: `mr_training_app` (`mr_training_app`, non-super, non-bypass)
- Seed/read/write verification performed through `mr_training_app` plus a super-role connection only where elevated internals require it
- No migration files added or applied
- Fixtures created under UUID-like IDs and deleted by ID; cleanup verified

## Certified running lifecycle

Steps validated:

1. Coach A creates a running workout template under app-capable service.
2. Coach A assigns it to athlete A.
3. Coach A can read the assignment under `mr_training_app` RLS context.
4. Athlete A can list the assigned workout under `mr_training_app`.
5. Athlete A starts a session; service persists `running_sessions` plus `running_workout_snapshots`.
6. Snapshot contains the assignment linkage and immutable template copy.
7. Athlete A persists run metrics (`distance`, `duration`, `calories`) via `CompleteSession`.
8. Athlete A reads the persisted session metrics under `mr_training_app`.
9. Coach A reads completion under `mr_training_app`: assignment status is `completed`, snapshot remains readable.
10. Coach A's assignment list contains the completed assignment.

## Cross-user isolation

Verified under `mr_training_app`:

- Athlete B cannot read athlete A's `running_sessions` row.
- Athlete B cannot read coach A's assignment.
- Coach B cannot read coach A's assignment.
- Coach B's assignment list does not include coach A's assignment.
- Coach B's template list does not include coach A's template.

## Non-running training package blocker

`TestPrincipalCycle_TrainingLifecycleAndIsolation` was attempted according to the requested set/exercise/completion flow, but it is currently blocked by a schema/repository mismatch:

- Existing `internal/infrastructure/training/workout_repository.go` assumes columns:
  - `workout_templates.goal`
  - `workout_templates.estimated_duration_minutes`
- Local PostgreSQL `workout_templates` (migration `109_workout_templates.sql`) defines:
  - `category`
  - `difficulty_level`
  - `duration_minutes`
- No migration or schema change was made under this task. Therefore the non-running training path cannot be certified here. The test is explicitly skipped and records the blocker.

## Commands run

```bash
cd apps/api
go build ./...
go vet ./internal/integration/principalcycle/
go test ./internal/integration/...
```

Results:

- `go build ./...`: pass
- `go vet ./internal/integration/principalcycle/`: pass
- `go test ./internal/integration/...`: pass (training lifecycle test intentionally skipped with documented blocker)

## Cleanup

- Running cycle fixtures removed by ID from:
  - `running_workout_snapshots`
  - `running_sessions`
  - `running_workout_assignments`
  - `running_workout_templates`
  - `coach_athlete_links`
  - `coaches`
  - `athlete_profiles`
- Post-run counts for `coach-pc-*` / `ath-pc-*` fixtures: 0
EOF
echo done