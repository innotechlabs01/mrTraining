# Design: API Endpoint Consolidation DDD

## Technical Approach
Unify web and mobile endpoints under Go Fiber `/api/v1/*` with Clean Architecture + DDD. Next.js API routes become thin proxies with fallback to legacy handlers for unmigrated paths. Clerk JWT is validated once at the edge/proxy and claims are forwarded to Go. Rate limiting and API versioning are enforced at the gateway layer. Domain modules are organized feature-first: training, workout, analytics, membership, community, nutrition, store. Existing Go codebase already follows domain/application/infrastructure layers; consolidation refactors handlers to use DDD aggregates, command/query handlers, and repository interfaces. Proxy latency target <50ms p95 via colocated services and cached auth.

## Architecture Decisions

### Decision: DDD Feature-First Modules
**Choice**: Organize `apps/api/internal/domain/{training,workout,analytics,membership,community,nutrition,store}` with entities, value objects, aggregates, repository interfaces, domain events.
**Alternatives considered**: Layer-first `internal/handlers`, `internal/services`, `internal/models`.
**Rationale**: Feature cohesion matches product modules, reduces cross-feature coupling, aligns with Clean Architecture and existing `05-backend-architecture.md`.

### Decision: Next.js Thin Proxy with Fallback
**Choice**: `apps/web/app/api/[...proxy]/route.ts` forwards to Go, falls back to legacy handler on 404.
**Alternatives considered**: Direct client calls to Go only; immediate full migration.
**Rationale**: Zero 404 risk Day 1, allows incremental parity, preserves existing client code.

### Decision: Central Clerk JWT Validation
**Choice**: Validate JWT in Go middleware using JWKS cache; proxy forwards `Authorization` header unchanged.
**Alternatives considered**: Validate in Edge middleware only; duplicate validation.
**Rationale**: Single source of truth for auth/RBAC, prevents drift, matches proposal requirement.

### Decision: Redis Token Bucket Rate Limiting
**Choice**: Per-user/org/IP token bucket in `internal/middleware/ratelimit.go` with stricter limits for `/api/v1/auth/*`.
**Alternatives considered**: Nginx rate limit; client-side throttling.
**Rationale**: Granular limits per tenant, integrates with existing Redis infra, returns 429 with `Retry-After`.

## Data Flow

Client → Next.js Proxy (auth passthrough) → Go API Gateway `/api/v1`
→ Middleware: RequestID → Logger → RateLimit → TenantContext → Authenticate → RBAC
→ Handler DTO → Application Use Case → Domain Aggregate → Repository Interface
→ Infrastructure: Turso Repository → Domain Events → NATS
Response flows back via same chain with `API-Version: v1` header.

    Web/Mobile Client ──→ Next.js Proxy ──→ Go Fiber Gateway
                         │                    │
                         └────── Fallback ──────┘
                                      ↓
                         Domain Layer ← Application Layer ← API Layer
                                      ↓
                         Infrastructure → Turso/Redis/NATS

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/api/internal/interfaces/http/router.go` | Modify | Mount `/api/v1` group with middleware chain |
| `apps/api/internal/middleware/auth.go` | Create | Clerk JWKS validator, claims extraction, RBAC |
| `apps/api/internal/middleware/ratelimit.go` | Create | Redis token bucket, per-user/org/IP limits |
| `apps/api/internal/domain/membership` | Create | Aggregate, repository interface, events |
| `apps/api/internal/domain/training` | Modify | Session CRUD, aggregate root |
| `apps/api/internal/domain/analytics` | Create | Dashboard summary query handler |
| `apps/api/internal/domain/community` | Create | Posts/comments domain |
| `apps/api/internal/domain/nutrition` | Create | Meal logs, macros |
| `apps/api/internal/domain/store` | Create | Products/cart domain |
| `apps/web/app/api/[...proxy]/route.ts` | Create | Thin proxy with JWT passthrough and 404 fallback |
| `apps/web/src/features/shared/api/client.ts` | Modify | Prefer Go API URL, fallback logic |
| `apps/mobile/src/infrastructure/api/client.ts` | Modify | Point to `/api/v1` base URL |

## Interfaces / Contracts

**API Versioning**: All public endpoints under `/api/v1/*`. Responses include `API-Version: v1`. Legacy unversioned routes return `Deprecation: true`.

**Auth**: `Authorization: Bearer <Clerk JWT>`. Middleware validates signature via JWKS, extracts `sub`, `org_id`, `role`. Returns 401 for invalid, 403 for RBAC failure.

**Rate Limit Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After` on 429.

**Error Format**: `{ error: { code, message, details[] }, request_id }`

**Example Contract**:
```
GET /api/v1/coach/dashboard/summary
Auth: Coach role
Response 200:
{
  roster_metrics: {...},
  upcoming_appointments: [...],
  needs_attention: [...]
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Domain aggregates, value objects, validators | `go test ./internal/domain/...` |
| Integration | Repository SQL, JWT middleware, rate limiter | Fiber test, Redis mock, Turso test DB |
| E2E | Proxy fallback zero-404, parity contracts | Playwright against Next.js + Go, contract snapshots |

## Threat Matrix
N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary changes.

## Migration / Rollout
Phase 1: Foundation middleware + router. Feature flag `GO_API_PROXY_ENABLED`. Phase 2: Migrate critical flows coach dashboard, athlete workout/session, membership, events, notifications with contract tests. Phase 3: Enable proxy for web/mobile, monitor latency and error rates. Phase 4: Remove duplicated Next.js business logic after parity confirmed. Rollback: disable proxy flag, revert client to Next.js routes.

## Open Questions
- [ ] Final rate limit thresholds per endpoint tier (general vs sensitive)?
- [ ] Exact deprecation sunset date for legacy `/api/*` routes?
- [ ] Mobile client migration window overlapping iOS release?
