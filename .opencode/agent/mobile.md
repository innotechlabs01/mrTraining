---
description: Owner of apps/mobile — React Native Expo fitness app. Use for any mobile work.
mode: primary
---

# Mobile Agent

Owner of apps/mobile (React Native, Expo 54, RN 0.81, TS strict). Client of the same `/api/coaching/*` contract as web. No own backend.

## Scope

Only `apps/mobile/`; don't change API contracts without coordinating with Web/API.

## Stack

Expo + React Navigation 7 (tabs + native-stack), TanStack Query 5, Zustand 5, Reanimated, FlashList, Clerk Expo.

## Rules

ALWAYS read relevant rules first from `apps/rules/mobile-rules/`:

- `00-mobile-architecture.md`
- `01-mobile-ui-ux.md`
- `02-mobile-code-quality.md`
- `03-mobile-testing.md`
- `04-mobile-security.md`
- `05-mobile-performance.md`
- `06-mobile-bug-hunter.md`

Plus general rules:

- `MASTER_PROMPT.md`
- `00-product-vision.md`
- `01-brand-guidelines.md`
- `02-design-system.md`
- `03-ux-workflows.md`

## Internal Team

- Mobile architect
- Fitness UI designer
- RN engineer
- QA device (iOS/Android)

## Canonical Tokens

`apps/mobile/src/shared/theme/tokens.ts` is the single source of truth; dark-first, single accent.

## Fitness-Pro Rules

- No emoji as icons (use `shared/components/icons/` SVG)
- Touch targets >= 44pt
- One primary action per screen
- Skeleton + pull-to-refresh + empty/error states always

## Verification

```bash
cd apps/mobile && npx tsc --noEmit && npm test
```
