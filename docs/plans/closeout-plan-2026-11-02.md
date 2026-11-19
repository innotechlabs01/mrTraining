# MR Training — Plan de cierre (auditoría 2026-11-02)

> Documento maestro de cierre. Descompone el trabajo en fases PR-ready, con criterios de aceptación (AC), asignación de roles, riesgos y dependencias. Cada fase tiene su spec desglosado en `docs/superpowers/specs/2026-11-02-fase<N>-...-design.md`. No se escribe código de implementación aquí; solo planificación.

---

## Estado verificado

- Rama: `dev` actualizada con `origin/dev`, sin cambios locales.
- Stack de memoria: saludable.
- Backend: `go build ./...` verde. `go vet ./...` roto por tests desalineados (`service_test.go` con merge conflict + `NewService` firma 1 arg vs 2 args).
- Mobile: `npx tsc --noEmit` verde.
- Web: `next lint` sin errores bloqueantes (solo warnings).

## Hallazgos críticos

1. `apps/api/internal/application/running/service_test.go` contiene marcador de merge sin resolver (`<<<<<<< HEAD` / `>>>>>>> origin/dev`) y usa firma vieja de `NewService`. Impide `go vet`, `go test ./...` y toda validación backend.
2. `api-endpoint-consolidation-ddd` (`openspec/changes/...`) abierto en dominios Community/Nutrition/Store y plumbing de repositories/tests.
3. `athlete-real-data-images` abierto: DTO camelCase + imágenes en training/workouts/today/history, remoción de mocks y flujo Empezar/Continuar.
4. Mobile UI audit deja pantallas en estado B/C; running estructurado deja GPS + offline queue + sync + tests.
5. Seguridad multi-tenant: A1/A2 implementados a nivel código, pero B1/B2/C2 bloqueados; PostgreSQL local no disponible para evidencia reproducible. Outbox: migración 012 y código divergen (faltan `event_id`, `locked_by`, `locked_until`, status `dead`, worker); inserts usan `*sql.DB` fuera de la transacción de negocio.
6. Comercial (audit SAAS): motor de políticas/comisiones parametrizable no implementado; RLS para comisiones incompleto; landing comercial pendiente.

---

## Secuencia propuesta (por entrega, no por feature aislada)

### Fase 0 — Higiene de baseline (P0, 1-2 días)

**Spec:** `docs/superpowers/specs/2026-11-02-fase0-baseline-higiene-design.md`  
**Rol responsable:** `dev-backend`

| Slice | Tarea (PR-ready) | Archivos | AC |
|---|---|---|---|
| 0.1 | Resolver conflicto de merge en `service_test.go` (marcadores `<<<<<<<`/`=======`/`>>>>>>>`) | `apps/api/internal/application/running/service_test.go` | AC-0.1 |
| 0.2 | Ajustar callers de `NewService` a firma `(repo domain.Repository, db *sql.DB)` | `apps/api/internal/integration/running/http_e2e_test.go`, tests de handlers | AC-0.2 |
| 0.3 | Ejecutar `go build ./...`, `go vet ./...`, `go test ./...`; archivar baseline | `apps/api/` | AC-0.3 |
| 0.4 | Documentar gate CI local (`go test ./...` no rojo antes de seguir) | `docs/plans/closeout-plan-2026-11-02.md` | AC-0.4 |

**Criterios de aceptación (Fase 0):**
- AC-0.1: `service_test.go` sin marcadores de merge; `go vet` no reporta ese paquete.
- AC-0.2: Todos los callers de `NewService` usan 2 argumentos; `go build ./...` compila.
- AC-0.3: `go build ./... && go vet ./... && go test ./...` verdes; baseline archivada.
- AC-0.4: Gate CI local documentado como prerrequisito para Fase 1.

**Riesgos:** rama equivocada al resolver merge; callers de `NewService` no identificados; tests de integración requieren PG local (usar `t.Skip` sin DB).

---

### Fase 1 — Seguridad y tenancy verificable (P0, 3-5 días)

**Spec:** `docs/superpowers/specs/2026-11-02-fase1-seguridad-tenancy-design.md`  
**Roles responsables:** `dev-backend` + `db-architect`

| Slice | Tarea (PR-ready) | Archivos | AC |
|---|---|---|---|
| 1.1 | Corregir migración 012 al contrato Outbox aprobado (`event_id` único/obligatorio, `locked_by`, `locked_until`, status `dead`, índices) | `apps/api/migrations/postgres/012_outbox_transaccional.sql` (o nueva numerada si 012 ya aplicada) | AC-1.1 |
| 1.2 | UnitOfWork tx: inserts de Outbox dentro de la misma tx PostgreSQL que la operación de negocio (no `*sql.DB` suelto) | `apps/api/internal/application/running/service.go` + callers | AC-1.3 |
| 1.3 | Worker durable Outbox: `claimToken`, `FOR UPDATE SKIP LOCKED`, idempotencia por `event_id`, estados terminal/retry/backoff | nuevo paquete worker en `apps/api/` | AC-1.2 |
| 1.4 | PG local + pruebas C2 de aislamiento multi-tenant; evidencia reproducible | scripts/local + evidencia adjunta | AC-1.4 |
| 1.5 | Confirmar bloqueo de migraciones hasta evidencia PG; no aplicar en entornos compartidos | `docs/plans/closeout-plan-2026-11-02.md` | AC-1.5 |

**Criterios de aceptación (Fase 1):**
- AC-1.1: Migración 012 tiene `event_id` UUID NOT NULL UNIQUE, `locked_by`, `locked_until`, status `dead`, índices para `FOR UPDATE SKIP LOCKED` + retry.
- AC-1.2: Worker publica cada evento una sola vez (múltiples workers, idempotencia `event_id`).
- AC-1.3: Ningún insert de Outbox vía `*sql.DB` fuera de tx; todos dentro de UnitOfWork tx.
- AC-1.4: PG local levantado; evidencia C2 reproducible de aislamiento org A vs org B.
- AC-1.5: Ninguna migración aplicada en entornos compartidos sin evidencia PG.

**Riesgos:** migración 012 ya aplicada (no reescribir; crear numerada nueva); eventos huérfanos si `*sql.DB` fuera de tx persiste; PG local no disponible (usar memory-gateway :5434); doble publicación sin lease correcto.

**Bloqueo:** Migraciones quedan bloqueadas hasta completar Fase 1 (evidencia PG). No aplicar migraciones en entornos compartidos.

---

### Fase 2 — Cierre de contratos API + real data (P1, 4-6 días)

**Spec:** `docs/superpowers/specs/2026-11-02-fase2-api-datos-design.md`  
**Roles responsables:** `dev-backend` + `dev-front`

| Slice | Tarea (PR-ready) | Archivos | AC |
|---|---|---|---|
| 2.1 | Dominios Community/Nutrition/Store: repositorios, handlers, DTOs | `apps/api/internal/{community,nutrition,store}/` | AC-2.1 |
| 2.2 | JWT/RBAC + rate limit v1, versionado `/api/v1` | `apps/api/internal/auth/`, middleware | AC-2.1 |
| 2.3 | Tests de paridad Go API vs Next.js legacy (cero 404 flujos críticos) | tests de integración | AC-2.1 |
| 2.4 | DTO Go camelCase único; mobile parsea camelCase; cero snake_case leftover | `apps/api/internal/interfaces/http/dto/` + mobile parse | AC-2.2 |
| 2.5 | `image_url` en `exercise_library` (migración + Go domain/DTO/repo read/write) | migración `019_exercise_image_url.sql` + Go | AC-2.3 |
| 2.6 | Endpoints `{workout,exercises,session}`; `GET /workouts/:id/detail` → `{workout, exercises}` | handlers training.go | AC-2.4 |
| 2.7 | TodayScreen real data (cero mocks: quitar `MOCK_RECOMMENDATIONS`/`MOCK_ARTICLES`/`WEEKLY_CHALLENGE`) | `apps/mobile/.../TodayScreen.tsx` | AC-2.5 |
| 2.8 | Coach gallery picker: `useExerciseLibrary` a Go `/exercises`; `CreateExerciseModal`; persist `imageUrl` | `apps/web/.../useExerciseLibrary.ts`, `CreateExerciseModal` | AC-2.3 |
| 2.9 | Flujo Empezar/Continuar por `status`+`progress` | `apps/mobile/.../History,WorkoutDetail` | AC-2.6 |
| 2.10 | Auditoría mismatches Go ↔ web/mobile (JSON keys, fechas, `null` vs `undefined`) | web/mobile + api dto | AC-2.7 |

**Criterios de aceptación (Fase 2):**
- AC-2.1: Dominios Community/Nutrition/Store cerrados; auth/RBAC central; rate limit; tests de paridad.
- AC-2.2: Go DTOs camelCase único; cero snake_case en contrato Go→mobile.
- AC-2.3: `image_url` en `exercise_library` propagado a mobile vía `LEFT JOIN exercise_library`.
- AC-2.4: `GET /workouts/:id/detail` retorna `{workout, exercises}`; History/WorkoutList cards no blank; WorkoutDetail muestra ejercicios.
- AC-2.5: TodayScreen sin mocks; datos reales de `activeWorkouts`.
- AC-2.6: Empezar/Continuar correcto (completed→Done/ninguno; progress>0→Continuar; progress==0→Empezar `POST /workouts/:id/session`).
- AC-2.7: Mismatches Go ↔ web/mobile alineados; sin errores de parseo.

**Riesgos:** migración `019` sin runner (aplicar manual a Turso, verificar DB compartida antes de QA); `/detail` roto oculta trabajo de imagen (fix como prerequisite); mismatch snake/camel si se salta un endpoint (central DTO pass + fixture test por pantalla); índice de sesión para reanudar no expuesto (añadir a detail DTO).

**Dependencias:** Fase 0 (backend verde) prerequisite.

---

### Fase 3 — Mobile atleta (P1, 4-6 días)

**Spec:** `docs/superpowers/specs/2026-11-02-fase3-mobile-atleta-design.md`  
**Rol responsable:** `dev-react-native`  
**Prerrequisito:** Fase 2 (datos reales del backend; sin ellos el móvil sigue con mocks).

| Slice | Tarea (PR-ready) | Archivos | AC |
|---|---|---|---|
| 3.1 | GPS en lote (batch cap 100, filtro accuracy >50m) | `apps/mobile/src/infrastructure/api/`, GPS service | AC-3.1 |
| 3.2 | Offline queue MMKV (encolar acciones sin conexión, reenviar al volver) | `apps/mobile/src/infrastructure/storage/`, MMKV | AC-3.2 |
| 3.3 | Reintento idempotente (idempotency key; backend deduplica) | idempotency key + backend dedup | AC-3.3 |
| 3.4 | Sync iniciado/completado con backend + audio cues + estado UI | WorkoutExecution + audio | AC-3.4 |
| 3.5 | Pruebas Jest + TypeScript (`npm test`, `npx tsc --noEmit`) | `apps/mobile/` | AC-3.5 |
| 3.6 | Validación real en emulador/dispositivo: navegación, listas, ejecución, summary, membership gate | emulador/dispositivo real | AC-3.6 |

**Criterios de aceptación (Fase 3):**
- AC-3.1: GPS batch enviado sin pérdida ni duplicados.
- AC-3.2: Acciones encoladas MMKV sin conexión; reenvío al recuperar conexión.
- AC-3.3: Reenvío idempotente; no hay duplicados en backend.
- AC-3.4: UI refleja iniciado→ejecutando→completado con audio cues.
- AC-3.5: `npm test` verde, `npx tsc --noEmit` verde.
- AC-3.6: Validación real en dispositivo pasa navegación, listas, ejecución, summary, membership gate.

**Riesgos:** validación en dispositivo real no disponible (AGENTS.md: sin dispositivo real = BLOCKED, no COMPLETE); GPS batch sin endpoint backend (Fase 2 prerequisite); MMKV crecimiento ilimitado (TTL/purga).

**Bloqueador potencial:** Global Mobile UI Validation Rule (AGENTS.md) — sin dispositivo/emulador real, la fase no se da por completa.

---

### Fase 4 — Web coach para cierre comercial (P2, 3-5 días)

**Spec:** `docs/superpowers/specs/2026-11-02-fase4-web-comercial-design.md`  
**Roles responsables:** `dev-front` + `ux-ui-designer` (+ `dev-backend` si endpoints nuevos)  
**Prerrequisito:** Fase 2 (contratos Go API).

| Slice | Tarea (PR-ready) | Archivos | AC |
|---|---|---|---|
| 4.1 | Coach public landing pages (`T-004`) sobre Go API | `apps/web/app/(app)/coach/` | AC-4.1 |
| 4.2 | Motor de políticas comerciales: comisiones, excepciones, historial | `apps/api/internal/payments/` (o existente) | AC-4.2 |
| 4.3 | RLS para comisiones por organización | migración (bloqueada hasta Fase 1) + policy | AC-4.3 |
| 4.4 | Anti-404 E2E Playwright (flujos críticos sin 404) | `apps/web/` e2e tests | AC-4.4 |
| 4.5 | Verificación API-first web (consumir Go API, no Next.js API routes para datos) | `apps/web/` clientes | AC-4.5 |

**Criterios de aceptación (Fase 4):**
- AC-4.1: Coach tiene perfil público dinámico para vender planes.
- AC-4.2: Comisión parametrizable por plan/atleta con historial de cambios.
- AC-4.3: RLS aísla comisiones por organización (org A no ve comisiones de org B).
- AC-4.4: Playwright E2E: cero 404 en flujos críticos.
- AC-4.5: Web consume Go API directamente (API-first).

**Riesgos:** motor de políticas requiere endpoints Go nuevos no definidos (definir contrato primero); RLS sin migración (bloqueada hasta Fase 1 evidencia PG); 404 tras consolidación (proxy fallback + contract tests + E2E).

---

### Fase 5 — Pulido mobile UX y release readiness (P2, continuo)

**Spec:** `docs/superpowers/specs/2026-11-02-fase5-mobile-ux-release-design.md`  
**Roles responsables:** `ux-ui-designer` + `dev-react-native` (+ `dev-backend`/`tech-writer` para docs)  
**No bloquea piloto controlado si Fases 0-2 verdes.**

| Slice | Tarea (PR-ready) | Archivos | AC |
|---|---|---|---|
| 5.1 | Rediseño pantallas B/C residuales (inventario `docs/mobile-app-ui-audit.md`) | `apps/mobile/src/features/*/screens/` | AC-5.1 |
| 5.2 | Re-ejecutar auditoría Mobile UI + Playwright Next | `apps/mobile/`, `apps/web/` e2e | AC-5.2 |
| 5.3 | Consolidar documentación: migraciones, contratos API, variables env | `docs/`, `apps/api/migrations/`, `.env.example` | AC-5.3 |
| 5.4 | Documentar corte y reversión (plan de rollback por cambio de schema/contrato) | `docs/plans/closeout-plan-2026-11-02.md` | AC-5.4 |

**Criterios de aceptación (Fase 5):**
- AC-5.1: Pantallas B/C residuales pasan criterios UX (loading, empty, error, primary action, 60 FPS, touch ≥44pt, safe areas).
- AC-5.2: Auditoría Mobile UI sin regresiones críticas; Playwright Next verde.
- AC-5.3: Documentación de migraciones, contratos API y variables env actualizada.
- AC-5.4: Plan de corte y reversión documentado.

**Nota auditoría mobile (2026-10-17):** Phases 4A-5B-5C ya cubrieron pantallas B/C; quedan AiWorkoutScreen (MediaPipe bloqueado nativo) e ImportHistoryScreen como bloqueos documentados. Fase 5 cierra lo residual.

---

## Veredicto para cerrar

- NO cerrar por código compilando.
- Cierre solo cuando: `go test ./...` verde, mobile Jest verde, TSC web/mobile verde, E2E críticos verde, y evidencia de aislamiento multi-tenant reproducible (Fase 1 AC-1.4).
- Migraciones quedan bloqueadas hasta completar Fase 1 (evidencia PG local). No aplicar migraciones en entornos compartidos.
- Items de UX/arquitectura durable fuera de P0 pueden moverse a release posterior sin bloquear un piloto controlado si Fases 0-2 verdes.

---

## Especs generados (referencia)

| Fase | Spec |
|---|---|
| Fase 0 | `docs/superpowers/specs/2026-11-02-fase0-baseline-higiene-design.md` |
| Fase 1 | `docs/superpowers/specs/2026-11-02-fase1-seguridad-tenancy-design.md` |
| Fase 2 | `docs/superpowers/specs/2026-11-02-fase2-api-datos-design.md` |
| Fase 3 | `docs/superpowers/specs/2026-11-02-fase3-mobile-atleta-design.md` |
| Fase 4 | `docs/superpowers/specs/2026-11-02-fase4-web-comercial-design.md` |
| Fase 5 | `docs/superpowers/specs/2026-11-02-fase5-mobile-ux-release-design.md` |

Cada spec sigue el template `docs/superpowers/specs/TEMPLATE-coach-feature.md` (problema, roles y AC, criterios UX, flujo, diseño, API, fuera de scope, riesgos, referencias, Definition of Done, plan de ejecución por slices).

---

## Roles del equipo (orca-team)

| Rol board | Responsabilidad en este plan |
|---|---|
| `dev-backend` | Fase 0, Fase 1, Fase 2 (backend), Fase 4 (endpoints nuevos) |
| `dev-front` | Fase 2 (frontend), Fase 4 (landing, E2E) |
| `dev-react-native` | Fase 3, Fase 5 (mobile UX) |
| `ux-ui-designer` | Fase 4 (landing UX), Fase 5 (rediseño B/C) |
| `db-architect` | Fase 1 (migración 012, esquema Outbox) |
| `qa` | Validación de AC en cada fase (tests + AC empíricos) |
| `security-hacker` | Fase 1 (aislamiento C2, RLS), Fase 4 (RLS comisiones) |
| `tech-writer` | Fase 5 (documentación migraciones, contratos, env) |

---

## Reglas aplicables (consultadas)

- `apps/rules/MASTER_PROMPT.md` (arquitectura antes que código, API-first, calidad sobre velocidad)
- `apps/rules/04-database-design.md` (migraciones, UUIDv7, RLS multitenencia)
- `apps/rules/05-backend-architecture.md` (Clean Architecture, UnitOfWork tx, DDD)
- `apps/rules/08-api-specification.md` (contratos API)
- `apps/rules/11-security.md` (auth, autorización, aislamiento multi-tenant)
- `apps/rules/12-coding-standards.md` (código, commits convencionales)
- `apps/rules/13-testing.md` (pruebas en cada capa)
- `apps/rules/14-team-workflow.md` (pipeline spec-first, roles, board)
- `AGENTS.md` (API-first, migraciones inmutables, no destructivo, móvil en dispositivo real, commits convencionales)
- `apps/api/AGENTS.md` (única fuente de verdad para datos)
