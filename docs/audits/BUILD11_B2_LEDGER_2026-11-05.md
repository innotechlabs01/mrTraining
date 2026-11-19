# BUILD11-B2 — Internal-only accounting ledger for Wompi payments

Date: 2026-11-05
Scope: Internal accounting ledger. No disbursement/payout simulation. No production/QA changes.

## Summary
- Added `platform_commission_terms` (versioned platform commission terms) and `wompi_payment_ledger` tables.
- Added `wompi_ledger_adjustments` for refunds/chargebacks/corrections.
- Linked Wompi transaction id to memberships, orders, and commission entries.
- Ledger records gross payment, known processing fee, platform commission, coach net payable, adjustments, payment period, and status.
- Status lifecycle: pending, approved, held, payable, settled, reversed. `settled` only via external third-party confirmation.
- Idempotency/duplicate protection by unique `wompi_transaction_id` and optional idempotency key.
- Cross-coach isolation via RLS policy and coach-filtered repository queries plus transactional UoW support.
- Migration: `apps/api/migrations/postgres/412_wompi_payment_ledger.sql`.

## Packages
- `internal/domain/payment_ledger`
- `internal/infrastructure/payment_ledger`
- `internal/application/payment_ledger`

## Tests
- `go build ./...`, `go vet ./...`, and `go test ./internal/application/payment_ledger/` pass.

## Not claimed
- No payout/disbursement executed.
- No Coach Settlement marked paid automatically.
