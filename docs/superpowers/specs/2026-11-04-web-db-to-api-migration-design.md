# Web DB → Go API Migration — Design Spec

> Fase de cierre del plan `docs/plans/closeout-plan-2026-11-02.md`. Planificación desglosada en slices listos para PR. No incluye código de implementación.

---

## 1. Problema

`apps/web/src/lib/db/*.ts` llama directamente a PostgreSQL vía `pg` Pool (`apps/web/src/lib/db/db.ts`) y libsql-style placeholders convertidos a `$1,$2,...`. Esto viola la regla API-first (`MASTER_PROMPT.md`): Mobile/Web → Go API → Database. El Next.js lee/escribe DB directamente saltándose el Go API, duplicando lógica de negocio, RLS, tenancy y auditoría en el frontend, y exponiendo credenciales de DB al runtime del frontend.

## 2. Roles y AC

| Rol | Quién es | Goal principal |
|---|---|---|
| dev-backend | Go API (apps/api) | Exponer endpoints Go equivalentes a cada dominio DB actual |
| dev-front | Next.js web (apps/web) | Reemplazar `lib/db/*` por `lib/api/*` consumiendo Go API |
| db-architect | Diseño de esquema + migraciones | Asegurar contratos DB/endpoint 1:1 y migraciones versionadas |
| qa-web | Pruebas web | Vitest/Playwright cubriendo cada migración de dominio |
| security | Revisión de seguridad | Validar RLS/tenant context y auth en cada endpoint migrado |

### Acceptance Criteria

- [ ] **AC-1:** Given catálogo de rutas DB actuales, When se mapean a contratos Go API, Then cada dominio tiene endpoint(s) documentado(s) en `08-api-specification.md` y ruta registrada en `apps/api/internal/interfaces/http/routes/routes.go`.
- [ ] **AC-2:** Given `lib/api/go-client.ts` existente, When se crea el cliente API compartido unificado, Then todo consumo de datos en web usa `goFetch`/`goClient` y nunca `lib/db/*` para datos de negocio.
- [ ] **AC-3:** Given cada dominio migrado, When se aplica RLS/tenant context, Then la petición lleva `X-Organization-ID` / `X-Coach-ID` y el Go API aplica tenancy (app + RLS defensa en profundidad).
- [ ] **AC-4:** Given orden de migración por dominio, When se ejecuta fase a fase, Then el web sigue funcionando en cada fase (legacy route actúa como fallback hasta el cut-over).
- [ ] **AC-5:** Given rollback definido por dominio, When falla un cut-over, Then se revierte a la ruta legacy de ese dominio sin afectar dominios ya migrados.
- [ ] **AC-6:** Given pruebas por dominio, When se completa un dominio, Then existen unit tests (Go handler), integration tests (Go + test DB) y frontend tests (Vitest con MSW) para ese dominio.
- [ ] **AC-7:** Given despliegue seguro, When se promociona a staging/producción, Then migraciones corren antes del código, health checks pasan, y existe rollback automático de Coolify si error rate > 5% o P95 > 50% baseline.

---

## 3. Criterios UX

No aplica (migración de capa de datos, sin cambios de UI). El comportamiento del frontend debe ser idéntico antes y después de cada cut-over.

---

## 4. Flujo de usuario

```
Usuario en web (coach/atleta) → página solicita datos → feature hook llama lib/api/* → goFetch → Go API /api/v1/* → DB (RLS por organización) → respuesta JSON idéntica a la que daba lib/db
```

---

## 5. Diseño (la solución)

### 5.1 Inventario actual de lib/db (dominios a migrar)

Fuente: `apps/web/src/lib/db/index.ts` (22 módulos):

1. `config.ts` — time blocks, public page config
2. `athletes.ts` — athletes, appointments, coach availability
3. `sessions.ts` — sessions
4. `messages.ts` — messages/threads
5. `dashboard.ts` — dashboard aggregates
6. `events.ts` — events
7. `plans.ts` — plans
8. `tickets.ts` — support tickets
9. `products.ts` — store products
10. `store.ts` — store
11. `payments.ts` — payment methods, memberships
12. `blog.ts` — blog/marketing
13. `exercises.ts` — exercises
14. `ai.ts` — AI
15. `recovery.ts` — recovery
16. `live-workout.ts` — live workout
17. `workout-execution.ts` — workout execution
18. `athlete-details.ts` — athlete details
19. `video-metrics.ts` — video metrics
20. `workout-templates.ts` — workout templates
21. `schedule.ts` — schedule
22. `db.ts` — conexión directa a PostgreSQL (la raíz del problema)

Nota: `sessions.ts`, `tickets.ts`, `blog.ts`, `live-workout.ts`, `schedule.ts` también aparecen como Next.js API Routes en `apps/web/src/app/api/`. Esas routes ya existen; el foco de este spec es reemplazar `lib/db/*` (acceso directo a DB) por consumo de Go API.

### 5.2 Catálogo de contratos Go API (mapping dominio → endpoint)

Cada dominio de `lib/db` mapea a uno o más endpoints Go bajo `/api/v1`. Endpoints ya existentes en `routes.go` se reusan; los que faltan se crean.

| Dominio (lib/db) | Endpoint Go existente | Endpoint(s) Go a crear | Método | Path |
|---|---|---|---|---|
| athletes | sí | sí | GET | /api/v1/athletes |
| athletes | sí | sí | GET | /api/v1/athletes/:id |
| athletes | sí | sí | GET/POST | /api/v1/athletes/:id/appointments |
| sessions | sí | sí | GET/POST | /api/v1/training/sessions |
| messages | sí | sí | GET/POST | /api/v1/messages |
| dashboard | sí | sí | GET | /api/v1/coach/dashboard/summary |
| events | sí | no | GET/POST | /api/v1/events |
| plans | sí | no | GET/POST | /api/v1/plans |
| tickets | sí | no | GET/POST | /api/v1/tickets |
| products | sí | sí | GET/POST | /api/v1/products |
| store | sí | sí | GET/POST | /api/v1/athlete/store |
| payments | sí | sí | GET | /api/v1/memberships |
| blog | sí | no | GET | /api/v1/blog |
| exercises | sí | no | GET | /api/v1/exercises |
| recovery | no | sí | GET/POST | /api/v1/recovery |
| ai | sí | sí | POST | /api/v1/ai/* |
| workout-templates | sí | sí | GET/PUT/POST | /api/v1/workout-templates |
| workout-execution | sí | sí | GET/POST | /api/v1/workouts/* |
| video-metrics | sí | sí | GET/POST | /api/v1/video-views |
| config (time blocks/public page) | no | sí | GET/POST | /api/v1/coach/*config |

### 5.3 Shared API client (web)

`apps/web/src/lib/api/go-client.ts` ya existe (`goFetch`, `goClient`). Se crea un módulo unificado `apps/web/src/lib/api/index.ts` que re-exporta `goClient` + helpers con tenancy:

- `apiGet<T>(path, params?)` → GET con `Authorization: Bearer <clerk token>` y `X-Organization-ID` desde cookie/session.
- `apiPost<T>(path, body)`, `apiPut`, `apiPatch`, `apiDelete`.
- Manejo central de 401 → refresh silencioso (ya en `goFetch`).
- Tipado de respuestas: `{ data, pagination, error, request_id }` per `08-api-specification.md §3.5`.

Regla: ninguna feature de web importa `apps/web/src/lib/db/*` para datos de negocio. Solo los webhooks de Clerk (`apps/web/src/app/api/webhooks/clerk/route.ts`) y SSR de datos estáticos pueden usar Next.js API Routes (excepción permitida por `06-frontend-architecture.md` y `apps/web/AGENTS.md`).

### 5.4 RLS / tenant context

- El frontend envía `X-Organization-ID` (coach) o `X-Coach-ID` (atleta, operación por operación) en cada petición autenticada al Go API.
- El Go API aplica `RequireAuth` → `RequireTenantContext` (coach es el tenant; atleta valida relación activa en `coach_athlete_links` vía header `X-Coach-ID`).
- Defensa en profundidad: PostgreSQL RLS en tablas tenant-scopedas (`organization_id = current_setting('app.current_organization_id')::uuid`) per `04-database-design.md §1.6` y `11-security.md §3.2`.
- El backend setea `app.current_organization_id` al inicio de cada sesión DB y lo limpia al final.

### 5.5 Orden de migración por dominio (fases)

Fase A — Dominios de lectura simple, bajo riesgo (blog, products, store, events, plans):
- Endpoints ya existen mayormente; solo cambiar el cliente web de `lib/db` → `goClient`.

Fase B — Dominios de gestión del coach (athletes, appointments, sessions, messages, tickets):
- Endpoints existen o se crean; incluir `RequireTenantContext` y validación de relación coach-atleta.

Fase C — Dominios de entrenamiento (workout-templates, workout-execution, exercises, recovery, video-metrics):
- Endpoints existen; migración de lógica de ejecución y sets.

Fase D — Dominios transversales (dashboard, analytics, payments, ai, config):
- Dashboard/analytics son agregados de lectura; payments toca Polar/Stripe (mantener webhook Next.js para eventos externos, lógica de negocio en Go); AI usa `202 Accepted` + polling.

Cada fase = uno o más PR. Cut-over por dominio: el web deja de llamar `lib/db.<dominio>` y usa `lib/api.<dominio>`. La ruta legacy de Next.js permanece como fallback hasta que el dominio esté verificado en staging.

### 5.6 Rollback

- Por dominio: si el cut-over de un dominio falla en producción, se revierte el cliente web de ese dominio a `lib/db.<dominio>` (ruta legacy aún desplegada) y se desactela el endpoint Go de ese dominio (o se mantiene operativo pero sin consumidores web).
- Base de datos: las migraciones son backward-compatible (expand-contract), nunca `DROP COLUMN`/`RENAME COLUMN` sin migración intermedia (`10-devops.md §2.4`).
- Cada migración tiene `down.sql` probado en CI.
- Rollback automático de Coolify si error rate > 5% en 5 min o P95 > 50% baseline (`10-devops.md §2.3`).

### 5.7 Pruebas

Per dominio migrado:

- **Go unit tests:** handler con dependencias mockeadas (`13-testing.md §8`).
- **Go integration tests:** request-response completo con test DB real (`httptest`, `testhelpers.NewTestDB`).
- **Frontend Vitest:** hooks/components con MSW mockando `/api/v1/*`.
- **E2E Playwright:** flujos críticos del dominio (cero 404 en rutas críticas, `06-frontend-architecture.md §13`, `13-testing.md §5`).
- Migraciones: prueba up/down en PostgreSQL local vacía antes de aplicar (`04-database-design.md §5`, `10-devops.md §2.4`).

### 5.8 Despliegue seguro

1. Migración SQL (up) corre como pre-deploy en CI contra snapshot de producción.
2. Código Go (nuevos endpoints) se despliega a staging; health checks + smoke suite.
3. Web (Next.js) se despliega con `NEXT_PUBLIC_GO_API_URL` apuntando al staging de Go API.
4. Validación en staging (E2E + pruebas de aislamiento C2).
5. Producción: blue-green vía Coolify. Rollback automático si se disparan triggers.

---

## 6. Fuera de scope (explícito)

- No se migra `apps/mobile` (tiene su propio `goApiClient` per `08-api-specification.md §4.17`).
- No se reescribe el schema de DB; solo se exponen endpoints sobre el schema existente.
- No se eliminan rutas legacy de Next.js hasta que el dominio correspondiente esté verificado en producción.
- No se toca el webhook de Clerk (`apps/web/src/app/api/webhooks/clerk/route.ts`).
- No se cambia la autenticación (Clerk sigue siendo el IdP; Go API valida JWT via JWKS).

---

## 7. Riesgos y decisiones abiertas

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Diferencia de contrato (campo faltante en respuesta Go vs lo que espera el web) | Fallo silencioso en UI | Contrato definido antes; tipos compartidos; pruebas Vitest con MSW validan forma de respuesta |
| RLS no configurada en tabla migrada | Fuga de datos entre organizaciones | Pruebas C2 de aislamiento en PG local obligatorias antes del cut-over (`AC-4`) |
| Token Clerk expirado en vuelo | 401 no manejado | `goFetch` reintenta una vez con token fresco; 401 persistente → redirige a login |
| Fallo de migración en medio de fase | Despliegue bloqueado | Migración pre-deploy con down.sql probado; rollback automático de Coolify |

---

## 8. Referencias

- `apps/rules/MASTER_PROMPT.md` — regla de oro API-first.
- `apps/rules/08-api-specification.md` — contratos de endpoint, auth, paginación, errores.
- `apps/rules/05-backend-architecture.md` — Clean Architecture, rutas, tenant context, RLS.
- `apps/rules/04-database-design.md` — schema, soft deletes, multi-tenancy, migraciones.
- `apps/rules/06-frontend-architecture.md` — Server Components, data fetching, API client.
- `apps/rules/11-security.md` — RLS, auth, autorización, OWASP.
- `apps/rules/10-devops.md` — CI/CD, despliegue blue-green, migraciones, rollback.
- `apps/rules/13-testing.md` — pirámide de pruebas, Go/TS estándares.
- `apps/rules/12-coding-standards.md` — convenciones de código y commits.
- `apps/web/AGENTS.md` — scope web y contrato API.
- `apps/api/AGENTS.md` — scope API y principio API-first.
- `docs/superpowers/specs/2026-11-02-fase0-baseline-higiene-design.md` — fase previa de backend.
- `docs/superpowers/specs/2026-11-02-fase1-seguridad-tenancy-design.md` — Outbox/tenancy previo.
