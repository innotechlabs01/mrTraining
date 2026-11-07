# BUILD11-B4 — Manual Test Readiness Guide (Payments Availability + Error Mapping)

Date: 2026-11-06
Scope: Preparatory guidance only. No sandbox payments have been executed. No QA/production changes.

## Environment prerequisites
- Repository on branch `dev`, local checkout preserved. Do not run commits/pushes.
- Go API: use local PostgreSQL and local config only (`DATABASE_URL` local). No QA/prod credentials.
- Web: `pnpm dev` locally (`apps/web`).
- Mobile: local emulator/simulator only.
- Required env vars for tomorrow (verify locally, never commit secrets):
  - `WOMPI_PUBLIC_KEY`
  - `WOMPI_PRIVATE_KEY`
  - `WOMPI_INTEGRITY_SECRET`
  - `WOMPI_EVENTS_SECRET`
  - `WOMPI_ENV` (expected `sandbox` for manual tests)
  - `WOMPI_WEBHOOK_URL`
  - existing Clerk keys and local app URL.

## What is implemented locally
- B1 Wompi payment checkout flow:
  - `POST /api/v1/payments/cart/preference`
  - `POST /api/v1/payments/membership/preference`
  - `GET /api/v1/payments/orders/:id`
  - `POST /payments/webhook`
- B4A availability gate:
  - `GET /api/v1/payments/availability`
- B4 centralized EXC payment error mapper:
  - package `internal/application/payment`, constants/codes and `MapEXCError`.
  - full unit test coverage for `errors.go`.

## Claim status (truthful)
- No sandbox transaction has been executed by this preparatory step.
- No live Wompi credentials are present in the repository.
- No production/QA validation is claimed.
- A human with sandbox credentials must perform tomorrow's manual tests.

## Manual test checklist for tomorrow
1. Availability gate
   - Start API locally and call `GET /api/v1/payments/availability`.
   - Confirm response has `checkout_allowed`, `fail_closed`, and per-medium `media` statuses.
   - Simulate statuspage unavailable only in isolated tests, not by editing repo config.
2. Web checkout availability
   - Open payment modal.
   - Verify blocked banner/outage list renders when `checkout_allowed=false`.
   - Verify pay CTA disabled in blocked/outage conditions.
3. Mobile checkout availability
   - Membership purchase and payment screens gate checkout and show disabled CTA/toast.
   - Cart checkout CTA disabled during availability outage.
4. Cart checkout precondition (no real payment)
   - Empty cart returns centralized EXC_001 (400 + message).
   - Invalid quantity returns EXC_002 (400).
   - Unknown product returns EXC_008 (404).
5. Webhook (synthetic payload only, local)
   - Validate signature rejects invalid signatures via EXC_018? (webhook path).
   - Do not send real financial data or production webhooks.
6. Error mapping
   - Run `go test ./internal/application/payment/...`.
   - Confirm 100% coverage of `errors.go`.

## Commands
```bash
cd apps/api
go build ./...
go vet ./...
go test ./internal/application/payment/... -cover
cd ../web
pnpm build
pnpm test
cd ../mobile
npx tsc --noEmit
npm test
```

## Not ready / blocked items
- Real sandbox Wompi execution requires credentials and dashboard enablement.
- Local automated B4 close coverage was extended with simulated Wompi HTTP fixtures; state remains PARTIAL/BLOCKED until a real signed webhook is obtained.
- B3 third-party payouts remain blocked (no provider adapter/credentials).
- No database migrations were created or applied in this step.
