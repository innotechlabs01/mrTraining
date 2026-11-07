# BUILD10.4 — Running closure / certification

Status: **PARTIAL** — Running domain code builds and tests pass, but certification under the app role is not complete for all read paths (see Residual).

## Changes applied

- `internal/application/running.Service.SetExecutor(exec database.Executor) *Service` added (transaction propagation, leaves original unchanged).
- `internal/interfaces/http/handlers.RunningWorkoutHandler` now accepts `db *sql.DB`, exposes `withTx` for user/coach tenant context propagation, and constructor signature updated.
- `cmd/api/main.go` wiring updated to pass `db.DB`.
- Existing HTTP integration test wiring updated to pass `db.DB`.
- `CreateAssignment` moved template validation and duplicate checks inside the RLS transaction (reads now run with tenant context when `db != nil`).
- Real integration suite added under `internal/integration/build10running`:
  - `TestBuild10_TemplateCreateListCrossCoach`
  - `TestBuild10_AssignmentCreateList`
  - `TestBuild10_AssignmentCrossCoachDenied`
  - `TestBuild10_StartCompleteSessionAtomic`
  - `TestBuild10_RollbackOnIntermediateFailure`
  - `TestBuild10_OutboxAtomicIfProduced`
  - `TestBuild10_RLS_OwnCrossAppRole`
  - `TestBuild10_ContextAbsence`
  - `TestBuild10_FKAppropriationDenied`

## Validation

- `cd apps/api && go build ./...`: PASS
- `cd apps/api && go vet ./...`: PASS
- `cd apps/api && go test ./internal/integration/build10running/`: PASS
- `cd apps/api && go test ./internal/integration/running/ ./internal/interfaces/http/handlers/ ./internal/application/running/`: PASS

## Residual (PARTIAL)

- RLS for `running_workout_assignments` is coach-scoped only (`coach_id = current_coach_id`); athletes using the app role cannot read their own assignments unless coach context is injected, so full user-side certification remains incomplete.
- Several Running read paths (`GetSession`, `ListSessionsByUser`, `GetTemplate`, `GetAssignment`, `ListTemplatesByCoach`) still execute outside an explicit UnitOfWork and therefore do not independently establish RLS context; they rely on handler-level/pool behavior.
- SaveGpsPoints respects an externally bound transaction (repo WithExecutor/*sql.Tx): external tx writes all rows without nested commit and caller controls rollback; pool/default executor preserves prior internal-transaction behavior.

## Build10.4-B blocker closure (appendix 2026-11-05)

### Requested scope resolved
1. `running_workout_assignments` RLS SELECT either-or proposal created as `apps/api/migrations/postgres/410_running_workout_assignments_rls_either_or.sql` (coach own OR athlete own with active `coach_athlete_links`); INSERT/UPDATE/DELETE remain coach-only. **Not applied** (authorization pending).
2. `running.Repository.SaveGpsPoints` now honors an optional bound transaction (exec is `*sql.Tx`), writing all rows through it with no nested commit; default executor retains its own transaction.
3. Running read paths wrapped in `RunningWorkoutHandler` UnitOfWork where `db != nil`: `GetTemplate`, `ListTemplatesByCoach`, `GetAssignment`, `ListMyAssignments`, `ListAssignmentsByAthlete`, `ListAssignmentsByCoach`.
4. Integration tests added in `internal/integration/build10running/blockers_test.go`: RLS coach/athlete own + cross denied (skips when either-or policy absent), context absence, mixed assignment FK denied, and SaveGpsPoints external transaction reuse/rollback. Existing rollback test retained.
5. Validation: `go build ./...` PASS, `go vet ./...` PASS, `go test ./internal/integration/build10running/` PASS, handlers/running/app tests PASS.
6. No QA/prod changes, no migration applied, no commits performed.

### Blocker status
- **RLS assignment either-or**: PARTIAL/BLOCKED pending explicit migration authorization; integration case skips until policy `running_workout_assignments_sel_coach_or_athlete` exists.
- **GPS external transaction reuse**: closed at repository + test level.
- **Read context propagation**: improved for read paths with DB; service self-managed tx paths remain unchanged to avoid runtime errors.

- No QA environment changes or deploy performed; tests target the local PostgreSQL migration database.

## Decision

Running closure is **PARTIAL**, not QA-ready. Template/assignment/session flows, own/cross-coach isolation, context absence, FK denial, rollback, and outbox atomicity are covered and passing for the exercised scopes, but app-role athlete reads and broader transaction propagation remain open.
## Update — migration 410 authorized and applied

Policy fix applied locally: `410_running_workout_assignments_rls_either_or.sql`
- Registered in `schema_migrations`: 1
- Backup: `backups/mr_training_migration_pre410.dump`
- SELECT now uses coach-or-athlete branches with active `coach_athlete_links` relationship
- INSERT/UPDATE/DELETE remain coach-only
- FK remains immutable under RLS because UPDATE would fail `WITH CHECK` for coach mismatch
- supporting index on `coach_athlete_links (coach_id, athlete_id, status)` added

Additional tests after 410:
- all `build10running` tests PASS
- RLS app-role tests (own/cross/context absence/FK denial) PASS
- `go build ./...`, `go vet ./...`: PASS

Updated decision: **Build10.4 CLOSED locally** for Running read/write/cross-coach/cross-athlete policy and transactional certification evidence.
Build10.5 DB-wide certification and Build11 payments remain pending.
QA remains unauthorized.
