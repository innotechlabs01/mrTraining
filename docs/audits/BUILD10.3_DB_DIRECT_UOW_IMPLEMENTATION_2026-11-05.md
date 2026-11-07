# BUILD10.3 — Targeted DB-direct / UoW implementation

Status: high-priority scope completed for selected tenant-sensitive repositories. Generic repos remain explicitly deferred (see Remaining work).

## Changes applied

### WithExecutor now returns the domain interface
- `user.Repository.WithExecutor` → `user.Repository`
- `notification.Repository.WithExecutor` → `domain.Repository`
- `event.Repository.WithExecutor` → `eventdomain.Repository`
- `coach_settlement.Repository.WithExecutor` → `domain.Repository`
- `commission_entry.Repository.WithExecutor` → `domain.Repository`
- `analytics.Repository.WithExecutor` → `domain.Repository`

### Already completed in prior scope
- `coach.Repository.WithExecutor` → `coachdomain.Repository`
- `coachfeed.Repository.WithExecutor` → `domain.Repository`
- `support.Repository.WithExecutor` → `supportdomain.Repository`
- `running.Repository.WithExecutor` → `domain.Repository`
- `membership.Repository.WithExecutor` → `membership.Repository`
- `message.Repository.WithExecutor` → `domain.Repository`
- `config.Repository.WithExecutor` → `config.Repository`
- `dashboard.Repository.WithExecutor` → `domain.Repository`

Newly converted repositories (user, notification) now carry `db` + `database.Executor`,
`SetExecutor`, `WithExecutor`, and `isTx`, and all queries use `r.exec`. No business logic changed.

## Validation
- `go build ./...`: PASS
- `go vet ./...`: PASS
- `go test ./internal/infrastructure/user/`: PASS
- `go test ./internal/infrastructure/event/...` (no tests): N/A
- `go test ./internal/application/...` (event, coach_settlement, commission_entry, analytics, membership, user, notification, coachfeed): PASS
- `gofmt`: clean for changed files

## Remaining generic repositories (explicitly deferred)

Repos whose `WithExecutor` still returns a concrete type:
- `ally`
- `commission`
- `exercise`
- `invite`
- `store`
- `training/program_repository`
- `training/workout_repository`

Repositories without `WithExecutor` support yet:
- `alert`
- `ally_catalog`
- `ally_operations`
- `ally_payment_declaration`
- `athlete`
- `audit`
- `blog`
- `challenge`
- `checkin`
- `community`
- `favorite`
- `formmetrics`
- `formrecording`
- `gamification`
- `health`
- `import`
- `leaderboard`
- `memory`
- `onboarding`
- `plan`
- `product`
- `routine`
- `subscription`
- `today`
- `trainingai`
- `videoanalytics`
- `videoview`
- `workout`

## Decision
High-priority scope (message, support, coachfeed, user, notification, event) is structurally complete at repository level. Build10.3 as a whole remains pending for generic repositories. Do not declare complete security isolation until Build10.4-10.6 and Build11.

## 2026-11-05 — Message/Support handler-level UoW

### Application services
- `message.Service.SetExecutor(database.Executor) *Service` (type-asserts repo to `WithExecutor(...) message.Repository`).
- `support.Service.SetExecutor(database.Executor) *Service` (preserves `notifs`, type-asserts repo to `WithExecutor(...) supportdomain.Repository`).

### HTTP handlers
- `MessageHandler` and `SupportHandler` gained `db *sql.DB` + `withTx` (optional coach-tenant transaction, returning service via `SetExecutor`; runs body directly when DB nil or no coach context).
- Constructors now accept `db *sql.DB`.
- All handler methods wrapped with `withTx` and status errors mapped through `handleError`.

### Wiring
- `cmd/api/main.go`: `NewMessageHandler(messageService, messageRepoDB)` and `NewSupportHandler(supportService, db.DB)`.

### Validation
- `go build ./...`: PASS
- `go vet ./internal/application/message/... ./internal/application/support/... ./internal/interfaces/http/handlers/...`: PASS
- `go test ./internal/application/message/... ./internal/application/support/... ./internal/interfaces/http/handlers/...`: PASS (no tests in message/support packages; handlers ok)
- `go test ./...`: unrelated pre-existing failure in `cmd/data-migrate` (`TestMigrationPlanOrdering` table ordering); outside this scope.

## 2026-11-05 — Build10.3-D continuation

### Scope completed in this pass
- Generic repo classification completed into:
  - **UoW-needed / tenant-sensitive / multi-write**: converted to `exec`-based repositories with `SetExecutor`, `WithExecutor`, and `isTx`. These now expose the domain interface from `WithExecutor` where a domain interface exists.
  - **Global/backend/public/system (justified unchanged)**: non-context or public/global read paths such as `challenge`, `routine`, and other system/public repositories that do not participate in request-scoped tenant transactions.
- Highest-need repositories converted:
  - `ally` (structurally already capable; `WithExecutor` now returns `allydomain.Repository`)
  - `ally_catalog`
  - `ally_operations`
  - `ally_payment_declaration`
  - `commission`
  - `exercise`
  - `invite`
  - `store`
  - `plan` (added `WithExecutor`)
  - `subscription` (added `WithExecutor`)
- `cmd/data-migrate`:
  - Fixed `loadSchema` PostgreSQL `is_nullable` scan (`"YES"/"NO"` string instead of bool).
  - Fixed foreign-key discovery query to use `information_schema.constraint_column_usage` instead of the broken self-join through `column_column_usage`.
  - `TestMigrationPlanOrdering` now PASS; no migration order changed. Root cause was introspection SQL, not plan semantics.

### Validation
- `cd apps/api && go build ./...`: PASS
- `cd apps/api && go vet ./...`: PASS
- `cd apps/api && go test ./internal/infrastructure/... ./internal/application/... ./internal/interfaces/...`: PASS
- `cd apps/api && go test ./cmd/data-migrate/...`: PASS

### Classification summary (remaining pool-only)
- Remaining pool-only repositories are intentionally left unchanged where they are global/public/system-oriented (e.g. `blog`, `community`, `leaderboard`, `gamification`, `trainingai`, `import`, `health`, `onboarding`, `product` where not service-path UoW), read-only/no-context paths (`challenge`, `routine`), facade (`athlete`), or memory/unwired (`memory`, `config`, `dashboard`).
- Tenant-sensitive pool-only repositories that are not yet converted (`alert`, `checkin`, `favorite`, `formmetrics`, `formrecording`, `today`, `videoanalytics`, `videoview`, `workout`, `training/*` session/progress/exercise repositories) are tracked as remaining Build10.x candidate work.

### Decision
- **PARTIAL**: Build10.3 is complete for selected high-risk repository-level scopes and data-migrate ordering; generic tenant-sensitive conversion remains pending per classification above.  
- Do not declare complete security isolation until Build10.4-10.6 and Build11.

## 2026-11-05 — Build10.3-E final closure of generic repositories

### Repos fixed this pass (16)
Exec-based `db`/`database.Executor`, `SetExecutor`, `WithExecutor` (domain interface), `isTx`; queries moved to `r.exec`. Internal `BeginTx` calls retained on `r.db`.

- `blog` — `blog_posts`/`blog_post_meta` (RLS coach)
- `checkin` — `readiness_checkins` (RLS)
- `favorite` — `athlete_favorites` (RLS)
- `formmetrics` — `form_metrics` (RLS); internal transaction retained
- `formrecording` — `form_recordings` (RLS)
- `gamification` — `gamification_*` (RLS)
- `health` — `athlete_health_*` (RLS)
- `leaderboard` — `leaderboard_entries` (RLS)
- `product` — `products`/`sales` (RLS)
- `today` — composite over assigned_workouts/coach_sessions RLS tables
- `trainingai` — reads assigned_workouts/workout_set_logs (RLS)
- `videoanalytics` — `video_analytics_sessions` (RLS)
- `workout` — `workout_templates` (RLS); internal transactions retained
- `training/exercise_repository` — `exercise_library` (RLS)
- `training/progress_repository` — `workout_session_logs`/set logs (RLS)
- `training/session_repository` — `coach_sessions`/`session_athletes` (RLS)

### Repos excluded (justified)
- `alert`: `athlete_alerts` not RLS-protected/global-ish read stub
- `audit`: append-only system audit; inserts already run via `InsertTx(*sql.Tx)`
- `athlete`: read-only facade over training/message repos
- `challenge`, `routine`: no-context repository style intentionally treated as global/public read paths
- `community`: `community_*` tables are not RLS-protected
- `import`: `import_jobs` not RLS-protected
- `onboarding`: `athlete_onboarding` not RLS-protected
- `routine`: covered above
- `memory`: in-memory membership repository, no SQL
- `videoview`: `video_views` not RLS-protected
- Prior scope: `ally`, `commission`, `exercise`, `invite`, `store`, `plan`, `subscription` (already converted), `config`/`dashboard` (converted in prior scope), plus high-priority `coach`, `coachfeed`, `support`, `running`, `membership`, `message`, `event`, `user`, `notification`, `analytics`, `coach_settlement`, `commission_entry`

### Validation
- `cd apps/api && go build ./...`: PASS
- `cd apps/api && go vet ./...`: PASS
- `cd apps/api && go test ./internal/infrastructure/... ./internal/application/... ./internal/interfaces/...`: PASS (no failures; many packages have no tests)
- `cd apps/api && go test ./cmd/data-migrate/...`: PASS
- `gofmt`: clean for changed files

### Decision
- **CLOSED** for the repository-level Build10.3 (DB-direct / UoW) scope: all tenant-sensitive generic repository surfaces that participate in request-scoped transactions now expose `WithExecutor` returning their domain interface. Remaining exclusions are deliberately global/public/system/read-only/facade/non-RLS paths and require no repository changes. Security isolation is still pending Build10.4-10.6 and Build11. No migrations or commits were made.
