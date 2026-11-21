# Plan: Fix two production issues in Super Admin CRM

**Status:** Plan only — no code changes yet  
**Task ID:** task_9cbceed1d894  
**Repo:** mr-training (apps/api, Go 1.25 Fiber)

---

## 1. Root Cause Summary

### Issue 1: POST /api/v1/admin/coaches/coach-001/skip-subscription returns 404

**File:** `apps/api/internal/interfaces/http/handlers/admin.go`, function `ToggleSkipSubscription` (line 443)

**Root cause:** The handler resolves the coach exclusively via:

```sql
SELECT id, email, COALESCE(NULLIF(name, ''), email), is_active
FROM users
WHERE id = $1 AND role = 'coach'
```

where `$1` is the URL path parameter (`coach-001`). If `coach-001` is not a `users.id` (Clerk ID) with `role = 'coach'`, the query returns `sql.ErrNoRows` and the handler returns **404 "coach not found"**. There is no fallback to:
- Look up by `coaches.id` instead of `users.id`
- Look up `users` by email when the ID is not a users.id
- Look up in `coaches` table directly

The comment at line 462 says "El CRM entrega users.id (clerk_id) como id del coach" — but if the frontend sends a non-Clerk identifier (e.g., `coach-001`), the lookup fails.

### Issue 2: innotechlabssas@gmail.com not visible in super admin CRM dashboard

**Root cause A (GetDashboard):** `apps/api/internal/interfaces/http/handlers/admin.go`, `GetDashboard` (line 177) queries `SELECT COUNT(*) FROM coaches` — sources exclusively from the `coaches` table. If the coach has no row in `coaches`, they are not counted.

**Root cause B (ListCoaches):** `apps/api/internal/interfaces/http/handlers/admin.go`, `queryCoaches` (line 331) queries `FROM coaches c` — sources exclusively from the `coaches` table. If the coach has no row in `coaches`, they do not appear in the list.

**Root cause C (Route conflict):** Both `AdminHandler` and `CRMHandler` register `GET /admin/coaches`.
- `AdminHandler.ListCoaches` queries `coaches` table (routes.go:752)
- `CRMHandler.ListCoaches` queries `users WHERE u.role = 'coach'` via CRM repository (crm/repository.go:52) — would find coaches without a coaches row

Admin routes are registered first in `routes_setup.go` (line 396) before CRM routes (line 402), and Fiber uses first-match-wins, so Admin's `ListCoaches` (coaches-table-only) handles all `GET /admin/coaches` requests. CRM's more inclusive query never executes for this path.

**Root cause D (possible, unverified):** Migration 427 adds super admin RLS policies for `users`, `coach_athlete_links`, `wompi_payment_ledger`, `athlete_memberships`, `subscriptions`, `plans` — but **NOT** for the `coaches` table itself. If RLS is enabled on `coaches`, super admin queries to `coaches` would be blocked by RLS since no super admin SELECT policy exists for that table. This needs verification against the live schema.

---

## 2. Plan Document

**Title:** Fix super admin CRM coach visibility and skip-subscription 404  
**Type:** Bugfix + plan  
**Author:** Architect (dispatched worker)  
**Date:** 2026-11-18

---

## 3. Decomposition

### Slice 1: Fix ToggleSkipSubscription 404 (Issue 1)

**File:** `apps/api/internal/interfaces/http/handlers/admin.go`

**Changes:**
1. Extend the coach lookup in `ToggleSkipSubscription` to fall back when `users WHERE id = $1 AND role = 'coach'` returns no rows:
   - First attempt: `users WHERE id = $1 AND role = 'coach'` (current behavior)
   - Fallback 1: `users WHERE email = $1 AND role = 'coach'` (if the passed id looks like an email)
   - Fallback 2: `coaches WHERE id = $1` (look up by coaches.id, then join to users for email/role)
   - Fallback 3: `coaches WHERE lower(email) = lower($1)` (look up coaches by email)
2. If still not found, return 404 "coach not found" (preserve existing behavior for genuinely missing coaches)
3. Once a coachID is resolved, continue with the existing upsert into `coaches` and Clerk metadata update (lines 478-513)
4. All queries must remain parameterized (no string concatenation of user input into SQL)

**Acceptance criteria:**
- `POST /api/v1/admin/coaches/coach-001/skip-subscription` returns 200 when coach-001 exists in users with role coach
- Same endpoint returns 200 when coach-001 exists in coaches table (even if users lookup by id fails)
- Same endpoint returns 404 only when the coach genuinely does not exist in either users (role=coach) or coaches
- Coach isolation preserved: coach-scoped flows unchanged (this is an admin-only endpoint behind `RequirePlatformSuperAdmin`)
- All queries parameterized

**Tests:**
- Unit test: ToggleSkipSubscription returns 200 when user found by id
- Unit test: ToggleSkipSubscription returns 200 when user not found by id but coach found in coaches table
- Unit test: ToggleSkipSubscription returns 404 when coach absent from both tables
- Integration test: full request-response cycle with test database

**Roles needed:** Go engineer (backend), QA (contract testing)

---

### Slice 2: Make dashboard coach listing include coaches without coaches table row (Issue 2)

**Files:**
- `apps/api/internal/interfaces/http/handlers/admin.go` — `GetDashboard`, `queryCoaches`
- `apps/api/migrations/postgres/` — new migration for RLS policy on coaches (if needed)

**Changes:**

**2a. GetDashboard** — The `coaches_count` and related counts source from `coaches` table. Options:
- Option 1: Change `SELECT COUNT(*) FROM coaches` to count from `users WHERE role = 'coach'` (union with coaches for deduplication)
- Option 2: Keep coaches table as source of truth but ensure all coaches have a coaches row (backfill)
- Option 3: Count from `users u LEFT JOIN coaches c ON ... WHERE u.role = 'coach'` to include coaches without coaches rows

**2b. queryCoaches / ListCoaches** — Change the source from `FROM coaches c` to `FROM users u WHERE u.role = 'coach' LEFT JOIN coaches c ...` so coaches without a coaches row still appear. The CRM repository already does this pattern (crm/repository.go:67-75) — the Admin handler should match.

**2c. Route priority** — The Admin `ListCoaches` currently shadows CRM's `ListCoaches`. Either:
- Option 1: Make Admin's `ListCoaches` source from users (so it's as inclusive as CRM's), then the shadowing doesn't matter
- Option 2: Remove the duplicate route registration (keep only one handler for GET /admin/coaches)

**2d. RLS policy for coaches (if RLS is enabled on coaches table)** — Add a super admin SELECT policy on `coaches` similar to migration 427's other tables, in a new migration file (e.g., `429_super_admin_coaches_rls.sql`).

**Acceptance criteria:**
- `GET /api/v1/admin/dashboard` returns correct `coaches_count` including coaches without coaches rows
- `GET /api/v1/admin/coaches` returns coaches that exist in users with role=coach even without a coaches row
- `innotechlabssas@gmail.com` (if role=coach in users) appears in dashboard list
- Coach isolation preserved: admin routes remain behind `RequirePlatformSuperAdmin`, no coach-id filter added
- Super admin CRM remains global (no coach-id filter)
- All queries parameterized
- `RequirePlatformSuperAdmin` guard remains on admin routes

**Tests:**
- Unit test: GetDashboard counts coaches from users when coaches table is empty
- Unit test: ListCoaches returns coaches without coaches rows
- Integration test: dashboard includes coach with users row but no coaches row
- Migration test: new RLS migration applies cleanly on empty database

**Roles needed:** Go engineer (backend), database engineer (migration/RLS), QA (contract testing)

---

### Slice 3: Verification and regression checks

**Changes:**
- Run `go build ./...` and `go test ./...` in `apps/api`
- Verify lint passes
- Verify no coach-scoped flows are broken (coach isolation)
- Verify `RequirePlatformSuperAdmin` still protects admin routes
- Verify all queries are parameterized (grep for string concatenation in SQL)

**Acceptance criteria:**
- `go build ./...` succeeds
- `go test ./...` passes (no regressions)
- Lint passes
- Admin routes still require super admin role

**Roles needed:** Go engineer, QA

---

## 4. Role Assignments

| Role | Responsibility |
|------|---------------|
| **Go engineer (backend)** | Implement Slice 1 (ToggleSkipSubscription fallback lookup), Slice 2a/2b (dashboard/queryCoaches source), Slice 3 (build/test) |
| **Database engineer** | Verify RLS status on coaches table, author new migration if needed (Slice 2d), verify migration 428 coach_code column doesn't conflict |
| **QA (contract testing)** | Write integration tests for both endpoints, verify acceptance criteria, test coach isolation is preserved |
| **Architect** | Review plan, review implementation, approve merge |

---

## 5. Acceptance Criteria (Aggregate)

1. `POST /api/v1/admin/coaches/:id/skip-subscription` returns 200 (not 404) when the coach exists in users with role=coach OR in coaches table, regardless of which identifier is passed (users.id, coaches.id, or email)
2. `POST /api/v1/admin/coaches/:id/skip-subscription` returns 404 only when the coach genuinely does not exist in either table
3. `GET /api/v1/admin/dashboard` `coaches_count` includes coaches that have a users row with role=coach but no coaches table row
4. `GET /api/v1/admin/coaches` lists coaches from users table (role=coach) even without a coaches row — `innotechlabssas@gmail.com` appears if role=coach in users
5. Coach isolation preserved: coach-scoped flows (`/coach/*`, `RequireCoach()`) continue working unchanged
6. Super admin CRM remains global: no coach-id filter added to admin routes
7. All SQL queries are parameterized (no string concatenation of user input)
8. `RequirePlatformSuperAdmin` guard remains on all admin routes
9. `go build ./...` and `go test ./...` pass with no regressions
10. Lint passes

---

## 6. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Changing `queryCoaches` source from `coaches` to `users` may return duplicate rows if a coach has multiple users rows with same email | Medium | Medium | Use `DISTINCT ON (lower(email))` pattern already used in CRM repository (crm/repository.go:67) |
| Changing dashboard count source may inflate counts if users has duplicate coach emails | Medium | Medium | Deduplicate by email in the count query |
| RLS on coaches table may block super admin queries if no policy exists | Low (unverified) | High | Verify RLS status on coaches table before implementing; add migration 429 if needed |
| Backfill of coaches rows for existing users may be needed but is out of scope for this plan | Low | Low | Document as follow-up; the fallback queries handle the missing-row case without backfill |
| Route shadowing between Admin and CRM ListCoaches may cause confusion | Low | Low | After making both handlers source from users, the shadowing is benign; consider deduplicating routes in a follow-up |
| Migration 428 `coach_code` column may interact with coach lookup | Low | Low | coach_code is a new nullable column with default ''; does not affect existing lookups |

---

## 7. Files Touched (Planned)

| File | Change |
|------|--------|
| `apps/api/internal/interfaces/http/handlers/admin.go` | ToggleSkipSubscription fallback lookup; GetDashboard count source; queryCoaches source |
| `apps/api/migrations/postgres/429_super_admin_coaches_rls.sql` | New RLS policy for coaches table (if RLS enabled on coaches) |
| `apps/api/internal/interfaces/http/handlers/admin_test.go` | New tests for ToggleSkipSubscription and ListCoaches (if test file exists; otherwise create) |

---

## 8. Files Deliberately NOT Touched

- `apps/api/internal/interfaces/http/handlers/crm.go` — CRM handler routes remain unchanged; CRM's ListCoaches already queries users table correctly
- `apps/api/internal/interfaces/http/routes/routes.go` — Route registration structure remains; Admin continues to take priority (benign after Slice 2b)
- `apps/api/cmd/api/routes_setup.go` — No route registration changes needed
- `apps/api/internal/middleware/rbac.go` — `RequirePlatformSuperAdmin` remains unchanged
- `apps/api/migrations/postgres/427_super_admin_dashboard_rls.sql` — Existing migration not modified (per rule: never rewrite applied migrations)
- `apps/api/migrations/postgres/428_coach_code_column.sql` — Existing migration not modified
- Any coach-scoped routes (`/coach/*`) — coach isolation preserved

---

## 9. Next Steps (for implementation session)

1. Verify RLS status on `coaches` table (check if `ALTER TABLE coaches ENABLE ROW LEVEL SECURITY` exists in any migration)
2. If RLS enabled on coaches without super admin policy, author migration `429_super_admin_coaches_rls.sql`
3. Implement Slice 1: ToggleSkipSubscription fallback lookup
4. Implement Slice 2a: GetDashboard count source change
5. Implement Slice 2b: queryCoaches source change
6. Implement Slice 3: build, test, lint
7. Review per code-review-and-quality skill; QA signs off on acceptance criteria
8. USER GATE: present evidence to user for approval before merge

---