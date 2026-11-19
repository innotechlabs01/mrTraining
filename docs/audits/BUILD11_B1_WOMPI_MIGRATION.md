# BUILD11-B1 — Wompi Migration (Begin)

Date: 2026-11-06
Scope: Begin migration. Active provider at subscription/config/handler/container level switched to Wompi. Historical Mercado Pago records and legacy code preserved.

## 1. Mercado Pago inventory and classification

### Active (before this change)
- `apps/api/cmd/api/main.go` — instantiated `mercadopagoinfra.NewAdapter` as payment provider; registered `/webhooks/mercadopago`.
- `apps/api/internal/application/payment/service.go` — cart and membership preferences directly call Mercado Pago preferences; webhook verifies MP signature and fetches MP payments.
- `apps/api/internal/interfaces/http/handlers/payment.go` — `/payments/cart/preference`, `/payments/membership/preference`, `/payments/orders/:id`, `/payments/webhook`.
- `apps/api/internal/config/config.go` — Mercado Pago env vars.

### Legacy transferable (retained, not wired as active)
- `apps/api/internal/infrastructure/subscription/mercadopago/adapter.go` — full MP adapter implementation.
- `apps/api/internal/application/payment/service.go` — MP direct HTTP implementation for cart/membership (transfer pending).
- `apps/api/internal/interfaces/http/handlers/payment.go` — MP payment routes (transfer pending).
- MP webhook endpoint registration code remains available but is not mounted.

### Historical data (preserved, no destructive migration)
- DB memberships/payments/subscriptions and provider payment IDs remain readable.
- No schema migration was created or applied.
- Legacy MP provider payment IDs in membership/payment records are retained as historical references.

### Documentation
- `docs/audits/BUILD11_A_MARKETPLACE_PROVIDER_AUDIT.md`
- `docs/audits/BUILD11_B0_WOMPI_GATE_AND_IMPLEMENTATION.md`

### Tests
- `apps/api/internal/application/subscription/service_test.go` — provider-fake based; remains valid for the port contract.

## 2. Changes made

### Config
Added Wompi configuration:
- `WompiPublicKey`
- `WompiPrivateKey`
- `WompiIntegritySecret`
- `WompiEventsSecret`
- `WompiEnv` (default `sandbox`)
- `WompiWebhookURL`

Env vars read:
- `WOMPI_PUBLIC_KEY`
- `WOMPI_PRIVATE_KEY`
- `WOMPI_INTEGRITY_SECRET`
- `WOMPI_EVENTS_SECRET`
- `WOMPI_ENV`
- `WOMPI_WEBHOOK_URL`

### Adapter
New package `apps/api/internal/infrastructure/subscription/wompi` implements `subscription.PaymentProvider`:
- `NewAdapter(cfg)`
- `CreateCheckout` — creates a Wompi payment link and returns permalink.
- `VerifySignature` — verifies Wompi event checksum.
- `FetchPayment` — reads Wompi transaction and maps status.
- `Refund` — best-effort void.

### Container / handler
- `main.go` uses `wompiinfra.NewAdapter(cfg)`.
- `main.go` mounts `/webhooks/wompi`.
- Added `RegisterWompiWebhook` and `RegisterWompiWebhookRoutes`.

### Application
- Webhook parsing supports MP and Wompi notification shapes.
- Notification URL selection prefers `WompiWebhookURL`.

## 3. Verification
- `go build ./...` passed.
- `go vet` targeted packages passed.
- `go test ./internal/application/subscription/...` passed.

## 4. Follow-up / credentials
- Wompi credentials absent; cannot E2E validate.
- Cart/store and membership preference endpoints still legacy MP transfer.
- Webhook dashboard must point to `/webhooks/wompi`.
- No marketplace split/dispersion implemented.

## 5. Continuation — payment flows migrated to Wompi

Date: 2026-11-06
Scope: Remove active Mercado Pago HTTP from `apps/api/internal/application/payment`.

### Changes
- `payment.Service` now uses a `PaymentProvider` port backed by the Wompi adapter.
- `CreateCartPreference` and `CreateMembershipPreference` create Wompi payment links (`/payment_links`) instead of MercadoPago `/checkout/preferences`.
- Public cart/order and membership preference API responses remain compatible (`initPoint` now holds the Wompi permalink).
- `ProcessWebhook` now verifies the Wompi event signature, fetches the Wompi transaction (`/transactions/{id}`), and fulfills cart orders or activates memberships on `approved`.
- Wompi webhook parsing supports `transaction.id` and `data.id` notification shapes.
- Active MP HTTP preference/payment calls, MP preference structs and MP webhook fetch logic removed from payment flow; MP adapter and historical identifiers remain preserved.
- `main.go` injects the shared Wompi adapter into `payment.Service`.
- `bytes`/`io` imports removed; build remains clean.

### Verification
- `go build ./...` passed.
- `go vet ./...` passed.
- `go test ./...` passed.

### Historical data
- No schema migration or destructive data change.
- Existing MP payment/order/membership identifiers remain readable.

### Not claimed
- No marketplace split/dispersion implemented.
- No production/QA validation with live Wompi credentials.
