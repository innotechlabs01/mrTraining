# P1 & P2 Backend Endpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add ~30 missing P1 and P2 API endpoints across Health, Push Tokens, Workout Detail/Session, Coach Dashboard, Assigned Workouts CRUD, Workout Template Delete, and Messages domains.

**Architecture:** Follow existing clean architecture pattern: domain entities → repository interfaces → infrastructure (Turso) → application service → HTTP handlers → route registration. Each new domain gets its own package under `internal/domain/`, `internal/infrastructure/`, `internal/application/`, and `internal/interfaces/http/`.

**Tech Stack:** Go 1.25, Fiber v2, database/sql, Turso/libsql, Google UUID, Clerk auth middleware.

---

## File Map

### New Files (Health Domain)
- `internal/domain/health/health.go` — HealthMetric, SleepLog, HealthDevice entities
- `internal/domain/health/repository.go` — HealthRepository interface
- `internal/infrastructure/health/repository.go` — Turso implementation
- `internal/application/health/service.go` — HealthService
- `internal/interfaces/http/dto/health.go` — DTOs
- `internal/interfaces/http/handlers/health_domain.go` — handlers

### New Files (Coach Domain)
- `internal/domain/coach/coach.go` — TimeBlock, Appointment, CoachAvailability, Dashboard entities
- `internal/domain/coach/repository.go` — CoachRepository interface
- `internal/infrastructure/coach/repository.go` — Turso implementation
- `internal/application/coach/service.go` — CoachService
- `internal/interfaces/http/dto/coach.go` — DTOs
- `internal/interfaces/http/handlers/coach.go` — handlers

### New Files (Message Domain)
- `internal/domain/message/message.go` — MessageThread, Message entities
- `internal/domain/message/repository.go` — MessageRepository interface
- `internal/infrastructure/message/repository.go` — Turso implementation
- `internal/application/message/service.go` — MessageService
- `internal/interfaces/http/dto/message.go` — DTOs
- `internal/interfaces/http/handlers/message.go` — handlers

### Modified Files
- `internal/domain/training/repository.go` — add 5 methods to WorkoutRepository
- `internal/application/training/service.go` — add 9 methods
- `internal/interfaces/http/handlers/training.go` — add 10 handlers + mappers
- `internal/domain/notification/repository.go` — already has RegisterDevice/DeactivateDevice (push tokens covered)
- `internal/interfaces/http/routes/routes.go` — add all new route registrations
- `cmd/api/main.go` — wire new domains

---

## Task 1: Health Domain — Entities & Repository Interface

**Files:**
- Create: `internal/domain/health/health.go`
- Create: `internal/domain/health/repository.go`

## Task 2: Health Domain — Infrastructure (Turso Repository)

**Files:**
- Create: `internal/infrastructure/health/repository.go`

## Task 3: Health Domain — Application Service

**Files:**
- Create: `internal/application/health/service.go`

## Task 4: Health Domain — DTOs & Handlers

**Files:**
- Create: `internal/interfaces/http/dto/health.go`
- Create: `internal/interfaces/http/handlers/health_domain.go`

## Task 5: Push Tokens — Add to Notification Domain

**Files:**
- Modify: `internal/interfaces/http/dto/notification.go` — add PushToken DTOs
- Modify: `internal/interfaces/http/handlers/notification.go` — add RegisterPushToken, RemovePushToken handlers
- Modify: `internal/interfaces/http/routes/routes.go` — add push token routes

## Task 6: Workout Detail + Session — Extend Training Domain

**Files:**
- Modify: `internal/domain/training/repository.go` — add 5 methods
- Modify: `internal/application/training/service.go` — add 5 methods
- Modify: `internal/interfaces/http/dto/training.go` — add DTOs
- Modify: `internal/interfaces/http/handlers/training.go` — add 5 handlers
- Modify: `internal/interfaces/http/routes/routes.go` — add routes

## Task 7: Coach Domain — Entities & Repository

**Files:**
- Create: `internal/domain/coach/coach.go`
- Create: `internal/domain/coach/repository.go`

## Task 8: Coach Domain — Infrastructure

**Files:**
- Create: `internal/infrastructure/coach/repository.go`

## Task 9: Coach Domain — Service, DTOs, Handlers

**Files:**
- Create: `internal/application/coach/service.go`
- Create: `internal/interfaces/http/dto/coach.go`
- Create: `internal/interfaces/http/handlers/coach.go`

## Task 10: Assigned Workouts CRUD + Template Delete

**Files:**
- Modify: `internal/domain/training/repository.go` — add ListAssignedWorkoutsByCoach, UpdateAssignedWorkout, DeleteAssignedWorkout, DeleteTemplate
- Modify: `internal/application/training/service.go` — add methods
- Modify: `internal/interfaces/http/dto/training.go` — add DTOs
- Modify: `internal/interfaces/http/handlers/training.go` — add handlers
- Modify: `internal/interfaces/http/routes/routes.go` — add routes

## Task 11: Messages Domain

**Files:**
- Create: `internal/domain/message/message.go`
- Create: `internal/domain/message/repository.go`
- Create: `internal/infrastructure/message/repository.go`
- Create: `internal/application/message/service.go`
- Create: `internal/interfaces/http/dto/message.go`
- Create: `internal/interfaces/http/handlers/message.go`

## Task 12: Wire Everything in main.go & Routes

**Files:**
- Modify: `cmd/api/main.go` — wire health, coach, message domains
- Modify: `internal/interfaces/http/routes/routes.go` — add all remaining route registrations

## Task 13: Build & Test

- Run `go mod tidy`
- Run `go build ./...`
- Run `go test ./...`
