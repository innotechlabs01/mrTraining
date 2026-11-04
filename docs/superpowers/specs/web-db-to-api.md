# Web DB → Go API Migration — Architecture Plan

> **Status:** Architecture only. No implementation code.
> **Location:** `docs/superpowers/specs/web-db-to-api.md`
> **Owner:** Web agent + API agent (coordinated contract change)
> **Applies to:** `apps/web/src` (Next.js 14 App Router) → `apps/api` (Go 1.25 + Fiber)

---

## 1. Problema

`apps/web/src/lib/db/*.ts` (25 módulos) y varios archivos de `apps/web/src/lib/` llaman **directamente a PostgreSQL** mediante `pg` Pool (`safeExecute`, `getDB`). Eso infringe la regla API-first (`MASTER_PROMPT.md`, `apps/rules/06-frontend-architecture.md`, `apps/web/AGENTS.md`): el frontend Next.js no debe tocar la base de datos. Toda la comunicación Web→Datos debe ir por el Go API (`apps/api`, fuente de verdad).

Además, los Route Handlers de Next.js (`apps/web/src/app/api/**/route.ts`) están en tres estados mezclados:
1. proxy a Go (`proxyToGo` / catch-all `[...proxy]`),
2. llamada directa a `lib/db` (p. ej. `coach/workout-templates/route.ts`),
3. llamada directa a Go vía `goGet`/`goFetch` (p. ej. `coaching/dashboard/route.ts`),
4. proxy con fallback a legacy (p. ej. `athlete/membership/route.ts`).

Objetivo del plan: migrar **todas** las rutas DB/service de Next.js a endpoints Go, por dominio, con contrato mapeado, cliente API compartido, contexto de tenant/RLS, orden de migración, rollback, pruebas y despliegue seguro. **Sin escribir código de implementación en este plan.**

---

## 2. Alcance y no-alcance

### In scope
- Todos los módulos de `apps/web/src/lib/db/*.ts` (25 archivos).
- Archivos de servicio de `apps/web/src/lib/` que acceden a DB: `coach-isolation-db.ts`, `messages.ts`, `landing-contacts.ts`, `coach-athlete-access.ts`, `landing.ts`, `nats.ts`, `auth-middleware.ts`.
- Todos los Route Handlers de `apps/web/src/app/api/**/route.ts` que consuman `lib/db` o que deban consumir Go API.
- Cliente API compartido de web (`apps/web/src/lib/api/go-client.ts`, `server.ts`, `client.ts`, `proxy-helper.ts`).

### Out of scope
- `apps/mobile/` (React Native): solo se coordina el contrato, no se toca.
- `apps/api/` implementación de handlers/repositorios: el plan define **qué** endpoints Go se necesitan y su contrato; la implementación es tarea del API agent en slices propios.
- Migración de datos: no se mueven datos, solo se cambia el camino de acceso.
- Clerk webhooks en `apps/web/src/app/api/webhooks/clerk/route.ts`: se quedan en Next.js (excepción permitida por `06-frontend-architecture.md`).

---

## 3. Objetivos y criterios de aceptación

| # | Objetivo | Criterio de aceptación |
|---|----------|------------------------|
| AC-1 | Cero acceso directo a PostgreSQL desde `apps/web/src` | `grep -R "safeExecute\|getPool\|getDB\|from 'pg'" apps/web/src` → solo queda en `lib/db/db.ts` por eliminar; ningún importador restante |
| AC-2 | Cada función DB legacy tiene un endpoint Go equivalente | Matriz de contrato 1:1 completada y revisada por API agent |
| AC-3 | Cliente API único y tipado en web | Una sola fuente de llamada a Go (`goFetch`/`goClient` + `serverFetch`), sin llamadas sueltas a `fetch` al Go API |
| AC-4 | Contexto de tenant (RLS) preservado | Cada petición autenticada a Go lleva `Authorization: Bearer <JWT>` + `X-Organization-ID`; Go setea `app.current_organization_id` para RLS |
| AC-5 | Migración por dominio con rollback por fase | Cada fase tiene feature flag, punto de corte y procedimiento de rollback documentado |
| AC-6 | Pruebas de paridad | Cada endpoint migrado tiene test de paridad Go vs respuesta legacy (o contrato) antes de cortar el legacy |
| AC-7 | Despliegue seguro sin downtime | Blue-green / canary, monitoreo de error rate, rollback automático si se supera umbral |

---

## 4. Inventario actual de módulos DB/service de web

### `apps/web/src/lib/db/*.ts` (25 módulos, acceso directo a PostgreSQL)

| Módulo | Dominio | Funciones principales (lectura/escritura) |
|--------|---------|-------------------------------------------|
| `config.ts` | Configuración pública | `getTimeBlocks`, `saveTimeBlocks`, `getPublicPageConfig`, `savePublicPageConfig` |
| `athletes.ts` | Atletas | `getAthletes`, `getAthleteById`, `saveAthlete`, `deleteAthlete`, `getAthleteByClerkId`, `getAthleteAssignedWorkouts`, `getAthleteSessions`, `getAthleteAppointments`, `createAthleteAppointment`, `getCoachAvailabilityForAthlete`, `getCoachAppointments`, `getAthleteAppointment`, `updateAppointment`, `createAppointment`, `getCoachAvailability`, `saveCoachAvailability` |
| `sessions.ts` | Sesiones | (sesiones de entrenamiento) |
| `messages.ts` | Mensajería | `getMessageThreads`, `saveMessage`, `createThread` |
| `dashboard.ts` | Dashboard coach | métricas del dashboard |
| `events.ts` | Eventos | CRUD de eventos |
| `plans.ts` | Planes de suscripción | `getPlans`, `savePlan`, `deletePlan`, `getPublicPlans`, `getAllPublicPlans` (+ `plan_training_modes`, `plan_features`) |
| `tickets.ts` | Tickets de soporte | CRUD de tickets |
| `products.ts` | Productos | CRUD de productos |
| `store.ts` | Tienda aliado | catálogo y compra |
| `payments.ts` | Pagos/membresías | métodos de pago, membresías (`getAthleteMembership`, `createMembership`, `renewMembership`, `cancelMembership`), `recordPayment`, `getPaymentHistory` |
| `blog.ts` | Blog/marketing | artículos del blog |
| `exercises.ts` | Biblioteca de ejercicios | listado, detalle, creación de ejercicios |
| `ai.ts` | IA | interacciones IA, sugerencias, contenido generado |
| `recovery.ts` | Recuperación | logs de recuperación, lesiones, métricas de readiness |
| `live-workout.ts` | Entrenamiento en vivo | sesiones en vivo |
| `workout-execution.ts` | Ejecución de entrenamiento | sesiones, series, completado |
| `athlete-details.ts` | Detalles de atleta | perfil de atleta |
| `video-metrics.ts` | Video analytics | métricas de forma, sesiones de video |
| `workout-templates.ts` | Plantillas de entrenamiento | `listWorkoutTemplates`, `getWorkoutTemplate`, `saveWorkoutTemplate`, `deleteWorkoutTemplate` (+ ejercicios de plantilla) |
| `schedule.ts` | Horarios | disponibilidad, citas |
| `db.ts` | Core | `safeExecute`, `getPool`, `getDB`, `getClient` (conexión directa a pg) |

### `apps/web/src/lib/` (servicios adicionales con acceso DB)

| Archivo | Dominio | Funciones con acceso DB |
|---------|---------|-------------------------|
| `coach-isolation-db.ts` | Usuarios/coaches/atletas/invites | `getUserById`, `createUser`, `getCoachById`, `createCoach`, `getCoachByCode`, `updateCoach`, `getAthleteProfileById`, `createAthleteProfile`, `getCoachAthletes`, `linkCoachAthlete`, `unlinkCoachAthlete`, `createPendingInvite`, `acceptPendingInvite`, etc. |
| `messages.ts` | Mensajes | (duplicado/superpuesto con `lib/db/messages.ts`) |
| `landing-contacts.ts` | Landing | `insertLandingContact` |
| `coach-athlete-access.ts` | Control de acceso coach-atleta | verificaciones de pertenencia |
| `landing.ts` | Landing | datos públicos de la landing |
| `nats.ts` / `nats-consumer.ts` | Event bus | consumo de NATS (puede quedarse en web si es solo consumidor frontend, pero idealmente se mueve a Go/worker) |
| `auth-middleware.ts` | Auth | middleware de Clerk en Next.js |

### Route Handlers de Next.js que consumen DB (muestra representativa)

- `apps/web/src/app/api/coach/workout-templates/route.ts` → llama directamente `listWorkoutTemplates` / `saveWorkoutTemplate` de `lib/db` (violación clara).
- `apps/web/src/app/api/athlete/membership/route.ts` → proxy a Go con fallback a `lib/db` (estado transitorio, modelo de referencia).
- `apps/web/src/app/api/coaching/dashboard/route.ts` → llama directamente a Go vía `goGet` (buen patrón, a estandarizar).
- `apps/web/src/app/api/[...proxy]/route.ts` → catch-all proxy a Go (mecanismo de puentes).
- Resto de handlers bajo `app/api/coaching/*`, `app/api/athlete/*`, `app/api/coach/*`, `app/api/marketing/*`, `app/api/exercises/*`, `app/api/progress/*`, `app/api/health/route.ts`, `app/api/landing/route.ts`, `app/api/nats/consumer/route.ts`.

---

## 5. Arquitectura objetivo (sin código)

### 5.1 Principio de datos

```
Web (Server Components / Client Components via TanStack Query)
        ↓
  goFetch / serverFetch  (único cliente API, apps/web/src/lib/api/)
        ↓
  Go API /api/v1/*  (apps/api, única fuente de verdad)
        ↓
  PostgreSQL (RLS por organization_id)
```

### 5.2 Cliente API compartido de web

Unificar en `apps/web/src/lib/api/`:
- `go-client.ts` existente (`goFetch`, `goClient`) → se extiende y pasa a ser **el único** cliente de llamadas al Go API.
- `server.ts` (`serverFetch`) → para Server Components: lee token Clerk y cookie `x-org-id`, agrega `Authorization: Bearer` + `X-Organization-ID`.
- `client.ts` (`clientFetch`) → para Client Components/TanStack Query: `credentials: 'include'`, reintento automático en 401 con token fresco de Clerk.
- Eliminar llamadas sueltas a `fetch` al Go API desde route handlers y componentes.

Contrato del cliente:
- Base URL: `NEXT_PUBLIC_GO_API_URL` (server) / `NEXT_PUBLIC_API_URL` (client).
- Headers por defecto: `Content-Type: application/json`, `Accept: application/json`, `Authorization: Bearer <token>`, `X-Organization-ID: <orgId>`, `X-Request-ID: <uuid>`.
- Reintento una vez en 401 con `skipCache: true` (ya implementado en `goFetch`).
- Manejo de errores con el formato estándar de `08-api-specification.md §3.5` (`{ error: { code, message, details }, request_id }`).
- Tipado: funciones genéricas `goFetch<T>(path, options)`; ningún `any`.

### 5.3 Contexto de tenant y RLS

Cada petición autenticada al Go API debe llevar:
- `Authorization: Bearer <Clerk JWT>` — valida Clerk, inyecta `user_id`, `org`, `role`, `permissions`.
- `X-Organization-ID: <org_uuid>` — resuelto por el cliente web desde cookie `x-org-id` o organización primaria del usuario.

En el backend Go (ya definido en `05-backend-architecture.md §8.2` y `routes.go` middleware `TenantContext`):
1. Middleware `Authenticate` valida el JWT de Clerk y setea `c.Locals("user_id")`, `c.Locals("organization_id")`.
2. Middleware `TenantContext` valida membresía del usuario a la organización y ejecuta `SELECT set_config('app.current_organization_id', $1, true)` en PostgreSQL al inicio de cada operación de repo.
3. RLS en tablas tenant-scoped: `organization_id = current_setting('app.current_organization_id')::uuid` (defensa en profundidad, `11-security.md §3.2`).

El cliente web debe propagar `X-Organization-ID` en **todas** las peticiones autenticadas, no solo algunas.

---

## 6. Matriz de contrato (dominio → función web → endpoint Go)

La columna "Endpoints Go" usa paths ya existentes en `apps/api/internal/interfaces/http/routes/routes.go` o marca **[GAP]** donde falta endpoint y debe crearse en `apps/api`.

| Dominio | Función web (lib/db) | Endpoint Go | Método | Estado |
|---------|----------------------|-------------|--------|--------|
| Atletas | `getAthletes(coachId)` | `/api/v1/coaches/:id/athletes` | GET | Existe (RegisterUserRoutes) |
| Atletas | `getAthleteById(coachId, athleteId)` | `/api/v1/athletes/:id` | GET | Existe (RegisterUserRoutes — coaches/:id/athletes); verificar |
| Atletas | `saveAthlete` / `deleteAthlete` | `/api/v1/athletes` | POST/DELETE | **[GAP]** crear |
| Atletas | `getAthleteByClerkId` | `/api/v1/athletes/me` | GET | Existe (RegisterUserRoutes `PUT /athletes/me`; GET falta) → **[GAP]** GET |
| Atletas | `getAthleteAssignedWorkouts` | `/api/v1/athletes/:id/workouts` | GET | Existe (RegisterAthleteRoutes) |
| Atletas | `getAthleteSessions` / `createAthleteAppointment` | `/api/v1/athlete/appointments` | GET/POST | Existe (RegisterAthleteSchedulingRoutes) |
| Atletas | `getCoachAvailabilityForAthlete` | `/api/v1/athlete/availability` | GET | Existe (RegisterAthleteSchedulingRoutes) |
| Citas | `getCoachAppointments` / `updateAppointment` | `/api/v1/athlete/appointments` (+ coach list) | GET/PATCH | Parcial: existe POST; coach list **[GAP]** |
| Configuración | `getTimeBlocks` / `saveTimeBlocks` | (time blocks) | GET/POST | **[GAP]** crear |
| Configuración | `getPublicPageConfig` / `savePublicPageConfig` | (public page config) | GET/POST | **[GAP]** crear |
| Mensajes | `getMessageThreads` / `saveMessage` / `createThread` | `/api/v1/messages` | GET/POST | Existe (RegisterMessageRoutes) |
| Planes | `getPlans` / `savePlan` / `deletePlan` | `/api/v1/plans` | GET/POST/PUT/DELETE | Existe (RegisterPlanRoutes) |
| Planes | `getPublicPlans` | `/api/v1/coaches/:coachId/plans` | GET | Existe (RegisterPublicPlanRoutes) |
| Pagos/Membresías | `getAthleteMembership` / `createMembership` / `renewMembership` / `cancelMembership` | `/api/v1/memberships` | GET/POST/PUT | Existe (RegisterMembershipRoutes) |
| Pagos | `getPaymentHistory` / `recordPayment` | `/api/v1/memberships/:id/payments` | GET | Existe (RegisterMembershipRoutes) |
| Pagos | métodos de pago | (payment methods) | GET/POST/DELETE | **[GAP]** crear |
| Productos | CRUD productos | `/api/v1/products` | GET/POST/PUT/DELETE | Existe (RegisterProductRoutes) |
| Tienda | catálogo/compra | `/api/v1/athlete/store` | GET/POST | Existe (RegisterStoreRoutes) |
| Ejercicios | listado/detalle/creación | `/api/v1/exercises` | GET/POST/PUT/DELETE | Existe (RegisterTrainingRoutes) |
| Plantillas | `listWorkoutTemplates` / `getWorkoutTemplate` / `saveWorkoutTemplate` / `deleteWorkoutTemplate` | `/api/v1/workout-templates` | GET/POST/PUT/DELETE | Existe (RegisterTrainingRoutes) |
| Entrenamiento | sesiones, series, completado | `/api/v1/workouts/*` | GET/POST | Existe (RegisterTrainingRoutes + RegisterRunningWorkoutRoutes) |
| Recuperación | logs de recuperación | (recovery logs) | GET/POST | **[GAP]** crear |
| Eventos | CRUD eventos | `/api/v1/events` | GET/POST/PUT/DELETE | Existe (RegisterEventRoutes) |
| Blog | artículos | `/api/v1/blog` | GET | Existe (RegisterBlogRoutes) |
| Tickets | CRUD tickets | `/api/v1/tickets` | GET/POST/PUT/DELETE | Existe (RegisterSupportRoutes) |
| Usuarios/Coaches | `getUserById`, `createUser`, `getCoachById`, `createCoach`, `updateCoach` | `/api/v1/users/*`, `/api/v1/coaches/*` | GET/POST/PUT | Existe (RegisterUserRoutes) |
| Coach-athlete links | `linkCoachAthlete` / `unlinkCoachAthlete` | (assignments) | POST/DELETE | **[GAP]** crear (vía programs/assignments o asignación directa) |
| Invites pendientes | `createPendingInvite` / `acceptPendingInvite` | `/api/v1/invites/*` | POST | Existe (RegisterInviteRoutes — accept/validate) |
| Landing contact | `insertLandingContact` | (landing contact) | POST | **[GAP]** crear (o dejar como webhook/SSR si es solo landing pública) |
| Video metrics | métricas de forma/sesiones | `/api/v1/video-analytics/*` | GET/POST | Existe (RegisterVideoAnalyticsRoutes) |
| AI | interacciones IA | `/api/v1/ai/*` | POST | Verificar existencia en Go |
| Dashboard | métricas dashboard coach | `/api/v1/coach/dashboard/summary` | GET | Existe (RegisterAnalyticsRoutes) |
| Schedule | disponibilidad/citas | `/api/v1/athlete/availability`, `/api/v1/athlete/appointments` | GET/POST | Existe (RegisterAthleteSchedulingRoutes) |

> Nota: la matriz definitiva se completa en el Slice 0 (inventario exacto) y se revisa con el API agent antes de comenzar cada fase.

---

## 7. Orden de migración (fases por dominio)

Se migra de **menos acoplado / solo lectura** a **más acoplado / escritura transaccional**, para minimizar riesgo y permitir rollback por fase.

### Fase 0 — Fundación (semana 0)
Objetivo: poner los cimientos sin tocar datos de producción.
- Inventario exacto: listar cada función de `lib/db/*.ts` y `lib/*.ts` con su destino Go (matriz de §6).
- Auditoría de endpoints Go existentes vs. [GAP]; crear issues para los [GAP] en `apps/api`.
- Establecer el cliente API único en web (extendir `go-client.ts`, `server.ts`, `client.ts`) y el contrato de headers (`Authorization`, `X-Organization-ID`, `X-Request-ID`).
- Definir feature flags por dominio (p. ej. `FEATURE_GO_ATHLETES`, `FEATURE_GO_PLANS`) para activar/desactivar el camino Go por dominio.
- Definir mecanismo de paridad: test que compara respuesta legacy (DB directa) vs respuesta Go para el mismo input, en entorno de staging con DB compartida.
- Criterio de salida: matriz de contrato revisada por API agent; cliente API único compilando; feature flags definidos.

### Fase 1 — Referencia de solo lectura (bajo riesgo)
Dominios: `exercises`, `blog`, `products`, `store`, `config` (time blocks, public page config), `schedule` (lectura de disponibilidad).
- Para cada dominio: crear endpoint Go si es [GAP], implementar, probar, cambiar consumidores web de `lib/db` a `goFetch`/`serverFetch`, activar feature flag, probar en staging, desplegar, verificar, rollback si falla.
- Criterio de salida: cero llamadas a `lib/db` desde estos dominios en web.

### Fase 2 — Atletas y citas (lectura + escritura simple)
Dominios: `athletes`, `athlete-details`, `sessions`, `appointments`, `availability`, `membership/status`.
- Migrar lecturas y escrituras simples. Mantener el cálculo de estado de membresía (`computeMembershipStatus`) en Go (lógica de negocio va al backend).
- Criterio de salida: web ya no consulta `athletes.ts`, `appointments`, `membership` directamente a DB.

### Fase 3 — Coach: planes, tickets, productos, plantillas, configuración
Dominios: `plans`, `tickets`, `products`, `workout-templates`, `config` (escritura), `payments` (métodos de pago).
- Escrituras transaccionales simples (create/update/delete). `workout-templates` incluye ejercicios anidados (transacción en Go).
- Criterio de salida: coach ya no usa `lib/db` para estos dominios.

### Fase 4 — Escritura transaccional y tiempo real
Dominios: `payments` (recordPayment, membresías create/renew/cancel), `messages`, `workout-execution`, `live-workout`, `recovery`, `events` (escritura), `video-metrics`.
- Aquí está la lógica de negocio más sensible (idempotencia de pagos, soft-delete, transacciones). Migrar con especial cuidado y pruebas de paridad rigurosas.
- `recordPayment` incluye guarda de idempotencia por `polar_order_id` — debe replicarse exactamente en Go.
- Criterio de salida: cero escritura directa a PostgreSQL desde web.

### Fase 5 — IA, analytics y dashboard
Dominios: `ai`, `dashboard` (analytics), `video-analytics` (agregaciones), `form-metrics`.
- Endpoints de lectura agregada y de IA (202 Accepted + polling). Consumir desde Server Components.
- Criterio de salida: dashboard y analytics consumen solo Go API.

### Fase 6 — Descomisión y limpieza
- Eliminar `apps/web/src/lib/db/db.ts` y todos los módulos de `lib/db/`.
- Eliminar archivos de servicio sobrantes en `lib/` (`coach-isolation-db.ts`, `landing-contacts.ts`, etc.) una vez sus funciones estén en Go.
- Eliminar Route Handlers de Next.js que solo hacían proxy o llamada a DB (quedar solo los permitidos: Clerk webhooks, SSR, estáticos).
- Eliminar la base de datos directa de web (no debería quedar `DATABASE_URL` usado por web).
- Criterio de salida: `grep` de acceso a pg desde web → 0 hits fuera de archivos eliminados; tests pasan; build pasa.

---

## 8. Estrategia de rollback

### Rollback por fase (recomendado)
Cada dominio se detiene detrás de un **feature flag** (`FEATURE_GO_<DOMINIO>`).
- **Activado (Go):** web llama a `goFetch`/`serverFetch` → Go API.
- **Desactivado (legacy):** web llama a `lib/db` directamente (código legacy conservado, no borrado hasta Fase 6).

Si una fase falla en producción (error rate > umbral, p. ej. >0.5% o P95 > 500ms):
1. Desactivar el feature flag del dominio (rollback inmediato, sin nuevo despliegue de web si el flag se lee en runtime; si es de build, revertir el despliegue de web).
2. El tráfico vuelve al camino legacy `lib/db` mientras se investiga.
3. Una vez corregido en Go, se vuelve a activar el flag.

### Rollback de despliegue (blue-green / canary)
- Desplegar Go API en blue-green (Coolify) o canary; web apunta a `NEXT_PUBLIC_GO_API_URL` que puede reconfigurarse entre versión antigua/nueva de Go.
- Si Go API falla, redirigir `NEXT_PUBLIC_GO_API_URL` al entorno anterior o activar flags a legacy.
- Base de datos: **no se hacen cambios de schema destructivos** en ninguna fase. Las migraciones son solo expansivas (expand-contract, `04-database-design.md §5.2`, regla de migraciones del AGENTS.md). Nunca se borra una columna ni tabla hasta Fase 6 y solo tras verificar que nada la usa.

### Rollback de datos
No aplica (no hay migración de datos). Si un endpoint Go escribe incorrectamente, se corrige y se reexecuta; las escrituras son idempotentes donde corresponde (pagos por `polar_order_id`).

### Matriz de decisión de rollback
| Síntoma | Acción | Tiempo de recuperación |
|---------|--------|------------------------|
| Error rate > 0.5% en endpoint Go | Desactivar feature flag del dominio | Inmediato (flag) o revertir despliegue (minutos) |
| P95 > 500ms persistente | Canary rollback de Go API | Minutos |
| Corrupción de datos (no esperado) | Detener escritura, investigar, no revertir DB sin autorización | Según incidente (`11-security.md §9`) |

---

## 9. Pruebas

### 9.1 Por fase (web + API)

| Tipo | Qué | Herramienta | Cuándo |
|------|-----|-------------|--------|
| Unitario (Go) | handlers, use cases, domain validation | `go test` | Cada endpoint Go, antes de desplegar |
| Unitario (TS) | utilidades de cliente API, mapeo de respuesta | Vitest | Cada cambio en `lib/api/` |
| Integración (Go) | endpoint con DB de test real | `go test` + `testhelpers.NewTestDB` | Cada endpoint, con RLS y org context |
| Paridad | respuesta legacy (DB directa) vs respuesta Go | script de staging + test automatizado | Antes de cortar cada dominio en web |
| E2E (web) | flujos críticos por dominio | Playwright | Cada fase, en staging |
| Contrato | OpenAPI / JSON schema de request/response | `apps/api/api/openapi/spec.yaml` | Cada nuevo endpoint |

### 9.2 Pruebas de paridad (clave para este plan)
Para cada función migrada, en staging con la misma DB:
1. Ejecutar la función legacy (`lib/db`) con input X → respuesta L.
2. Ejecutar el endpoint Go equivalente con input X → respuesta G.
3. Comparar L y G (ignorando diferencias de formato de fecha/camelCase acordadas en `08-api-specification.md`).
4. Cero diferencias semánticas antes de activar el feature flag en web.

### 9.3 Pruebas de tenant/RLS
- Test que verifica que un coach de la org A no puede leer datos de la org B (RLS + middleware).
- Test que verifica que falta `X-Organization-ID` → 403/401.
- Test que verifica token expirado → reintento con token fresco (cliente web).

### 9.4 Umbrales de calidad
- Cobertura unit/integración ≥ 80% (`13-testing.md §1.2`).
- No se mergea sin tests pasando (`13-testing.md §1.1`).
- E2E de flujos críticos (dashboard coach, alta de atleta, plan, pago, plantilla de entrenamiento) en staging.

---

## 10. Despliegue seguro

### 10.1 Secuencia por fase
1. API agent implementa endpoint Go + tests + migración de schema si hace falta (`apps/api/migrations/postgres/NNN_descripcion.sql` — expansiva, nunca destructiva).
2. Web agent expone el endpoint vía cliente API único y cambia consumidores del dominio.
3. Desplegar Go API primero (backward compatible: los endpoints legacy de Next.js siguen funcionando).
4. Desplegar web con feature flag **desactivado** (camino legacy).
5. Activar feature flag en staging → validar con pruebas de paridad y E2E.
6. Activar feature flag en producción (canary %) → monitorear error rate y P95.
7. Si estable, marcar fase completa; de lo contrario, rollback al flag desactivado.

### 10.2 Variables de entorno
- `NEXT_PUBLIC_GO_API_URL` (ya existe en `.env.example` y `.env.local` apuntando a `localhost:9090` / `127.0.0.1:9090`).
- En producción apuntar al URL del Go API (Coolify/Hetzner, `10-devops.md`).
- Nunca usar `DATABASE_URL` en web después de Fase 6.

### 10.3 Monitoreo y alertas
- Error rate por endpoint Go (5xx).
- P95 de respuesta (< 200ms objetivo normal, `05-backend-architecture.md §2`).
- Tasa de fallo de reintento 401 del cliente web.
- Alertas si se superan umbrales durante activación de flag.

---

## 11. Riesgos y decisiones abiertas

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Endpoint Go [GAP] no existe y API agent no puede implementarlo a tiempo | Alto | Fase 0 identifica todos los [GAP]; se crean issues en API y se priorizan antes de cada fase web |
| Diferencias de formato JSON (snake_case vs camelCase, fechas, null vs undefined) | Medio | Acordar contrato en `08-api-specification.md`; pruebas de paridad detectan mismatches antes del corte |
| Lógica de negocio en web (cálculo de membresía, idempotencia de pagos) se pierde al migrar | Alto | Mover lógica a Go use cases; pruebas de paridad comparan resultados, no solo formas |
| `nats.ts` / `nats-consumer.ts` en web (acceso al event bus) | Bajo | Evaluar si web realmente necesita consumir NATS directamente; si no, mover a Go worker |
| Rollback de DB no permitido (migraciones solo expansivas) | Medio | No hacer cambios destructivos; Fase 6 solo elimina código web, no schema |

### Decisiones abiertas (a definir en Fase 0 con API agent)
1. Formato exacto de respuesta para endpoints [GAP] (DTO camelCase, `ListResponse[T]`, error shape).
2. Qué hacer con `coach-isolation-db.ts` (usuarios/coaches duplicados con `lib/db/athletes.ts`): unificar bajo un solo dominio Go.
3. Qué hacer con `nats.ts`/`nats-consumer.ts` en web (¿seguir consumiendo NATS o delegar a Go?).
4. Si `landing-contacts.ts` (insert público sin auth) va a Go o se deja como webhook/SSR en Next.js (excepción justificada).

---

## 12. Definición de hecho (DoD) del plan completo

- [ ] Matriz de contrato completa (§6) revisada y firmada por API agent y Web agent.
- [ ] Fase 0 (fundación) completada: cliente API único, feature flags, pruebas de paridad definidas.
- [ ] Cada fase (1-6) ejecutada con: endpoint Go implementado y testeado, consumidor web cambiado, feature flag activado, pruebas de paridad pasadas, despliegue en producción sin incidentes.
- [ ] Fase 6 completada: cero acceso a PostgreSQL desde `apps/web/src`; `lib/db/` eliminado; Route Handlers reducidos a las excepciones permitidas.
- [ ] Documentación de contrato actualizada (`docs/superpowers/specs/` + `apps/rules/08-api-specification.md` si aplica).
- [ ] `go build ./...` y `go test ./...` en `apps/api` pasan; `pnpm lint && pnpm test && pnpm build` en `apps/web` pasan.

---

## 13. Referencias

- `apps/rules/MASTER_PROMPT.md` — arquitectura, API-first, filosofía de ingeniería.
- `apps/rules/05-backend-architecture.md` — Clean Architecture, rutas Go, tenant/RLS, pgx.
- `apps/rules/06-frontend-architecture.md` — Server Components, data fetching, cliente API, auth.
- `apps/rules/08-api-specification.md` — contratos REST, auth JWT, org contexto, errores, paginación.
- `apps/rules/04-database-design.md` — PostgreSQL, UUIDv7, RLS, soft deletes, migraciones expansivas.
- `apps/rules/11-security.md` — autenticación, autorización, RLS defensa en profundidad.
- `apps/rules/13-testing.md` — pirámide de pruebas, paridad, cobertura.
- `apps/rules/12-coding-standards.md` — convenciones de commits, nombrado, tipos.
- `apps/rules/14-team-workflow.md` — flujo Spec → TODO → In Progress → Review → USER GATE → Done.
- `apps/web/AGENTS.md` — alcance del agente web, contrato API-first.
- `apps/api/AGENTS.md` — alcance del agente API, fuente de verdad de datos.
- `docs/superpowers/specs/TEMPLATE-coach-feature.md` — plantilla de specs.

---

**Autor:** agente web (despachado por Orca, task `task_493efa6a0787`)  
**Tipo de entregable:** Plan de arquitectura solamente (no código).  
**Siguiente paso:** revisar este plan con el coordinador y el API agent antes de iniciar Fase 0.