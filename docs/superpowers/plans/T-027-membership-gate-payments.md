# T-027: Membership Gate + Payment Flow (MercadoPago) — Architecture Plan

**Status:** Draft (architect output — awaiting USER GATE via coordinator)
**Target:** `mr-training` checkout on `main` (no branches, no worktrees)
**Date:** 2026-10-16
**Board task:** T-027 — Bloqueo de acceso a app hasta membresía activa + flujo de pago en backend

---

## 1. Problem Summary

The mobile app must block access to training functionality until the athlete has an
active membership, with a real payment flow (MercadoPago) to recover. Today:

| # | Verified finding | Location |
|---|------------------|----------|
| 1 | `MembershipGate` **never blocks**. It parses Go's `{success, data:{...}}` envelope as `data?.data?.[0] ?? data?.membership ?? data`, which resolves to the whole envelope object; `membership.status` is `undefined`, so state falls through to `'active'`. It also only reacts to status `'suspended'`, which the Go API never emits (it emits `active / trial / past_due / cancelled / expired`). API errors fail **open** (`catch → active`). | `apps/mobile/src/features/membership/presentation/MembershipGate.tsx:38-67` |
| 2 | The gate's `PaymentScreen` calls the **legacy Polar** checkout (`POST /polar/checkout`), not MercadoPago. | `apps/mobile/src/features/membership/presentation/PaymentScreen.tsx:10,37` → `features/polar/polarService.ts` |
| 3 | `membershipService.ts` calls **phantom endpoints that do not exist in the Go API**: `/athlete/membership/status/:id`, `/athlete/membership/plans/:id`, `/athlete/membership/purchase`, `/athlete/membership/cancel` (client maps them to `/memberships/status/:id` etc. → 404). Used by `MembershipCheckScreen`, `MembershipPlansListScreen`, `MembershipPurchaseScreen`, `ProfileScreen`. | `apps/mobile/src/features/auth/services/membershipService.ts`, `apps/api/internal/interfaces/http/routes/routes.go` |
| 4 | The **full MercadoPago membership flow already exists** in the Go API and is unused by the gate: `POST /payments/membership/preference` (returns `initPoint`), public signed webhook `POST /payments/webhook` (HMAC `x-signature`, fetches the payment back from MP, idempotent activation), and `membershipService.ActivateAfterPayment` (extends period, mirrors sale to coach dashboard). | `apps/api/internal/application/payment/service.go`, `apps/api/internal/interfaces/http/handlers/payment.go`, `apps/api/internal/application/membership/service.go:149-200` |
| 5 | There is **no backend enforcement** of membership on training endpoints — any authenticated athlete can hit `/athletes/today`, `/workouts/*`, `/progress*` regardless of membership state. | `apps/api/internal/interfaces/http/routes/routes.go` |
| 6 | **Bold**: zero code and zero config in `apps/api`. Only MercadoPago env keys exist (`MERCADO_PAGO_*` in `internal/config/config.go:47-51,99-102`). | `apps/api/internal/config/config.go` |

## 2. Decisions (architect)

1. **Payment provider = MercadoPago for T-027.** The flow is already implemented
   end-to-end in the Go API; the work is wiring + gating. **Bold is a follow-up
   task**: it needs a `PaymentProvider` seam and merchant credentials
   (`BOLD_*` env keys) that do not exist yet. *Open decision: coordinator was asked
   (mercadopago-first vs both vs bold-only) and the ask timed out after ~10 min;
   this plan defaults to mercadopago-first. If the coordinator answers
   both/bold-only, promote Phase D (below) ahead of Phase B.*
2. **Blocking rule (maps Go statuses → gate behavior):**
   - `active`, `trial` → **allow**.
   - `past_due` (inside grace window, `PaymentDueDate` = period end + 5 days) →
     **allow + payment banner** (grace is an existing business rule, `defaultGracePeriodDays = 5`).
   - `expired`, `cancelled`, or **no membership** → **block** with payment screen.
   - Brand-new athlete (no membership yet): blocked, shown "pídele a tu coach que
     te asigne una membresía" state (`NoMembershipState` component exists). The MP
     preference endpoint requires a coach-assigned membership (`404 "no tienes un
     plan asignado"`), so self-serve purchase only works after coach assignment.
3. **Gate fails closed.** API/network error at gate time → blocking retry screen,
   not silent access. (Revenue protection outweighs convenience; retry button +
   optional MMKV cache of last-known-active status is an enhancement, not v1.)
4. **Contract first**: new backend endpoint returns a normalized gate payload so
   mobile stops parsing membership internals.

## 3. Target Contract (new/changed, Go API only)

### 3.1 `GET /api/v1/athletes/membership/status` (NEW, `RequireAthlete`)

Always `200` (never 404) with the normalized gate payload:

```json
{
  "hasActiveMembership": true,
  "status": "active|trial|past_due|expired|cancelled|none",
  "isInGracePeriod": false,
  "daysRemaining": 12,
  "expiresAt": "2026-11-15",
  "membership": {
    "id": "…", "planName": "…", "planPrice": 150000, "billingPeriod": "monthly",
    "currentPeriodStart": "…", "currentPeriodEnd": "…", "paymentDueDate": "…",
    "athleteId": "…", "coachId": "…"
  },
  "membershipId": "…"
}
```

- `membership: null` when none. `hasActiveMembership = status ∈ {active, trial, past_due}`.
- Source of truth: `membership.Service.GetMembership` + `RecalculateStatus()` (existing).

### 3.2 `RequireActiveMembership` middleware (NEW)

- Wraps an athlete route: reads membership via the service; if status ∉
  {active, trial, past_due} → `403` with error code `MEMBERSHIP_REQUIRED`
  (message: "membresía inactiva — renueva para continuar").
- **Applied to (training functionality only, per task):** `GET /athletes/today`,
  `POST /training/sessions` is coach-only (skip), all `RequireAthlete` routes under
  `/workouts`, `/workouts/*`, `/progress`, `/progress/summary`, `/athletes/sessions`.
- **NOT applied (must stay reachable while blocked):** `/memberships*`,
  `/payments/*`, `/athletes/onboard`, `/users/me`, `/notifications*`, `/devices`,
  `/athlete/tickets*`, `/blog`, `/invites/*`.
- Implementation: `internal/middleware/membership.go` taking the membership service
  (or a narrow `MembershipStatusReader` interface) — depends on application layer,
  consistent with Clean Architecture direction used elsewhere.

### 3.3 Existing endpoints (NO changes, consumed by mobile)

- `POST /payments/membership/preference` → `{membershipId, planName, initPoint, total, currency}`.
- `POST /payments/webhook` (public, HMAC `x-signature`; idempotent activation).
- `GET /memberships`, `GET /memberships/:id/payments`.
- `POST /polar/checkout` stays (legacy, out of scope — only de-referenced by mobile).

## 4. Decomposition — Ordered Subtasks

### Phase A — dev-backend (FIRST; contract before clients)

| # | Subtask | Files | Notes |
|---|---------|-------|-------|
| A1 | Gate-status endpoint `GET /athletes/membership/status` (handler + service method + DTO) | `handlers/membership.go`, `application/membership/service.go`, `dto/`, `routes/routes.go` | Always-200 normalized payload per §3.1. Register inside `RegisterMembershipRoutes`. |
| A2 | `RequireActiveMembership` middleware + apply to training routes (§3.2 list) | `middleware/membership.go`, `routes/routes.go` | 403 `MEMBERSHIP_REQUIRED`. Unit tests with fake repo: active/past_due/expired/none/error paths. |
| A3 | Extend existing service tests: status normalization, `ActivateAfterPayment` idempotency regression (already covered — add expired-membership renewal case) | `application/membership/service_test.go` | No DB schema change: payments table already stores MP id in `polar_order_id` column. |
| A4 | Contract documentation in `apps/rules/08-api-specification.md` (new endpoint + 403 code) | `apps/rules/08-api-specification.md` | Rules updated with the code, per contract-first rule. |

**Verify:** `cd apps/api && go build ./... && go test ./...`

### Phase B — dev-react-native (after A merges on main)

| # | Subtask | Files | Notes |
|---|---------|-------|-------|
| B1 | Rewrite `MembershipGate`: call §3.1 endpoint; block on `expired/cancelled/none` and on fetch error (fail-closed retry screen); `past_due` → allow + payment banner; keep `useMembership()` context API | `features/membership/presentation/MembershipGate.tsx`, `infrastructure/api/client.ts` (add `'/athlete/membership/status'` map entry) | Gate is mounted at `src/navigation/Navigation.tsx:134` — no navigation changes needed. |
| B2 | Switch gate `PaymentScreen` from Polar to MercadoPago: `createMembershipPreference()` → open `initPoint` via `Linking`; on `AppState → active`, poll §3.1 endpoint until `hasActiveMembership` → success → pass gate | `features/membership/presentation/PaymentScreen.tsx` | `membershipPayment.ts` already wraps the MP preference call; `useQueryClient` invalidation pattern stays. |
| B3 | Re-wire phantom `membershipService` to real contracts: `getMembershipStatus` → §3.1 (drop `athleteId` param — token identity); purchase → `createMembershipPreference`; remove/deprecate `getAvailablePlans`, `purchaseMembership`, `cancelMembership` (no such Go endpoints; plan catalog does not exist — price lives on the coach-assigned membership) | `features/auth/services/membershipService.ts`, callers: `MembershipCheckScreen.tsx`, `MembershipPlansListScreen.tsx`, `MembershipPurchaseScreen.tsx`, `ProfileScreen.tsx` | Handle preference-404 ("no tienes un plan asignado") → `NoMembershipState`. Preserve the T-026 redesign UI (uncommitted work) — behavior change only. |
| B4 | Jest tests for gate state machine (mock client) + `npx tsc --noEmit` | `__tests__/` in membership feature | Per `apps/rules/03-mobile-testing.md`. |

**Verify:** `cd apps/mobile && npx tsc --noEmit && npm test`

### Phase C — Review pipeline (after B)

1. **qa**: real-device validation (Android emulator/iOS simulator via Maestro MCP when
   available) of: blocked → pay → webhook confirms → gate passes; grace-period banner;
   fail-closed retry. Per repo rule, a mobile task without real-UI validation ends
   `BLOCKED`, not `PASS`.
2. **code-reviewer**: diff vs this plan; naming/structure per `12-coding-standards.md`.
3. **security-hacker** (REQUIRED — payment/webhook code touched): webhook signature
   verification & replay handling, idempotency (no double period extension), 403 bypass
   attempts on training routes, no secrets/PII in client payloads, TLS-only initPoint
   handling.

### Phase D (CONDITIONAL — only if coordinator overrides Decision 1)

Bold provider: extract `PaymentProvider` interface (create-checkout + verify-webhook),
implement Bold adapter behind `PAYMENT_PROVIDER=bold|mercadopago` config, add `BOLD_*`
env keys, second webhook route with Bold's signature scheme. Requires merchant
credentials — flag before dispatch.

## 5. Acceptance Criteria (observable, testable)

1. `GET /api/v1/athletes/membership/status` (athlete token) returns `200` with
   `hasActiveMembership` + `expiresAt`; athlete with no membership → `status:"none"`,
   `membership:null` (not 404).
2. Athlete with `expired`/`cancelled`/no membership calling `GET /athletes/today` or
   any `/workouts*` route → `403` with code `MEMBERSHIP_REQUIRED`. Same call with
   `active` or `past_due` (inside grace) → `200`.
3. `POST /payments/membership/preference` → returns non-empty `initPoint`;
   `404` when no membership; `400` when `plan_price <= 0`.
4. Webhook `POST /payments/webhook` with valid `x-signature` and approved MP payment
   whose `external_reference = "membership:<id>"` → membership period extended exactly
   one billing cycle, payment row recorded, sale mirrored; **replaying the same
   webhook does not extend again**. Invalid/absent signature → rejected, membership
   unchanged.
5. Mobile: with `expired`/`none` membership, `AthleteTabs` is **not** reachable —
   payment screen shows plan name + price; tapping Pay opens the MercadoPago
   `initPoint`; after webhook confirmation and app foreground, the gate passes.
6. Mobile: when the status call fails (network/5xx), the gate shows a blocking retry
   state — no silent pass-through.
7. `go build ./... && go test ./...` and `npx tsc --noEmit && npm test` all green.

## 6. Risks / Do-Not-Touch

- **No DB schema/migration changes** — payments reuse the existing table (MP payment
  id already stored via the `polar_order_id` column by `ActivateAfterPayment`). No RLS changes.
- **No auth/session/Clerk changes, no PKCE/password-recovery changes, no env secret
  values committed** (only new env *names* documented if Phase D activates).
- **Webhook stays public + signature-verified** — never move it inside the Clerk group;
  never trust the notification body for money movements (existing `fetchPayment` pattern).
- **Preserve uncommitted T-026 redesign** in `apps/mobile` — workers must `git status`
  first and touch only files listed in §4; behavior changes, not visual redesigns.
- **Grace-period semantics**: blocking `past_due` users inside the 5-day grace window
  would contradict the existing domain rule — QA must verify grace users keep access.
- **Fail-closed tradeoff**: a Turso outage locks everyone out of training. Accepted
  for v1 (revenue protection); MMKV-cached last-known-active status is the documented
  mitigation path if the user objects at USER GATE.
- Bold is **out of scope** for T-027 unless the coordinator overrides Decision 1.

## 7. Team & Order

```
dev-backend (A1→A4)  →  dev-react-native (B1→B4)  →  qa  →  code-reviewer  →  security-hacker  →  USER GATE
        └── contract-first: B starts only after A lands on main
```

Dispatch on `mr-training` checkout (`--worktree current`), one task per phase, board
`BOARD.md` updated on every transition. Nothing reaches Done without explicit user
approval at the USER GATE.
