# Tasks: API Endpoint Consolidation DDD

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1200-1800 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 → PR 5 |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Foundation proxy + auth | PR 1 | go test ./internal/middleware/... | curl -H Authorization /api/v1/health | apps/web/app/api/proxy/* |
| 2 | Membership + Store domains | PR 2 | go test ./internal/domain/membership/... | GET /api/v1/athlete/membership | apps/api/internal/domain/membership |
| 3 | TrainingSessions + WorkoutPrescription | PR 3 | go test ./internal/domain/training/... | POST /api/v1/athlete/workouts/{id}/sessions | apps/api/internal/domain/training |
| 4 | CoachAnalytics + Community + Nutrition | PR 4 | go test ./internal/domain/analytics/... | GET /api/v1/coach/dashboard/summary | apps/api/internal/domain/analytics |
| 5 | Proxy fallback + rate limiting + cleanup | PR 5 | pnpm test web | Proxy latency <50ms p95 | apps/web/app/api/* |

## Phase 1: Foundation / Infrastructure

- [x] 1.1 Create DDD base layer `apps/api/internal/domain/{training,workout,analytics,community,nutrition,store,membership}` with entities, aggregates, repository interfaces. Acceptance: interfaces compile, no impl. Depends: none. Est: ~80 lines.
- [x] 1.2 Implement Clerk JWT validator `apps/api/internal/middleware/auth.go` with JWKS cache, claims extraction, RBAC. Acceptance: invalid JWT returns 401, role enforced 403. Depends: 1.1. Est: ~120 lines.
- [x] 1.3 Add rate limiter middleware `apps/api/internal/middleware/ratelimit.go` Redis token bucket per user/org/IP. Acceptance: 429 with Retry-After, stricter `/api/v1/auth/*`. Depends: 1.2. Est: ~100 lines.
- [x] 1.4 Create API versioning router `apps/api/internal/interfaces/http/router.go` mount `/api/v1/*` with middleware chain. Acceptance: `API-Version: v1` header present. Depends: 1.2,1.3. Est: ~60 lines.

## Phase 2: Core Domain Implementation

- [x] 2.1 Implement TrainingSessions domain `apps/api/internal/domain/training` session CRUD, aggregate root, sessionId generation. Acceptance: POST returns 201 with sessionId, matches legacy shape. Depends: 1.1. Est: ~200 lines.
- [x] 2.2 Implement WorkoutPrescription domain `apps/api/internal/domain/workout` template import, athlete assignment. Acceptance: assignment creates aggregate events. Depends: 1.1. Est: ~180 lines.
- [x] 2.3 Implement CoachAnalytics domain `apps/api/internal/domain/analytics` dashboard summary aggregation query handler. Acceptance: GET `/api/v1/coach/dashboard/summary` returns roster metrics, upcoming, needs-attention. Depends: 1.1. Est: ~160 lines.
- [x] 2.4 Implement Membership migration domain `apps/api/internal/domain/membership` plan/expiry/entitlements parity. Acceptance: GET `/api/v1/athlete/membership` matches legacy contract. Depends: 1.1. Est: ~150 lines.
- [ ] 2.5 Implement Community domain `apps/api/internal/domain/community` posts/comments aggregates. Acceptance: CRUD endpoints return expected payloads. Depends: 1.1. Est: ~140 lines.
- [ ] 2.6 Implement Nutrition domain `apps/api/internal/domain/nutrition` meal logs, macro calculations. Acceptance: POST meal log returns calculated macros. Depends: 1.1. Est: ~130 lines.
- [ ] 2.7 Implement Store domain `apps/api/internal/domain/store` products/cart/checkout parity. Acceptance: cart operations mirror legacy shape. Depends: 1.1. Est: ~170 lines.

## Phase 3: Proxy & Integration

- [x] 3.1 Create Next.js thin proxy `apps/web/app/api/[...proxy]/route.ts` forward to Go with JWT passthrough. Acceptance: proxied request returns Go response transparently. Depends: 1.4. Est: ~90 lines.
- [x] 3.2 Add proxy fallback logic to legacy handlers on Go 404. Acceptance: zero 404s for unmigrated paths, fallback logs. Depends: 3.1. Est: ~70 lines.
- [x] 3.3 Update mobile client base URL `apps/mobile/src/infrastructure/api/client.ts` to `/api/v1`. Acceptance: mobile hits Go endpoints. Depends: 1.4. Est: ~30 lines.
- [ ] 3.4 Wire domain repositories to Turso `apps/api/internal/infrastructure/db/...`. Acceptance: integration tests pass for each domain repo. Depends: 2.1-2.7. Est: ~120 lines.

## Phase 4: Testing / Verification

- [ ] 4.1 RED test invalid JWT rejection `POST /api/v1/athlete/workouts` returns 401. Acceptance: test fails before auth impl, passes after. Depends: 1.2. Est: ~40 lines.
- [ ] 4.2 Contract test membership parity GET `/api/v1/athlete/membership` matches legacy shape. Acceptance: snapshot matches. Depends: 2.4. Est: ~50 lines.
- [ ] 4.3 Integration test workout session creation POST returns 201. Acceptance: DB row created. Depends: 2.1,3.4. Est: ~60 lines.
- [ ] 4.4 Verify rate limit enforcement `go test ./internal/middleware -run TestRateLimit`. Acceptance: 429 triggered. Depends: 1.3. Est: ~30 lines.
- [ ] 4.5 Verify proxy fallback zero-404 scenario. Acceptance: Playwright shows no 404 for critical flows. Depends: 3.2. Est: ~50 lines.

## Phase 5: Cleanup / Documentation

- [ ] 5.1 Update API docs OpenAPI v1 with deprecation headers. Acceptance: docs reflect `/api/v1/*`. Depends: 1.4. Est: ~80 lines.
- [ ] 5.2 Remove duplicated business logic from migrated `apps/web/app/api/*` routes. Acceptance: routes are thin proxy only. Depends: 3.1-3.2. Est: ~100 lines.
- [ ] 5.3 Add feature flag for legacy fallback toggle. Acceptance: flag disables fallback in config. Depends: 3.2. Est: ~40 lines.
