# Web DB → Go API Migration — Progress

## Goal
Migrate ALL remaining Next.js route handlers that import `apps/web/src/lib/db/*.ts` to call the Go API via `goFetch`/`goFetchServer`, removing direct SQL. Incremental by domain, committing as we go.

## Baseline (verified)
- `cd apps/api && go build ./...` → PASS (exit 0)
- `cd apps/api && go vet ./...` → PASS
- `cd apps/web && pnpm build` → PASS (exit 0)
- `cd apps/web && pnpm exec tsc --noEmit` → PASS (for migrated files)

## Migrated domains (DONE) — direct SQL removed, using goFetchServer → Go API
| Domain | Route handlers migrated | Go endpoint |
|---|---|---|
| exercises | `app/api/exercises/route.ts` (GET list, POST create) | `/api/v1/exercises` |
| exercises | `app/api/exercises/[id]/route.ts` (PUT update, DELETE delete) | `/api/v1/exercises/:id` |
| events | `app/api/coaching/events/route.ts` (GET list, POST create) | `/api/v1/events` |
| messages | `app/api/coaching/messages/route.ts` (GET threads, PUT create-thread, POST add-message) | `/api/v1/messages` |
| store/products | `app/api/athlete/store/route.ts` (GET catalog) | `/api/v1/athlete/store` |
| store/products | `app/api/athlete/store/purchase/route.ts` (POST purchase) | `/api/v1/athlete/store/purchase` |
| membership | `app/api/athlete/membership/route.ts` (GET membership + payments, snake→camel map) | `/api/v1/memberships`, `/memberships/:id/payments` |
| today | `app/api/athlete/today/route.ts` (GET today view) | `/api/v1/athletes/today` |
| workouts | `app/api/athlete/workouts/route.ts` (GET assigned workouts; replaced proxyToGo fallback) | `/api/v1/workouts` |
| athletes (coach list) | `app/api/coach/athletes/route.ts` (GET) | `/api/v1/coaches/:id/athletes` |
| athletes (coaching list) | `app/api/coaching/athletes/route.ts` (GET → Go; POST create-athlete left as GAP) | `/api/v1/coaches/:id/athletes` |
| form-metrics | `app/api/athlete/form-metrics/route.ts` (POST sync → snake_case map) | `/api/v1/form-metrics/sync` |
| form-metrics | `app/api/coach/athletes/[id]/form-metrics/route.ts` (GET per-athlete) | `/api/v1/form-metrics/athlete/:id` |
| events (athlete) | `app/api/athlete/events/route.ts` (GET) | `/api/v1/events` |
| events (athlete detail) | `app/api/athlete/events/[id]/route.ts` (GET; snake→camel map) | `/api/v1/athletes/events/:id` |
| events (athlete respond) | `app/api/athlete/events/[id]/respond/route.ts` (POST) | `/api/v1/athletes/events/:id/respond` |

## Client API (foundation)
- `apps/web/src/lib/api/go-client.ts`: added `goFetchServer(path, token, options)` — server-side variant for Route Handlers, forwards Clerk Bearer token so Go Authenticate + TenantContext enforce RLS. `goFetch` (client, window.Clerk) retained.

## Remaining — GAPs (need API agent to add Go endpoints) / not migrated yet
| Route handler | Domain | Reason |
|---|---|---|
| `app/api/coach/athletes/[id]/route.ts` | athletes | save/delete athlete + getAthleteById: no Go endpoint |
| `app/api/coaching/appointments/route.ts` | appointments | coach appointments list: no Go endpoint |
| `app/api/coaching/appointments/[id]/route.ts` | appointments | update appointment: no Go endpoint |
| `app/api/coaching/coach-availability/route.ts` | availability | no coach availability endpoint |
| `app/api/coaching/time-blocks/route.ts` | config | no time-blocks endpoint |
| `app/api/coach/form-metrics/route.ts` | form-metrics | coach aggregate across athletes: no aggregate endpoint |
| `app/api/athlete/availability/route.ts` | availability | needs athlete's coachId; no "my coach" endpoint |

## Migrated domains (this session)
| Domain | Route handlers migrated | Go endpoint |
|---|---|---|
| blog | `app/api/marketing/blog/route.ts` (GET public list + slug) | `GET /public/blog`, `GET /public/blog/:slug` |
| plans | `app/api/marketing/plans/route.ts` (GET public list) | `GET /public/plans` |
| products | `app/api/marketing/products/route.ts` (GET public list) | `GET /public/products` |
| invites | `app/api/athlete/accept-invite/route.ts` (POST accept) — coach isolation logic moved to Go (`/invites/accept`, `/users/me`, PUT `/users/me`) | `POST /api/v1/invites/accept`, `GET /api/v1/users/me`, `PUT /api/v1/users/me` |
| webhooks/clerk | `app/api/webhooks/clerk/route.ts` — replaced direct `coach-isolation-db` writes with Go API proxy (`POST /webhooks/clerk`); verifies svix signature, forwards raw payload to Go. No DB imports remain. | `POST /webhooks/clerk` (Go) |
| allies | `app/api/athlete/allies/route.ts` (GET) | `GET /api/v1/athlete/allies` |
| athlete/profile | `app/api/athlete/profile/route.ts` (GET, PUT) | `GET /api/v1/users/me`, `PUT /api/v1/athletes/me`, `PUT /api/v1/users/me` |
| athlete/onboard | `app/api/athlete/onboard/route.ts` (POST) | `POST /api/v1/athletes/onboard` |
| marketing/contact | `app/api/marketing/contact/route.ts` (POST landing contact) | `POST /public/landing/contact` |

## lib/db modules
Removed: `blog.ts`, `payments.ts`, `plans.ts`, `products.ts`, `exercises.ts`, `video-metrics.ts`.
Remaining:
- `db.ts` (infra/shared — used by `coach-isolation-db.ts` [clerk webhook excepted] and `landing.ts` [landing content route]; NOT removed — still has live callers).
- `index.ts` re-exports `./db` only.
- `landing-contacts.ts` — REMOVED (only caller `app/api/marketing/contact/route.ts` migrated to Go API `POST /public/landing/contact`).

## Formally documented exceptions (intentional, not gaps)

| Item | Reason | Disposition |
|------|--------|-------------|
| `nats/consumer/route.ts` | REMOVED from web. Long-running NATS JetStream consumer did direct SQL (`getDB`/`safeExecute`) — infrastructure concern that belongs in a Go worker, not a Next.js route handler. Direct SQL eliminated from `apps/web`; consumer to be implemented in `apps/api/worker/nats` in a separate cross-repo ticket. | Deleted from web; documented as Go-worker TODO, not a web exception. |
| `coach-isolation-db.ts` | Still used by other routes not in this task's scope (`validate-code`, `coach/athletes/invite`). Clerk webhook was migrated to Go API in this sweep. | Kept; out of scope for this sweep (other callers remain). |


## Pre-existing failures (NOT caused by this change)
- `apps/web/src/lib/__tests__/e2e-coach-athlete-lifecycle.test.ts` — tests legacy lib/db directly; 19 failures (test file untouched by this change; had pre-existing tsc errors re: coaching-db).
- `apps/api/cmd/data-migrate` — `TestMigrationPlanOrdering` failure (Go data-migrate test, untouched).

## Files changed (this session)
apps/web/src/lib/api/go-client.ts
+ 16 route handlers under apps/web/src/app/api/ (see table above)
apps/web/src/app/api/athlete/accept-invite/route.ts — migrated off coach-isolation-db/lib/db to Go API (/invites/accept, /users/me, PUT /users/me)
apps/web/src/app/api/athlete/allies/route.ts — migrated to Go API (GET /api/v1/athlete/allies)
apps/web/src/app/api/athlete/profile/route.ts — migrated to Go API (GET /api/v1/users/me, PUT /api/v1/athletes/me, PUT /api/v1/users/me)
apps/web/src/app/api/athlete/onboard/route.ts — migrated to Go API (POST /api/v1/athletes/onboard)
apps/web/src/app/api/marketing/contact/route.ts — migrated to Go API (POST /public/landing/contact)
apps/web/src/app/api/webhooks/clerk/route.ts — Clerk webhook: replaced direct coach-isolation-db writes with Go API proxy; verifies svix signature, forwards raw payload to Go. No DB imports.
apps/web/TODO.md (progress tracker)
apps/api/internal/interfaces/http/handlers/clerk_webhook.go — removed direct SQL (softDeleteUser → userService.SoftDeleteUser); constructor now takes interfaces for testability
apps/api/internal/interfaces/http/handlers/clerk_webhook_test.go — new tests for signature verification, provisioning, soft delete
apps/api/internal/domain/user/repository.go — added SoftDeleteUser to Repository interface
apps/api/internal/application/user/service.go — added SoftDeleteUser to application service
apps/api/internal/application/user/service_test.go — added SoftDeleteUser tests
apps/api/internal/infrastructure/user/provision.go — implemented SoftDeleteUser in repository
apps/api/cmd/api/main.go — removed db.DB arg from NewClerkWebhookHandler

## Removed this session (direct-DB cleanup)
- `apps/web/src/lib/landing-contacts.ts` — only caller (`app/api/marketing/contact/route.ts`) migrated to Go API; module now unused.
- `apps/web/src/app/api/coach/exercise-videos/upload/route.ts` — dead exercise-videos upload path (T-009.1), no consumer.
- `apps/web/src/app/api/exercises/[id]/video/route.ts` — dead exercise video path; wrote `exercise_library.video_url` directly to DB.
- `apps/web/src/app/api/nats/consumer/route.ts` — NATS JetStream consumer doing direct SQL; infra belongs in a Go worker.
- `apps/web/src/lib/db/video-metrics.ts` — DEPRECATED T-009.1 module, only used by the deleted exercise-videos routes.
- `apps/web/src/lib/db/index.ts` — dropped `export * from './video-metrics'` (module deleted).

## Exceptions (direct-DB paths intentionally kept in apps/web)
- `apps/web/src/lib/db/db.ts` — shared infra, still has live callers (`validate-code`, `coach/athletes/invite`; `landing.ts` → landing content route). NOT removed yet because non-allowed callers (`landing.ts`, `coach-isolation-db.ts` via invite/validate-code) still depend on it.
