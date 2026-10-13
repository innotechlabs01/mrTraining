# Team Board

## In Progress (team pipeline)
- [ ] T-011: Clerk refresh token not working correctly | architect spec `2026-10-13-T-011-clerk-refresh-token.md` — Go API does NOT expect a JWT template (verified); real bugs are mobile-side (401 retry reuses same token, dead session never redirects, AppState swallow) | dev-react-native implementing
- [ ] T-012: Exercise detail video UX/UI | design spec `2026-10-13-T-012-exercise-video-ux.md` (thumbnail → tap → fullscreen modal, 4 states, lazy mount) | dev-react-native implementing

## Review (team pipeline)
- [ ] T-009: Exercise demo video not visible on athlete mobile | spec `2026-10-12-T-009-T-010...md` | dev-backend A1+A2 + dev-react-native B1 done (commits dd8f2d9→7bbb5b8) | code-reviewer PASS, security-hacker PASS | go build OK, mobile 314/314 | QA device validation BLOCKED-at-signin (needs Maestro sign-in flow fix) | A3 data repair (insert-only re-seed) HELD for user approval
- [ ] T-010: Athlete profile edit 422 | dev-react-native B2+B3+B4 done (commit 7bbb5b8) | code-reviewer PASS, security-hacker PASS | mobile 314/314 | QA device validation pending sign-in

## In Progress
- [ ] T-007: Auth flow refactor — single source of truth for session routing | dev+ux-ui complete | qa pending user device test

## Review
- [ ] T-008: MercadoPago cart checkout + orders + stock fulfillment + events chain | architect: skeleton MP era dead code (unmounted, double /v1, fake signature, no fulfillment) | dev: config keys, migration 018 (store_orders/items), store repo +orders (FulfillOrder transactional idempotente), payment service rewrite (cart preference multi-item, MP /checkout/preferences, webhook HMAC x-signature real, fetch payment + fulfill), handler + main wiring (webhook PUBLIC fuera auth, pref/order detrás RequireAthlete), mobile CartSheet → MP browser + polling 6×2.5s, migration aplicada, API 9090 vivo | smoke: pref 401, order 401, webhook 401 firma ✓ | events chain web→api→mobile validada (detail tolera no-registrado, respond crea registro) | tests 288/288 go build OK | membership MP = TODO (necesita catálogo de precios) | qa pending real payment test

## Done
- [x] T-006: Deep link invite persistence — skip InviteAccept for returning athletes with cached code. | architect: check isCodeAccepted in InviteAccept, skip to AthleteTabs if cached, else acceptInvite | dev: added isCodeAccepted to coachCodeCache, InviteAccept checks cache on mount, navigation.replace AthleteTabs if accepted | tests 288/288 pass | expo-doctor clean | qa PASS | code-reviewer PASS | security PASS | approved by @user 2026-10-12

## Done
- [x] T-004: iOS pod install fail — VisionCamera needs NitroImage from nitro-specs repo; repo not found on GitHub. | architect: remove bad source, add react-native-nitro-image, reinstall pods, verify iOS build + camera flow | dev: **pod install PASS** (NitroImage 0.15.2 in Podfile.lock); **xcodebuild PASS** (BUILD SUCCEEDED); npm tests 287/288 pass (1 pre-existing EmptyState test flakiness) | qa PASS | code-reviewer PASS | security PASS | approved by @user 2026-10-12

## Done
- [x] T-005: Expo SDK 54 → 57 upgrade — project incompatible with Expo Go 57; need full SDK migration including React Native 0.81→0.87, expo packages, config plugins, breaking changes per upgrade guide | architect: incremental 54→55→56→57, nitro stack alignment, Hermes v1 memory fix in 57.0.17+, New Arch mandatory | dev-react-native: **expo@57.0.25 + RN 0.86.3 + Hermes 250829098.0.17**; iOS deployment target 16.4; AppDelegate Swift 6 compatibility; xcodebuild BUILD SUCCEEDED; npm tests 288/288 pass; expo-doctor clean | qa PASS | code-reviewer PASS | security PASS | approved by @user 2026-10-12

## Review

## Done
- [x] T-003: mobile UI/UX hygiene S1–S5 — spec `2026-10-12-T-003-mobile-uiux-design.md` | S1–S5 + fix loop 1 (096cf7c) | qa PASS | code-reviewer PASS | security PASS | approved by @user 2026-10-12 (PASS WITH LIMITATIONS: validación real en dispositivo pendiente — ticket aparte)
- [x] T-002: expo-av→expo-video migration — dev PASS → qa PASS → review PASS → security PASS — approved by @user 2026-10-12 — PR #2 merged (fd4524b)
- [x] T-001: iOS bundle fix (missing expo-localization) — QA PASS — approved by @user 2026-10-12 — PR #1 merged (5b8aa97)