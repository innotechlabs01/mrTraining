# Team Board

## Review (team pipeline)
- [ ] T-014: Verify challenge visibility in mobile home tab | **MANUAL VERIFICATION**: Code path confirmed — TodayScreen uses GET /athlete/challenges/active (joins coach_athlete_links, filters status='active' AND expires_at > now), ChallengeHomeCard renders title/exercise_type/countdown, navigation to ChallengeDetailScreen works | **BLOCKER**: No active challenge in Turso DB for linked coach-athlete pair (ch-20261010022004 404 = not in DB) | Coach must create + activate (Play ▶) challenge in web → status='active' + expires_at='2026-10-30T23:59:59Z' | Device QA pending active challenge creation

## Review (team pipeline)
- [ ] T-009: Exercise demo video not visible on athlete mobile | spec `2026-10-12-T-009-T-010...md` | dev-backend A1+A2 + dev-react-native B1 done | code-reviewer PASS, security-hacker PASS | go build/test green, mobile 345/345 | **A3 data repair APPLIED + verified** (AC-5 orphans=0, AC-6 idempotent) b9e1004 | QA device BLOCKED-at-signin (needs Maestro creds env)
- [ ] T-010: Athlete profile edit 422 | dev-react-native done (route name→PUT /users/me, athlete fields→PUT /athletes/me, RMW merge, human 422s) | code-reviewer PASS, security-hacker PASS | mobile 345/345 | QA device pending sign-in
- [ ] T-011: Clerk refresh token | architect spec `2026-10-13-T-011-clerk-refresh-token.md` (Go needs NO JWT template — verified) | dev done (token-change guard, null-token → signOut, AppState logging); review loop 1: fixed spurious-signout catch | needs device E2E (session fresh >1h)
- [ ] T-012: Exercise video UX (thumbnail → fullscreen modal, 4 states, lazy mount) | design spec `2026-10-13-T-012-exercise-video-ux.md` | implemented + coordinator-fixed wiring bug | needs device validation
- [ ] T-013 (live bug): set logging 404s | root cause: mobile hit nonexistent `/athletes/sessions/:id/sets` | fixed → `/workouts/:workoutId/sets` (1-based setIndex, sec→duration), complete carries durationSeconds, dead /progress call removed | security loop: 2 IDORs patched server-side | mobile 345/345, go green | needs device E2E

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
- [ ] T-015: Alianzas Phase B — commit f11246d en main, go build/test green. Cerrada, Fase C autorizada.

## In Progress
- [ ] T-016: Alianzas Phase C — catálogo comercios y servicios (migración 022, ally_products/ally_services, CRUD con ownership ally↔ally, RBAC RequireAlly, pruebas). Invitaciones/accept/perfil pendientes (requieren Clerk Backend API no implementado — decisión abierta).

## Review
- [ ] T-017: Alianzas Phase D — operaciones, reservas, tickets QR (migración 023, ally_operations/ally_operation_items/ally_redemptions, CRUD con ownership, RBAC RequireAlly/RequireAthlete, redención atómica anti-replay, concurrencia, pruebas IDOR). Implementada y testeada, go build/test green. Commit pendiente. R7 = relationship_id obligatorio + status active al crear (verificado en pruebas). R8 = sin decisión de interfaz móvil; solo mecanismo de dominio/backend implementado (sin lib QR nativa).

## Done
- [x] T-003: mobile UI/UX hygiene S1–S5 — spec `2026-10-12-T-003-mobile-uiux-design.md` | S1–S5 + fix loop 1 (096cf7c) | qa PASS | code-reviewer PASS | security PASS | approved by @user 2026-10-12 (PASS WITH LIMITATIONS: validación real en dispositivo pendiente — ticket aparte)
- [x] T-002: expo-av→expo-video migration — dev PASS → qa PASS → review PASS → security PASS — approved by @user 2026-10-12 — PR #2 merged (fd4524b)
- [x] T-001: iOS bundle fix (missing expo-localization) — QA PASS — approved by @user 2026-10-12 — PR #1 merged (5b8aa97)