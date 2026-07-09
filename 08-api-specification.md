# MR Training — API Specification

**Version 1.0 — 2026**

---

## Table of Contents

1. [API Design Principles](#1-api-design-principles)
2. [Authentication](#2-authentication)
3. [Common Patterns](#3-common-patterns)
4. [Core Endpoints](#4-core-endpoints)
5. [Webhooks](#5-webhooks)
6. [Rate Limiting](#6-rate-limiting)
7. [SDK Generation](#7-sdk-generation)

---

## 1. API Design Principles

### 1.1 RESTful Conventions

The MR Training API is a RESTful JSON API. Every resource is identified by a URL. Every action on a resource is expressed through an HTTP method. This is not an academic exercise — it is a deliberate choice that makes the API predictable, cacheable, and toolable. A developer who knows the pattern can guess the endpoint without reading documentation. An HTTP cache layer can cache GET responses without understanding the payload. A monitoring system can alert on 5xx responses without parsing JSON bodies.

Every URL identifies a resource, not an action. Resources are nouns in their plural form:

```
GET    /api/v1/athletes          # List athletes
POST   /api/v1/athletes          # Create an athlete
GET    /api/v1/athletes/:id      # Get a single athlete
PUT    /api/v1/athletes/:id      # Replace an athlete (full update)
PATCH  /api/v1/athletes/:id      # Update an athlete (partial update)
DELETE /api/v1/athletes/:id      # Delete an athlete (soft delete)
```

Actions that do not map cleanly to CRUD operations use a verb appended to the resource URL. This is used sparingly — only for operations that truly are actions, not mutations of resource state:

```
POST /api/v1/workouts/:id/complete       # Complete a workout
POST /api/v1/workouts/:id/review         # Coach reviews a completed workout
POST /api/v1/programs/:id/publish        # Publish a draft program
POST /api/v1/programs/:id/assign         # Assign program to athletes
POST /api/v1/payments/invoices/:id/pay   # Pay an invoice
POST /api/v1/auth/login                  # Authenticate
POST /api/v1/auth/refresh                # Refresh token
POST /api/v1/auth/logout                 # Invalidate session
```

### 1.2 HTTP Status Codes

Status codes are used precisely and consistently. A client should be able to determine the outcome of a request by the status code alone, without parsing the response body:

| Code | Meaning | When Used |
|---|---|---|
| `200 OK` | Request succeeded | GET, PUT, PATCH, DELETE success |
| `201 Created` | Resource created | POST success. Response includes `Location` header with the new resource URL |
| `202 Accepted` | Request accepted for processing | Async operations (AI generation, report building, bulk export). Response includes a `status_url` for polling |
| `204 No Content` | Success with no response body | DELETE success, or POST actions that do not return data |
| `400 Bad Request` | Client error — malformed input | Invalid JSON, missing required fields, validation failures. Response body includes error details |
| `401 Unauthorized` | Authentication required | Missing or invalid JWT token. Client should redirect to login |
| `403 Forbidden` | Authenticated but insufficient permissions | Valid token but wrong role. Do not retry |
| `404 Not Found` | Resource not found | Invalid UUID, soft-deleted resource, or resource outside organization scope |
| `409 Conflict` | Request conflicts with current state | Duplicate resource, version mismatch (optimistic concurrency), invalid state transition |
| `422 Unprocessable Entity` | Semantically invalid input | Valid JSON, passes struct validation, but fails business rules |
| `429 Too Many Requests` | Rate limit exceeded | Response includes `Retry-After` header. Client should back off |
| `500 Internal Server Error` | Unexpected server error | Something went wrong on the server. Retry with exponential backoff |
| `503 Service Unavailable` | Server overloaded or in maintenance | Response includes `Retry-After`. Client should back off significantly |

### 1.3 Versioning

API versioning uses URL path prefixes: `/api/v1/`, `/api/v2/`. This is chosen over header-based versioning (`Accept: application/vnd.mrtraining.v1+json`) because URL-based versioning is visible in logs, simple to route in API gateways, and does not require clients to configure custom headers.

A new API version is created only for breaking changes:
- Removing a field from a response
- Changing a field's type
- Adding a required request parameter
- Changing the meaning of an existing parameter
- Removing an endpoint

Non-breaking changes are released within the current version:
- Adding new endpoints
- Adding optional request parameters
- Adding new fields to response objects
- Adding new enum values
- Relaxing validation rules

Deprecated API versions are supported for a minimum of 6 months (two release cycles). Deprecated endpoints include warnings in response headers:

```
Deprecation: true
Sunset: Wed, 01 Jul 2026 00:00:00 GMT
Link: /api/v2/athletes; rel=successor-version
```

The `Sunset` header gives a hard date after which the deprecated version will return `410 Gone`. The `Link` header points clients to the replacement endpoint.

### 1.4 Resource Naming

Resource names use plural nouns, lowercase, with hyphens for multi-word names:

```
Correct:   /api/v1/workout-programs
Correct:   /api/v1/nutrition-plans
Correct:   /api/v1/event-registrations
Incorrect: /api/v1/workoutProgram
Incorrect: /api/v1/getWorkouts
Incorrect: /api/v1/workout_programs
```

Nested resources express parent-child relationships that are truly hierarchical — where the child cannot exist without the parent:

```
GET  /api/v1/workouts/:id/exercises          # Exercises within a workout
GET  /api/v1/workouts/:id/exercises/:exId    # A specific exercise within a workout
GET  /api/v1/programs/:id/workouts           # Workouts within a program
```

Resource nesting is limited to one level. Deep nesting (`/api/v1/programs/:id/workouts/:wid/exercises/:eid/sets`) produces unreadable URLs and brittle client code. For deeply nested data, the parent resource response includes the nested data inline, or a separate endpoint with query parameters is used.

---

## 2. Authentication

### 2.1 JWT Token Architecture

Authentication uses JWT access and refresh tokens. The access token is short-lived (1 hour) and carried in the `Authorization` header on every authenticated request. The refresh token is long-lived (30 days) and stored as an httpOnly, Secure, SameSite=Lax cookie. This dual-token architecture means that if an access token is intercepted, the exposure window is 1 hour. The refresh token is never accessible to JavaScript, protecting against XSS token theft while still enabling silent token refresh.

```
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Access Token Payload:**

```json
{
  "sub": "user_2nMqN9xYzK8pR3vW",
  "org": "org_7bFjL2cH4sA9pT5d",
  "email": "coach@mrtraining.com",
  "role": "coach",
  "permissions": [
    "training.programs.create",
    "training.programs.read",
    "training.workouts.create",
    "athletes.read",
    "athletes.metrics.read"
  ],
  "iat": 1704067200,
  "exp": 1704070800,
  "iss": "mr-training-api"
}
```

The permissions array is included in the token so that the API server can authorize requests without a database lookup. When permissions change — a coach is promoted to admin or has a permission revoked — the refresh token rotation triggers a new access token with updated permissions. The maximum staleness of permissions is the access token lifetime: 1 hour.

### 2.2 Token Refresh Flow

```text
Client                              API Server
  |                                      |
  |--- GET /api/v1/training/programs --->|  (Authorization: Bearer <access>)
  |                                      |
  |<--- 401 Unauthorized ----------------|
  |                                      |
  |--- POST /api/v1/auth/refresh ------->|  (Cookie: refresh_token=<token>)
  |                                      |
  |<--- 200 OK { access_token } ---------|
  |    (Set-Cookie: new_refresh_token)   |
  |                                      |
  |--- GET /api/v1/training/programs --->|  (Authorization: Bearer <new_access>)
  |                                      |
  |<--- 200 OK { programs } -------------|
```

The refresh flow is handled automatically by the API client (Dio interceptor on mobile, server-side fetch wrapper on web). Application code never calls `/auth/refresh` directly — it encounters a 401, the interceptor catches it, refreshes the token, and retries the original request. From the user's perspective, authentication is invisible. The only time they see a login screen is when the refresh token itself expires (30 days of inactivity) or is explicitly revoked (logout, password change, security event).

Refresh token rotation is enforced: each refresh returns a new refresh token and invalidates the previous one. If a stolen refresh token is used after the legitimate user has already refreshed, the server detects the reuse, invalidates the entire token family, and forces re-authentication. This is the same refresh token rotation strategy used by Auth0 and Clerk.

### 2.3 API Keys for Service-to-Service

For server-to-server communication (AI engine, notification worker, analytics pipeline, third-party integrations), API keys are used instead of user-scoped JWT tokens. API keys are provisioned through the organization settings UI and have configurable scopes:

```text
Authorization: ApiKey mr_live_8fJkL2cH4sA9pT5dXzN6qR3vW7bFjL2c
```

API keys support fine-grained permissions through scopes, IP allowlisting, and usage quotas. A key scoped to `training.workouts.read` cannot access billing endpoints. A key with an IP allowlist of `34.120.0.0/16` is rejected if used from any other IP range. Keys can be revoked instantly from the dashboard.

### 2.4 OAuth2 / Social Login

Social login (Google, Apple, Facebook) is delegated to Clerk, which federates with these providers and issues MR Training JWTs. The API server validates Clerk-issued tokens using Clerk's JWKS endpoint. This means the API server never handles OAuth2 redirects, never stores third-party access tokens, and never manages social account linking — Clerk owns the entire identity lifecycle.

### 2.5 Request Headers

Every authenticated request includes:

```
Authorization: Bearer <access_token>
X-Organization-ID: <org_uuid>
X-Request-ID: <uuid_v4>
Content-Type: application/json
Accept: application/json
```

The `X-Organization-ID` header identifies the active organization for multi-tenant requests. It is validated against the user's organization memberships. If a user does not belong to the requested organization, the request is rejected with `403 Forbidden` regardless of their role in other organizations.

The `X-Request-ID` header is generated by the client for distributed tracing. If the client does not provide one, the API server generates a UUID. The request ID is included in every log line, every error response, and every audit log entry for that request. Support can ask a user for the request ID from an error message and trace the entire request lifecycle across all services.

---

## 3. Common Patterns

### 3.1 Pagination

**Offset Pagination** — Used for bounded list endpoints where the total count matters (program lists, athlete rosters, exercise library):

```text
GET /api/v1/athletes?page=1&per_page=20&sort_by=name&sort_dir=asc
```

```json
{
  "data": [ /* ... */ ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_items": 247,
    "total_pages": 13
  }
}
```

Parameters:
- `page` — 1-based page number. Default: 1.
- `per_page` — Items per page. Default: 20. Max: 100.

**Cursor-Based Pagination** — Used for real-time feeds and append-only lists where consistency under concurrent writes matters (community feed, notification list, workout history):

```text
GET /api/v1/community/feed?cursor=eyJjcmVhdGVkX2F0IjoiMjAyNi0wMS0xNVQwODowMDowMFoifQ==&limit=50
```

```json
{
  "data": [ /* ... */ ],
  "pagination": {
    "next_cursor": "eyJjcmVhdGVkX2F0IjoiMjAyNi0wMS0xNFQxNjo0NTowMFoifQ==",
    "has_more": true
  }
}
```

The cursor is a base64-encoded JSON payload containing the `created_at` timestamp of the last item in the current page. This is an opaque value from the client's perspective — it should be treated as a black box, never decoded or constructed. Cursor pagination is stable under concurrent inserts: new items appended after the cursor position do not shift the page boundaries.

### 3.2 Filtering

Filtering uses query parameters with a consistent syntax:

```text
# Equality
GET /api/v1/workouts?status=completed&sport_type=running

# Range (dates)
GET /api/v1/analytics/performance?scheduled_after=2026-01-01&scheduled_before=2026-03-31

# Range (numeric)
GET /api/v1/leaderboard?score_min=1000&score_max=5000

# Multi-value
GET /api/v1/workouts?sport_type=running,cycling,swimming

# Text search
GET /api/v1/exercises?search=bench+press

# Boolean
GET /api/v1/athletes?is_active=true

# Nested (dot notation)
GET /api/v1/athletes?profile.gender=male
```

Unrecognized filter keys are silently ignored — never rejected. This is a deliberate choice. A client using an old SDK version may send filter parameters that a newer API version has deprecated. Rejecting the request would break the client unnecessarily. The server applies the filters it recognizes and ignores the rest. This is forward compatibility at the API level.

Filters are validated against an endpoint-specific allowlist. An endpoint for listing workouts accepts `status`, `sport_type`, `scheduled_after`, `scheduled_before`. It does not accept `billing_status` — that filter is silently ignored because it is meaningless in the workouts context.

### 3.3 Sorting

Sorting is controlled through `sort_by` and `sort_dir` parameters:

```text
GET /api/v1/athletes?sort_by=name&sort_dir=asc
GET /api/v1/workouts?sort_by=scheduled_date&sort_dir=desc
```

- `sort_by` — The field to sort by. Each endpoint documents its sortable fields. Invalid values fall back to the default sort (typically `created_at` descending).
- `sort_dir` — `asc` or `desc`. Default is endpoint-specific and documented.

Multi-column sorting is supported through comma separation:

```text
GET /api/v1/athletes?sort_by=status,name&sort_dir=asc,asc
```

### 3.4 Sparse Fieldsets

Clients can request specific fields in the response to reduce payload size. This is valuable for mobile clients on slow connections and for list endpoints where only a subset of fields is needed:

```text
GET /api/v1/athletes?fields=id,name,primary_sport,training_status
GET /api/v1/workouts?fields=id,name,scheduled_date,status,rpe
```

```json
{
  "data": [
    {
      "id": "ath_abc123",
      "name": "John Doe",
      "primary_sport": "running",
      "training_status": "active"
    }
  ],
  "pagination": { /* ... */ }
}
```

If `fields` is omitted, the full resource is returned. If `fields` specifies unknown fields, they are silently ignored — forward compatibility again. The `id` field is always included regardless of the `fields` parameter; there is no circumstance where a resource is returned without its primary identifier.

### 3.5 Error Response Format

Every error response follows a consistent structure:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The request body contains invalid fields.",
    "details": [
      {
        "field": "name",
        "message": "name is required",
        "code": "required"
      },
      {
        "field": "scheduled_date",
        "message": "scheduled_date must be in the format YYYY-MM-DD",
        "code": "invalid_format"
      }
    ]
  },
  "request_id": "req_a1b2c3d4e5f6"
}
```

Error codes are stable, machine-readable strings that clients can switch on:

| Code | Meaning |
|---|---|
| `VALIDATION_FAILED` | Request body or query parameters are structurally invalid |
| `UNAUTHENTICATED` | No valid authentication credentials provided |
| `FORBIDDEN` | Authenticated but insufficient permissions |
| `NOT_FOUND` | Requested resource does not exist or is outside the user's scope |
| `CONFLICT` | Request conflicts with the current state of the resource |
| `RATE_LIMITED` | Too many requests; retry after the specified delay |
| `INTERNAL_ERROR` | Unexpected server error |
| `SERVICE_UNAVAILABLE` | Server is temporarily unable to handle the request |
| `BUSINESS_RULE_VIOLATION` | Request violates a business rule (e.g., "Cannot assign expired program") |

The `details` array is present only when the error involves specific fields. Each detail includes the field name, a human-readable message, and a machine-readable code.

### 3.6 Rate Limiting Headers

Every response includes rate limit headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1704074400
```

- `X-RateLimit-Limit` — Maximum requests allowed in the current window
- `X-RateLimit-Remaining` — Requests remaining in the current window
- `X-RateLimit-Reset` — Unix timestamp when the window resets

Clients should respect these headers and implement exponential backoff when `X-RateLimit-Remaining` approaches zero, rather than waiting for a `429` response.

### 3.7 Idempotency Keys

For non-idempotent operations — payment processing, subscription creation, program assignment — clients can provide an `Idempotency-Key` header to ensure the operation is executed exactly once:

```text
POST /api/v1/payments/charges
Idempotency-Key: idem_8fJkL2cH4sA9pT5dXzN6qR3vW7bFjL2c
```

The server stores the response to the first request with the given idempotency key for 24 hours. Subsequent requests with the same key return the stored response without executing the operation again. This protects against network retries creating duplicate charges, duplicate subscriptions, or double-assigned programs. Idempotency keys are scoped to the organization — two organizations using the same key value are treated independently.

### 3.8 Conditional Requests

Clients can use `If-None-Match` and `If-Match` headers for efficient caching and optimistic concurrency control:

```text
# Efficient caching — only fetch if the resource has changed
GET /api/v1/exercise-library/123
If-None-Match: "abc123"

# If unchanged, server returns:
304 Not Modified

# Optimistic concurrency — only update if the resource hasn't been modified
PUT /api/v1/workouts/456
If-Match: "def789"

# If the version doesn't match, server returns:
409 Conflict
```

ETags are generated from the `version` column on every database row. When a row is updated, the version increments and the ETag changes. This provides a lightweight mechanism for clients to avoid refetching data they already have and to detect concurrent modifications before making conflicting writes.

---

## 4. Core Endpoints

Each endpoint specification includes:
- **Method and URL**
- **Authentication** required (yes/no, specific permission)
- **Request** body/parameters
- **Response** body (success and common errors)
- **Business Rules** governing the operation

### 4.1 Authentication & Sessions

#### Register

```text
POST /api/v1/auth/register
Authentication: None
```

```json
{
  "email": "coach@example.com",
  "password": "secure-password-123",
  "first_name": "Sarah",
  "last_name": "Chen",
  "role": "coach",
  "organization_name": "Peak Performance Coaching",
  "accepted_terms": true
}
```

```json
{
  "user": {
    "id": "user_abc123",
    "email": "coach@example.com",
    "role": "coach"
  },
  "organization": {
    "id": "org_xyz789",
    "name": "Peak Performance Coaching",
    "slug": "peak-performance-coaching"
  },
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

Business rules:
- Email must be unique within the system (checked by Clerk)
- Password strength enforced by Clerk (minimum 8 characters, breached password detection)
- Organization name must be unique (slug derived automatically, append number if conflict)
- The registering user becomes the organization admin
- A default coach profile is created automatically

#### Login

```text
POST /api/v1/auth/login
Authentication: None
```

```json
{
  "email": "coach@example.com",
  "password": "secure-password-123"
}
```

Response is identical to Register. Includes access token, organization info, and sets refresh token as httpOnly cookie.

#### Refresh Token

```text
POST /api/v1/auth/refresh
Authentication: Refresh token cookie
```

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

Business rules:
- Refresh token must be valid and not revoked
- Rotates refresh token — old token invalidated, new token set in cookie
- If a previously-used refresh token is presented (replay attack), the entire token family is revoked

#### Logout

```text
POST /api/v1/auth/logout
Authentication: Required (any role)
```

Invalidates the current refresh token and clears the cookie. Returns 204 No Content.

#### Forgot / Reset Password

```text
POST /api/v1/auth/forgot-password
Authentication: None

{
  "email": "coach@example.com"
}

POST /api/v1/auth/reset-password
Authentication: Reset token

{
  "token": "reset_token_from_email",
  "new_password": "new-secure-password-456"
}
```

Delegated to Clerk. The API server proxies these requests; Clerk handles email delivery, token validation, and password storage.

### 4.2 Users & Profiles

#### Get Current User

```text
GET /api/v1/users/me
Authentication: Required
```

Returns the authenticated user's profile, roles, organizations, and notification preferences.

```json
{
  "id": "user_abc123",
  "email": "coach@example.com",
  "profile": {
    "first_name": "Sarah",
    "last_name": "Chen",
    "avatar_url": "https://cdn.mrtraining.com/avatars/sarah.jpg",
    "timezone": "America/New_York",
    "locale": "en-US"
  },
  "organizations": [
    {
      "id": "org_xyz789",
      "name": "Peak Performance Coaching",
      "role": "admin",
      "is_primary": true
    }
  ],
  "notification_preferences": {
    "workout_completed_push": true,
    "message_email": false,
    "weekly_digest": true
  }
}
```

#### Update Profile

```text
PATCH /api/v1/users/me
Authentication: Required

{
  "profile": {
    "first_name": "Sara",
    "timezone": "America/Chicago"
  }
}
```

Partial update — only provided fields are changed. Fields set to `null` are cleared (except required fields like `first_name` which reject null).

#### List Organization Users

```text
GET /api/v1/organizations/:orgId/users?role=coach&status=active&page=1&per_page=20
Authentication: Required (admin or coach)
```

Returns paginated list of users in the organization with their roles and status.

### 4.3 Organizations & Academies

#### Create Organization

```text
POST /api/v1/organizations
Authentication: Required (admin)

{
  "name": "Elite Tennis Academy",
  "billing_email": "billing@elitetennis.com",
  "settings": {
    "default_sport": "tennis",
    "default_language": "en"
  }
}
```

#### Get Organization

```text
GET /api/v1/organizations/:orgId
Authentication: Required (organization member)

{
  "id": "org_xyz789",
  "name": "Peak Performance Coaching",
  "slug": "peak-performance-coaching",
  "billing_email": "billing@peakperformance.com",
  "settings": { /* ... */ },
  "subscription": {
    "plan": "pro",
    "status": "active",
    "current_period_end": "2026-02-15T00:00:00Z"
  },
  "stats": {
    "total_athletes": 47,
    "active_athletes": 42,
    "total_coaches": 3,
    "programs_active": 8,
    "workouts_this_week": 156
  }
}
```

#### Manage Academies

```text
GET    /api/v1/organizations/:orgId/academies              # List academies
POST   /api/v1/organizations/:orgId/academies              # Create academy
GET    /api/v1/organizations/:orgId/academies/:academyId   # Get academy
PUT    /api/v1/organizations/:orgId/academies/:academyId   # Update academy
DELETE /api/v1/organizations/:orgId/academies/:academyId   # Soft-delete academy
```

Authentication: admin only for create/update/delete.

### 4.4 Coaches & Athletes

#### List Coaches

```text
GET /api/v1/organizations/:orgId/coaches?academy_id=acad_123&sport_type=tennis&status=active
Authentication: Required (admin, coach)

{
  "data": [
    {
      "id": "coach_abc123",
      "user_id": "user_xyz789",
      "name": "Sarah Chen",
      "headline": "USPTA Elite Professional",
      "specialties": ["tennis", "gym"],
      "athlete_count": 12,
      "is_accepting_athletes": true
    }
  ],
  "pagination": { /* ... */ }
}
```

#### Create / Update / Delete Coach

```text
POST   /api/v1/organizations/:orgId/coaches           # Create coach profile
GET    /api/v1/organizations/:orgId/coaches/:coachId  # Get coach details
PUT    /api/v1/organizations/:orgId/coaches/:coachId  # Update coach
DELETE /api/v1/organizations/:orgId/coaches/:coachId  # Soft-delete
```

#### List Athletes

```text
GET /api/v1/organizations/:orgId/athletes?coach_id=coach_abc123&sport_type=running&status=active&search=john&page=1
Authentication: Required (admin, coach)

{
  "data": [
    {
      "id": "athlete_def456",
      "user_id": "user_jkl012",
      "name": "John Doe",
      "primary_sport": "running",
      "experience_level": "intermediate",
      "training_status": "active",
      "injury_status": "healthy",
      "adherence_pct": 92.5,
      "assigned_coaches": [
        {
          "id": "coach_abc123",
          "name": "Sarah Chen",
          "is_primary": true
        }
      ]
    }
  ],
  "pagination": { /* ... */ }
}
```

#### Get Athlete Dashboard

```text
GET /api/v1/athletes/:athleteId/dashboard
Authentication: Required (coach who manages athlete, or the athlete themselves)
```

Returns the athlete's dashboard with current program, today's workouts, recent metrics, readiness score, and AI-generated insights:

```json
{
  "athlete": { /* ... */ },
  "current_program": {
    "id": "prog_abc123",
    "name": "Marathon Build Phase",
    "phase": "Week 8 of 16",
    "progress_pct": 50
  },
  "todays_workouts": [
    {
      "id": "wkt_def456",
      "name": "Tempo Intervals",
      "type": "running",
      "status": "scheduled",
      "scheduled_date": "2026-01-15",
      "duration_minutes": 60,
      "exercises": [ /* ... */ ]
    }
  ],
  "metrics": {
    "weekly_training_load": 450.5,
    "adherence_pct": 92.5,
    "acute_load": 420.3,
    "chronic_load": 380.1,
    "acwr": 1.11
  },
  "readiness": {
    "score": 82,
    "hrv_ms": 65.3,
    "resting_hr_bpm": 52,
    "sleep_hours": 7.5,
    "last_updated": "2026-01-15T07:30:00Z"
  },
  "insights": [
    {
      "type": "trend",
      "title": "Consistent Progress",
      "body": "Your weekly mileage has increased 5% for 3 consecutive weeks. Current load is sustainable.",
      "confidence": 0.85
    }
  ]
}
```

#### List Athlete Workouts

```text
GET /api/v1/athletes/:athleteId/workouts?status=completed&scheduled_after=2026-01-01&scheduled_before=2026-01-31&page=1
```

#### Get Athlete Metrics

```text
GET /api/v1/athletes/:athleteId/metrics?metric_date_from=2025-12-01&metric_date_to=2026-01-15&fields=weight_kg,resting_hr_bpm,vo2max_estimate
```

Returns time-series metrics data suitable for charting:

```json
{
  "data": [
    {
      "metric_date": "2025-12-01",
      "weight_kg": 72.5,
      "resting_hr_bpm": 55,
      "vo2max_estimate": 48.2
    },
    {
      "metric_date": "2025-12-08",
      "weight_kg": 72.3,
      "resting_hr_bpm": 53,
      "vo2max_estimate": 48.5
    }
  ]
}
```

### 4.5 Workout Programs

#### List Programs

```text
GET /api/v1/training/programs?coach_id=coach_abc123&sport_type=running&status=active&search=marathon&page=1&per_page=20
Authentication: Required (coach or admin)
```

#### Create Program

```text
POST /api/v1/training/programs
Authentication: training.programs.create

{
  "name": "Marathon Build Phase",
  "description": "16-week marathon training block targeting sub-3:30",
  "sport_type": "running",
  "start_date": "2026-01-01",
  "end_date": "2026-04-15",
  "phases": [
    {
      "name": "Base Building",
      "description": "Aerobic foundation and mileage ramp",
      "week_start": 1,
      "week_end": 6
    },
    {
      "name": "Build Phase",
      "description": "Introduce tempo and threshold work",
      "week_start": 7,
      "week_end": 12
    }
  ],
  "athlete_ids": ["athlete_def456", "athlete_ghi789"],
  "is_template": false
}
```

Business rules:
- Start date must be before end date
- Phases must be non-overlapping and within date range
- Athletes must belong to the same organization
- Coaches can only assign athletes they manage

#### Get Program

```text
GET /api/v1/training/programs/:programId
```

Returns the full program with phases, workouts, assignments, and completion statistics.

#### Update / Delete Program

```text
PUT    /api/v1/training/programs/:programId    # Full update
PATCH  /api/v1/training/programs/:programId    # Partial update
DELETE /api/v1/training/programs/:programId    # Soft delete
```

#### Publish Program

```text
POST /api/v1/training/programs/:programId/publish
Authentication: training.programs.publish
```

Publishing a program creates a snapshot of its current state, generates workouts for assigned athletes on their scheduled dates, and transitions the program status from `draft` to `active`.

#### Assign Program

```text
POST /api/v1/training/programs/:programId/assign
Authentication: training.programs.update

{
  "athlete_ids": ["athlete_def456", "athlete_ghi789"]
}
```

### 4.6 Workouts

#### List Workouts

```text
GET /api/v1/training/workouts?athlete_id=athlete_def456&scheduled_date=2026-01-15&status=scheduled
```

#### Get Workout

```text
GET /api/v1/training/workouts/:workoutId
```

Returns the full workout with exercises, prescribed sets, and any logged sets.

#### Complete Workout

```text
POST /api/v1/training/workouts/:workoutId/complete
Authentication: training.workouts.complete

{
  "rpe": 8,
  "soreness": 4,
  "energy": 7,
  "athlete_notes": "Felt strong today. Increased weight on set 3.",
  "exercise_results": [
    {
      "exercise_id": "ex_abc123",
      "sets": [
        {
          "set_number": 1,
          "actual_reps": 10,
          "actual_weight_kg": 60,
          "is_completed": true
        }
      ]
    }
  ]
}
```

Business rules:
- Workout must be in `scheduled` status
- All prescribed exercises must have results (sets can be marked as skipped)
- RPE must be between 1 and 10
- Triggers `workout.completed` domain event (coach notification, metric recalculation, AI analysis)

#### Review Workout (Coach)

```text
POST /api/v1/training/workouts/:workoutId/review
Authentication: training.workouts.review

{
  "coach_feedback": "Great session! Your pacing on the tempo intervals was excellent. Keep the effort consistent next week."
}
```

Business rules:
- Workout must be in `completed` status
- Only the assigned coach (or an admin) can review
- Triggers `workout.reviewed` domain event (athlete notification)

### 4.7 Exercises

#### List Exercises

```text
GET /api/v1/training/exercises?sport_type=gym&category=strength&muscle_group=chest&search=bench&page=1
```

```json
{
  "data": [
    {
      "id": "ex_abc123",
      "name": "Barbell Bench Press",
      "category": "strength",
      "sport_type": "gym",
      "muscle_groups": ["chest", "triceps", "shoulders"],
      "equipment": ["barbell", "bench"],
      "difficulty": "intermediate",
      "video_url": "https://cdn.mrtraining.com/exercises/bench-press.mp4",
      "thumbnail_url": "https://cdn.mrtraining.com/exercises/bench-press-thumb.jpg",
      "is_verified": true
    }
  ],
  "pagination": { /* ... */ }
}
```

#### Create Custom Exercise

```text
POST /api/v1/training/exercises
Authentication: training.exercises.create

{
  "name": "Custom Banded Squat",
  "category": "strength",
  "sport_type": "gym",
  "muscle_groups": ["quadriceps", "glutes"],
  "equipment": ["resistance band"],
  "difficulty": "beginner",
  "instructions": "Stand on a resistance band with feet shoulder-width apart..."
}
```

Custom exercises are scoped to the organization. They are visible to all coaches in the organization but not to other organizations.

### 4.8 Nutrition

#### List Nutrition Plans

```text
GET /api/v1/nutrition/plans?athlete_id=athlete_def456&status=active
```

#### Create Nutrition Plan

```text
POST /api/v1/nutrition/plans
Authentication: nutrition.plans.create

{
  "athlete_id": "athlete_def456",
  "name": "Race Week Carb Load",
  "description": "High-carb, moderate-protein plan for race week",
  "start_date": "2026-03-10",
  "end_date": "2026-03-16",
  "daily_calories": 3200,
  "protein_g": 140,
  "carbs_g": 480,
  "fat_g": 71,
  "dietary_restrictions": ["no-dairy"]
}
```

#### Log Nutrition Entry

```text
POST /api/v1/nutrition/entries
Authentication: nutrition.entries.create

{
  "plan_id": "plan_abc123",
  "meal_type": "lunch",
  "logged_date": "2026-01-15",
  "notes": "Post-training meal",
  "foods": [
    {
      "food_name": "Chicken Breast",
      "serving_size": "200g",
      "servings": 1,
      "calories": 330,
      "protein_g": 62,
      "carbs_g": 0,
      "fat_g": 7.2
    }
  ]
}
```

#### Get Daily Nutrition Summary

```text
GET /api/v1/nutrition/summary?athlete_id=athlete_def456&date=2026-01-15

{
  "date": "2026-01-15",
  "targets": {
    "calories": 3200,
    "protein_g": 160,
    "carbs_g": 400,
    "fat_g": 89
  },
  "consumed": {
    "calories": 2950,
    "protein_g": 155,
    "carbs_g": 380,
    "fat_g": 82
  },
  "pct_of_target": {
    "calories": 92.2,
    "protein_g": 96.9,
    "carbs_g": 95.0,
    "fat_g": 92.1
  },
  "meals": [ /* meal entries for the day */ ]
}
```

### 4.9 Recovery

#### Log Recovery Entry

```text
POST /api/v1/recovery/logs
Authentication: recovery.logs.create

{
  "log_date": "2026-01-15",
  "soreness_level": 4,
  "fatigue_level": 3,
  "stress_level": 2,
  "mood_rating": 8,
  "sleep_hours": 7.5,
  "sleep_quality": 4,
  "notes": "Good sleep. Slight quad soreness from yesterday."
}
```

#### Get Recovery Dashboard

```text
GET /api/v1/recovery/dashboard?athlete_id=athlete_def456&date_from=2026-01-01&date_to=2026-01-15
```

Returns combined recovery data: subjective logs, wearable data (HRV, resting HR, sleep stages from Health Connect/HealthKit), readiness scores, and injury status.

#### Log Injury

```text
POST /api/v1/recovery/injuries
Authentication: recovery.injuries.create (coach or PT)

{
  "athlete_id": "athlete_def456",
  "body_part": "right_knee",
  "diagnosis": "Patellar tendinopathy",
  "severity": "moderate",
  "onset_date": "2026-01-10",
  "expected_return_date": "2026-02-01",
  "notes": "Onset after tempo run. Referred to PT.",
  "restrictions": ["no-plyometrics", "no-deep-squats", "reduced-mileage"]
}
```

### 4.10 Community

#### Get Feed

```text
GET /api/v1/community/feed?group_id=grp_abc123&cursor=eyJj...&limit=30
```

Returns cursor-paginated feed of workout completions, PRs, challenge entries, and social posts from the athlete's groups and connections.

#### Create Post

```text
POST /api/v1/community/posts

{
  "content": "New 5K PR! 21:32 at the parkrun this morning.",
  "group_ids": ["grp_abc123"],
  "media_ids": ["med_def456"],
  "privacy": "group"
}
```

#### Challenges

```text
GET    /api/v1/community/challenges                     # List challenges
POST   /api/v1/community/challenges                     # Create challenge
GET    /api/v1/community/challenges/:challengeId         # Get challenge details
GET    /api/v1/community/challenges/:challengeId/leaderboard  # Get leaderboard
POST   /api/v1/community/challenges/:challengeId/join   # Join challenge
```

### 4.11 Events

#### List Events

```text
GET /api/v1/events?event_type=competition&status=upcoming&start_after=2026-02-01&page=1
```

#### Create Event

```text
POST /api/v1/events
Authentication: events.create

{
  "name": "Spring Open Tournament",
  "event_type": "competition",
  "sport_type": "tennis",
  "start_date": "2026-04-10T08:00:00Z",
  "end_date": "2026-04-12T18:00:00Z",
  "location": "City Tennis Center",
  "max_participants": 64,
  "registration_fee_cents": 5000,
  "description": "Annual spring tournament for all skill levels.",
  "scoring_format": "single_elimination"
}
```

#### Register for Event

```text
POST /api/v1/events/:eventId/register

{
  "athlete_id": "athlete_def456",
  "waiver_accepted": true,
  "payment_method_id": "pm_card_visa"
}
```

Business rules:
- Event must be in `published` status
- Registration must be open (between `registration_open_date` and `registration_close_date`)
- Must not exceed `max_participants` (checked atomically to prevent oversubscription)
- Payment is processed immediately for paid events

### 4.12 Payments & Subscriptions

#### List Plans

```text
GET /api/v1/payments/plans?tier=pro&interval=monthly
```

Returns available subscription plans (Free, Pro, Enterprise) with features, pricing, and athlete limits.

#### Create Subscription

```text
POST /api/v1/payments/subscriptions
Authentication: billing.manage

{
  "plan_id": "plan_pro_monthly",
  "payment_method_id": "pm_card_visa",
  "coupon_code": "LAUNCH2026"
}
```

#### Get Current Subscription

```text
GET /api/v1/payments/subscriptions/current

{
  "id": "sub_abc123",
  "plan": {
    "id": "plan_pro_monthly",
    "name": "Pro",
    "tier": "pro",
    "price": {
      "amount_cents": 4900,
      "currency": "usd",
      "interval": "monthly"
    }
  },
  "status": "active",
  "current_period_start": "2026-01-15T00:00:00Z",
  "current_period_end": "2026-02-15T00:00:00Z",
  "cancel_at_period_end": false,
  "athlete_usage": {
    "current": 47,
    "limit": 100
  },
  "payment_method": {
    "brand": "visa",
    "last4": "4242",
    "exp_month": 12,
    "exp_year": 2027
  }
}
```

Payment processing is delegated to Stripe. The MR Training API creates Stripe objects (customers, subscriptions, payment intents) and returns MR Training-formatted responses. Payment method details (card numbers, CVC) never touch MR Training servers — they go directly to Stripe via Stripe.js on the frontend, which returns a payment method token that the API passes to Stripe.

#### List Invoices

```text
GET /api/v1/payments/invoices?status=paid&page=1
```

#### Pay Invoice

```text
POST /api/v1/payments/invoices/:invoiceId/pay

{
  "payment_method_id": "pm_card_visa"
}
```

### 4.13 Achievements & Badges

#### List Achievements

```text
GET /api/v1/gamification/achievements?athlete_id=athlete_def456
```

```json
{
  "data": [
    {
      "id": "ach_abc123",
      "type": "streak",
      "title": "7-Day Streak",
      "description": "Completed a workout every day for 7 days",
      "achieved_at": "2026-01-14T08:30:00Z",
      "icon_url": "https://cdn.mrtraining.com/badges/streak-7.png"
    }
  ]
}
```

Achievements are awarded automatically by event consumers listening to `workout.completed` events. No endpoint exists for manually awarding achievements — they are system-generated.

#### Challenges Leaderboard

```text
GET /api/v1/gamification/challenges/:challengeId/leaderboard?limit=25

{
  "data": [
    {
      "rank": 1,
      "athlete_id": "athlete_def456",
      "athlete_name": "John Doe",
      "score": 1250.5,
      "trend": "up"
    }
  ],
  "current_user_rank": 8
}
```

### 4.14 AI

All AI endpoints return `202 Accepted` with a `status_url` for polling because AI generation can take multiple seconds:

```text
POST /api/v1/ai/generate-workout
Authentication: ai.generate

{
  "athlete_id": "athlete_def456",
  "sport_type": "running",
  "goal": "marathon_sub_330",
  "duration_weeks": 12,
  "days_per_week": 5,
  "constraints": {
    "max_weekly_mileage": 50,
    "preferred_long_run_day": "sunday",
    "injuries": ["right_knee_caution"]
  }
}

# Response:
{
  "status_url": "/api/v1/ai/status/ai_req_abc123",
  "estimated_completion_seconds": 8
}
```

Poll the status URL:

```text
GET /api/v1/ai/status/ai_req_abc123

{
  "status": "completed",
  "result": {
    "program": { /* full generated program */ },
    "explanation": "This program builds mileage gradually...",
    "confidence": 0.87
  }
}
```

AI endpoints:

| Endpoint | Purpose |
|---|---|
| `POST /ai/generate-workout` | Generate a training program |
| `POST /ai/generate-nutrition` | Generate a nutrition plan |
| `POST /ai/generate-meal-plan` | Generate a weekly meal plan |
| `POST /ai/insights/:athleteId` | Generate performance insights for an athlete |
| `POST /ai/report/:athleteId` | Generate a comprehensive performance report |
| `POST /ai/check-in/:athleteId` | Generate contextual check-in questions |
| `POST /ai/anomaly-detect/:athleteId` | Analyze recent data for anomalies |

All AI-generated content includes a `confidence_score` and requires coach approval before being applied to an athlete's active program or plan. Generated content is stored as `AI_GENERATED_CONTENT` with status `pending_review`. The coach reviews the content, optionally edits it, and applies it — at which point the content transitions to `applied`.

### 4.15 Analytics

#### Get Coach Dashboard Analytics

```text
GET /api/v1/analytics/coach-dashboard?date_from=2026-01-01&date_to=2026-01-15

{
  "athlete_summary": {
    "total": 47,
    "active": 42,
    "at_risk": 3,
    "inactive": 2
  },
  "adherence": {
    "overall_pct": 87.5,
    "by_sport": {
      "gym": 92.1,
      "running": 85.3,
      "cycling": 78.2
    }
  },
  "workout_volume": {
    "total": 312,
    "completed": 285,
    "missed": 27,
    "trend": [
      { "week": "2026-W01", "completed": 68, "missed": 5 },
      { "week": "2026-W02", "completed": 72, "missed": 4 }
    ]
  },
  "engagement": {
    "athletes_logging_daily_pct": 82.0,
    "avg_workouts_per_athlete": 6.8,
    "trend": "up"
  },
  "revenue": {
    "mrr_cents": 680000,
    "mrr_change_pct": 5.2,
    "projected_arr_cents": 8160000
  }
}
```

#### Get Athlete Performance Trends

```text
GET /api/v1/analytics/athlete/:athleteId/performance?sport_type=running&metric=pace&period=12w
```

Returns a time series suitable for charting, with trend lines, annotations for personal records, and comparative benchmarks.

### 4.16 Media Uploads

Media files are uploaded through presigned URLs — the file data never transits through the API server:

```text
POST /api/v1/media/upload-url
Authentication: Required

{
  "filename": "deadlift-form-check.mp4",
  "content_type": "video/mp4",
  "size_bytes": 15728640,
  "purpose": "exercise_video"
}
```

```json
{
  "media_id": "med_abc123",
  "upload_url": "https://storage.mrtraining.com/uploads/med_abc123?X-Amz-...",
  "upload_method": "PUT",
  "headers": {
    "Content-Type": "video/mp4"
  },
  "expires_at": "2026-01-15T08:15:00Z",
  "public_url": "https://cdn.mrtraining.com/media/med_abc123.mp4"
}
```

The client uploads the file directly to the presigned URL. When complete, the client calls:

```text
POST /api/v1/media/:mediaId/confirm-upload
```

The server verifies the file exists in object storage, processes it (thumbnail generation, video transcoding for adaptive bitrate), and marks the media record as `ready`.

---

## 5. Webhooks

### 5.1 Event Types

Webhooks enable external systems to react to events in MR Training in real time. An academy with a custom dashboard can receive workout completions. A physiotherapy clinic can be notified of injury status changes. A nutritionist's external tool can receive meal plan assignments.

Webhook events mirror the domain events published on the internal NATS event bus:

| Event Type | Trigger | Payload Includes |
|---|---|---|
| `workout.completed` | Athlete completes a workout | Workout ID, athlete ID, RPE, completed timestamp |
| `workout.reviewed` | Coach reviews a completed workout | Workout ID, coach ID, feedback text |
| `program.published` | Coach publishes a program | Program ID, sport type, phase details |
| `program.assigned` | Program is assigned to athletes | Program ID, athlete IDs, coach ID |
| `athlete.registered` | New athlete added to organization | Athlete ID, sport, experience level |
| `athlete.injury_status_changed` | Athlete injury status changes | Athlete ID, old status, new status, body part |
| `nutrition.plan_created` | Nutrition plan created | Plan ID, athlete ID, macro targets |
| `subscription.created` | New subscription activated | Subscription ID, plan tier, amount |
| `subscription.canceled` | Subscription canceled | Subscription ID, cancellation reason |
| `invoice.paid` | Invoice payment processed | Invoice ID, amount, payment method |
| `payment.failed` | Payment attempt failed | Invoice ID, failure reason, next retry |
| `event.registration_completed` | Athlete registers for event | Event ID, athlete ID, registration status |
| `challenge.completed` | Athlete completes a challenge | Challenge ID, athlete ID, final score, rank |
| `milestone.achieved` | Athlete achieves a milestone | Athlete ID, milestone type, value |

### 5.2 Webhook Delivery

```text
POST <customer_webhook_url>
Content-Type: application/json
X-MR-Signature: t=1704074400,v1=8fJkL2cH4sA9pT5dXzN6qR3vW7bFjL2c...
X-MR-Event-Type: workout.completed
X-MR-Delivery-ID: del_abc123
```

```json
{
  "event_id": "evt_abc123",
  "event_type": "workout.completed",
  "organization_id": "org_xyz789",
  "occurred_at": "2026-01-15T08:30:00Z",
  "data": {
    "workout_id": "wkt_def456",
    "athlete_id": "athlete_def456",
    "coach_id": "coach_abc123",
    "rpe": 8,
    "completed_at": "2026-01-15T08:29:45Z"
  }
}
```

### 5.3 Signature Verification

Every webhook delivery is signed with HMAC-SHA256 using a shared secret (the webhook signing secret configured in the organization settings). The signature is included in the `X-MR-Signature` header:

```
X-MR-Signature: t=1704074400,v1=8fJkL2cH4sA9pT5dXzN6qR3vW7bFjL2c...
```

The receiving system should:
1. Extract the timestamp (`t=`) and signature (`v1=`) from the header
2. Construct the signed payload: `{timestamp}.{raw_request_body}`
3. Compute the HMAC-SHA256 of the signed payload using the shared secret
4. Compare the computed signature to the one in the header in constant time

If the signatures do not match, the request is discarded. If the timestamp is more than 5 minutes old, the request is discarded (replay attack protection).

### 5.4 Retry Policy

Failed deliveries are retried with exponential backoff:
- First retry: 5 seconds
- Second retry: 25 seconds
- Third retry: 125 seconds
- Fourth retry: 625 seconds (~10 minutes)
- Fifth retry: 3125 seconds (~52 minutes)

If all retries fail, the delivery is marked as failed in the webhook logs. Organizations can view failed deliveries in the webhook dashboard and manually retry them. Webhooks that consistently fail (failure rate above 50% over 24 hours) trigger an alert to the organization admin and the webhook endpoint is temporarily disabled until the admin re-enables it.

---

## 6. Rate Limiting

### 6.1 Tier-Based Limits

Rate limiting is applied per organization, not per user. This prevents a single organization's heavy API usage from affecting other tenants. Limits are tiered:

| Tier | Requests per Minute | Burst Capacity | Concurrent Connections |
|---|---|---|---|
| Free | 100 | 20 | 5 |
| Pro | 1,000 | 100 | 25 |
| Enterprise | 10,000 | 500 | 100 |

The burst capacity allows short spikes above the per-minute limit — a coach loading an athlete dashboard may trigger 15 API calls in rapid succession. The sliding window algorithm ensures that sustained usage beyond the limit results in `429` responses.

### 6.2 Endpoint-Specific Overrides

Some endpoints have adjusted limits to account for their cost:

| Endpoint | Multiplier | Reasoning |
|---|---|---|
| `/ai/*` | 0.1x | AI generation is expensive (GPU compute + LLM API costs). 10 requests/min for Pro tier |
| `/media/upload-url` | 0.5x | Large file uploads. 500 requests/min for Pro tier |
| `/analytics/reports/*` | 0.2x | Report generation scans large datasets. 200 requests/min for Pro tier |
| `/community/feed` | 2x | Feed polling is frequent and cheap. 2,000 requests/min for Pro tier |

### 6.3 429 Response

```text
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704074460
Retry-After: 42
Content-Type: application/json

{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Retry after 42 seconds."
  },
  "request_id": "req_a1b2c3d4e5f6"
}
```

The `Retry-After` header tells the client how many seconds to wait before retrying. Well-behaved clients back off preemptively when `X-RateLimit-Remaining` drops below 10% of the limit, avoiding 429 responses entirely.

### 6.4 Cost-Based Rate Limiting (Future)

A cost-based system is planned where each endpoint is assigned a cost (1 for simple reads, 5 for search queries, 50 for AI generation) and organizations have a per-minute cost budget instead of a request count. This more accurately reflects server resource consumption and prevents rate limit gaming through cheap endpoint calls.

---

## 7. SDK Generation

### 7.1 OpenAPI Specification

The entire API is documented in an OpenAPI 3.1 specification file (`api/openapi/spec.yaml`). This spec is the source of truth for the API contract. It is generated from code annotations in the Go handlers and manually curated for readability. The spec includes:

- Every endpoint with HTTP method, path, and description
- Every request parameter (path, query, header, body) with types, constraints, and examples
- Every response (success and error) with schemas
- Authentication schemes
- Rate limit documentation
- Deprecation notices with sunset dates

The spec is served at `/docs` via Swagger UI and at `/docs/openapi.yaml` as a raw YAML file for tooling consumption. No endpoint exists without being in the spec. A CI check fails the build if a handler route is not documented in the OpenAPI spec.

### 7.2 Client SDK Generation

The OpenAPI spec is used to generate type-safe client SDKs for all supported platforms:

**TypeScript SDK** — Generated using `openapi-generator-cli` with the `typescript-fetch` generator. Published as `@mrtraining/api-client` on npm. Used by the Next.js frontend for server-side API calls. Includes:
- Type-safe request and response types
- Automatic token refresh handling
- Organization context injection
- Request deduplication
- Error handling with typed error responses

**Dart/Flutter SDK** — Generated using `openapi-generator-cli` with the `dart-dio` generator. Published as `mrtraining_api_client` on pub.dev. Used by the Flutter mobile app. Includes:
- Type-safe models with `freezed` for immutability
- Dio-based HTTP client with interceptors
- Automatic token refresh
- Offline detection and local fallback
- Sync queue integration

**Go SDK** — Generated using `openapi-generator-cli` with the `go` generator. Used by internal services (AI engine, notification worker) and available for third-party Go backends that integrate with MR Training.

### 7.3 SDK Maintenance

SDKs are regenerated automatically when the OpenAPI spec changes. A CI pipeline:
1. Detects changes to `api/openapi/spec.yaml`
2. Regenerates all SDKs
3. Runs SDK unit tests
4. Creates a PR with the updated SDKs
5. Publishes new versions to npm and pub.dev on merge

This ensures that SDKs are always in sync with the API. No manual SDK updates. No drift between documentation and generated types.

---

*This document is part of the MR Training architecture series. See also: [05 Backend Architecture](./05-backend-architecture.md) and [04 Database Design](./04-database-design.md).*
