# Delta for API Consolidation DDD

## ADDED Requirements

### Requirement: Unified API Gateway v1

The system MUST expose all web and mobile endpoints under `/api/v1/*` on the Go backend with DDD Clean Architecture.

#### Scenario: Endpoint parity for coach dashboard
- GIVEN a coach is authenticated via Clerk JWT with coach role
- WHEN client GET `/api/v1/coach/dashboard/summary`
- THEN system returns 200 with roster metrics, upcoming appointments, and needs-attention items
- AND response shape matches previous Next.js `/api/coach/athletes` aggregation

#### Scenario: Endpoint parity for athlete workout/session tracking
- GIVEN an athlete is authenticated
- WHEN client POST `/api/v1/athlete/workouts/{id}/sessions` with session data
- THEN system creates session, returns 201 with sessionId
- AND existing Next.js `/api/athlete/workouts/[id]/session` clients receive identical payload via proxy fallback

#### Scenario: Membership endpoint parity
- GIVEN an athlete requests membership status
- WHEN client GET `/api/v1/athlete/membership`
- THEN Go API returns current plan, expiry, and entitlements
- AND response matches legacy `/api/athlete/membership` contract

#### Scenario: Events registration parity
- GIVEN an athlete is authenticated
- WHEN client POST `/api/v1/athlete/events/{id}/respond` with RSVP
- THEN system records response and returns 200
- AND error codes align with legacy endpoint

#### Scenario: Notifications delivery parity
- GIVEN push token is registered
- WHEN client GET `/api/v1/athlete/notifications`
- THEN system returns unread notifications paginated
- AND payload matches legacy `/api/athlete/notifications`

### Requirement: Proxy Fallback for Unmigrated Endpoints

The system MUST allow Next.js API routes to act as thin proxies to Go API with fallback to legacy handler if Go returns 404.

#### Scenario: Proxy success path
- GIVEN `/api/athlete/workouts` is migrated to Go
- WHEN Next.js route receives request
- THEN request is forwarded to Go `/api/v1/athlete/workouts` with Clerk JWT forwarded
- AND response is proxied transparently

#### Scenario: Proxy fallback on missing parity
- GIVEN endpoint not yet migrated to Go
- WHEN proxy receives request for unmigrated path
- THEN proxy falls back to existing Next.js handler
- AND zero 404s are exposed to client

### Requirement: Clerk JWT Authentication and RBAC

The system MUST validate Clerk-issued JWT at edge/proxy for every API request and enforce RBAC centrally.

#### Scenario: Valid JWT accepted
- GIVEN request includes `Authorization: Bearer <Clerk JWT>`
- WHEN Go API receives request
- THEN system validates signature via JWKS, extracts `sub`, `org_id`, `role`
- AND request proceeds with claims in context

#### Scenario: Invalid JWT rejected
- GIVEN request includes expired or tampered JWT
- WHEN request reaches Go API
- THEN system returns 401 Unauthorized
- AND no downstream processing occurs

#### Scenario: RBAC enforcement
- GIVEN athlete JWT calls coach-only endpoint
- WHEN request reaches Go handler
- THEN system returns 403 Forbidden before business logic executes

### Requirement: Rate Limiting v1

The system MUST enforce rate limits per user/org/IP on all `/api/v1/*` endpoints.

#### Scenario: Rate limit enforced per user
- GIVEN authenticated user exceeds 100 req/min window
- WHEN next request arrives
- THEN system returns 429 Too Many Requests with `Retry-After`
- AND Redis counter is respected

#### Scenario: Stricter limits for sensitive endpoints
- GIVEN request to `/api/v1/auth/*`
- WHEN 5 requests per minute per IP exceeded
- THEN system returns 429 with shorter window

### Requirement: API Versioning v1

The system MUST version all public endpoints under `/api/v1` and support deprecation headers.

#### Scenario: Versioned endpoint accessible
- GIVEN client calls `/api/v1/athlete/workouts`
- THEN request is routed to v1 handler
- AND response includes `API-Version: v1`

#### Scenario: Deprecated version warning
- GIVEN legacy unversioned route is accessed
- WHEN proxy forwards request
- THEN response includes `Deprecation: true` and `Sunset` header

## MODIFIED Requirements

### Requirement: Next.js API Routes Proxy Behavior

The system SHALL forward requests to Go API when parity exists, otherwise fallback to legacy handler.
(Previously: Next.js API routes implemented business logic directly)

#### Scenario: Forwarded request preserves auth
- GIVEN proxy receives request with Clerk JWT cookie
- WHEN forwarding to Go API
- THEN JWT is forwarded as Authorization header unchanged
- AND Go validates centrally

#### Scenario: Error mapping
- GIVEN Go API returns 5xx
- WHEN proxy receives error
- THEN proxy returns same status with request ID for correlation

## REMOVED Requirements

### Requirement: Direct Business Logic in Next.js API Routes for Migrated Endpoints

(Reason: Logic consolidated into Go DDD layers to avoid duplication)
(Migration: Routes kept as thin proxies with fallback; clients unchanged)

## RENAMED Requirements

None
