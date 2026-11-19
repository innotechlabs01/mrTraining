# BUILD11-B4 CLOSE — Error Mapper + Test Readiness

Date: 2026-11-06

## Scope
Preparatory close for Build11-B4 without sandbox payment execution. Centralizes payment EXC error mapping and prepares manual testing guidance. No QA/prod, no commit/push, no migrations, no secrets, no real payments, no B3 transfer.

## Inspected flows
- B1 payment service (`apps/api/internal/application/payment/service.go`): cart preference, membership preference, order polling/webhook.
- B4A availability gate (`apps/api/internal/application/wompiavailability`): fail-closed safe JSON.
- Existing ad-hoc payment errors across create/validate/webhook paths.

## Implemented
- Centralized error mapper:
  - File: `apps/api/internal/application/payment/errors.go`.
  - Constants: `EXC_001`, `EXC_002`, `EXC_008`, `EXC_017`, `EXC_018`, `EXC_019`, `EXC_022` (aliases without underscores included).
  - Mapping table with exact HTTP status and message.
  - APIs: `EXCSpec`, `MapEXCError`, `MustMapEXCError`, `MapPaymentError`, `PaymentErrorMapper`, `KnownEXCCodes`, and `EXCPaymentError`/`PaymentErrorCode`.
- Unit tests:
  - File: `apps/api/internal/application/payment/errors_test.go`.
  - Coverage for `errors.go` is 100%.
- Manual testing guide:
  - `docs/testing/BUILD11_B4_MANUAL_TEST_READINESS_2026-11-06.md`.

## Verification
- `go build ./...`: PASS
- `go vet ./...`: PASS (targeted payment package PASS)
- `go test ./internal/application/payment/... -cover`: PASS, `errors.go` at 100.0%.

## Test readiness
- Web and mobile availability gates from B4A remain unchanged and certified in prior audit.
- Web: `pnpm build` and `pnpm test` (145 tests) PASS from B4A certification.
- Mobile: `npx tsc --noEmit` and `npm test` (499 tests) PASS from B4A certification.

## Limitations and truthful status
- No sandbox or real Wompi payment has been executed.
- Wompi credentials are absent; manual tests cannot run live payments today.
- B3 third-party payouts remain blocked (no adapter/credentials/beneficiaries).
- This preparatory step does not claim QA/production readiness for live payments.

## Remaining follow-up
1. Human runs tomorrow's manual checklist with sandbox credentials.
2. If sandbox succeeds, create/update evidence in a separate audit.
3. B3 remains gated on Wompi enablement + sandbox credentials.