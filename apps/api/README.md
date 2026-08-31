# MR Training API

Go backend service built with Fiber, following Clean Architecture patterns.

## Quick Start

```bash
# Install dependencies
go mod tidy

# Run locally
go run ./cmd/api

# Run tests
go test ./...

# Build
go build -o bin/api ./cmd/api
```

## Environment

Copy `.env.example` to `.env` and configure:

```bash
cp config/.env.example .env
```

## Docker

```bash
# Development with hot reload
docker compose -f docker-compose.dev.yml up

# Production build
docker build -t mr-training-api .
docker run -p 8080:8080 mr-training-api
```

## Endpoints

### Public Endpoints (No Auth Required)

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check (200) |
| GET | /ready | Readiness check |

### Protected Endpoints (Clerk Bearer Token Required)

#### Users

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | /api/v1/users/me | Get current user profile | Any |
| PUT | /api/v1/users/me | Update current user profile | Any |
| GET | /api/v1/users/:id | Get user by ID | Admin |

#### Coaches

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | /api/v1/coaches | List all coaches | Any |
| GET | /api/v1/coaches/:id/athletes | Get athletes by coach | Any |
| PUT | /api/v1/coaches/me | Update coach profile | Coach |

#### Athletes

| Method | Path | Description | Role |
|--------|------|-------------|------|
| PUT | /api/v1/athletes/me | Update athlete profile | Athlete |

#### Today

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | /api/v1/athletes/today | Get today dashboard | Athlete |

#### Onboarding

| Method | Path | Description | Role |
|--------|------|-------------|------|
| POST | /api/v1/athletes/onboard | Save athlete onboarding | Athlete |
| GET | /api/v1/athletes/onboard | Get athlete onboarding | Athlete |

#### Invites

| Method | Path | Description | Role |
|--------|------|-------------|------|
| POST | /api/v1/invites/accept | Accept a coach invite code | Any |
| POST | /api/v1/invites/validate | Validate a coach invite code | Any |

#### Exercises

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | /api/v1/exercises | List all exercises | Any |
| GET | /api/v1/exercises/:id | Get exercise by ID | Any |
| POST | /api/v1/exercises | Create new exercise | Coach |

#### Workout Templates

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | /api/v1/workout-templates | List workout templates | Coach |
| GET | /api/v1/workout-templates/:id | Get workout template by ID | Any |
| POST | /api/v1/workout-templates | Create workout template | Coach |

#### Workouts

| Method | Path | Description | Role |
|--------|------|-------------|------|
| POST | /api/v1/workouts/assign | Assign workout to athlete | Coach |
| GET | /api/v1/workouts | Get assigned workouts | Athlete |
| GET | /api/v1/workouts/:id/detail | Get assigned workout detail | Athlete |
| GET | /api/v1/workouts/:id/prescription | Get workout exercise prescription | Athlete |
| POST | /api/v1/workouts/:id/session | Start a workout session | Athlete |
| POST | /api/v1/workouts/:id/sets | Log workout set | Athlete |
| GET | /api/v1/workouts/sessions/:id | Get workout session | Athlete |
| POST | /api/v1/workouts/sessions/:id/complete | Complete workout session | Athlete |

#### Progress

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | /api/v1/progress | Get athlete progress | Athlete |

#### Memberships

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | /api/v1/memberships | Get membership | Any |
| POST | /api/v1/memberships | Create membership | Coach |
| PUT | /api/v1/memberships/:id/cancel | Cancel membership | Coach |
| PUT | /api/v1/memberships/:id/renew | Renew membership | Coach |
| GET | /api/v1/memberships/:id/payments | Get payment history | Any |
| GET | /api/v1/coaches/memberships | List memberships by coach | Coach |

#### Events

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | /api/v1/events | List events | Any |
| GET | /api/v1/events/:id | Get event by ID | Any |
| POST | /api/v1/events | Create event | Coach |
| PUT | /api/v1/events/:id | Update event | Coach |
| DELETE | /api/v1/events/:id | Delete event | Coach |
| POST | /api/v1/events/:id/register | Register for event | Athlete |
| DELETE | /api/v1/events/:id/register | Cancel registration | Athlete |
| GET | /api/v1/athletes/events | Get my registered events | Athlete |

#### Products

| Method | Path | Description | Role |
|--------|------|-------------|------|
| GET | /api/v1/products | List products | Any |
| GET | /api/v1/products/:id | Get product by ID | Any |
| POST | /api/v1/products | Create product | Coach |
| PUT | /api/v1/products/:id | Update product | Coach |
| DELETE | /api/v1/products/:id | Delete product | Coach |
| GET | /api/v1/coaches/sales | Get sales | Coach |
| POST | /api/v1/coaches/sales | Record sale | Coach |

#### Notifications

| Method | Path | Description | Role |
|--------|------|-------------|------|
| POST | /api/v1/devices | Register device | Any |
| DELETE | /api/v1/devices/:id | Remove device | Any |
| GET | /api/v1/devices | List devices | Any |
| GET | /api/v1/notifications | List notifications | Any |
| PATCH | /api/v1/notifications/:id/read | Mark notification read | Any |
| PATCH | /api/v1/notifications/read-all | Mark all notifications read | Any |

#### Running

| Method | Path | Description | Role |
|--------|------|-------------|------|
| POST | /api/v1/running/sessions | Log running session | Any |
| GET | /api/v1/running/sessions | List running sessions | Any |
| GET | /api/v1/running/stats | Get running stats | Any |
| POST | /api/v1/running/devices | Connect device | Any |
| DELETE | /api/v1/running/devices/:id | Disconnect device | Any |

#### WebSocket

| Path | Description |
|------|-------------|
| /ws | Real-time events (Clerk auth via query param) |

## API Switching (Web & Mobile Clients)

The web and mobile clients are configured to use the Go API as the primary backend, with Next.js API routes as fallback for endpoints not yet ported to Go.

### Web Client Configuration

```bash
# .env.local
NEXT_PUBLIC_GO_API_URL=http://localhost:8080  # Go API (primary)
```

The web client (`apps/web/src/features/shared/api/client.ts`) automatically:
1. Routes requests to Go API for supported endpoints
2. Falls back to Next.js API routes if Go API is unavailable
3. Uses the same Clerk Bearer token for both backends

### Mobile Client Configuration

```json
// apps/mobile/app.json
{
  "expo": {
    "extra": {
      "goApiUrl": "http://localhost:8080"
    }
  }
}
```

The mobile client (`apps/mobile/src/infrastructure/api/client.ts`) provides two Axios instances:
- `goApiClient` — For Go API endpoints (/api/v1/*)
- `apiClient` — For Next.js API routes (/api/*)

### Endpoint Routing Summary

| Domain | Go API | Next.js (Fallback) |
|--------|--------|-------------------|
| Users | /api/v1/users/* | - |
| Coaches | /api/v1/coaches/* | /api/coach/profile |
| Athletes | /api/v1/athletes/me | /api/coaching/athletes/* |
| Exercises | /api/v1/exercises | /api/exercises |
| Workout Templates | /api/v1/workout-templates | /api/coach/workout-templates |
| Workouts | /api/v1/workouts/* | /api/coaching/assigned-workouts |
| Progress | /api/v1/progress | /api/coach/athletes/:id/* |
| Memberships | /api/v1/memberships/* | /api/coaching/memberships |
| Events | /api/v1/events/* | /api/coaching/events |
| Products | /api/v1/products/* | /api/coaching/products |
| Notifications | /api/v1/notifications/* | /api/athlete/notifications |
| Running | /api/v1/running/* | - |
| Coaching Dashboard | - | /api/coaching/* (all) |
| Marketing | - | /api/marketing/* |
| Payments (Polar) | - | /api/polar/* |
