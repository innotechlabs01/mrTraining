# MR TRAINING — MANUAL TEST PLAN (2026-11-07)

Scope: local/sandbox validation only. No QA/production. No commits/pushes. No real payments; sandbox only when credentials are supplied by a human.

## Environment (names only; no secrets)
- `DATABASE_URL` (local PostgreSQL only)
- `APP_PORT` (default `3001`)
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_GO_API_URL` (local API URL)
- `PLATFORM_SUPER_ADMIN_CLERK_ID` (optional, comma/newline separated)
- Wompi sandbox only: `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`, `WOMPI_ENV=sandbox`, `WOMPI_WEBHOOK_URL`

Local defaults: Web `http://localhost:3000`, API `http://localhost:3001`.

## Known endpoints
- Admin: `/admin` (web), `GET /api/v1/admin/dashboard`, `GET /api/v1/admin/coaches`, `GET /api/v1/admin/coaches/:id`, `GET /api/v1/admin/services/health`
- Payments: `GET /api/v1/payments/availability`, `POST /api/v1/payments/cart/preference`, `POST /api/v1/payments/membership/preference`, `GET /api/v1/payments/orders/:id`, `POST /api/v1/payments/webhook`

## Pre-flight validation
```bash
cd apps/api && go build ./... && go vet ./...
cd apps/api && go test ./internal/middleware/ ./internal/interfaces/http/handlers/ ./internal/application/payment/ ./internal/application/payment_ledger/...
cd apps/web && pnpm build && pnpm test
cd apps/mobile && npx tsc --noEmit && npm test
```

## Test cases
1. Super Admin identity
   - Set `PLATFORM_SUPER_ADMIN_CLERK_ID` to a Clerk user ID.
   - Call admin endpoints with that identity: expect 200.
   - Call with a non-listed identity (including Clerk `super_admin` role): expect 403.
   - Unset env var: all admin requests expect 403.
   - Web `/admin` loads only for allowed identity; shows counts/coach/service health.
2. Build10 isolation status
   - Confirm no further RLS correlation regressions if relevant DB fixture tests are available.
3. B4 availability (web)
   - Open payment modal, call `GET /api/v1/payments/availability`.
   - Verify blocked banner/outage list and disabled pay CTA when `checkout_allowed=false`.
4. B4 availability (mobile)
   - Membership purchase/payment screens and cart gate checkout CTAs with disabled state/toast/alert.
5. Payment preconditions (no real payment without sandbox)
   - Empty cart preference returns EXC_001-style error.
   - Invalid quantity returns EXC_002-style error.
   - Unknown product returns EXC_008-style error.
6. B2 ledger
   - Verify payment ledger tests and endpoints if sandbox payment succeeds.
   - Do not mark Coach Settlement settled without external confirmation.
7. B4 sandbox (human-required)
   - With sandbox credentials and `WOMPI_ENV=sandbox`, execute one cart and one membership checkout.
   - Validate webhook signature and order polling.
   - Record evidence in a separate audit only after success.

## Blocked / not ready
- B3 third-party payouts: no adapter/credentials/beneficiaries; blocked until Wompi enablement.
- Full live/sandbox payment certification requires human-provided credentials and dashboard enablement.
- Local automated B4 coverage now includes a simulated Wompi HTTP server and local fixtures; this does not replace a real signed sandbox webhook. State remains PARTIAL/BLOCKED for external webhook evidence.
- Automated checks for the local B4 close update:
  `cd apps/api && go build ./... && go vet ./... && go test ./internal/application/payment/ ./internal/infrastructure/subscription/wompi/ ./internal/application/wompiavailability/ ./internal/application/subscription/ ./internal/application/payment_ledger/`

## Completion rule
- No PASS claim for real mobile UI or sandbox payment unless actually executed by a human with a real target.
- No commits/pushes, no QA/prod access.
