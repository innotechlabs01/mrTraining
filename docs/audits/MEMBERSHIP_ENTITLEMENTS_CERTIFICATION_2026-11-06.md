# Membership Entitlements Certification — 2026-11-06

Status: COMPLETE (minimal backend-authoritative enforcement + tests)
Scope: Audit of membership access/entitlements in Go API, web, and mobile. No payment, B3, Build10, migration, commit, push, or deploy changes.

## 1. Existing status rules (source of truth)

Backend domain (`apps/api/internal/domain/membership/membership.go`, `RecalculateStatus()`):

- Status values: `active`, `trial`, `past_due`, `cancelled`, `expired` (plus `none` at gate).
- `cancelled` is never auto-updated.
- If today <= period end -> `active`.
- If today <= payment due date -> `past_due` (grace window, default 5 days).
- Otherwise -> `expired`.

Access rule (`RequireActiveMembership`):

- Allowed: `active`, `trial`, `past_due`.
- Denied: `expired`, `cancelled`, `none`, any unknown/empty status.
- Fail-closed on AppError (including "not found") and infra errors -> 403/500, never allow.

## 2. Audit findings

### Backend

- `RequireActiveMembership` middleware is applied to training routes (`/athletes/today`, `/workouts/*`, `/progress`, `/progress/summary`, `/athletes/sessions`), excluding non-training and payment/membership recovery routes.
- `GET /athletes/membership/status` intentionally remains ungated so blocked athletes can recover; API rule updated to reflect `RequireAthlete`, never `RequireActiveMembership`.
- `GetMembershipStatus` handler computes `hasActiveMembership` via backend status whitelist.
- `IsInGracePeriod` was incorrectly derived from `GracePeriodDays > 0`; changed to the actual grace state (`status == "past_due"`).
- `MembershipStatusReader.GetMembershipStatus` now derives `hasActiveMembership` solely from backend status, not a loose exclusion check.

### Web

- Athlete membership proxy no longer assumes `grace_period`/`suspended` client statuses that the Go API never emits; payable statuses now map to backend-emitted `past_due`, `expired`, `cancelled`.
- Coach users page recognizes backend status `past_due` in addition to legacy `grace_period`.

### Mobile

- `MembershipStatus` and gate state now include backend statuses `cancelled` and `expired`.
- Gate explicitly blocks `cancelled` and `expired` through the existing payment-recovery screen (fail-closed already covered network/API errors).
- Gate still allows `active`, `trial`, `past_due`; `none`/`no_membership` and unknown statuses remain blocked.

## 3. Changes made

- `apps/api/internal/interfaces/http/handlers/membership.go` — grace-period derivation fixed.
- `apps/api/internal/middleware/membership.go` — access boolean derived from status whitelist.
- `apps/api/internal/interfaces/http/handlers/membership_grace_test.go` — handler tests for grace and active states.
- `apps/web/src/app/api/athlete/membership/route.ts` — backend status alignment for `isPayable`.
- `apps/web/src/app/(app)/coach/users/page.tsx` — backend `past_due` status alias.
- `apps/mobile/src/features/auth/services/membershipService.ts` — status union expanded.
- `apps/mobile/src/features/membership/presentation/MembershipGate.tsx` — gate blocks backend inactive statuses.
- `apps/rules/08-api-specification.md` — status endpoint gate annotation corrected.

## 4. Verification

- `go test ./internal/middleware/... ./internal/interfaces/http/handlers/...` -> PASS.
- `go build ./...` -> PASS.
- Mobile `npx tsc --noEmit` and `npm test` -> PASS.
- Web `npx tsc --noEmit` -> PASS.

## 5. Remaining/non-goals

- No payment, MercadoPago, Bold, B3, or Build10 modifications.
- No database migrations or schema changes.
- Mobile payment flow files left untouched.
- No commit, push, or deploy performed.
}