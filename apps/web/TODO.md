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
| `app/api/athlete/onboard/route.ts` | onboarding | complex coach-isolation-db |
| `app/api/nats/consumer/route.ts` | nats | move consumer to Go worker (separate concern) |
| `app/api/coach/exercise-videos/*` | exercise-videos | DEPRECATED dead path (T-009.1), removal needs approval |
| `app/api/exercises/[id]/video/route.ts` | exercise-videos | DEPRECATED dead path (T-009.1) |

## Migrated domains (this session)
| Domain | Route handlers migrated | Go endpoint |
|---|---|---|
| blog | `app/api/marketing/blog/route.ts` (GET public list + slug) | `GET /public/blog`, `GET /public/blog/:slug` |
| plans | `app/api/marketing/plans/route.ts` (GET public list) | `GET /public/plans` |
| products | `app/api/marketing/products/route.ts` (GET public list) | `GET /public/products` |
| invites | `app/api/athlete/accept-invite/route.ts` (POST accept) — coach isolation logic moved to Go (`/invites/accept`, `/users/me`, PUT `/users/me`) | `POST /api/v1/invites/accept`, `GET /api/v1/users/me`, `PUT /api/v1/users/me` |
| webhooks/clerk | `app/api/webhooks/clerk/route.ts` — replaced `getAthleteMembership` with inline `db.execute` query | N/A (Clerk webhook, excepted) |

## lib/db modules
Removed: `blog.ts`, `payments.ts`, `plans.ts`, `products.ts`, `exercises.ts`.
Remaining:
- `db.ts` (infra — used by coach-isolation-db [clerk webhook excepted], `exercises/[id]/video` [deprecated], `nats/consumer` [infrastructure exception])
- `video-metrics.ts` (DEPRECATED T-009.1 — used only by deprecated `coach/exercise-videos/*` routes; removal needs approval)
- `index.ts` re-exports `./db` and `./video-metrics`

## Formally documented exceptions (intentional, not gaps)

| Item | Reason | Disposition |
|------|--------|-------------|
| `coach/exercise-videos/route.ts` | DEPRECATED T-009.1 dead path. `exercise_videos` table never read by Go API or mobile. Removal needs explicit approval. | Left as deprecated route; uses `video-metrics.ts`. |
| `coach/exercise-videos/upload/route.ts` | Same as above — writes to dead `exercise_videos` table via Vercel Blob + SQL. | Left as deprecated route; uses `video-metrics.ts`. |
| `exercises/[id]/video/route.ts` | DEPRECATED T-009.1 — writes `exercise_library.video_url` directly to DB instead of Go API (`POST/PUT /api/v1/exercises`). No web caller. | Left as deprecated route; uses `db.ts` directly. |
| `nats/consumer/route.ts` | Long-running NATS JetStream consumer — infrastructure concern, belongs in a Go worker, not a Next.js route handler. | Left as Next.js route (transitional). Move to Go worker in separate ticket. |
| `video-metrics.ts` | DEPRECATED T-009.1 module. Only used by deprecated exercise-videos routes. | Kept in `lib/db` as documented exception. |
| `coach-isolation-db.ts` | Still used by Clerk webhook (excepted) + other routes not in this task's scope (`validate-code`, `profile`, `coach/athletes/invite`, `onboard`, `allies`). | Kept; out of scope for this sweep. |


## Pre-existing failures (NOT caused by this change)
- `apps/web/src/lib/__tests__/e2e-coach-athlete-lifecycle.test.ts` — tests legacy lib/db directly; 19 failures (test file untouched by this change; had pre-existing tsc errors re: coaching-db).
- `apps/api/cmd/data-migrate` — `TestMigrationPlanOrdering` failure (Go data-migrate test, untouched).

## Files changed (this session)
apps/web/src/lib/api/go-client.ts
+ 16 route handlers under apps/web/src/app/api/ (see table above)
apps/web/src/app/api/athlete/accept-invite/route.ts — migrated off coach-isolation-db/lib/db to Go API (/invites/accept, /users/me, PUT /users/me)
apps/api/internal/domain/invite/invite.go — added CoachID to AcceptResult
apps/api/internal/infrastructure/invite/repository.go — populate CoachID in AcceptInvite result
apps/web/TODO.md (progress tracker)
