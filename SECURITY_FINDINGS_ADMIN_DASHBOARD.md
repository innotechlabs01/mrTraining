# Security Review — Super Admin Dashboard CRM (task_11cfda2ec038)

Verdict: **FAIL** (--outcome failed). At least one HIGH finding exists; critical/high findings always fail.

---

## Attack surface reviewed

| Endpoint | Handler | File:line |
|---|---|---|
| GET /api/v1/admin/dashboard | GetDashboard | apps/api/internal/interfaces/http/handlers/admin.go:176 |
| GET /api/v1/admin/coaches | ListCoaches | admin.go:225 |
| GET /api/v1/admin/revenue | GetRevenueStats | crm.go:42 |
| POST /api/v1/admin/coaches/:id/skip-subscription | ToggleSkipSubscription | admin.go:434 |

Also reviewed (same admin surface): GET/PUT/DELETE /admin/plans/*, GET/PUT /admin/settings*, GET /admin/services/health (admin.go), plus CRM's /admin/coaches/expiring, /admin/coaches/expired, /admin/coaches/:id/payments (crm.go).

---

## Findings

### F-01 (HIGH) — Missing RequirePlatformSuperAdmin on CRM /admin/* routes (broken access control / privilege escalation)

**Location:**
- `apps/api/internal/interfaces/http/handlers/crm.go:23-30` — `CRMHandler.RegisterRoutes` creates `admin := api.Group("/admin")` and registers `GET /admin/coaches`, `/admin/coaches/expiring`, `/admin/coaches/expired`, `/admin/revenue`, `GET /admin/coaches/:id/payments` **without** applying `middleware.RequirePlatformSuperAdmin(...)`.
- Contrast: `apps/api/internal/interfaces/http/routes/routes.go:748-764` — `RegisterAdminRoutes` DOES apply `admin.Use(middleware.RequirePlatformSuperAdmin(allowed...))` (line 750), guarding dashboard, coaches, skip-subscription, plans, settings.
- `apps/api/cmd/api/main.go:187-188` — only `RequireAuth` (Clerk JWT) is applied group-wide to all of `/api/v1/*`; that authenticates but does NOT authorize super-admin.

**Exploitation scenario:** Any authenticated Clerk user (coach, athlete, or any logged-in user) can call `GET /api/v1/admin/revenue` (and the other CRM-only admin paths) and read platform revenue/business financial data (today, this_month, this_year, total, by_month). `/admin/revenue` is in the scoped target list, so this is a direct authorization bypass on a required target.

**Fix:** Apply `middleware.RequirePlatformSuperAdmin(cfg.PlatformSuperAdminClerkIDs)` to CRM's admin group in `crm.go:23-30` (or mount CRM routes under the already-guarded admin group), failing closed when the allowlist is empty. Do not rely on `RequireAuth` alone for super-admin data.

**Severity:** HIGH (OWASP A01 Broken Access Control / privilege escalation exposing platform financial data). Because it requires a valid authenticated session it is not CRITICAL, but it is a clear privilege escalation.

---

### F-02 (LOW) — Raw database error details returned to client in 500 responses

**Location:** `apps/api/internal/interfaces/http/handlers/admin.go:186-219` (`GetDashboard`) and identical patterns across the admin handlers, e.g. `"failed to count coaches: " + err.Error()`.

**Exploitation scenario:** A super admin who triggers a DB error receives an HTTP 500 body containing the raw `database/sql`/pgx error message, which can leak SQL state, column/table names, and query structure (information disclosure aiding further attacks). Endpoint is super-admin guarded so the audience is limited, but schema internals are still exposed to the client.

**Fix:** Return a generic, safe message to the client; log the full `err.Error()` server-side only.

**Severity:** LOW.

---

## Ruled out (verified safe — no exploitation path)

### Injection (SQL / command / template)
Every input path uses parameterized `$1`/`$2` placeholders passed to `db.QueryRowContext`/`QueryContext`/`ExecContext` with `args...`:
- `search` query → `$1` with `"%"+search+"%"` (admin.go:326-327).
- `page`/`limit`/`offset` → ints (`c.QueryInt`, fixed `pageSize=25`) passed as args; placeholder names computed from `len(args)` (admin.go:338-340, 397-399) — not user string concatenation.
- Coach ID param (`c.Params("id")`) → `$1` (admin.go:272, 461, 471-490).
- Dynamic `UPDATE ... SET` in `UpdateAdminPlan` uses a fixed column allowlist + `$N` args (admin.go:640-680).
No command execution (`os/exec`) or template rendering of user input. **No injection vector.**

### Data exposure / athlete PII
Coach table exposes only aggregated counts (`athletes_count`, `memberships_count`, `active_memberships_count`) — never athlete names/identities (admin.go `queryCoaches` uses `COUNT(*)` subqueries, admin.go:345-353). `GetDashboard` returns counts only (`users` table is counted, not enumerated). No PII in logs. **No athlete-identity exposure.**

### RLS coach isolation (migration 427)
Additive super-admin SELECT policies gate on `current_setting('app.current_*', true) = ''` (empty context). Coach-scoped flows (`ListEntriesByCoach`, `GetEntry`) set `app.current_coach_id` via `UoW.Begin` → `set_config('app.current_coach_id', $1, true)` (transaction-local, `apps/api/internal/infrastructure/database/uow.go:127`), so the super-admin policy is false there and coach-isolation policies govern. `AdminHandler` uses `db.DB` with no RLS context set → empty → global read, but reachable only by super admins (`RequirePlatformSuperAdmin`). **Additive policies do not break coach isolation.**

### Secrets / dependencies
- No hardcoded keys, credentials, or secrets added in the diff (searched `secret|api_key|clerk|password|sk_|live_|test_|hardcod`).
- No new Go dependencies (`go.mod`/`go.sum` unchanged). `docker-compose.yml` only adds `PLATFORM_SUPER_ADMIN_CLERK_ID=${PLATFORM_SUPER_ADMIN_CLERK_ID:-}` (defaults empty → fail-closed, secure).

### Frontend `?? → ||` fallback (observation, not a vulnerability)
`apps/web/src/app/(app)/admin/dashboard/page.tsx:221-235` uses `||` so a legitimate backend `0` is replaced with client-computed values. This is data-fidelity/UX, not a security finding; noted for completeness.

---

## Summary

- Guarded & correct: dashboard, coaches list, coach detail, skip-subscription toggle (all behind `RequirePlatformSuperAdmin` via `RegisterAdminRoutes`); all queries parameterized; no athlete PII; RLS additive policies preserve coach isolation.
- Broken: CRM-only admin routes (`/admin/revenue`, `/admin/coaches/expiring`, `/admin/coaches/expired`, `/admin/coaches/:id/payments`) lack `RequirePlatformSuperAdmin` — any authenticated user can read platform revenue (`F-01`, HIGH).
- Low: raw DB errors leaked to client bodies (`F-02`, LOW).

**Verdict: FAIL** — `F-01` is HIGH and always fails. No code was fixed by this review; remediation is the author's responsibility.