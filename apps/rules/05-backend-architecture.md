# MR Training — Backend Architecture

**Version 1.0 — 2026**

---

## Table of Contents

0. [Authoritative Backend — READ FIRST](#0-authoritative-backend--read-first)
1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [API Design](#4-api-design)
5. [Domain Layer](#5-domain-layer)
6. [Application Layer](#6-application-layer)
7. [Infrastructure Layer](#7-infrastructure-layer)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Event-Driven Architecture](#9-event-driven-architecture)
10. [Error Handling](#10-error-handling)
11. [Logging & Observability](#11-logging--observability)
12. [Background Jobs](#12-background-jobs)
13. [Rate Limiting](#13-rate-limiting)
14. [File Upload](#14-file-upload)
15. [Endpoint Pattern — Next.js Route Handlers](#15-endpoint-pattern--nextjs-route-handlers-mandatory)

---

## 0. Authoritative Backend — READ FIRST

**The active backend of MR Training lives inside `apps/web` as Next.js 14 App Router Route Handlers (`apps/web/src/app/api/**/route.ts`) on top of Turso/libSQL.** All new endpoints ("paths") MUST be implemented there. This document governs how to build them; sections that describe the Go/Fiber auxiliary service describe a future/inactive component — do NOT implement new endpoints in Go.

| Layer | Technology (REAL, active) |
|---|---|
| Backend runtime | Next.js 14 API Routes (App Router), TypeScript strict |
| Database | Turso / libSQL (SQLite-compatible), accessed via `@libsql/client` |
| Data access layer | `apps/web/src/lib/coaching-db.ts` (typed helpers + row mappers) |
| Migrations | Versioned SQL files in `apps/web/migrations/NNN_name.sql`, applied to Turso |
| Auth | Clerk v6 (`auth()` from `@clerk/nextjs/server` in every route handler) |
| Payments | Polar.sh (`@polar-sh/sdk`) via `api/polar/*` routes |
| Auxiliary backend | Go 1.25 (`apps/backend/`) — NOT active in QA; not the target for new endpoints |

Sections below keep the transport-agnostic design principles (validation, error shape, status codes, idempotency, domain separation). Where they name Fiber/pgx/NATS specifics, read them as the *pattern* to respect inside a Route Handler, not as the runtime to install.

---

## 1. Architecture Overview

### 1.1 Clean Architecture with Domain-Driven Design

MR Training adopts Clean Architecture with Domain-Driven Design at its core. The system is structured into four concentric layers, each with strict dependency rules: dependencies point inward. The outer layers know about the inner layers; the inner layers know nothing about the outer layers. This means a domain entity never imports an HTTP handler, and a use case never knows whether it's being called from a REST endpoint, a gRPC handler, or an event consumer.

```
┌──────────────────────────────────────────────────────┐
│                  API Layer (Fiber)                   │
│  HTTP handlers, middleware, DTOs, request validation │
├──────────────────────────────────────────────────────┤
│              Application Layer                       │
│  Use cases, command/query handlers, ports (interfaces)│
├──────────────────────────────────────────────────────┤
│                Domain Layer                          │
│  Entities, value objects, domain events, aggregates, │
│  repository interfaces, domain services              │
├──────────────────────────────────────────────────────┤
│            Infrastructure Layer                      │
│  PostgreSQL repositories, NATS event bus, Redis cache,│
│  S3 file storage, external API clients, auth gateway │
└──────────────────────────────────────────────────────┘
```

**API Layer** — Translates HTTP requests into application-layer calls. Handles request parsing, response serialization, and middleware concerns (authentication, rate limiting, CORS, request logging). Does not contain business logic. A handler extracts parameters from the request, calls a use case, and maps the result to an HTTP response. That is its entire responsibility.

**Application Layer** — Orchestrates the domain to fulfill use cases. This is where commands and queries are dispatched, transactions are demarcated, and domain events are raised. The application layer defines ports — interfaces that the domain needs but that must be implemented in infrastructure. A use case receives a command DTO, loads the relevant aggregate from a repository (through a port), calls methods on the aggregate, persists changes, and publishes domain events. It never depends on PostgreSQL, Redis, or HTTP.

**Domain Layer** — Contains all business rules in pure Go code with no external dependencies. Entities encapsulate identity and mutable state. Value objects are immutable, equality-based types that model concepts like `EmailAddress`, `Money`, or `TrainingLoad`. Aggregates are clusters of entities and value objects treated as a single consistency boundary, accessed only through the aggregate root. Repository interfaces are declared here but never implemented here. Domain events are raised by aggregates when significant state transitions occur. Domain services handle operations that don't naturally belong to a single entity — for example, calculating an athlete's acute-to-chronic workload ratio across multiple workout records. The domain layer has zero imports from infrastructure, application, or API packages.

**Infrastructure Layer** — Implements the interfaces declared in the domain and application layers. A `PostgresAthleteRepository` implements `domain.AthleteRepository`. A `NatsEventBus` implements `domain.EventPublisher`. A `RedisAuthTokenStore` implements `ports.TokenStore`. This layer owns the concrete technology decisions: which database driver, which cache client, which message broker library. The rest of the application never imports these directly — they depend on interfaces, and dependency injection wires the concrete implementations at startup.

### 1.2 CQRS at the Application Level

Commands and queries are separated at the application layer. A command mutates state: `CreateWorkout`, `AssignProgram`, `ProcessPayment`. A query reads state: `GetAthleteDashboard`, `ListCoachesForOrganization`, `GetWorkoutHistory`. Commands are handled by command handlers that follow a consistent pattern: validate input, load aggregate, invoke domain logic, persist changes, publish events. Queries are handled by query handlers that can bypass the domain model entirely and read directly from optimized read models or database views when query performance demands it.

This separation is logical, not physical. MR Training does not use separate command and query databases (full event sourcing with separate read stores is reserved for analytics and audit projections). The same PostgreSQL database serves both reads and writes, but the code paths are distinct. Command handlers use repositories that enforce domain invariants. Query handlers are free to write raw SQL, use materialized views, or query Redis for cached dashboard data — whatever produces the fastest, most efficient read. A query handler that writes data is a bug caught at code review.

### 1.3 Feature-First Organization

Code is organized by feature, not by layer. A feature directory contains everything that feature needs — handler, use case, domain model, repository interface — colocated for cohesion:

```
internal/
  training/
    handler.go       — HTTP handlers for training endpoints
    usecase.go       — command/query handlers (CreateWorkout, GetProgram...)
    workout.go       — Workout aggregate, WorkoutExercise entity, ExerciseSet entity
    program.go       — WorkoutProgram aggregate
    repository.go    — repository interfaces (WorkoutRepository, ProgramRepository)
    events.go        — domain events (WorkoutCompleted, ProgramPublished...)
    dto.go           — request/response DTOs
  athlete/
    handler.go
    usecase.go
    athlete.go       — Athlete aggregate
    repository.go
    events.go
    dto.go
  ...
```

Cross-cutting concerns — authentication middleware, observability, rate limiting, error handling — live in a shared `pkg/` directory at the project root. Infrastructure implementations live under `internal/infrastructure/` organized by technology: `internal/infrastructure/postgres/`, `internal/infrastructure/nats/`, `internal/infrastructure/redis/`.

This structure means a developer working on the training feature opens one directory and sees every file they need. They don't hunt through `handlers/`, `models/`, `repositories/`, `services/` directories scattered across the codebase. When a feature is removed, one directory is deleted.

---

## 2. Technology Stack

| Component | Technology | Version | Purpose |
|---|---|---|---|
| Backend runtime | Next.js API Routes (App Router) | 14.2 | Primary backend — every new endpoint lives in `apps/web/src/app/api/**/route.ts` |
| Language (backend) | TypeScript strict | 5.6+ | Explicit types, no `any`, explicit return types on exported handlers |
| Database | Turso / libSQL | — | SQLite-compatible relational DB (see §04 Database Design for modeling rules) |
| Database Client | `@libsql/client` | 0.17+ | Parameterized SQL via `db.execute(sql, params)`; no ORM |
| Migrations | Versioned SQL files | NNN_*.sql | `apps/web/migrations/` applied to Turso; additive-first policy |
| Auth | Clerk (`@clerk/nextjs`) | v6 | `auth()` per request; actors resolved from session, never from body |
| Payments | Polar.sh (`@polar-sh/sdk`) | 0.49+ | Checkout + webhook under `api/polar/*` |
| Cache/Sessions (future) | Redis | 7.x | Reserved for caching/rate limits when needed |
| Event Bus (future) | NATS + JetStream | 2.10+ | Reserved for async domain events when needed |
| Auxiliary backend (INACTIVE) | Go 1.25 + Fiber (`apps/backend/`) | — | Future/side service only; NOT the target for new endpoints |
| Validation | Hand-rolled in handler | — | Validate input before touching the data layer; 400 with field details |
| Testing | Jest + ts-jest | 30.x | Pure business logic unit-tested outside handlers |

**Rule of thumb: if a path can be expressed as a Next.js Route Handler, it IS a Next.js Route Handler.** Reach for Go only for genuinely out-of-band workloads that Next cannot host, and never for CRUD/analytics endpoints consumed by web or mobile.

### 2.1 Why Fiber Over Standard Library or gin

Fiber is built on fasthttp, the fastest HTTP engine in the Go ecosystem. For a platform where the P95 API response time target is under 200ms (see Product Vision §6.1), the framework's per-request allocation overhead matters. Fiber's middleware chain is allocation-light, its router is a radix tree with zero heap allocations per route match, and its handler signature avoids reflection. The trade-off is that fasthttp is not fully compatible with the `net/http` handler interface, so middleware from the broader Go ecosystem sometimes requires a fasthttp adaptor. For MR Training, the performance gain justifies this inconvenience. The framework choice is encapsulated in the API layer — if benchmarks prove that another framework outperforms Fiber for the platform's specific request patterns, the swap is contained to a single package.

---

## 3. Project Structure

```
mr-training/
├── cmd/
│   ├── api/                    # Main HTTP API server
│   │   └── main.go
│   ├── worker/                 # Background job worker (asynq)
│   │   └── main.go
│   └── migrate/                # Database migration runner
│       └── main.go
│
├── internal/
│   ├── training/               # Training domain feature
│   │   ├── handler.go
│   │   ├── usecase.go
│   │   ├── workout.go
│   │   ├── program.go
│   │   ├── exercise.go
│   │   ├── repository.go
│   │   ├── events.go
│   │   └── dto.go
│   ├── athlete/                # Athlete domain feature
│   ├── coach/                  # Coach domain feature
│   ├── organization/           # Organization/tenant management
│   ├── nutrition/              # Nutrition domain feature
│   ├── recovery/               # Recovery domain feature
│   ├── community/              # Community, feed, challenges
│   ├── events/                 # Events and competitions
│   ├── payments/               # Subscriptions, payments, invoicing
│   ├── analytics/              # Analytics and reporting
│   ├── crm/                    # CRM and athlete lifecycle
│   ├── communications/         # Messaging, notifications, announcements
│   ├── ai/                     # AI engine integration
│   ├── auth/                   # Authentication and authorization
│   │   ├── handler.go
│   │   ├── usecase.go
│   │   ├── permissions.go
│   │   ├── tokens.go
│   │   └── middleware.go
│   │
│   └── infrastructure/
│       ├── postgres/           # PostgreSQL repository implementations
│       │   ├── athlete_repo.go
│       │   ├── training_repo.go
│       │   ├── nutrition_repo.go
│       │   └── ...
│       ├── nats/               # NATS event bus implementation
│       │   ├── publisher.go
│       │   ├── subscriber.go
│       │   └── jetstream.go
│       ├── redis/              # Redis implementations
│       │   ├── cache.go
│       │   ├── session.go
│       │   └── ratelimit.go
│       ├── storage/            # S3-compatible file storage
│       │   └── s3.go
│       ├── clerk/              # Clerk auth provider adapter
│       │   └── client.go
│       ├── stripe/             # Stripe payment adapter
│       │   └── client.go
│       └── grpc/               # gRPC clients for internal services
│           ├── ai_client.go
│           └── notification_client.go
│
├── pkg/
│   ├── apperror/               # Application error types and formatting
│   │   └── errors.go
│   ├── middleware/              # Shared Fiber middleware
│   │   ├── auth.go
│   │   ├── ratelimit.go
│   │   ├── recover.go
│   │   ├── requestid.go
│   │   └── logging.go
│   ├── pagination/             # Cursor/offset pagination utilities
│   │   └── pagination.go
│   ├── query/                  # Filtering and sorting DSL
│   │   └── query.go
│   ├── telemetry/              # OpenTelemetry setup
│   │   ├── tracing.go
│   │   └── metrics.go
│   ├── config/                 # Application configuration
│   │   └── config.go
│   └── validator/              # Custom validation rules
│       └── validator.go
│
├── api/
│   └── openapi/                # OpenAPI 3.1 specification
│       └── spec.yaml
│
├── proto/                      # Protobuf definitions for gRPC services
│   ├── ai/
│   │   └── v1/
│   │       └── ai.proto
│   └── notifications/
│       └── v1/
│           └── notifications.proto
│
├── migrations/                 # SQL migration files
│   ├── 000001_create_organizations.up.sql
│   ├── 000001_create_organizations.down.sql
│   └── ...
│
├── scripts/                    # Development and deployment scripts
├── docker-compose.yml          # Local development environment
├── Dockerfile                  # Production build
├── go.mod
├── go.sum
└── .env.example
```

### 3.1 Dependency Injection with Wire

Google Wire generates dependency injection code at compile time. A `wire.go` file in each `cmd/` entrypoint declares the set of providers needed, and `wire` generates a `wire_gen.go` file that constructs the entire object graph. This approach means there is no runtime service locator, no reflection-based container, and no hidden dependency graph. The generated code is plain Go that can be read, debugged, and profiled like any other code. If a dependency is missing, the build fails — not at runtime during a production incident.

```go
// cmd/api/wire.go
//go:build wireinject

func InitializeApp(cfg *config.Config) (*App, error) {
    wire.Build(
        // Infrastructure
        postgres.NewConnectionPool,
        redis.NewClient,
        nats.NewConnection,
        storage.NewS3Client,

        // Repository implementations
        postgres.NewAthleteRepository,
        postgres.NewWorkoutRepository,
        postgres.NewProgramRepository,

        // Event bus
        nats.NewEventPublisher,

        // Cache
        redis.NewCache,

        // Use cases
        training.NewUseCases,
        athlete.NewUseCases,
        auth.NewUseCases,

        // Handlers
        training.NewHandler,
        athlete.NewHandler,
        auth.NewHandler,

        // App
        NewRouter,
        NewApp,
    )
    return nil, nil
}
```

---

## 4. API Design

### 4.1 Router and Middleware Chain

The Fiber router is mounted with a middleware stack that executes in order for every request. Middleware that adds context (request ID, logger) runs first. Middleware that gates access (authentication, rate limiting, tenant resolution) runs next. The handler runs last.

```go
func NewRouter(
    cfg *config.Config,
    authHandler *auth.Handler,
    trainingHandler *training.Handler,
    athleteHandler *athlete.Handler,
    // ... other handlers
) *fiber.App {
    app := fiber.New(fiber.Config{
        AppName:      "mr-training",
        ErrorHandler: apperror.FiberErrorHandler,
        JSONEncoder:  json.Marshal,
        JSONDecoder:  json.Unmarshal,
        ReadTimeout:  15 * time.Second,
        WriteTimeout: 30 * time.Second,
        IdleTimeout:  120 * time.Second,
        BodyLimit:    10 * 1024 * 1024, // 10MB
    })

    // Global middleware
    app.Use(middleware.RequestID())
    app.Use(middleware.Logger())
    app.Use(middleware.Recover())
    app.Use(middleware.CORS(cfg.CORS))
    app.Use(middleware.Tracing())

    // Health check (no auth)
    app.Get("/health", healthCheck)
    app.Get("/metrics", prometheusHandler)

    // API v1
    v1 := app.Group("/api/v1")
    v1.Use(middleware.RateLimit(cfg.RateLimit))
    v1.Use(middleware.TenantContext())

    // Public endpoints
    auth := v1.Group("/auth")
    auth.Post("/login", authHandler.Login)
    auth.Post("/register", authHandler.Register)
    auth.Post("/refresh", authHandler.RefreshToken)

    // Authenticated endpoints
    authed := v1.Group("")
    authed.Use(middleware.Authenticate(cfg.JWT))

    // Training
    training := authed.Group("/training")
    training.Get("/programs", trainingHandler.ListPrograms)
    training.Post("/programs", trainingHandler.CreateProgram)
    training.Get("/programs/:id", trainingHandler.GetProgram)
    training.Put("/programs/:id", trainingHandler.UpdateProgram)
    training.Delete("/programs/:id", trainingHandler.DeleteProgram)
    training.Post("/programs/:id/publish", trainingHandler.PublishProgram)
    training.Post("/programs/:id/assign", trainingHandler.AssignProgram)

    training.Get("/workouts", trainingHandler.ListWorkouts)
    training.Post("/workouts", trainingHandler.CreateWorkout)
    training.Get("/workouts/:id", trainingHandler.GetWorkout)
    training.Post("/workouts/:id/complete", trainingHandler.CompleteWorkout)
    training.Post("/workouts/:id/review", trainingHandler.ReviewWorkout)

    training.Get("/exercises", trainingHandler.ListExercises)

    // Athletes
    athletes := authed.Group("/athletes")
    athletes.Get("/", athleteHandler.List)
    athletes.Post("/", athleteHandler.Create)
    athletes.Get("/:id", athleteHandler.Get)
    athletes.Put("/:id", athleteHandler.Update)
    athletes.Get("/:id/metrics", athleteHandler.GetMetrics)
    athletes.Get("/:id/progress", athleteHandler.GetProgress)

    // ... additional route groups for nutrition, recovery, community, etc.

    return app
}
```

### 4.2 API Versioning

Versioning uses URL path prefixes: `/api/v1/`, `/api/v2/`. A new API version is created when a breaking change is introduced — a field is removed from a response, a required parameter is added, or a response structure is reorganized. Non-breaking changes (adding optional fields, adding new endpoints) are released within the current version. A deprecated version continues to function for a minimum of two release cycles (approximately 6 months) with deprecation warnings in response headers: `Deprecation: true`, `Sunset: Sat, 01 Jan 2027 00:00:00 GMT`.

Handler logic for different API versions lives in the same feature package. The router maps a versioned path to the appropriate handler method. Internally, version-specific DTOs map to the same use case calls — the domain model does not version.

### 4.3 Request/Response DTOs

Every API endpoint defines explicit request and response DTOs. These are feature-local structs in the feature's `dto.go` file. They are never reused across features — coupling DTOs between features creates unintended breakage when one feature's API evolves.

```go
// internal/training/dto.go

// --- Request DTOs ---

type CreateProgramRequest struct {
    Name        string    `json:"name" validate:"required,min=1,max=255"`
    Description string    `json:"description" validate:"max=2000"`
    SportType   string    `json:"sport_type" validate:"required,oneof=gym running tennis swimming cycling crossfit"`
    StartDate   string    `json:"start_date" validate:"required,datetime=2006-01-02"`
    EndDate     string    `json:"end_date" validate:"required,datetime=2006-01-02"`
    Phases      []PhaseDTO `json:"phases" validate:"min=1,dive"`
    AthleteIDs  []string  `json:"athlete_ids" validate:"min=1,dive,uuid"`
}

type ListProgramsRequest struct {
    SportType string `query:"sport_type" validate:"omitempty,oneof=gym running tennis swimming cycling crossfit"`
    Status    string `query:"status" validate:"omitempty,oneof=draft active completed archived"`
    Search    string `query:"search" validate:"omitempty,max=200"`
    Page      int    `query:"page" validate:"min=1"`
    PerPage   int    `query:"per_page" validate:"min=1,max=100"`
    SortBy    string `query:"sort_by" validate:"omitempty,oneof=name created_at start_date status"`
    SortDir   string `query:"sort_dir" validate:"omitempty,oneof=asc desc"`
}

// --- Response DTOs ---

type ProgramResponse struct {
    ID          string       `json:"id"`
    Name        string       `json:"name"`
    Description string       `json:"description"`
    SportType   string       `json:"sport_type"`
    Status      string       `json:"status"`
    StartDate   string       `json:"start_date"`
    EndDate     string       `json:"end_date"`
    Phases      []PhaseDTO   `json:"phases"`
    Coach       CoachSummary `json:"coach"`
    AthleteCount int         `json:"athlete_count"`
    CreatedAt   string       `json:"created_at"`
    UpdatedAt   string       `json:"updated_at"`
}

type ListProgramsResponse struct {
    Data       []ProgramResponse `json:"data"`
    Pagination PaginationMeta    `json:"pagination"`
}

type ErrorResponse struct {
    Error      ErrorDetail `json:"error"`
    RequestID  string      `json:"request_id"`
}

type ErrorDetail struct {
    Code    string `json:"code"`
    Message string `json:"message"`
    Details []FieldError `json:"details,omitempty"`
}

type FieldError struct {
    Field   string `json:"field"`
    Message string `json:"message"`
}
```

### 4.4 Pagination, Filtering, and Sorting

**Pagination** uses offset/limit for most list endpoints, cursor-based pagination for real-time feeds (community feed, notification list). Offset pagination is simpler to implement and works well for bounded result sets. Cursor pagination is used where results are append-only and consistency under concurrent writes matters.

Offset pagination parameters: `page` (default 1), `per_page` (default 20, max 100). The response includes `PaginationMeta`:

```json
{
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_items": 247,
    "total_pages": 13
  }
}
```

Cursor pagination uses opaque base64-encoded cursors:

```json
{
  "pagination": {
    "next_cursor": "eyJjcmVhdGVkX2F0IjoiMjAyNi0wMy0xNVQwODowMDowMFoifQ==",
    "has_more": true
  }
}
```

**Filtering** uses query parameters. Simple equality filters: `?status=active&sport_type=running`. Range filters: `?scheduled_after=2026-01-01&scheduled_before=2026-03-31`. Full-text search: `?search=bench+press`. Multi-value: `?sport_type=running,cycling`. All filters are validated against an allowlist per endpoint — unrecognized filter keys are silently ignored, not rejected.

**Sorting** uses `sort_by` and `sort_dir` (asc/desc). Defaults are endpoint-specific and documented in the OpenAPI spec. Sortable columns are allowlisted per endpoint. Invalid sort columns default to the endpoint's primary sort (typically `created_at`).

### 4.5 Handler Pattern

Every handler follows the same pattern: parse request, validate, call use case, return response. Handlers never contain business logic. A handler is a thin translation layer between HTTP concerns and application concerns.

```go
func (h *Handler) CreateProgram(c *fiber.Ctx) error {
    var req CreateProgramRequest
    if err := c.BodyParser(&req); err != nil {
        return apperror.ErrInvalidRequestBody(err)
    }
    if err := h.validator.Struct(req); err != nil {
        return apperror.ErrValidationFailed(err)
    }

    coachID := c.Locals("user_id").(string)
    orgID := c.Locals("organization_id").(string)

    cmd := CreateProgramCommand{
        Name:        req.Name,
        Description: req.Description,
        SportType:   req.SportType,
        StartDate:   req.StartDate,
        EndDate:     req.EndDate,
        Phases:      req.Phases,
        CoachID:     coachID,
        OrgID:       orgID,
        AthleteIDs:  req.AthleteIDs,
    }

    program, err := h.usecases.CreateProgram(c.Context(), cmd)
    if err != nil {
        return err
    }

    return c.Status(fiber.StatusCreated).JSON(program)
}
```

---

## 5. Domain Layer

### 5.1 Entities

Entities are objects defined by their identity, not their attributes. An athlete's name may change, their weight may fluctuate, their sport may shift — but their UUID remains constant. Entities enforce invariants: you cannot complete a workout that has already been completed. You cannot assign an expired program to an athlete. You cannot set an athlete's injury status to "healthy" if they have an open injury record.

```go
// internal/training/workout.go

type Workout struct {
    id             uuid.UUID
    programID      *uuid.UUID
    organizationID uuid.UUID
    athleteID      uuid.UUID
    coachID        *uuid.UUID
    name           string
    description    string
    sportType      SportType
    scheduledDate  time.Time
    completedAt    *time.Time
    exercises      []WorkoutExercise
    status         WorkoutStatus
    rpe            *int
    athleteNotes   string
    coachFeedback  string
    coachNotes     string
    reviewedAt     *time.Time
    reviewedBy     *uuid.UUID
    domainEvents   []DomainEvent
}

func (w *Workout) Complete(rpe int, notes string, exerciseResults []ExerciseResult) error {
    if w.status != WorkoutStatusScheduled {
        return ErrWorkoutAlreadyCompleted
    }
    if rpe < 1 || rpe > 10 {
        return ErrInvalidRPE
    }

    now := time.Now()
    w.status = WorkoutStatusCompleted
    w.completedAt = &now
    w.rpe = &rpe
    w.athleteNotes = notes

    for _, result := range exerciseResults {
        if err := w.applyExerciseResult(result); err != nil {
            return err
        }
    }

    w.raiseEvent(WorkoutCompletedEvent{
        WorkoutID:    w.id,
        AthleteID:    w.athleteID,
        CoachID:      w.coachID,
        CompletedAt:  now,
        RPE:          rpe,
    })

    return nil
}

func (w *Workout) Review(feedback string, reviewedBy uuid.UUID) error {
    if w.status != WorkoutStatusCompleted {
        return ErrWorkoutNotCompleted
    }

    now := time.Now()
    w.coachFeedback = feedback
    w.reviewedAt = &now
    w.reviewedBy = &reviewedBy
    w.status = WorkoutStatusReviewed

    w.raiseEvent(WorkoutReviewedEvent{
        WorkoutID:  w.id,
        ReviewedBy: reviewedBy,
        ReviewedAt: now,
    })

    return nil
}

func (w *Workout) DomainEvents() []DomainEvent {
    return w.domainEvents
}

func (w *Workout) clearEvents() {
    w.domainEvents = nil
}
```

Entities never expose their fields directly. Getters provide read access; methods provide mutation with invariant enforcement. This is not boilerplate — it is the mechanism by which the domain guarantees correctness at every state transition.

### 5.2 Value Objects

Value objects are immutable, equality-based types with no identity. Two `Money` objects representing 100 USD cents are equal regardless of which struct instance holds them. Value objects encapsulate validation and formatting:

```go
type SportType string

const (
    SportTypeGym     SportType = "gym"
    SportTypeRunning SportType = "running"
    SportTypeTennis  SportType = "tennis"
    SportTypeSwimming SportType = "swimming"
    // ...
)

func NewSportType(s string) (SportType, error) {
    st := SportType(s)
    switch st {
    case SportTypeGym, SportTypeRunning, SportTypeTennis, SportTypeSwimming,
         SportTypeCycling, SportTypeCrossFit:
        return st, nil
    default:
        return "", fmt.Errorf("invalid sport type: %s", s)
    }
}
```

### 5.3 Aggregate Roots

An aggregate is a cluster of related objects treated as a unit for data changes. The aggregate root is the entry point — external code references only the root, never its children. In MR Training:

- **Workout** is the aggregate root for a training session. It contains `WorkoutExercise` entities which contain `ExerciseSet` entities. All changes to exercises or sets go through the Workout.
- **WorkoutProgram** is the aggregate root for a training plan. It contains phases, workout templates, and assignment state. A program is published, assigned, and archived as a single unit.
- **Athlete** is the aggregate root for an athlete profile. It owns goals, metrics, and coach assignments. An external service cannot directly modify an athlete's metrics — it calls a method on the Athlete aggregate.
- **Organization** is the aggregate root for tenant configuration, subscription state, and feature flags.

The aggregate boundary also defines the transactional boundary. A single unit of work — one database transaction — modifies exactly one aggregate. If two aggregates must change in response to the same event, the change is propagated through domain events, not through the same transaction. This constraint prevents the most common source of consistency bugs in distributed systems: transactions that span entity boundaries and leave the system in an inconsistent state if one half of the transaction fails.

### 5.4 Domain Events

Domain events record significant state transitions within an aggregate. They are raised by the aggregate, collected by the application layer during persistence, and published to the event bus after the transaction commits. Events are immutable structs with a timestamp, an aggregate ID, and relevant data:

```go
type WorkoutCompletedEvent struct {
    EventID     uuid.UUID
    WorkoutID   uuid.UUID
    AthleteID   uuid.UUID
    CoachID     *uuid.UUID
    OrgID       uuid.UUID
    CompletedAt time.Time
    RPE         int
    OccurredAt  time.Time
}
```

Domain events power several downstream processes: updating the athlete's metrics cache, triggering AI analysis of recent training, notifying the coach, updating the community feed, and appending to the audit log. None of these processes are the workout completion handler's concern. The handler completes the workout and publishes the event. Separate consumers react independently.

### 5.5 Repository Interfaces

Repository interfaces are declared in the domain layer, implemented in infrastructure. They operate on aggregates, not rows:

```go
type WorkoutRepository interface {
    Save(ctx context.Context, workout *Workout) error
    FindByID(ctx context.Context, id uuid.UUID, orgID uuid.UUID) (*Workout, error)
    FindByAthlete(ctx context.Context, athleteID uuid.UUID, dateRange DateRangeFilter) ([]*Workout, error)
    FindByProgram(ctx context.Context, programID uuid.UUID) ([]*Workout, error)
    FindPendingReview(ctx context.Context, coachID uuid.UUID, orgID uuid.UUID) ([]*Workout, error)
    FindScheduledForDate(ctx context.Context, athleteID uuid.UUID, date time.Time) ([]*Workout, error)
}
```

The repository deals in domain objects. The implementation maps between domain objects and database rows. The domain layer never sees a SQL query.

### 5.6 Domain Services

Domain services encapsulate logic that spans multiple aggregates or that doesn't naturally belong to a single entity. The acute-to-chronic workload ratio calculation is a domain service — it reads an athlete's recent workout history and produces a training load score, but the calculation itself is a pure function that doesn't mutate state:

```go
type TrainingLoadService struct{}

func (s *TrainingLoadService) CalculateACWR(athleteID uuid.UUID, recentWorkouts []*Workout) float64 {
    acuteLoad := s.calculateRollingLoad(recentWorkouts, 7)
    chronicLoad := s.calculateRollingLoad(recentWorkouts, 28)
    if chronicLoad == 0 {
        return 0
    }
    return acuteLoad / chronicLoad
}
```

---

## 6. Application Layer

### 6.1 Use Cases and Command Handlers

Every use case is a single-purpose struct with a single `Handle` method. This is the command handler pattern from CQRS. The handler receives a command DTO, validates it, loads the aggregate, invokes domain logic, persists, and publishes events:

```go
type CreateProgramCommand struct {
    Name        string
    Description string
    SportType   string
    StartDate   string
    EndDate     string
    Phases      []PhaseDTO
    CoachID     string
    OrgID       string
    AthleteIDs  []string
}

type CreateProgramHandler struct {
    programRepo ProgramRepository
    athleteRepo AthleteRepository
    eventBus    EventPublisher
    txManager   TransactionManager
}

func (h *CreateProgramHandler) Handle(ctx context.Context, cmd CreateProgramCommand) (*ProgramResponse, error) {
    sportType, err := domain.NewSportType(cmd.SportType)
    if err != nil {
        return nil, apperror.ErrInvalidInput("sport_type", err.Error())
    }

    startDate, err := time.Parse("2006-01-02", cmd.StartDate)
    if err != nil {
        return nil, apperror.ErrInvalidInput("start_date", "must be YYYY-MM-DD")
    }

    endDate, err := time.Parse("2006-01-02", cmd.EndDate)
    if err != nil {
        return nil, apperror.ErrInvalidInput("end_date", "must be YYYY-MM-DD")
    }

    coachID, _ := uuid.Parse(cmd.CoachID)
    orgID, _ := uuid.Parse(cmd.OrgID)

    program := domain.NewWorkoutProgram(cmd.Name, cmd.Description, sportType, startDate, endDate, coachID, orgID)

    for _, p := range cmd.Phases {
        if err := program.AddPhase(p.Name, p.Description, p.WeekStart, p.WeekEnd); err != nil {
            return nil, apperror.ErrInvalidInput("phases", err.Error())
        }
    }

    var athleteIDs []uuid.UUID
    for _, idStr := range cmd.AthleteIDs {
        id, _ := uuid.Parse(idStr)
        athleteIDs = append(athleteIDs, id)
    }

    if err := h.txManager.Run(ctx, func(ctx context.Context) error {
        if err := h.programRepo.Save(ctx, program); err != nil {
            return err
        }

        for _, athleteID := range athleteIDs {
            _, err := h.athleteRepo.FindByID(ctx, athleteID, orgID)
            if err != nil {
                return apperror.ErrNotFound("athlete", athleteID.String())
            }
            program.AssignAthlete(athleteID)
            if err := h.programRepo.SaveAssignment(ctx, program.ID(), athleteID, coachID, orgID); err != nil {
                return err
            }
        }

        return nil
    }); err != nil {
        return nil, err
    }

    for _, event := range program.DomainEvents() {
        if err := h.eventBus.Publish(ctx, event); err != nil {
            // Log the failure but don't fail the request.
            // The event bus guarantees delivery semantics.
            slog.Error("failed to publish event", "event", event.EventName(), "error", err)
        }
    }

    return toProgramResponse(program), nil
}
```

### 6.2 Queries

Queries are handled by separate query handlers that bypass the domain model. A query handler writes optimized SQL, queries pre-built materialized views, or reads from a Redis cache. It returns DTOs, not domain objects:

```go
type GetAthleteDashboardQuery struct {
    AthleteID string
    OrgID     string
}

type GetAthleteDashboardHandler struct {
    db *pgxpool.Pool // Direct database access for read optimization
}

func (h *GetAthleteDashboardHandler) Handle(ctx context.Context, q GetAthleteDashboardQuery) (*AthleteDashboardResponse, error) {
    athleteID, _ := uuid.Parse(q.AthleteID)
    orgID, _ := uuid.Parse(q.OrgID)

    const query = `
        SELECT
            a.id, a.primary_sport, a.training_status,
            up.first_name, up.last_name,
            COALESCE(a.weekly_adherence_pct, 0) as adherence_pct,
            COALESCE(a.weekly_training_load, 0) as weekly_load,
            COALESCE(a.readiness_score, 0) as readiness_score,
            p.name as current_program_name,
            p.phase_name as current_phase
        FROM athlete_dashboard_view a
        JOIN user_profiles up ON up.user_id = a.user_id
        LEFT JOIN active_program_view p ON p.athlete_id = a.id
        WHERE a.id = $1 AND a.organization_id = $2
    `

    var resp AthleteDashboardResponse
    err := h.db.QueryRow(ctx, query, athleteID, orgID).Scan(
        &resp.ID, &resp.PrimarySport, &resp.Status,
        &resp.FirstName, &resp.LastName,
        &resp.AdherencePct, &resp.WeeklyLoad, &resp.ReadinessScore,
        &resp.CurrentProgram, &resp.CurrentPhase,
    )
    if err != nil {
        if errors.Is(err, pgx.ErrNoRows) {
            return nil, apperror.ErrNotFound("athlete", q.AthleteID)
        }
        return nil, err
    }

    return &resp, nil
}
```

### 6.3 DTOs

Application-layer DTOs are distinct from API-layer DTOs. The API layer converts HTTP request bodies into command/query DTOs and converts response DTOs into HTTP response bodies. This separation means the application layer can be called from multiple transports (REST, gRPC, event consumer, CLI) without coupling to any transport's serialization format.

### 6.4 Validators

Validation occurs at two levels. API-layer validation checks structural correctness: is this field present? Is this string a valid UUID? Is this integer within range? These validations use struct tags and `go-playground/validator`. Domain-layer validation checks business rules: can this program be published? Does this athlete have an active injury that prevents this exercise? These validations live in the domain entity methods and domain services.

---

## 7. Infrastructure Layer

### 7.1 PostgreSQL Repository Implementations

Repositories use `pgx` directly — no ORM. The Mapping between domain objects and database rows is explicit:

```go
type PostgresWorkoutRepository struct {
    pool *pgxpool.Pool
}

func (r *PostgresWorkoutRepository) Save(ctx context.Context, w *domain.Workout) error {
    const upsertWorkout = `
        INSERT INTO workouts (id, program_id, organization_id, athlete_id, coach_id,
            name, description, sport_type, scheduled_date, completed_at, status, rpe,
            athlete_notes, coach_notes, coach_feedback, reviewed_at, reviewed_by, version)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        ON CONFLICT (id) DO UPDATE SET
            completed_at = EXCLUDED.completed_at,
            status = EXCLUDED.status,
            rpe = EXCLUDED.rpe,
            athlete_notes = EXCLUDED.athlete_notes,
            coach_feedback = EXCLUDED.coach_feedback,
            coach_notes = EXCLUDED.coach_notes,
            reviewed_at = EXCLUDED.reviewed_at,
            reviewed_by = EXCLUDED.reviewed_by,
            version = workouts.version + 1
        WHERE workouts.version = $18
        RETURNING version
    `

    // Set organization context for RLS
    if _, err := r.pool.Exec(ctx, "SELECT set_config('app.current_organization_id', $1, true)", w.OrganizationID().String()); err != nil {
        return err
    }

    var newVersion int
    err := r.pool.QueryRow(ctx, upsertWorkout,
        w.ID(), w.ProgramID(), w.OrganizationID(), w.AthleteID(), w.CoachID(),
        w.Name(), w.Description(), string(w.SportType()), w.ScheduledDate(),
        w.CompletedAt(), string(w.Status()), w.RPE(),
        w.AthleteNotes(), w.CoachNotes(), w.CoachFeedback(),
        w.ReviewedAt(), w.ReviewedBy(), w.Version(),
    ).Scan(&newVersion)

    if err != nil {
        if errors.Is(err, pgx.ErrNoRows) {
            return domain.ErrConcurrentModification
        }
        return fmt.Errorf("failed to save workout: %w", err)
    }

    return r.saveExercises(ctx, w.ID(), w.Exercises())
}
```

Optimistic concurrency is enforced through the `version` column. The `WHERE workouts.version = $18` clause ensures that if two concurrent requests attempt to modify the same workout, only one succeeds. The other receives an `ErrConcurrentModification` that the application layer retries or surfaces as a conflict error.

### 7.2 NATS Event Bus

NATS serves as the asynchronous communication backbone. Domain events are published to NATS subjects using a hierarchical naming scheme:

```
events.workout.completed
events.workout.reviewed
events.program.published
events.program.assigned
events.athlete.registered
events.athlete.injury_status_changed
events.payment.subscription_created
events.payment.invoice_paid
```

JetStream provides persistence, at-least-once delivery, and consumer groups for horizontal scaling:

```go
type NatsEventBus struct {
    conn *nats.Conn
    js   nats.JetStreamContext
}

func (b *NatsEventBus) Publish(ctx context.Context, event domain.DomainEvent) error {
    data, err := json.Marshal(event)
    if err != nil {
        return err
    }

    subject := fmt.Sprintf("events.%s.%s", event.AggregateType(), event.EventName())
    msg := nats.NewMsg(subject)
    msg.Data = data
    msg.Header.Set("X-Event-ID", event.EventID().String())
    msg.Header.Set("X-Event-Type", event.EventName())
    msg.Header.Set("X-Aggregate-ID", event.AggregateID().String())
    msg.Header.Set("X-Organization-ID", event.OrganizationID().String())
    msg.Header.Set("X-Timestamp", event.OccurredAt().Format(time.RFC3339))

    _, err = b.js.PublishMsg(msg)
    return err
}

func (b *NatsEventBus) Subscribe(ctx context.Context, subject string, queueGroup string, handler EventHandler) error {
    sub, err := b.js.QueueSubscribe(subject, queueGroup, func(msg *nats.Msg) {
        var event domain.DomainEvent
        // Deserialize based on msg.Header.Get("X-Event-Type")
        if err := json.Unmarshal(msg.Data, &event); err != nil {
            slog.Error("failed to unmarshal event", "error", err)
            msg.Nak()
            return
        }
        if err := handler(ctx, event); err != nil {
            slog.Error("event handler failed", "event", event.EventName(), "error", err)
            msg.Nak()
            return
        }
        msg.Ack()
    }, nats.ManualAck(), nats.Durable(queueGroup))

    return err
}
```

### 7.3 Redis Cache

Redis serves four purposes: session storage for authentication tokens, response caching for hot read paths (athlete dashboard, exercise library), rate limit counters, and leaderboard storage for challenges and community features.

Cache keys follow a structured naming convention: `cache:{entity}:{id}:{variant}`. TTLs are set per cache entry based on the volatility of the underlying data. An exercise library entry (rarely changed) gets a 24-hour TTL. An athlete dashboard (updated after every workout) gets a 60-second TTL with cache-aside invalidation on workout completion:

```go
type RedisCache struct {
    client *redis.Client
}

func (c *RedisCache) GetAthleteDashboard(ctx context.Context, athleteID uuid.UUID) (*AthleteDashboardResponse, error) {
    key := fmt.Sprintf("cache:athlete:dashboard:%s", athleteID)
    data, err := c.client.Get(ctx, key).Bytes()
    if err != nil {
        return nil, err // redis.Nil means cache miss
    }
    var resp AthleteDashboardResponse
    if err := json.Unmarshal(data, &resp); err != nil {
        return nil, err
    }
    return &resp, nil
}

func (c *RedisCache) InvalidateAthleteDashboard(ctx context.Context, athleteID uuid.UUID) error {
    key := fmt.Sprintf("cache:athlete:dashboard:%s", athleteID)
    return c.client.Del(ctx, key).Err()
}
```

### 7.4 File Storage (S3-Compatible)

Media files — exercise demonstration videos, profile avatars, progress photos, document attachments — are stored in S3-compatible object storage. The application generates presigned URLs for upload and download, so media data never transits through the API server:

```go
type S3Storage struct {
    client     *s3.Client
    bucket     string
    publicURL  string
    presigner  *s3.PresignClient
}

func (s *S3Storage) GenerateUploadURL(ctx context.Context, key string, contentType string, sizeBytes int64) (*UploadURL, error) {
    req, err := s.presigner.PresignPutObject(ctx, &s3.PutObjectInput{
        Bucket:      &s.bucket,
        Key:         &key,
        ContentType: &contentType,
        ContentLength: &sizeBytes,
    }, s3.WithPresignExpires(15*time.Minute))

    return &UploadURL{
        URL:    req.URL,
        Method: "PUT",
        Key:    key,
        Headers: map[string]string{
            "Content-Type": contentType,
        },
        ExpiresAt: time.Now().Add(15 * time.Minute),
    }, nil
}

func (s *S3Storage) GetPublicURL(key string) string {
    return fmt.Sprintf("%s/%s", s.publicURL, key)
}
```

---

## 8. Authentication & Authorization

### 8.1 Authentication Flow

Authentication uses Clerk as the identity provider. The API server validates Clerk-issued session tokens on every request. New users authenticate through Clerk's hosted UI or embedded components; the API server never handles passwords directly. This separation means the API server does not store password hashes, implement password reset flows, or manage multi-factor authentication — Clerk owns the entire authentication lifecycle.

The Clerk middleware extracts the session token from the `Authorization` header, validates it against Clerk's API (with local JWKS caching for sub-millisecond validation), and injects the authenticated user's identity into the request context:

```go
func Authenticate(cfg *config.JWTConfig) fiber.Handler {
    return func(c *fiber.Ctx) error {
        token := extractBearerToken(c)
        if token == "" {
            return apperror.ErrUnauthenticated
        }

        claims, err := validateClerkToken(c.Context(), token, cfg.JWKSEndpoint)
        if err != nil {
            return apperror.ErrUnauthenticated
        }

        c.Locals("user_id", claims.Subject)
        c.Locals("email", claims.Email)
        c.Locals("session_id", claims.SessionID)
        c.Locals("auth_provider", "clerk")

        return c.Next()
    }
}
```

### 8.2 Tenant Resolution

After authentication, the tenant context middleware resolves the user's current organization. Multi-organization users (a coach who works across two academies) select their active organization through a header (`X-Organization-ID`) or a session preference. The middleware validates that the user belongs to the requested organization and sets `app.current_organization_id` in the PostgreSQL session for RLS enforcement:

```go
func TenantContext() fiber.Handler {
    return func(c *fiber.Ctx) error {
        userID := c.Locals("user_id").(string)
        orgID := c.Get("X-Organization-ID")

        if orgID == "" {
            // Default to user's primary organization
            orgID = resolvePrimaryOrg(c.Context(), userID)
        }

        if !userBelongsToOrg(c.Context(), userID, orgID) {
            return apperror.ErrForbidden("you do not belong to this organization")
        }

        c.Locals("organization_id", orgID)
        return c.Next()
    }
}
```

### 8.3 Role-Based Access Control

Authorization is role-based with granular permissions. Every role is a collection of permission strings. A permission is a dot-separated path: `training.programs.create`, `athletes.metrics.view`, `payments.invoices.manage`. Middleware checks permissions against the authenticated user's roles:

```go
type Permission string

const (
    PermTrainingProgramsCreate  Permission = "training.programs.create"
    PermTrainingProgramsRead    Permission = "training.programs.read"
    PermTrainingProgramsUpdate  Permission = "training.programs.update"
    PermTrainingProgramsDelete  Permission = "training.programs.delete"
    PermTrainingProgramsPublish Permission = "training.programs.publish"
    PermTrainingWorkoutsCreate  Permission = "training.workouts.create"
    PermTrainingWorkoutsRead    Permission = "training.workouts.read"
    PermTrainingWorkoutsComplete Permission = "training.workouts.complete"
    PermAthletesCreate          Permission = "athletes.create"
    PermAthletesRead            Permission = "athletes.read"
    PermAthletesUpdate          Permission = "athletes.update"
    PermAthletesMetricsRead     Permission = "athletes.metrics.read"
    PermBillingManage           Permission = "billing.manage"
    PermOrgSettingsManage       Permission = "organization.settings.manage"
    // ... ~60 permissions total across all domains
)

var RolePermissions = map[string][]Permission{
    "coach": {
        PermTrainingProgramsCreate, PermTrainingProgramsRead,
        PermTrainingProgramsUpdate, PermTrainingProgramsPublish,
        PermTrainingWorkoutsCreate, PermTrainingWorkoutsRead,
        PermAthletesCreate, PermAthletesRead, PermAthletesUpdate,
        PermAthletesMetricsRead,
        // Coach cannot delete programs (admin only)
    },
    "athlete": {
        PermTrainingWorkoutsRead, PermTrainingWorkoutsComplete,
        PermAthletesMetricsRead,
        // Read-only access to their own data + the ability to log workouts
    },
    "admin": {
        // All permissions including billing and organization management
    },
    "nutritionist": {
        // Nutrition domain permissions + athlete read access
    },
    "physiotherapist": {
        // Recovery domain permissions + athlete read access
    },
}
```

Permission enforcement middleware is applied per-route group. A coach cannot access admin billing endpoints; an athlete cannot create training programs. The authorization check fails fast with a 403 response before the handler executes:

```go
func RequirePermission(perm Permission) fiber.Handler {
    return func(c *fiber.Ctx) error {
        userID := c.Locals("user_id").(string)
        orgID := c.Locals("organization_id").(string)

        roles, err := getUserRoles(c.Context(), userID, orgID)
        if err != nil {
            return apperror.ErrForbidden("failed to resolve roles")
        }

        for _, role := range roles {
            if hasPermission(role, perm) {
                return c.Next()
            }
        }

        return apperror.ErrForbidden("insufficient permissions")
    }
}

// Usage in router setup:
programs.Post("/", RequirePermission(PermTrainingProgramsCreate), trainingHandler.CreateProgram)
```

### 8.4 API Keys for Integrations

Organizations can generate API keys for third-party integrations (custom dashboards, data pipelines, ETL processes). An API key is a long-lived credential with a configurable permission scope. API keys are stored as SHA-256 hashes in the database; the raw key is displayed exactly once at creation time. API key authentication follows the same authorization flow as user authentication — the key's permission set is resolved, and subsequent middleware checks apply the same permission enforcement:

```
Authorization: Bearer mrk_live_4f8a2b1c9d3e...
```

API keys support expiration dates, IP allowlisting, and rate limits independent of user-based limits.

---

## 9. Event-Driven Architecture

### 9.1 Domain Events vs. Integration Events

A **domain event** is raised within a bounded context when an aggregate's state changes. `WorkoutCompleted` is a training domain event. `AthleteRegistered` is an athlete domain event. These events never cross bounded context boundaries directly — a training domain consumer does not subscribe to nutrition domain events. If a different bounded context needs to react to an event, an **integration event** is published. Integration events are explicitly designed for cross-boundary communication with a stable schema and versioning.

### 9.2 Event Flow

```
┌──────────┐    ┌──────────────┐    ┌───────────┐
│ Workout  │───>│ Domain Event │───>│ NATS      │
│ Completed│    │ (raised)     │    │ (published)│
└──────────┘    └──────────────┘    └─────┬─────┘
                                          │
              ┌───────────────────────────┼───────────────┐
              │                           │               │
              ▼                           ▼               ▼
    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
    │ Metrics Updater │    │ Coach Notifier  │    │ Audit Logger    │
    │ (updates athlete │    │ (push notif to  │    │ (appends to     │
    │  metrics cache)  │    │  coach's device) │    │  audit_logs)    │
    └─────────────────┘    └─────────────────┘    └─────────────────┘
              │
              ▼
    ┌─────────────────┐
    │ Community Feed   │
    │ (publishes post) │
    └─────────────────┘
```

### 9.3 Event Sourcing for Audit

The audit log uses event sourcing. Every mutating operation on a domain entity appends an immutable event to the `audit_logs` table. The events contain the full before/after state of the changed entity, the actor who made the change, the IP address, and a timestamp. This provides a complete, append-only history of every change in the system without the complexity of temporal tables or triggers.

The audit log is partitioned by month for query performance and retention management. Partitions older than the retention policy (7 years) are dropped automatically:

```sql
CREATE TABLE audit_logs (
    id          UUID DEFAULT uuid_generate_v7(),
    org_id      UUID NOT NULL,
    actor_id    UUID NOT NULL,
    action      VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id   UUID NOT NULL,
    changes     JSONB NOT NULL,
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);
```

### 9.4 NATS Subject Design

NATS subjects follow a consistent hierarchy for consumer flexibility. A subject like `events.workout.completed` can be subscribed with wildcards: `events.workout.*` receives all workout events, `events.*.completed` receives all completion events across domains, `events.>` receives every event in the system. This flexibility is used for cross-cutting consumers like the audit logger and metrics aggregator.

JetStream consumers are configured per bounded context with appropriate durability and delivery guarantees. The metrics updater uses a durable consumer with at-least-once delivery and idempotent handlers (the handler checks if the metrics row for this date already reflects this event before updating). The notification service uses a queue group so multiple worker instances share the workload without duplication.

---

## 10. Error Handling

### 10.1 Error Types

The application defines a hierarchy of typed errors in `pkg/apperror`:

```go
type AppError struct {
    Type       ErrorType
    Code       string
    Message    string
    Details    []FieldError
    HTTPStatus int
    Err        error // Wrapped underlying error
}

type ErrorType string

const (
    ErrorTypeValidation   ErrorType = "validation_error"
    ErrorTypeNotFound     ErrorType = "not_found"
    ErrorTypeConflict     ErrorType = "conflict"
    ErrorTypeUnauthorized ErrorType = "unauthorized"
    ErrorTypeForbidden    ErrorType = "forbidden"
    ErrorTypeRateLimit    ErrorType = "rate_limit_exceeded"
    ErrorTypeInternal     ErrorType = "internal_error"
    ErrorTypeUnavailable  ErrorType = "service_unavailable"
)
```

Convenience constructors create errors with appropriate HTTP status codes mapped:

| Error Type | HTTP Status | Usage |
|---|---|---|
| `validation_error` | 400 | Invalid request body, missing fields, bad formats |
| `not_found` | 404 | Requested entity does not exist or is soft-deleted |
| `conflict` | 409 | Concurrent modification, duplicate resource |
| `unauthorized` | 401 | Missing or expired authentication token |
| `forbidden` | 403 | Authenticated user lacks required permission |
| `rate_limit_exceeded` | 429 | Too many requests |
| `internal_error` | 500 | Unexpected server error |
| `service_unavailable` | 503 | Downstream dependency unavailable |

### 10.2 Error Middleware

Fiber's error handler catches all errors — typed application errors and unexpected panics — and formats them consistently:

```go
func FiberErrorHandler(c *fiber.Ctx, err error) error {
    var appErr *AppError
    if errors.As(err, &appErr) {
        return c.Status(appErr.HTTPStatus).JSON(ErrorResponse{
            Error: ErrorDetail{
                Code:    appErr.Code,
                Message: appErr.Message,
                Details: appErr.Details,
            },
            RequestID: c.Locals("request_id").(string),
        })
    }

    // Unexpected error — log the full stack and return a sanitized response
    slog.Error("unhandled error",
        "error", err,
        "path", c.Path(),
        "method", c.Method(),
        "request_id", c.Locals("request_id"),
    )

    return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
        Error: ErrorDetail{
            Code:    "internal_error",
            Message: "An unexpected error occurred. The team has been notified.",
        },
        RequestID: c.Locals("request_id").(string),
    })
}
```

### 10.3 Consistent API Error Format

Every error response follows the same structure:

```json
{
  "error": {
    "code": "validation_error",
    "message": "The request contains invalid parameters.",
    "details": [
      {
        "field": "scheduled_date",
        "message": "scheduled_date must be a future date"
      },
      {
        "field": "athlete_ids",
        "message": "athlete with ID 'abc123' not found in your organization"
      }
    ]
  },
  "request_id": "req_3fa8b2c1d9e4"
}
```

The `request_id` is a UUID generated by the `RequestID` middleware at the start of every request. It is injected into the response, logged with every log line, and returned in the error response. When a user reports an error, the `request_id` is all the support team needs to find the full trace, logs, and context of that specific request.

---

## 11. Logging & Observability

### 11.1 Structured Logging with Zerolog

Every log entry is structured JSON with a consistent set of fields: `level`, `message`, `timestamp`, `request_id`, `user_id`, `organization_id`, `path`, `method`, `status`, `latency_ms`. Service startup logs include version, commit SHA, and configuration summary. Logs are written to stdout (for container environments) and optionally to a file for local development. The log level is configurable: `debug` for development, `info` for production.

```go
func Logger() fiber.Handler {
    return func(c *fiber.Ctx) error {
        start := time.Now()
        requestID := c.Locals("request_id").(string)

        logger := zerolog.Ctx(c.Context()).With().
            Str("request_id", requestID).
            Logger()

        ctx := logger.WithContext(c.Context())
        c.SetUserContext(ctx)

        err := c.Next()

        latency := time.Since(start)
        logEvent := zerolog.Ctx(c.Context()).Info().
            Str("path", c.Path()).
            Str("method", c.Method()).
            Int("status", c.Response().StatusCode()).
            Dur("latency_ms", latency).
            Int("bytes_written", c.Response().Header.ContentLength())

        if err != nil {
            logEvent.Err(err)
        }

        logEvent.Msg("request completed")
        return err
    }
}
```

### 11.2 OpenTelemetry Tracing

Distributed tracing is integrated at every boundary: HTTP request (Fiber middleware creates a span for every request), database query (pgx integration creates spans for SQL execution), gRPC call (client and server interceptors propagate trace context), and NATS message publish/subscribe (trace context is propagated through message headers). Spans include relevant attributes: `db.statement` (SQL query text, parameterized), `messaging.destination` (NATS subject), `http.status_code`, `error` (if the span contains an error).

Trace context is propagated from the incoming HTTP request through the entire call chain. When an athlete completes a workout, a single trace shows the HTTP handler, the use case, the database transaction, the NATS event publish, and the metrics cache update — all linked by a shared trace ID. This turns "the athlete's workout completion failed" from a needle-in-a-haystack search into a single query in the tracing backend.

### 11.3 Prometheus Metrics

The `/metrics` endpoint exposes standard HTTP metrics (request count, latency histogram, in-flight requests) and application-specific metrics:

- `mr_workouts_completed_total` — counter by sport_type
- `mr_programs_active` — gauge by organization
- `mr_athletes_active` — gauge by organization
- `mr_events_published_total` — counter by event_type
- `mr_events_dlq_size` — gauge — dead letter queue backlog
- `mr_db_connections_active` — gauge
- `mr_cache_hit_ratio` — gauge
- `mr_background_jobs_processed_total` — counter by job_type

All metrics include `organization_id` as a label only for internal aggregation, never for cross-tenant visibility.

### 11.4 Health Checks

The `/health` endpoint returns the status of every dependency:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "commit": "a3f8b2c",
  "uptime_seconds": 124736,
  "checks": {
    "database": {"status": "healthy", "latency_ms": 2},
    "redis": {"status": "healthy", "latency_ms": 1},
    "nats": {"status": "healthy", "latency_ms": 0},
    "s3": {"status": "healthy", "latency_ms": 15}
  }
}
```

If any dependency is unhealthy, the overall status is `degraded` and the response returns HTTP 503. The health check is the target of Kubernetes liveness and readiness probes. The liveness probe checks that the process is running (always healthy unless the server is hung). The readiness probe runs the full dependency check and gates traffic until all downstream services are reachable.

---

## 12. Background Jobs

### 12.1 Job Queue with Asynq

Background jobs handle work that should not block an HTTP response: sending emails, generating AI program drafts, computing athlete metrics, processing uploaded videos, running scheduled reports. Asynq provides a Redis-backed task queue with retry policies, dead letter queues, scheduled jobs, and task deduplication. A task is a named payload with a JSON body:

```go
type ComputeAthleteMetricsPayload struct {
    AthleteID string `json:"athlete_id"`
    OrgID     string `json:"org_id"`
}

func (p *ComputeAthleteMetricsPayload) Task() *asynq.Task {
    payload, _ := json.Marshal(p)
    return asynq.NewTask("metrics:compute_athlete", payload,
        asynq.MaxRetry(3),
        asynq.Timeout(30*time.Second),
        asynq.Retention(24*time.Hour),
    )
}
```

The API server enqueues tasks; a separate worker process dequeues and handles them. This separation keeps the API server's resource footprint stable under load — a surge in workout completions does not slow down the API because the metrics computation and notification dispatch happen in the worker pool.

### 12.2 Retry Policies

Every task type has a configurable retry policy. Transient failures (network timeouts, database connection pool exhaustion) are retried with exponential backoff: 10s, 30s, 1m, 5m, 15m. Permanent failures (invalid athlete ID, missing data dependencies) are not retried and are moved directly to the dead letter queue. The number of retries and the backoff schedule are configured per task type:

```go
func NewWorker(redisAddr string) *asynq.ServeMux {
    srv := asynq.NewServer(
        asynq.RedisClientOpt{Addr: redisAddr},
        asynq.Config{
            Concurrency:  20,
            Queues: map[string]int{
                "critical": 6, // payment processing, auth events
                "default":  3, // metrics computation, notifications
                "low":      1, // report generation, analytics
            },
        },
    )

    mux := asynq.NewServeMux()
    mux.HandleFunc("metrics:compute_athlete", handleComputeAthleteMetrics)
    mux.HandleFunc("notifications:send_push", handleSendPushNotification)
    mux.HandleFunc("ai:generate_program", handleGenerateProgram)
    mux.HandleFunc("reports:generate_monthly", handleGenerateMonthlyReport)

    return mux
}
```

Queue priority ensures that critical tasks (payment processing, authentication events) are processed before default-priority tasks (metrics computation) even when the queue is large.

### 12.3 Dead Letter Queue

Tasks that exhaust their retries are moved to the dead letter queue (DLQ). The DLQ is monitored via Prometheus metrics and a dashboard. Operations engineers can inspect DLQ tasks, diagnose the root cause, fix the underlying issue, and re-enqueue the tasks. A task in the DLQ for more than 7 days without re-enqueue is purged.

### 12.4 Scheduled Jobs

Recurring tasks are registered as cron-like schedules using Asynq's periodic task manager:

```go
func SetupScheduledTasks(scheduler *asynq.PeriodicTaskManager) {
    // Compute daily athlete metrics at 2:00 AM UTC
    scheduler.Register("@daily", asynq.NewTask("metrics:compute_daily_all", nil))

    // Generate monthly revenue reports on the 1st of each month
    scheduler.Register("0 6 1 * *", asynq.NewTask("reports:generate_monthly_all", nil))

    // Clean up expired sessions every hour
    scheduler.Register("@every 1h", asynq.NewTask("maintenance:cleanup_sessions", nil))

    // Refresh materialized views every 15 minutes during business hours
    scheduler.Register("*/15 6-22 * * *", asynq.NewTask("maintenance:refresh_materialized_views", nil))
}
```

---

## 13. Rate Limiting

### 13.1 Token Bucket Algorithm

Rate limiting uses the token bucket algorithm backed by Redis. Each client (identified by user ID for authenticated requests, IP address for unauthenticated requests) has a bucket with a configurable capacity and refill rate. The default configuration allows 100 requests per minute with a burst capacity of 20. The limit is checked before the handler executes; an exhausted bucket returns HTTP 429 with a `Retry-After` header:

```go
func RateLimit(cfg RateLimitConfig) fiber.Handler {
    limiter := ratelimit.NewRedisTokenBucket(redisClient, cfg)

    return func(c *fiber.Ctx) error {
        key := resolveRateLimitKey(c)

        allowed, retryAfter, err := limiter.Allow(c.Context(), key, cfg.RequestsPerMinute, cfg.BurstSize)
        if err != nil {
            slog.Error("rate limiter error", "error", err)
            return c.Next() // Fail open if Redis is unavailable
        }

        c.Set("X-RateLimit-Limit", strconv.Itoa(cfg.RequestsPerMinute))
        c.Set("X-RateLimit-Remaining", strconv.Itoa(allowed))

        if !allowed {
            c.Set("Retry-After", strconv.FormatInt(retryAfter, 10))
            return apperror.ErrRateLimitExceeded(retryAfter)
        }

        return c.Next()
    }
}
```

### 13.2 Per-User and Per-IP Limits

The rate limit key is compound: `ratelimit:{org_id}:{user_id}` for authenticated users, `ratelimit:ip:{ip_address}` for unauthenticated requests. Organization-level rate limits protect against a single organization's API key or buggy integration overwhelming the service. Sensitive endpoints (login, password reset, API key generation) have stricter limits: 5 requests per minute per IP.

### 13.3 Redis-Backed Implementation

The token bucket is implemented with a Lua script that executes atomically on Redis, avoiding race conditions between the check and decrement operations:

```lua
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(bucket[1]) or capacity
local last_refill = tonumber(bucket[2]) or now

local elapsed = math.max(0, now - last_refill)
local refill = elapsed * rate
tokens = math.min(capacity, tokens + refill)
last_refill = now

local allowed = tokens >= requested
if allowed then
    tokens = tokens - requested
end

redis.call('HMSET', key, 'tokens', tokens, 'last_refill', last_refill)
redis.call('EXPIRE', key, 60)

return {allowed and 1 or 0, tokens, math.ceil((requested - tokens) / rate)}
```

---

## 14. File Upload

### 14.1 Multipart Upload Flow

File uploads use a two-phase process: generate an upload URL, then upload directly to S3. This keeps large files (workout videos up to 500MB, progress photos, document attachments) off the API server entirely:

1. **Client requests upload URL**: `POST /api/v1/media/upload-url` with `{ "filename": "deadlift_form.mp4", "content_type": "video/mp4", "size_bytes": 52428800 }`
2. **Server validates and returns presigned URL**: The API validates the file type against an allowlist, generates a unique object key (`orgs/{orgID}/workouts/{workoutID}/deadlift_form_20260315.mp4`), creates a presigned S3 PUT URL with a 15-minute expiry, and returns it to the client
3. **Client uploads directly to S3**: The client PUTs the file to the presigned URL. This bypasses the API server entirely — bandwidth, transfer time, and S3 I/O are between the client and S3.
4. **Client notifies server of completion**: `POST /api/v1/media/{mediaID}/upload-complete` notifies the API that the upload finished. The server creates a `media` record in the database and returns the public URL. If this notification never arrives, a background job purges unconfirmed uploads after 24 hours.

### 14.2 Image Processing Pipeline

Uploaded images automatically pass through an image processing pipeline. When the upload-complete notification is received, a background job is enqueued:

```
Upload Notification → Asynq "media:process_image" → 
  Download from S3 →
  Generate variants (thumbnail 150px, small 400px, medium 800px, large 1600px) →
  Convert to WebP →
  Strip EXIF metadata →
  Upload variants to S3 →
  Update media record with variant URLs
```

Profile photos and exercise demonstration thumbnails are always served as the appropriate variant size. The original file is retained but never served directly to clients — the processing pipeline ensures that no raw uploaded image is ever displayed without optimization.

### 14.3 Allowed File Types

| Category | Allowed Types | Max Size |
|---|---|---|
| Profile avatar | JPEG, PNG, WebP | 5 MB |
| Exercise video | MP4, MOV, WebM | 500 MB |
| Progress photo | JPEG, PNG, WebP, HEIC | 20 MB |
| Document attachment | PDF | 25 MB |
| Message attachment | JPEG, PNG, WebP, PDF, MP4 | 50 MB |
| Meal photo | JPEG, PNG, WebP | 10 MB |

## 15. Endpoint Pattern — Next.js Route Handlers (MANDATORY)

Every new API path follows this exact pattern. Existing routes (`api/athlete/*`, `api/coach/*`, `api/polar/*`) are the reference implementations.

### 15.1 File layout

```
apps/web/src/app/api/
├── athlete/                     # Athlete-scoped resources (actor = logged-in athlete)
│   ├── workouts/
│   │   ├── route.ts             # GET list
│   │   └── [id]/
│   │       ├── route.ts         # GET detail
│   │       └── session/route.ts # POST start/resume session
│   └── sessions/[sessionId]/
│       ├── sets/route.ts        # POST log a set
│       └── complete/route.ts    # POST finish session
└── coach/                       # Coach-scoped resources (actor = logged-in coach)
    ├── athletes/route.ts        # GET roster
    └── athletes/[id]/...        # Per-athlete reads (training summary, 1RM, fatigue...)
```

- One file per route; export only the HTTP verbs the route supports.
- Dynamic segments (`[id]`, `[sessionId]`) are read from `ctx.params`.
- Nesting stays shallow: actor → resource → (dynamic id) → one action level, max.

### 15.2 Handler skeleton

```ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAthleteByClerkId } from '@/lib/coaching-db';

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  try {
    // 1. AUTH FIRST — always, before any work
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. RESOLVE ACTOR FROM SESSION — never trust IDs from body/query
    const athlete = await getAthleteByClerkId(userId);
    if (!athlete) return NextResponse.json({ error: 'Athlete profile not found' }, { status: 404 });

    // 3. OWNERSHIP / TENANT SCOPE — IDOR guard on every nested resource
    //    e.g. detail.workout.athleteId !== athlete.id -> 404 (never leak existence)

    // 4. VALIDATE INPUT — 400 for invalid JSON / missing fields BEFORE touching DB

    // 5. CALL DATA LAYER — SQL lives in src/lib/coaching-db.ts, not in handlers
    return NextResponse.json({ /* typed result */ }, { status: 200 });
  } catch (error) {
    console.error('Error <action>:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 15.3 Rules checklist

- **Auth first, always.** `auth()` → `401` before anything else.
- **Actor from session.** Athletes resolve via `getAthleteByClerkId(userId)`; coaches scope every query by their own `coachId`. Never accept `coachId`/`athleteId` identity from the request body or query string.
- **Ownership check on every nested resource** (IDOR guard). Out-of-scope returns `404`, never `403` with existence details.
- **Validate before persisting**: invalid JSON, missing required fields → `400` with a clear message.
- **Thin handlers**: no SQL and no business logic in route files. Data access lives in `src/lib/coaching-db.ts`; pure business logic lives in `src/features/<feature>/services/` or `src/lib/` and is unit-tested with Jest.
- **Status codes**: `200` success/read · `201` created · `400` invalid input · `401` unauthenticated · `403` forbidden · `404` missing or out-of-scope · `500` unexpected (with `console.error`).
- **Responses**: JSON via `NextResponse.json`. Row→camelCase mapping happens once in the data-layer mappers; handlers never leak raw rows.
- **Naming**: actor-scoped prefixes as established (`api/athlete/...`, `api/coach/...`); kebab-case segments; plural resource nouns.
- **Migrations are additive first**: `ALTER TABLE ... ADD COLUMN` with defaults; renames/drops require an explicit data plan in the migration file header comment.
- **Idempotency where it matters**: start-session endpoints return the existing active session instead of duplicating (see `api/athlete/workouts/[id]/session`).

---

**Document version 1.0 — July 2026. This document is living; it is updated when architecture decisions are made, not when code is written. Every decision documented here must be traceable to a PR or ADR.**
