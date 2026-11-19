# Platform Super Admin MVP — Read-Only Vertical Slice (Certified)

Date: 2026-11-06
Status: **CERTIFIED (MVP)** — backend and frontend read-only surfaces implemented; automated auth matrix implemented and passing. No commits or pushes.

## Authorization model
- Identity-based only, from environment allowlist:
  - Env var: `PLATFORM_SUPER_ADMIN_CLERK_ID` (comma/newline-separated Clerk user IDs accepted).
  - Config field: `PlatformSuperAdminClerkID` (raw) plus normalized `PlatformSuperAdminClerkIDs`.
- Application roles (`coach`, `athlete`, `ally`, `admin`, `super_admin`) do not grant platform admin access.
- Middleware: `RequirePlatformSuperAdmin` in `apps/api/internal/middleware/rbac.go`.
- Fail-closed when allowlist is empty.
- Routes are registered under `/api/v1`, behind Clerk `RequireAuth` plus `RequirePlatformSuperAdmin`.
- No role escalation path was added: adding/updating Clerk application roles cannot make a user a platform super admin.

## Backend endpoints
- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/coaches?search=&page=`
- `GET /api/v1/admin/coaches/:id`
- `GET /api/v1/admin/services/health`

## Frontend
- Minimal Next.js read-only page: `apps/web/src/app/(app)/admin/page.tsx`.
- URL: `/admin`.
- Displays aggregated platform counts, coach list, service health. No athlete private data or tenant operational data.

## Implementation files
- `apps/api/internal/interfaces/http/handlers/admin.go`
- `apps/api/internal/interfaces/http/routes/routes.go` (`RegisterAdminRoutes`)
- `apps/api/internal/middleware/rbac.go` (`RequirePlatformSuperAdmin`, `parsePlatformSuperAdminIDs`)
- `apps/api/internal/config/config.go` (`PlatformSuperAdminClerkID`, `PlatformSuperAdminClerkIDs`)
- `apps/api/cmd/api/main.go` (admin wiring, env allowlist)
- `apps/web/src/app/(app)/admin/page.tsx`

## Tests added
- `apps/api/internal/middleware/rbac_test.go`:
  - `TestRequirePlatformSuperAdmin`
  - `TestRequirePlatformSuperAdminAuthMatrix`
- `apps/api/internal/interfaces/http/handlers/admin_auth_test.go`:
  - `TestAdminHandler_AuthorizationMatrix`
  - `TestAdminHandler_UnauthorizedMatrixAllEndpoints`

## Authorization matrix (verified)
| Case | User ID | Role | Allowlist | Expected | Verified |
|---|---|---|---|---|---|
| Anonymous | empty | n/a | allowed-admin | 401 | PASS |
| Athlete | athlete-1 | athlete | allowed-admin | 403 | PASS |
| Coach | coach-1 | coach | allowed-admin | 403 | PASS |
| Unknown | unknown-user | unknown | allowed-admin | 403 | PASS |
| Allowed | allowed-admin | athlete (role ignored) | allowed-admin | 200 | PASS |

## Evidence (commands run 2026-11-06)
- `cd apps/api && go build ./...` → PASS
- `cd apps/api && go vet ./internal/middleware/ ./internal/interfaces/http/handlers/ ./internal/config/` → PASS
- `cd apps/api && go test ./internal/middleware/` → PASS (`TestRequirePlatformSuperAdmin`, `TestRequirePlatformSuperAdminAuthMatrix`)
- `cd apps/api && go test ./internal/interfaces/http/handlers/` → PASS (`TestAdminHandler_AuthorizationMatrix`, `TestAdminHandler_UnauthorizedMatrixAllEndpoints`)
- `cd apps/api && go test ./internal/config/` → PASS
- `cd apps/web && pnpm build` → PASS (`/admin` route present)
- `cd apps/web && pnpm test` → PASS (23 suites, 145 tests)

## Security posture
- Endpoints are read-only.
- Results are aggregated counts plus coach identity/contact fields.
- No athlete private data, memberships PHI, or tenant operational data exposed.
- Database health reporting is dependency-only and does not validate every downstream table.
- Admin data uses existing PostgreSQL pool; no schema/migration changes.
- No external payment flow or Build10/RLS changes were made.

## Limitations
- Middleware unit tests cover identity/fail-closed semantics using Fiber locals; they do not perform live Clerk JWT validation.
- DB-backed admin data is not exercised in handler tests (`nil` DB for authorization matrix); SQL query behavior is not integration-tested here.
- Frontend is minimal read-only surface; no mutation controls.
- Not a complete admin console.
- No automated end-to-end JWT test with real Clerk tokens.

## Boundaries
- No commits or pushes.
- No QA/production access or changes.
- Build10 and closed RLS untouched.
- Env values/secrets are not recorded.
