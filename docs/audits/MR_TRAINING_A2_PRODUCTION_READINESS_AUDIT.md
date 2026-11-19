# MR TRAINING — Auditoría A2 / Producción Readiness

Fecha: 2026-11-04  
Rama auditada: dev (checkout principal limpio)  
Modo: SOLO LECTURA. No se ejecutaron migraciones ni cambios de datos.

## 1. Resumen ejecutivo
- Implementación A1/A2 parcial. Modelo vigente: coach-as-tenant (`coach_id`), no organizations.
- A1 (UnitOfWork) implementado en código; A2 (middleware/contexto) parcial y de adopción baja.
- Web dejó de tener DB directa (solo adapter HTTP/webhook Clerk), migrada a Go API.
- No hay evidencia de RLS operativa ni de aislamiento real por PostgreSQL.
- Build local Go + vet OK; tsc web OK.
- go test ./... falla por TestMigrationPlanOrdering (cmd/data-migrate) como preexistente de entorno.
- Veredicto: **B. A2 requiere correcciones antes de continuar.**

## 2. Git y protección de producción
- Rama actual: dev; estado local limpio.
- Worktrees activos existen; rama feature/mobile-running-stability y dev están actualizados.
- No se confirmó estado real de producción por evidencia del repo; solo por docs/CI.
- Sin cambios archivos, migraciones o configuraciones en esta auditoría.

## 3. Arquitectura real Web → Go → DB
- Web consume Go API mediante `goFetch`/`proxyToGo`; Next.js ya no maneja DB directa excepto infra (db.ts) y webhook adapter.
- Go Fiber + middleware Clerk(auth) y tenant context.
- UoW establece `app.current_user_id`, `app.current_coach_id`, `app.user_role` con `set_config(..., true)`.
- RLS todavía no está autorizado/validado.

## 4. Inventario UnitOfWork
- 13 repositorios declaran `WithExecutor`: ally, analytics, coach, coach_settlement, coachfeed, commission, commission_entry, event, exercise, invite, running, store, support.
- 52 repositorios totales (39 directos).
- `database.NewUnitOfWork` usado en coach.go, analytics.go y running.service.runInTx.
- A2 adopción parcial, no uniforme.

## 5. Middleware y tenant resolver
- `RequireTenantContext` implementado.
- Coach validado por `coaches.is_active`.
- Atleta valida `coach_athlete_links` con `X-Coach-ID`.
- Falta en operaciones sin contexto/Rol/admin no definido; handlers deben validar `GetCoachID()`.

## 6. RLS / PostgreSQL
- No se ejecutaron migraciones ni RLS real.
- B2 bloqueada y P0 por diseño pendiente.
- PostgreSQL local requerido para validación; no tocar QA/producción.

## 7. Handlers y rutas
- 61 archivos en handlers; middleware mixto.
- No todos los endpoints tienen UoW activo.
- Prioridad: completar tenant context obligatorio en flujos sensibles.

## 8. Pruebas y compilación
- `go build ./...`: PASS.
- `go vet ./...`: PASS.
- `go test ./...`: falla preexistente `cmd/data-migrate/TestMigrationPlanOrdering`.
- `npx tsc --noEmit` Web: PASS.
- `npm run lint` web: solo warnings.
- Tests de handlers/ mock no equivalentes a PG real.

## 9. Riesgos producción
- P0: handlers sin GetCoachID() forzado, prompting IDOR/cross-coach access.
- P0: repos without UoW/integration can bypass transactional context.
- P0: middleware permisivo cuando falta coach context relies on handler discipline.
- P1: B2 not implemented; RLS only planned.
- P1: B1 not implemented; async payments rely on webhooks alone without durable worker.
- P1: partial integration may unexpectedly break legacy endpoints.
- P1: migration mismatch SQLite/Postgres (`datetime()`, etc.).
- P2: no real PG pool tests.
- P3: docs/dup rules and worktrees stale.

## 10. Matriz de estado general
| Área | Estado actual | Evidencia | Trabajo pendiente | Riesgo producción |
|---|---|---|---|---|
| Web | PARCIAL | goFetch/proxy mayoritario; direct DB removido | limpiar configs minor | P2 |
| Clerk | COMPLETO | auth SDK + webhook forwarding | hardening webhook only | P2 |
| API Go | PARCIAL | handlers/repos; 61 handlers | integración uniforme | P1 |
| Middleware | PARCIAL | RequireTenantContext real | fail-closed en handlers | P0 |
| UnitOfWork | PARCIAL | A1 implementado; baja adopción | services/flows críticos | P0 |
| Servicios | PARCIAL | runInTx/UnitOfWork solo en algunos | inventario UoW | P1 |
| Repositorios | PARCIAL | 13/52 WithExecutor | clasificar/instrumentar | P1 |
| Handlers | PARCIAL | middlewares mixtos | validar tenant obligatorio | P0 |
| PostgreSQL | PENDIENTE / NO VERIFICADO | migrations; sin test real | entorno local exclusivo | P1 |
| RLS | BLOQUEADO | B2 no autorizada ni implementada | políticas + pruebas | P0 |
| Tests | PENDIENTE | build/test passing mocks, PG fail integration | pg local + aislamiento | P1 |
| CI/CD | COMPLETO (parcial) | workflows; Go api issue preexisting | separated dev vs QA | P2 |

## 11. Criterios de aceptación A2
- `go build ./...` y `go vet ./...` PASS
- UoW integrado en todos los flujos críticos
- `GetCoachID()` validado por handlers sensibles y negación real
- Negación de accesos cross-coach/IDOR
- PostgreSQL local (no QA/prod) validado
- No migraciones en entornos compartidos
- Branch feature/integration lista para review

## 12. Veredicto final
**B. A2 REQUIERE CORRECCIONES ANTES DE CONTINUAR.**

A1 existe pero adopción A2 desigual; contexto tenant no está globalmente impuesto, RLS no validada, faltan pruebas PG reales.

## 13. Siguientes pasos (sin implementar)
1. Inventario de handlers/endpoints y aplicar validación tenant explícita (`GetCoachID()`) en todos los sensibles.
2. Preparar PostgreSQL local exclusivo para A1/A2.
3. Diseño/aplicación B2 (esperar autorización).
4. B1 para pagos y eventos confiables.
5. C1/C2 después de B2.

Generado como auditoría read-only.