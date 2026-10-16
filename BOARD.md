# Team Board

## Review (team pipeline)
- [ ] T-014: Verify challenge visibility in mobile home tab | **MANUAL VERIFICATION**: Code path confirmed — TodayScreen uses GET /athlete/challenges/active (joins coach_athlete_links, filters status='active' AND expires_at > now), ChallengeHomeCard renders title/exercise_type/countdown, navigation to ChallengeDetailScreen works | **BLOCKER**: No active challenge in Turso DB for linked coach-athlete pair (ch-20261010022004 404 = not in DB) | Coach must create + activate (Play ▶) challenge in web → status='active' + expires_at='2026-10-30T23:59:59Z' | Device QA pending active challenge creation

## Review (team pipeline)
- [ ] T-009: Exercise demo video not visible on athlete mobile | spec `2026-10-12-T-009-T-010...md` | dev-backend A1+A2 + dev-react-native B1 done | code-reviewer PASS, security-hacker PASS | go build/test green, mobile 345/345 | **A3 data repair APPLIED + verified** (AC-5 orphans=0, AC-6 idempotent) b9e1004 | QA device BLOCKED-at-signin (needs Maestro creds env)
- [ ] T-010: Athlete profile edit 422 | dev-react-native done (route name→PUT /users/me, athlete fields→PUT /athletes/me, RMW merge, human 422s) | code-reviewer PASS, security-hacker PASS | mobile 345/345 | QA device pending sign-in
- [ ] T-011: Clerk refresh token | architect spec `2026-10-13-T-011-clerk-refresh-token.md` (Go needs NO JWT template — verified) | dev done (token-change guard, null-token → signOut, AppState logging); review loop 1: fixed spurious-signout catch | needs device E2E (session fresh >1h)
- [ ] T-012: Exercise video UX (thumbnail → fullscreen modal, 4 states, lazy mount) | design spec `2026-10-13-T-012-exercise-video-ux.md` | implemented + coordinator-fixed wiring bug | needs device validation
- [ ] T-013 (live bug): set logging 404s | root cause: mobile hit nonexistent `/athletes/sessions/:id/sets` | fixed → `/workouts/:workoutId/sets` (1-based setIndex, sec→duration), complete carries durationSeconds, dead /progress call removed | security loop: 2 IDORs patched server-side | mobile 345/345, go green | needs device E2E

## Done
- [x] T-015: Mobile app no arranca (iOS Simulator) — `[runtime not ready]: ReferenceError: Property 'layout' doesn't exist`
  - **FIX APLICADO (dev-react-native, 5 archivos sin commitear)**: `AthleteTodaySummary.tsx` + `layout` import; `tokens.ts` restore `tokens` aggregate; `NutritionScreen`/`ProgressScreen`/`StoreScreen` + `shadows` import. jest 353/353. App lanza en iPhone 17 sim sin `runtime not ready`. Maestro Hoy-tab render verificado (screenshot en state/reports/t015-today-renders.png).
  - **QA PASS** (worker_done succeeded). **USER GATE: aprobado por @user** → Done

## Review
- [ ] T-026: Rediseño UI/UX membresía móvil (pantallas profesionales y claras) — IMPLEMENTADO (sin commitear)
  - `MembershipScreen`, `PaymentScreen`, `MembershipCheckScreen`, `MembershipPurchaseScreen`, `ProfileScreen` (días restantes + vencimiento)
  - `navigation/Navigation.tsx` (rutas agregadas), `screensTexts.ts` (textos), 5 componentes nuevos
  - tsc limpio, jest 353/353. **Pendiente QA device real con Maestro** antes de Done.
  - roles: dev-react-native → qa → code-reviewer → security-hacker → USER GATE

## In Progress
- [ ] T-027: Bloqueo de acceso a app hasta membresía activa + flujo de pago MercadoPago
  - **Architect plan DONE**: `docs/superpowers/plans/T-027-membership-gate-payments.md`
  - **Hallazgos críticos**: MembershipGate NUNCA bloquea (envelope-parsing bug, fail-open); PaymentScreen usa Polar legacy (no MP); membershipService.ts usa 4 endpoints fantasma (404); Go API YA tiene flujo MP completo sin usar; NO hay backend enforcement en rutas de training; Bold = cero código en apps/api.
  - **Scope confirmado por @user**: MercadoPago solo.
  - **Fases**: A (dev-backend: endpoint status + middleware RequireActiveMembership + tests + docs) → B (dev-react-native: gate fail-closed + PaymentScreen a MP + rewire service) → C (qa → code-reviewer → security-hacker) → USER GATE.
  - **Do NOT touch**: DB schema/migrations, RLS, auth/session/Clerk, PKCE, env secrets, producción.
  - **Preservar**: T-026 redesign sin commitear en apps/mobile.


  - `ProfileScreen.tsx` — muestra días restantes junto al plan (consulta `/athlete/membership` desde frontend)
  - `navigation/Navigation.tsx` — agregadas rutas `MembershipCheck`, `MembershipPurchase`, `MembershipPlansList` a `RootStackParamList`
  - `src/shared/i18n/screensTexts.ts` — agregado `eventsMembershipTexts` al spread (claves `membershipScreen.*`, `paymentScreen.*`)
  - Nuevos componentes: `MembershipHeroCard`, `MembershipStatusBadge`, `MembershipSkeleton`, `NoMembershipState`, `PaymentHistoryList`
  - **Do NOT touch**: pago Bold/MercadoPago, webhooks, contratos Go API, auth/sesión, RLS, DB.
  - **QA pendiente** (T-015 QA todavía corriendo, no interferir)

- [ ] T-015: Mobile app no arranca (iOS Simulator)
  - **ROOT CAUSE (coordinator, reproducido 2026-10-15)**: cambios SIN COMMITEAR en working tree. `apps/mobile/src/features/training/presentation/screens/AthleteTodaySummary.tsx:225` usa `layout.heroPadding` pero importa solo `{ colors, spacing, radius, typography }` → `StyleSheet.create` a nivel módulo evalúa antes de que exista el binding → crash en bootstrap. Segunda regresión: `src/shared/theme/tokens.ts` eliminó `export const tokens = {...}` y `export default tokens`, y `src/features/ai/presentation/screens/AiWorkoutScreen.tsx:7` sigue importando `{ tokens }` (TS2305).
  - **Evidencia**: `npx expo run:ios` → log Metro: `[React] [runtime not ready]: ReferenceError: Property 'layout' doesn't exist`. Bundle OK (HTTP 200, 15.9MB), jest 353/353 PASS → defecto es de evaluación de módulo, no de tipos ni de bundling.
  - **HALLAZGO A (separado, no bloquea)**: `npm run typecheck` está ENMASCARADO. `tsconfig.json:9` usa `baseUrl` → error TS5101 y tsc aborta diagnósticos: reporta 1 mensaje y sale 0. Con `--ignoreDeprecations 6.0`: 1570 errores (256 fuera de `__tests__`), incl. `useClerkAuth.ts` (`ClerkUser`, `nav`, `navigate` no definidos), `MediaPipePoseRuntime.ts` (firma `detect` ≠ `PoseRuntime`, mal uso de `TfliteModel`), `StyleSheet.absoluteFillObject`. Decisión pendiente: fix mínimo vs. task aparte de deuda.
  - **Do NOT touch**: datos mock/API/auth, `docs/Phase.md` y `docs/mobile-app-ui-audit.md` (contienen afirmaciones falsas: `layout` "no bloqueante", `src/theme/field.ts` inexistente, `layout.ts` inexistente).
  - roles: dev-react-native → qa (device validation obligatoria: Maestro)

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
- [ ] T-017: Alianzas Phase D — operaciones, reservas, tickets QR (migración 023, ally_operations/ally_operation_items/ally_redemptions, CRUD con ownership, RBAC RequireAlly/RequireAthlete, redención atómica anti-replay, concurrencia, pruebas IDOR). Commit d12f237 en main, go build/test green. Cerrada, Fase E autorizada. R7 = relationship_id obligatorio + status active al crear (verificado en pruebas). R8 = sin decisión de interfaz móvil; solo mecanismo de dominio/backend implementado (sin lib QR nativa).
- [ ] T-018: Alianzas Phase E — declaraciones de pago, revisión y comisiones (migración 024 ally_payment_declarations + 025 commission_entries/financial_adjustments, versionado H-03, flujo de revisión confirmed/rejected, cálculo de comisión con rate_bps + fixed_amount_cents, redondeo half_up, overflow check, UNIQUE(operation_id), auditoría en misma tx, pruebas IDOR/concurrencia/idempotencia). R6 resuelto per spec: declared="declarada, no verificada", confirmed=revisión explícita.

## Done
- [x] T-018: Alianzas Phase E — declaraciones de pago, revisión y comisiones (commit 166b50a en main, go build/test green). Cerrada, Fase F autorizada.
- [x] T-019: Alianzas Phase F — liquidaciones mensuales y pagos externos (migración 026 coach_settlements/settlement_items/settlement_documents/coach_payment_records, máquina de estados H-10, job mensual idempotente con APP_TIMEZONE=America/Bogota, pagos externos coach_payment_records H-09, documentos borrador, auditoría H-05, pruebas idempotencia/concurrencia/IDOR/máquina de estados). Commit pendiente. R4 resuelto: APP_TIMEZONE default America/Bogota.

## In Progress

## Done
- [x] T-003: mobile UI/UX hygiene S1–S5 — spec `2026-10-12-T-003-mobile-uiux-design.md` | S1–S5 + fix loop 1 (096cf7c) | qa PASS | code-reviewer PASS | security PASS | approved by @user 2026-10-12 (PASS WITH LIMITATIONS: validación real en dispositivo pendiente — ticket aparte)
- [x] T-002: expo-av→expo-video migration — dev PASS → qa PASS → review PASS → security PASS — approved by @user 2026-10-12 — PR #2 merged (fd4524b)
- [x] T-001: iOS bundle fix (missing expo-localization) — QA PASS — approved by @user 2026-10-12 — PR #1 merged (5b8aa97)