# Plan: T-001 Activation of Athlete Handlers in Go API

**Target:** `apps/api` (Go 1.25 + Fiber, Clean Architecture)
**Task ID:** task_492f2fb500e8
**Status:** Plan only — no implementation yet

---

## 1. Problem Statement

There is no `athlete` feature package in `apps/api`. While domain, application,
and infrastructure layers exist for the sub-concerns **workouts** (`domain/workout`,
`application/workout`, `infrastructure/workout`), **metrics** (`domain/dashboard`,
`application/dashboard`, `infrastructure/dashboard`), and **messages**
(`domain/message`, `application/message`, `infrastructure/message`), there is:

- No unified `athlete` feature package (no `domain/athlete`, `application/athlete`,
  `handlers/athlete.go`, `dto/athlete.go`)
- No athlete-scoped HTTP handlers exposing these domains
- No metrics/dashboard HTTP handler or routes (domain + app + infra exist but are
  never wired to HTTP)
- No `RegisterAthleteRoutes` in `internal/interfaces/http/routes/routes.go`
- No athlete handler wiring in `cmd/api/main.go`

The task is to activate athlete handlers that expose internal/domain logic for
athletes (workouts, metrics, messages) following Clean Architecture: handlers are
thin translation layers; all business logic lives in `internal/domain` and
`internal/application`.

---

## 2. Decomposition

### Slice 1 — Domain layer: athlete aggregate + repository interface
**Files:**
- `apps/api/internal/domain/athlete/athlete.go` — Athlete aggregate (id, user_id,
  primary_sport, training_status, injury_status, assigned_coaches, metrics summary)
- `apps/api/internal/domain/athlete/repository.go` — `Repository` interface
  (GetByID, GetWorkouts, GetMetrics, GetMessages for an athlete)
- `apps/api/internal/domain/athlete/events.go` — domain events (optional, e.g.
  AthleteProfileUpdated)

**Rationale:** Feature-first organization (05-backend-architecture.md §1.3). The
athlete aggregate owns athlete-scoped concerns and delegates to sub-domains
(message, workout, dashboard) for data access.

### Slice 2 — Application layer: athlete use cases
**Files:**
- `apps/api/internal/application/athlete/service.go` — `Service` struct composing
  message/workout/dashboard application services; methods:
  - `ListWorkouts(ctx, athleteID)` → delegates to workout service
  - `GetMetrics(ctx, athleteID)` → delegates to dashboard service
  - `ListMessages(ctx, athleteID)` → delegates to message service

**Rationale:** Application layer orchestrates domain use cases (CQRS). It never
depends on PostgreSQL/HTTP directly. Composes existing sub-domain services rather
than duplicating logic.

### Slice 3 — API layer: DTOs + handlers + routes
**Files:**
- `apps/api/internal/interfaces/http/dto/athlete.go` — request/response DTOs
  (AthleteResponse, AthleteWorkoutResponse, AthleteMetricsResponse,
  AthleteMessageResponse, ListResponse wrappers)
- `apps/api/internal/interfaces/http/handlers/athlete.go` — `AthleteHandler`
  with methods:
  - `GetWorkouts(c *fiber.Ctx)` — GET /athletes/:id/workouts
  - `GetMetrics(c *fiber.Ctx)` — GET /athletes/:id/metrics
  - `GetMessages(c *fiber.Ctx)` — GET /athletes/:id/messages
  Handler pattern: parse params → validate → call use case → map to DTO →
  `appresponse.Success`. No business logic.
- `apps/api/internal/interfaces/http/routes/routes.go` — add
  `RegisterAthleteRoutes(api, handler)` registering the 3 routes under `/athletes`
  with `middleware.RequireAuth` and role scoping (athlete self or managing coach)

### Slice 4 — Wiring in main.go
**Files:**
- `apps/api/cmd/api/main.go` — wire athlete repo (postgres), service, handler;
  call `routes.RegisterAthleteRoutes(api, athleteHandler)`

**Note:** Repository implementation (`internal/infrastructure/athlete/`) may be
needed if no existing repo satisfies the athlete repository interface. If the
existing message/workout/dashboard repos are sufficient, the athlete repo can be
a thin facade; otherwise create `infrastructure/athlete/repository.go`.

---

## 3. Acceptance Criteria

- [ ] `cd apps/api && go build ./...` passes with no errors
- [ ] `cd apps/api && go test ./...` passes with no failures
- [ ] New files follow the existing handler pattern (parse → validate → use case →
  response; no business logic in handlers)
- [ ] Athlete-scoped routes registered: GET /athletes/:id/workouts, /metrics,
  /messages
- [ ] Auth middleware applied (`RequireAuth`); authorization ensures athlete self
  or managing coach access
- [ ] Error handling uses `appresponse.Error` + `errors.AppError` mapping to
  correct HTTP status codes
- [ ] DTOs use `dto.ListResponse[T]` for lists (already defined in `dto/user.go`)
- [ ] Response format matches API spec (08-api-specification.md §3.5 error shape,
  §3.1 pagination)

---

## 4. Team

- **Architect** (this dispatch): plan + design review
- **Backend Engineer (Go)**: implementation of slices 1–4
- **QA Engineer**: contract tests against the 3 new endpoints

---

## 5. Risks

| Risk | Mitigation |
|---|---|
| Duplication with existing `/messages` and `/workouts` handlers | Athlete handler delegates to existing message/workout application services; no duplicated business logic |
| `ListResponse[T]` must be verified as imported/available | Already defined in `dto/user.go` line 99; confirmed present |
| No existing athlete repository implementation | If needed, create `infrastructure/athlete/repository.go` as a facade over message/workout/dashboard repos; verify against `go build` |
| Authorization model (athlete self vs. coach access) | Use `middleware.GetUserID` + `GetUserRole`; enforce ownership inside handler before calling use case |
| Database schema for athlete metrics may not exist | Dashboard infra queries `athletes`, `assigned_workouts` tables (confirmed in `infrastructure/dashboard/repository.go`); verify tables exist in local Postgres before implementing |

---

## 6. Next Steps (after plan approval)

1. Implement Slice 1 (domain/athlete)
2. Implement Slice 2 (application/athlete)
3. Implement Slice 3 (dto + handler + routes)
4. Implement Slice 4 (main.go wiring)
5. Run `go build ./...` and `go test ./...`
6. Commit atomically (conventional commit) + PR to main
