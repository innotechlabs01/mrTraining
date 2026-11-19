# BUILD11-B4A CLOSE — Frontend Availability Gate Certification

Date: 2026-11-06

## Scope
Frontend integration for `GET /api/v1/payments/availability` in `apps/web` and `apps/mobile`. No QA/prod, no deploy, local only.

## Implemented
- Web:
  - `apps/web/src/features/shared/types/paymentAvailability.ts`: `PaymentAvailability`, helpers `isCheckoutBlocked`, `isMediumOperational`.
  - `apps/web/src/features/shared/api/paymentAvailability.ts`: `paymentAvailabilityApi.get/getPaymentAvailability`.
  - `apps/web/src/features/shared/api/client.ts`: `coachingApi.getPaymentAvailability` client method.
  - `apps/web/src/features/shared/hooks/usePaymentAvailability.ts`.
  - `apps/web/src/components/iron-gym/payment-modal.tsx`: fetch availability on open, blocked banner and per-medium outage list, disabled pay CTA.
- Mobile:
  - `apps/mobile/src/features/payments/paymentAvailability.ts`: service + helpers.
  - `apps/mobile/src/features/payments/usePaymentAvailability.ts`.
  - `apps/mobile/src/features/auth/presentation/screens/MembershipPurchaseScreen.tsx`: gate + disabled CTA + toast.
  - `apps/mobile/src/features/membership/presentation/PaymentScreen.tsx`: gate + disabled CTA + blocked alert.
  - `apps/mobile/src/features/store/presentation/components/CartSheet.tsx`: gate + disabled checkout CTA.

## Medium-aware handling
- Per-medium operational status respected via `media` list; blocked/outage mediums rendered/disabled contextually.
- Overall checkout gated by `checkout_allowed` + `fail_closed`.

## Tests
- Web: `pnpm build` PASS; `pnpm test` PASS (145 tests); new unit test `paymentAvailability.test.ts` PASS.
- Mobile: `npx tsc --noEmit` PASS; `npm test` PASS (499 tests); new unit test `paymentAvailability.test.ts` PASS.
- Baseline lint warnings/errors are pre-existing and unchanged by this change (verified no new errors from changed files).

## Secrets
- No hardcoded secrets. All calls use existing authenticated clients.

## Not touched
- No API/backend, DB, migrations, QA/prod, or deployment artifacts.