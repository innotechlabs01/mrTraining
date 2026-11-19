# BUILD 10.5 — DB-Wide Certification against local PostgreSQL (`mr_training_app`)

Date of certification run: 2026-11-06 UTC session (command snapshot).  
Scope: `apps/api` Go module.  
Decision: **NOT READY** for DB-wide certification under the restricted app role (`mr_training_app`).

## 1. Certification posture

- Target DB: local container `postgres-mr-training-migration` (`127.0.0.1:5435/mr_training_migration`).
- Authentication role used for `DATABASE_URL`: `mr_training_app`.
- No code was modified.
- No commits/migrations were created or applied.
- No QA/production system was touched.
- Certification evidence log: `/tmp/build105_tests.log`.

## 2. Commands

```bash
cd apps/api
export DATABASE_URL='postgresql://mr_training_app:***@127.0.0.1:5435/mr_training_migration?sslmode=disable'

# Build
go build ./...
# RC=0

# Vet
go vet ./...
# RC=0

# DB-wide package certification (restricted app role)
go test -p 1 -timeout 15m ./internal/...
# aggregate RC=1
```

## 3. Overall result

| Check | Result |
|---|---|
| `go build ./...` | PASS (`RC=0`) |
| `go vet ./...` | PASS (`RC=0`) |
| `go test -p 1 -timeout 15m ./internal/...` | FAIL (`RC=1`) |
| Packages with test passes | 36 |
| Packages with failures | 12 |
| Packages without tests | 123 |

## 4. Failing packages by package

| Package | Test result | Dominant failure |
|---|---|---|
| `internal/application/ally` | FAIL | `cannot create schema_migrations table: permission denied for schema public` |
| `internal/application/ally_catalog` | FAIL | `permission denied for schema public` |
| `internal/application/ally_operations` | FAIL | `permission denied for schema public` |
| `internal/application/ally_payment_declaration` | FAIL | `permission denied for schema public` |
| `internal/application/coach_settlement` | FAIL | `permission denied for schema public` |
| `internal/application/commission` | FAIL | `permission denied for schema public` |
| `internal/application/commission_entry` | FAIL | `permission denied for schema public` |
| `internal/application/running` | FAIL | RLS insert rejection for `running_workout_templates` under app role |
| `internal/infrastructure/database/migrations` | FAIL | permission denied + SQLite `PRAGMA` syntax under PostgreSQL |
| `internal/infrastructure/running` | FAIL | `permission denied for schema public` on DDL insert |
| `internal/infrastructure/user` | FAIL | table creation denied; one expected empty-slice assertion mismatch |
| `internal/integration/build10running` | FAIL | mixed RLS seed failures and app-role reads returning zero rows |

## 5. Failure details

### 5.1 App role cannot run dynamic DDL/migrations

Many test suites call migration/schema setup under `mr_training_app`, and then receive:

- `ERROR: permission denied for schema public (SQLSTATE 42501)`
- `apply migrations: cannot create schema_migrations table`

Affected failure classes:

- `application/ally`, `ally_catalog`, `ally_operations`, `ally_payment_declaration`, `coach_settlement`, `commission`, `commission_entry`
- `infrastructure/user`, `infrastructure/running`, `infrastructure/database/migrations`

This indicates these suites expect higher-schema privileges than the persistent app role provides. Under the current certification profile, they cannot pass without either elevated fixture/migration setup or explicit role grants.

### 5.2 RLS-sensitive tests fail under app role without tenant context

`application/running` integration tests fail during fixture creation:

- `save running workout template: ERROR: new row violates row-level security policy for table "running_workout_templates" (SQLSTATE 42501)`

`integration/build10running` additionally fails with:

- `seed template: ERROR: new row violates row-level security policy for table "running_workout_templates"`
- `ERROR: new row violates row-level security policy for table "running_sessions"`
- assignment lookup failures `RunningWorkoutAssignment ... not found`
- outbox atomic test expects 1 row but got 0

These reflect fixture seeding/tenant context assumptions around the app role, and should be rerun with super-user seeding separated from app-role assertions.

### 5.3 PostgreSQL portability issue in migration tests

The migrations test suite also reports:

- `PRAGMA foreign_keys: ERROR: syntax error at or near "PRAGMA" (SQLSTATE 42601)`

This is a SQLite-specific statement running against PostgreSQL. These tests fail independently of the app-role privilege issue.

### 5.4 App-role versus super-role helper misresolution

`internal/integration/build10running` helpers call `newSuperDB()` which uses `DATABASE_URL` first, then falls back to a hard-coded super URL. Because the certification command set `DATABASE_URL` to `mr_training_app`, the "super" helper resolved to the app role. This masks intended separation between privileged seeding and restricted assertions.

### 5.5 Secondary non-permission observation

`infrastructure/user` also has:
- `TestRepository_ListAthletesByCoach_Empty`: expected empty slice, got nil

This is a smaller contract-style finding and not the dominant app-role blocker.

## 6. Passing packages (36)

`application/analytics`, `application/athlete`, `application/coach`, `application/coachfeed`, `application/event`, `application/formrecording`, `application/gamification`, `application/leaderboard`, `application/membership`, `application/notification`, `application/product`, `application/subscription`, `application/training`, `application/trainingai`, `application/user`, `application/videoanalytics`, `application/workout`, `athlete`, `config`, `domain/analytics`, `domain/athlete`, `domain/subscription`, `domain/training`, `handlers`, `infrastructure/cache`, `infrastructure/database`, `infrastructure/exercise`, `infrastructure/training`, `infrastructure/websocket`, `integration/linea_d`, `integration/running`, `interfaces/http`, `interfaces/http/handlers`, `middleware`, `pkg/activityparse`, `pkg/validator`.

## 7. Recommended next correction targets

1. Separate migration/fixture credentials from app-runtime credentials: support an explicit superuser/admin URL (`SUPER_DATABASE_URL`/`POSTGRES_DATABASE_URL`) while keeping `DATABASE_URL` on `mr_training_app`.
2. Either grant `CREATE`/`USAGE` on schema `public` to `mr_training_app` under local/test profiles, or remove runtime migration-on-demand from app-role integration tests.
3. Remove SQLite-only `PRAGMA foreign_keys` from PostgreSQL migrations/tests and make migration tests PostgreSQL-native.
4. Fix `newSuperDB()` so it cannot silently reuse the app role supplied by `DATABASE_URL`.
5. Rework RLS integration tests so privileged fixture seeding occurs with tenant context, while direct repository/service assertions run through the app role and intended middleware context.
6. Fix empty-slice semantics in `infrastructure/user.ListAthletesByCoach` so repository contract returns `[]` rather than nil.
7. Re-run this same `BUILD 10.5` profile after the above corrections; it is not yet certifiable.

## 8. Decision

**READY after correction pass** — build and vet pass, and `go test -p 1 -timeout 15m ./internal/...` now passes with 0 failing packages. RLS invariants and the restricted app role (`mr_training_app`) remain intact: no roles were made superuser/bypassrls and no grants beyond the intended default grants were added.

## 9. Correction summary

### Classification of the 12 failing packages
- A grants/fixture privileges: `application/ally`, `ally_catalog`, `ally_operations`, `ally_payment_declaration`, `coach_settlement`, `commission`, `commission_entry`, `infrastructure/running`, `infrastructure/user` (DDL used super-user setup; app assertions stayed restricted).
- B missing UoW/db context in tests: `application/running` (service now receives `db.DB`; tests pass DB wiring) and removed nil-db fallback paths where they caused RLS denials.
- C SQLite PRAGMA/syntax mismatch: migration test suite (removed SQLite-only `PRAGMA`, SQLite catalog queries converted to `information_schema`, `datetime('now')` to `CURRENT_TIMESTAMP`, removed SQLite trigger; kept PG-native assertions).
- D helper role misresolution: `integration/build10running` (`newSuperDB` now resolves from `SUPER_DATABASE_URL`/`POSTGRES_DATABASE_URL`, verifies `rolsuper`/`rolbypassrls`; it cannot silently reuse `DATABASE_URL`).
- E real defects fixed: `infrastructure/running` placeholder numbering (`$16`-style); `infrastructure/user` empty-slice contract; `ally_operations` empty-string `scheduled_at`; `ally_catalog` dynamic update placeholders; `coach_settlement` `fixed_amount_cents` removal from `settlement_items`; test isolation/seed typos in `running` integration.
- F obsolete fixture/allied cleanup: isolated dirty shared tables and removed SQLite-only assertions; no production RLS weakening or closed-domain weakening.

### Result
- `go build ./...`: PASS
- `go vet ./...`: PASS
- `go test -p 1 -timeout 15m ./internal/...`: PASS (0 failing packages)
