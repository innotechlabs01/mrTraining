# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- [fe] Banner de periodo de prueba de 5 días con botón "Pagar membresía" y bloqueo del panel del coach al expirar los 5 días sin pago (`CoachLayout`), más badge/CTA de 5 días gratis por plan en `PlansSection` — @frg (PR #53)
- [be] Trial de plataforma para coaches ajustado a 5 días por defecto según el plan seleccionado (`StartTrial`) — @frg (PR #53)
- [be] Fix flujo checkout Wompi QA: `fetchWompiTransaction` respeta `WOMPI_ENV=sandbox`, `HandleVerify` marca `pending_checkouts` como `paid`, `assertPaymentApproved` acepta referencias de Payment Links, `EnsureUser` usa default de `is_active`, y normalización de `/` final en `CORS_ORIGINS` y `WEB_APP_URL` — @frg (PR pending)
- [fe] Componentes compartidos de error boundary, not-found y loading para todas las rutas de la web — @frg (PR pending)
- [fe] Esquemas de validación Zod para formularios de auth (sign-in, sign-up, verificación de código) — @frg (PR pending)
- [fe] Labels explícitos en inputs de formularios de auth (accesibilidad y claridad UX) — @frg (PR pending)
- [fe] sitemap.xml y robots.txt generados dinámicamente; metadata Open Graph, Twitter y alternates de idioma en root layout — @frg (PR pending)
- [fix(web)] Contraste WCAG AA: --text-tertiary y --text-muted corregidos en dark y light mode (erano 3.5:1, ahora ≥4.5:1) — @frg (PR pending)
- [in] Calidad verificada: `tsc --noEmit` limpio, `next lint` sin errores, `next build` exitoso, 268 tests Jest pasando (incluye flujos críticos de login y registro) — @frg (PR pending)
- [fe] Error boundaries personalizados por route group (dashboard, auth, marketing, payment, event, invite, meet, locale, short, uiux) con diseño y copy específicos por sección — @frg (PR pending)
- [fix(web)] Contraste WCAG AA corregido componente por componente: `text-[#6B7280]` (3.5:1) → `text-[#9CA3AF]` (6.2:1) en 36 archivos; `text-text-muted` y `text-muted-foreground` → `text-text-secondary` — @frg (PR pending)
- [feat(web)] Error, not-found and loading pages for marketing and locale routes — @frg (PR pending)
- [be] Endpoint `POST /public/checkouts/:id/verify` para verificar transacciones Wompi (`PENDING`, `DECLINED`, `APPROVED`) y emitir `sign_in_token` de Clerk — @frg (PR pending)
- [fe] Ruta pública `/payment/success` con polling automático, manejo de rechazo Wompi y auto-login transparente con Clerk ticket — @frg (PR pending)
- [db] Migración `431_wearable_oauth_tokens_and_health_sync_fix.sql`: paridad de columnas `platform`/`scope`/`updated_at` en `wearable_oauth_tokens` + índice único idempotente en `athlete_sleep_logs(athlete_id, date, source)` — @dev-database (PR pending)
- [be] Endpoints de consentimiento de IA (`GET/PUT /api/v1/form-metrics/consent`), PRs de running para coach (`GET /api/v1/coach/athletes/:id/running/prs`, `GET /api/v1/athlete/:athleteId/analytics/running/prs`) y detalle de sesión GPS (`GET /api/v1/coach/athletes/:id/running/sessions/:sessionId`) — @dev-backend (PR pending)
- [db] Migración `430_athlete_form_recording_consent.sql` para persistir en PostgreSQL el consentimiento de IA y técnica de los atletas — @dev-database (PR pending)
- [be] Complete nutrition domain (service, PostgreSQL repository, DTOs, handlers, routes `/api/v1/nutrition/*`) — @dev-backend (PR pending)
- [db] Migration `429_nutrition_meal_logs.sql` with RLS tenant isolation policies — @dev-database (PR pending)
- [db] New role: dev-database (Supabase/PostgreSQL expert with RLS focus) — @orca-team (internal)
- [in] Git workflow + changelog rules (15-git-workflow-changelog.md) — @orca-team (internal)

### Changed
- [in] `.githooks/pre-commit`: restaurados checks rápidos de Go API (`go mod tidy`, `go build`, `go test`) y Web (`pnpm lint`, `pnpm build`) junto con `validate-changelog.sh` — @frg (PR #1)
- [in] Limpieza de CI: eliminado `ci.yml` duplicado, limitado `security-review.yml` a PRs hacia `main` / manual y removido `cache: "pnpm"` roto en `dependency-audit` — @frg (PR #1)
- [fe] Fix `fatigue.test.ts`: pasar `FIXED_NOW` a `balanceByMuscle` y `neglectedMuscles` para evitar deriva por `Date.now()` — @frg (PR #1)
- [mo] Fix `useRunningSync.test.ts`: inicializar `globalThis.navigator` en `setOnline` cuando no existe en entorno Node — @frg (PR #1)
- [mo] Actualización de `apps/mobile/plugins/withAndroidFirebaseAppDistribution.js` — @frg (PR #1)
- [mo] `WorkoutExecutionScreen` + `AiWorkoutScreen`: validación de postura y distancia con cámara IA, calificación por semáforo (Bien/verde, Medio/amarillo, Mal/rojo), gating estricto por modal de Términos y Condiciones (`RecordingConsent`) y recuperación de progreso/consentimiento desde PostgreSQL tras actualizaciones de la app — @dev-react-native (PR pending)
- [fe] Coach `AthleteRunningPanel` y `/coach/users/[id]/running/[workoutId]`: integración de workouts de running asignados (prescrito vs real + SSE en vivo) y sesiones GPS libres con gráficas de tendencia semanal, PRs y exportación CSV/GPX — @dev-front (PR pending)
- [be] Persistencia completa de `intervals` y `gpsRoute` en `workout_templates`, `loggedSets` en `GET /api/v1/workouts/:id` y cálculo automático de progreso en PostgreSQL al registrar sets o completar running — @dev-backend (PR pending)
- [in] Fix workflow `.github/workflows/cd-qa.yml` (remoción de `secrets.*` en `env:` global, ejecución de migraciones QA, variables Infisical QA y `APP_PORT=8080` en `Dockerfile`) — @orca-team (PR pending)
- [be] Store `PurchaseResponse` DTO standardized to camelCase (`athleteId`, `productId`, `createdAt`, `total`) matching web/mobile contracts — @dev-backend (PR pending)
- [in] Added dev-database role to orca-team pipeline and 14-team-workflow.md — @orca-team (internal)

### Fixed
- [in] Fix `scripts/migrate-all.sh`: conexión a Supabase QA vía Session Pooler IPv4 (`aws-0-us-east-2.pooler.supabase.com:5432`) y fallo explícito si QA falla — @dev-database (PR pending)
- [be] Fix wearable/health PostgreSQL queries (`health/repository.go`: removidas funciones SQLite `datetime('now')`/`date('now')` y bug `$12`), URLs de Garmin (`?` en lugar de `$10`/`$11` en `garmin_provider.go`) y soporte dual `snake_case`/`camelCase` en `health_data.go` — @dev-backend (PR pending)
- [fe] Fix `trainingApi.getHealth`: ruta `/api/v1/health/*` con normalización de `{metrics, sleepLogs, devices}` para mostrar Apple Watch, Garmin, HRV, RHR, sueño, pasos y VO2max en `AthleteHealthPanels` y badge de dispositivo en `AthleteRunningPanel` — @dev-front (PR pending)
- [mo] Fix `GO_API_PATH_MAP` (`/athlete/running` → `/running`) para sincronizar sesiones de Apple Watch (`/running/sessions/import`) y Garmin (`/running/providers/garmin/sync`) y normalización de métricas de recuperación en `useRecoveryData` — @dev-react-native (PR pending)
- [be] Fix Wompi payment return flow: checkout claim ownership check + StatusPaid guards on MarkFailed/RecoverPayment + coach role written to Clerk publicMetadata — @dev-backend (PR pending)
- [fe] Fix Wompi payment return: redirect_url preservation on sign-in + middleware coach role routing to /coach/plan — @dev-front (PR pending)

---

## [1.0.0] - 2026-XX-XX

### Added
- [fe] Banner de periodo de prueba de 5 días con botón "Pagar membresía" y bloqueo del panel del coach al expirar los 5 días sin pago (`CoachLayout`), más badge/CTA de 5 días gratis por plan en `PlansSection` — @frg (PR #53)
- [be] Trial de plataforma para coaches ajustado a 5 días por defecto según el plan seleccionado (`StartTrial`) — @frg (PR #53)
- [be] Fix flujo checkout Wompi QA: `fetchWompiTransaction` respeta `WOMPI_ENV=sandbox`, `HandleVerify` marca `pending_checkouts` como `paid`, `assertPaymentApproved` acepta referencias de Payment Links, `EnsureUser` usa default de `is_active`, y normalización de `/` final en `CORS_ORIGINS` y `WEB_APP_URL` — @frg (PR pending)
- [be] Endpoint `POST /public/checkouts/:id/verify` para verificar transacciones Wompi (`PENDING`, `DECLINED`, `APPROVED`) y emitir `sign_in_token` de Clerk — @frg (PR pending)
- [fe] Ruta pública `/payment/success` con polling automático, manejo de rechazo Wompi y auto-login transparente con Clerk ticket — @frg (PR pending) - Running / GPS (S0–S11)
- [fe] Running history + detail pages with map, live tracker — @dev-front (PR #?)
- [fe] Running API client + `RunningRouteMap` SSR-safe — @dev-front (PR #?)
- [fe] GPS running detail + live-location endpoint — @dev-front (PR #?)
- [be] Activity import (GPX/TCX/FIT) + Garmin provider + webhook — @dev-backend (PR #?)
- [be] Training AI insights — `GET /workouts/:id/ai-insights` — @dev-backend (PR #?)
- [be] Real analytics repository + routes `/analytics` — @dev-backend (PR #?)
- [be] Running session lifecycle — PATCH/DELETE, GPS batch, rate limit — @dev-backend (PR #?)
- [mo] GPS run recording with offline-first queue — @dev-react-native (PR #?)
- [mo] Workout detail with AI insights on web and mobile — @dev-react-native (PR #?)

### Added
- [fe] Banner de periodo de prueba de 5 días con botón "Pagar membresía" y bloqueo del panel del coach al expirar los 5 días sin pago (`CoachLayout`), más badge/CTA de 5 días gratis por plan en `PlansSection` — @frg (PR #53)
- [be] Trial de plataforma para coaches ajustado a 5 días por defecto según el plan seleccionado (`StartTrial`) — @frg (PR #53)
- [be] Fix flujo checkout Wompi QA: `fetchWompiTransaction` respeta `WOMPI_ENV=sandbox`, `HandleVerify` marca `pending_checkouts` como `paid`, `assertPaymentApproved` acepta referencias de Payment Links, `EnsureUser` usa default de `is_active`, y normalización de `/` final en `CORS_ORIGINS` y `WEB_APP_URL` — @frg (PR pending)
- [be] Endpoint `POST /public/checkouts/:id/verify` para verificar transacciones Wompi (`PENDING`, `DECLINED`, `APPROVED`) y emitir `sign_in_token` de Clerk — @frg (PR pending)
- [fe] Ruta pública `/payment/success` con polling automático, manejo de rechazo Wompi y auto-login transparente con Clerk ticket — @frg (PR pending) - API / Backend
- [be] Secure data migration tool Turso → PostgreSQL — @dev-backend (PR #?)
- [be] Unit tests + improved resilience for data-migrate — @dev-backend (PR #?)

### Added
- [fe] Banner de periodo de prueba de 5 días con botón "Pagar membresía" y bloqueo del panel del coach al expirar los 5 días sin pago (`CoachLayout`), más badge/CTA de 5 días gratis por plan en `PlansSection` — @frg (PR #53)
- [be] Trial de plataforma para coaches ajustado a 5 días por defecto según el plan seleccionado (`StartTrial`) — @frg (PR #53)
- [be] Fix flujo checkout Wompi QA: `fetchWompiTransaction` respeta `WOMPI_ENV=sandbox`, `HandleVerify` marca `pending_checkouts` como `paid`, `assertPaymentApproved` acepta referencias de Payment Links, `EnsureUser` usa default de `is_active`, y normalización de `/` final en `CORS_ORIGINS` y `WEB_APP_URL` — @frg (PR pending)
- [be] Endpoint `POST /public/checkouts/:id/verify` para verificar transacciones Wompi (`PENDING`, `DECLINED`, `APPROVED`) y emitir `sign_in_token` de Clerk — @frg (PR pending)
- [fe] Ruta pública `/payment/success` con polling automático, manejo de rechazo Wompi y auto-login transparente con Clerk ticket — @frg (PR pending) - Features
- [fe] 7-day membership trial — @dev-front (PR #?)
- [fe] Morning readiness check-in — @dev-front (PR #?)
- [fe] Garmin manual sync + mobile bridge + Settings wearables — @dev-front (PR #?)

### Documentation
- [in] Commercial audit for MR Training SaaS monetization — @dev-backend (PR #?)
- [in] Fitness improvement plan v2 closeout (S0–S11 done) — @dev-backend (PR #?)

### Changed
- [in] `.githooks/pre-commit`: restaurados checks rápidos de Go API (`go mod tidy`, `go build`, `go test`) y Web (`pnpm lint`, `pnpm build`) junto con `validate-changelog.sh` — @frg (PR #1)
- [in] Limpieza de CI: eliminado `ci.yml` duplicado, limitado `security-review.yml` a PRs hacia `main` / manual y removido `cache: "pnpm"` roto en `dependency-audit` — @frg (PR #1)
- [fe] Fix `fatigue.test.ts`: pasar `FIXED_NOW` a `balanceByMuscle` y `neglectedMuscles` para evitar deriva por `Date.now()` — @frg (PR #1)
- [mo] Fix `useRunningSync.test.ts`: inicializar `globalThis.navigator` en `setOnline` cuando no existe en entorno Node — @frg (PR #1)
- [mo] Actualización de `apps/mobile/plugins/withAndroidFirebaseAppDistribution.js` — @frg (PR #1)
- [be] gofmt handlers and running service test — @dev-backend (PR #?)

### Other
- [in] Sync pending team changes across api, web, mobile — @dev-backend (PR #?)