# Proposal: API Endpoint Consolidation DDD

## Intent
Eliminate duplication of logic between Next.js API routes and Go API. Unify auth/RBAC via Clerk JWT and establish single source of truth in DDD Clean Architecture. Reduce bugs from diverging implementations.

## Scope

### In Scope
- Migrate all web/mobile used endpoints to Go API with parity
- Refactor Go endpoints to DDD Clean Architecture
- Next.js API routes become thin proxy or deprecated in favor of direct Go client calls
- Auth verification via Clerk JWT at edge/proxy
- Rate-limit and v1 versioning from day 1
- Day 1 critical flows: coach dashboard, athlete workout/session tracking, membership, events registration, notifications

### Out of Scope
- SSR-only routes
- Internal webhooks
- Cron tasks

## Capabilities

### New Capabilities
- unified-api-gateway: single Go API entry for web and mobile endpoints
- auth-proxy: Clerk JWT verification with RBAC enforcement at proxy/edge
- rate-limit-v1: versioned API with rate limiting

### Modified Capabilities
- None

## Approach
Prefer rapid coverage with thin proxies for missing endpoints to avoid 404s while building parity in Go. Web client can call Go API directly via existing go client. Auth verified once at edge, forwarded as JWT claims. Existing Go endpoints refactored to domain layers.

## Affected Areas
| Area | Impact | Description |
| apps/web/app/api | Modified | Thin proxy forwarding to Go API |
| apps/backend | Modified | DDD Clean Architecture refactor + new handlers |
| apps/mobile | Modified | Point to unified Go API |

## Risks
| Risk | Likelihood | Mitigation |
| Proxy latency | Med | Cache auth, colocate services |
| Feature parity gaps | High | Proxy fallback + contract tests |
| Auth drift | Med | Central Clerk JWT validator |

## Rollback Plan
Re-enable original Next.js handlers via feature flag. Proxy can bypass to legacy routes. Database schema unchanged.

## Dependencies
- Clerk JWT validation
- Go API client library
- Rate limiter infra

## Success Criteria
- [ ] Zero 404s for critical flows Day 1
- [ ] All web/mobile endpoints reachable via Go API v1
- [ ] Auth/RBAC enforced centrally
- [ ] Proxy latency <50ms p95
