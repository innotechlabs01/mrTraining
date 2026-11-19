# Build11-B4 Wompi Checkout Certification (2026-11-06)

Status: **PASS WITH LIMITATIONS** (sandbox, no production/QA).

## Environment state

- API env loaded from `apps/api/config/.env.local`.
- `APP_ENV=development`, `WompiEnv=sandbox`.
- Wompi keys: public/private/integrity/events **present** (values redacted); `WompiWebhookURL` **missing**.
- Clerk secret key **present**.
- Database: `postgres-mr-training-migration` (postgres:17, 127.0.0.1:5435), database `mr_training_migration`, role `postgres`.
- Clerk test users available (5); temporary session JWT minted only for route/auth exercise.
- Local test data:
  - `athlete_memberships`: 0 rows (0 with `plan_price > 0`)
  - `coach_athletes`: 0 rows
  - `membership_payments`: 0 rows
  - `coach_athlete_links`: 7 rows
  - `athlete_profiles`: 18 rows
- Sandbox host check (before fix): adapter used `api-sandbox.co.wompi.co` (**NXDOMAIN**), production used `api.co.wompi.co` (also non-resolving in this env path). Correct hosts are `sandbox.wompi.co` and `production.wompi.co`.

## Implementation corrections made during certification

1. `apps/api/internal/infrastructure/subscription/wompi/adapter.go` base URLs corrected to `https://sandbox.wompi.co/v1` / `https://production.wompi.co/v1`.
2. Checkout URL now falls back to `https://checkout.wompi.co/l/{payment_link_id}` because Wompi `payment_links` response has no `permalink` field. This allowed a real sandbox payment link to be created.

No migrations, commits, or pushes were performed.

## Tests and checks executed

1. `go build ./...` — pass.
2. `go vet ./...` — pass.
3. `go test ./internal/application/wompiavailability/` — 5 tests pass:
   - all operational checkout allowed;
   - API down fail-closed;
   - invalid JSON fail-closed;
   - media down degrades but checkout allowed;
   - cache behavior.
4. `go test ./internal/application/payment/` — pass.
5. `go test ./internal/infrastructure/subscription/wompi/` — no test files.
6. Endpoint exercise: in-memory Fiber app with valid Clerk test JWT and tenant context called `GET /api/v1/payments/availability` — HTTP 200. Result: `gate_known=true`, `checkout_allowed=true`, `reason=ok`, `unresolved_incidents=0`, all 13 Wompi media operational (API and checkout operational).
7. Sandbox API proof: adapter `CreateCheckout` created a real sandbox payment link for 1500 COP (`test_...`); returned checkout URL under `https://checkout.wompi.co/l/...`.
8. Environment isolation proof: same sandbox private key sent to `production.wompi.co` returned `INVALID_ACCESS_TOKEN`.
9. Wompi statuspage network availability returned `CheckoutAllowed=true`.

## What could not be certified

- **Membership checkout** `CreateMembershipPreference` against a real athlete membership: no `athlete_memberships` rows or paid plans exist in local DB.
- **Cart checkout** `CreateCartPreference` end-to-end through `/api/v1` payments routes was not executed because no product inventory/test order data was certified for this build.
- **Transaction completion**: no payer completed a sandbox payment; no real approved transaction ID was obtained.
- **Webhook absolute proof**: no real Wompi callback was delivered. `WompiWebhookURL` is missing in local env; signature verification was not exercised with a real signed Wompi event; `FetchPayment`/`ProcessWebhook` were not run against a real approved payment.
- **Wompi component status** is a live snapshot and may change after this certification.

## Conclusion

Wompi configuration loads locally with sandbox keys present. Status/availability gating and sandbox payment-link creation now work after correcting the legacy adapter host/URL handling. Absolute certification of a completed sandbox transaction and webhook-driven fulfillment is **not achieved** and remains blocked by missing test membership/payment data and webhook delivery evidence.

## Web/Mobile membership & checkout state handling update (2026-11-06)

### Added living code
1. `apps/api/internal/interfaces/http/routes/routes.go`: registered `GET /api/v1/athletes/membership/status` (backend-authoritative normalized membership state) for Web/Mobile consumption.
2. `apps/web/src/app/api/athlete/membership/route.ts`: treats Go API 404/no-membership as canonical empty state instead of 500.
3. `apps/mobile/src/features/membership/presentation/screens/MembershipScreen.tsx`: removed browser-redirect-as-success assumption; checkout now refreshes backend state and uses informational status because Wompi/webhook is authoritative for activation.

### Tests/checks executed
- `go build ./...` — pass.
- `go test ./internal/application/payment/` — pass (including new backend-authoritative error tests).
- `go test ./internal/interfaces/http/handlers/` — pass.
- `cd apps/mobile && npx tsc --noEmit` — pass.
- `cd apps/mobile && npm test` — 88 suites, 499 tests pass.
- `cd apps/web && pnpm build` — pass.
- `cd apps/web && pnpm test` — 23 suites, 145 tests pass.

### PARTIAL/BLOCKED
- The Wompi webhook registered at `/webhooks/wompi` is handled by the subscription service; membership/cart preference fulfillment is exposed via the separate `/payments/webhook` (legacy MercadoPago-shaped) handler. Full end-to-end webhook-driven activation for Wompi membership/cart payments could not be verified in this session (sandbox, no real transaction; webhook routing/availability evidence missing).
- No real approved transaction or webhook delivery was obtained; automatic activation remains backend-authoritative in code path (`payment.Service.ProcessWebhook` -> `membership.ActivateAfterPayment`) but runtime certification is blocked by missing signed callback.
- Web lint still has pre-existing unrelated warnings/errors in unrelated files and was not changed.
- No sandbox payment was performed; `PASS WITH LIMITATIONS` remains.

## Build11-B4 local automated close update (2026-11-06)

Status: **PARTIAL / BLOCKED for external real webhook; local automated coverage expanded.**

This update does **not** certify a live Wompi sandbox transaction or webhook callback.

### Local automated coverage added/extended

- `apps/api/internal/infrastructure/subscription/wompi/adapter_test.go` (new):
  - simulated HTTP Wompi server only (httptest), no network charges;
  - valid/invalid/malformed webhook signature scenarios;
  - pending/rejected/declined/error/voided transaction status mapping;
  - server-to-server `FetchPayment` with id/reference/amount/currency propagation and mismatch visibility;
  - approved transaction fixtures;
  - invalid/missing checkout link handling;
  - production/sandbox base URL handling.
- `apps/api/internal/application/payment/service_webhook_test.go` (new):
  - valid signature approved membership activation;
  - invalid signature;
  - malformed event body;
  - pending/rejected transaction handling;
  - id/reference mismatch and missing membership id (no silent fulfillment);
  - duplicate webhook idempotency (membership and store paths);
  - out-of-order/delayed notification handling;
  - cart/membership invalid checkout link propagation;
  - empty/invalid cart precondition coverage;
  - amount/currency propagation coverage.
- Existing packages re-run: `payment`, `wompi`, `wompiavailability`, `subscription`, `payment_ledger`.

### Verification

```bash
cd apps/api
go build ./...
go vet ./...
go test ./internal/application/payment/ ./internal/infrastructure/subscription/wompi/ ./internal/application/wompiavailability/ ./internal/application/subscription/ ./internal/application/payment_ledger/
```

Result: all listed packages pass. No migration, commit, push, sandbox payment, or B3 change was performed.

### Still blocked (truthful)

- No real Wompi signed webhook has been delivered or verified.
- No `WompiWebhookURL` is configured in the local certification environment.
- No approved sandbox transaction ID was obtained.
- Membership/cart checkout completion remains uncertified in runtime.
- B3 third-party payouts remain blocked.
- External real webhook evidence is still required before changing this state beyond PARTIAL/BLOCKED.

```
PARTIAL / BLOCKED (external real webhook still outstanding)
```