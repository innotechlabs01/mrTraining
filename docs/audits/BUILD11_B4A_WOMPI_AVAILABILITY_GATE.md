# BUILD11-B4A — Wompi Statuspage Availability Gate

Date: 2026-11-05

## Implemented

- Service package: `apps/api/internal/application/wompiavailability`
  - Fetches `status.json`, `components.json`, `incidents/unresolved.json` from `https://wompi.statuspage.io`.
  - Official Colombia component IDs wired:
    - API (Col): `5my08zr85ylh`
    - Checkout (Col): `cc5d2k9wlmgs`
    - Media group: `x63cw46w3kmh` (all child media auto-discovered, including PSE `8ls5k1tsc5k3`, Nequi `tz4kvvt4nk19`, Tarjetas, Bancolombia, Daviplata, etc.)
  - In-memory cache TTL 45s (clamped 30-60s); no statuspage request per HTTP request.
  - Fail-closed on timeout, incomplete/invalid JSON, missing API or checkout component, or non-operational API/checkout.
  - Safe JSON endpoint: `GET /api/v1/payments/availability` registered in `routes.RegisterWompiAvailabilityRoutes`.
  - Backend authority preserved; no DB tables, no payouts, no secrets.
  - Unit tests with simulated statuspage responses: `service_test.go`.

## Gate Methods

- `PaymentCheckoutAllowed() bool`
- `PaymentCheckoutReason() string`
- `Reason() string`
- `CheckoutAllowed() bool`
- `MediumOperational(ref string) bool`
- `MediumAllowed(ref string) bool`
- `MediaStatus() map[string]bool`
- `PerMedium() map[string]bool`
- `Snapshot(ctx) Availability`
- `Known() bool`

## Behavior

- `checkout_allowed = API (Col) operational AND Checkout (Col) operational`.
- Media outage marks `degraded=true` but does not by itself block checkout.
- Unresolved incidents increment `unresolved_incidents` and set `degraded=true`.
- Network/parse failure returns fail-closed snapshot (`checkout_allowed=false`, `fail_closed=true`).
- HTTP handler always returns 200 with safe JSON (no stack traces / secrets).

## Build10 / Health

- No changes to `/health`, `/ready`, Build10 DB/health checks, or payment fulfillment flow.
- No commits made.

## Notes / Limits

- Prometheus metrics not added: no Prometheus dependency is present in `go.mod`; added dependency would violate "do not broadly redesign". If needed later, expose counters around refresh/cache hits via existing observability layer.
- Statuspage is treated as advisory; it is not a substitute for real Wompi transaction verification.
- Does not modify B2/Build10.

## Verification

- `go build ./...`: PASS
- `go vet ./...`: PASS
- `go test ./internal/application/wompiavailability/`: PASS
- `go test ./internal/interfaces/http/handlers/`: PASS