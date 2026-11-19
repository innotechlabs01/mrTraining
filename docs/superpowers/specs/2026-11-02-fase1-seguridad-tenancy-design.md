# Fase 1 — Seguridad y tenancy verificable — Design Spec

> **Fase de cierre del plan `docs/plans/closeout-plan-2026-11-02.md`. Planificación desglosada en slices listos para PR. No incluye código de implementación.**

---

## 1. Problema

La seguridad multi-tenant tiene A1/A2 implementadas a nivel código, pero B1/B2/C2 bloqueadas. El Outbox (migración 012) diverge del contrato aprobado: faltan `event_id` (obligatorio/único), `locked_by`, `locked_until`, status `dead` e índices correspondientes; no hay worker durable; los inserts de Outbox usan `*sql.DB` fuera de la transacción de negocio (riesgo de doble escritura / eventos huérfanos). Además, no hay PostgreSQL local para evidencia reproducible de aislamiento C2, y las migraciones están bloqueadas hasta que exista esa evidencia. No se aplican migraciones hasta validar en PG local.

---

## 2. Roles y AC

| Rol | Quién es | Goal principal |
|---|---|---|
| dev-backend | Go API + DB (apps/api) | Outbox transaccional + worker durable + UnitOfWork tx |
| db-architect | Diseño de esquema PostgreSQL | Migración 012 corregida al contrato aprobado |

### Acceptance Criteria

- [ ] **AC-1.1:** Given migración 012 actual, When se corrige al contrato Outbox aprobado, Then incluye `event_id` UUID obligatorio/único, `locked_by`, `locked_until`, status con valor `dead`, e índices para `FOR UPDATE SKIP LOCKED` + retry.
- [ ] **AC-1.2:** Given worker durable, When implementa `claimToken`, `FOR UPDATE SKIP LOCKED`, idempotencia por `event_id`, estados terminal/retry/backoff, Then un evento se publica una sola vez incluso con múltiples workers.
- [ ] **AC-1.3:** Given inserts de Outbox, When se mueven a la misma transacción PostgreSQL que la operación de negocio (UnitOfWork tx), Then no hay eventos fuera de tx ni vía `*sql.DB` suelto.
- [ ] **AC-1.4:** Given PostgreSQL local, When se levantan pruebas C2 de aislamiento multi-tenant, Then se adjunta evidencia reproducible (logs/capturas) de que organización A no ve datos de organización B.
- [ ] **AC-1.5:** Given bloqueo de migraciones, When no hay evidencia PG local, Then no se aplica ninguna migración en entornos compartidos.

---

## 3. Criterios UX

No aplica (capa de infraestructura/backend).

---

## 4. Flujo de usuario

No aplica (capa de infraestructura/backend).

---

## 5. Diseño (la solución)

### Slices de trabajo (PR-ready, en orden)

1. **Slice 1.1 — Corregir migración 012 Outbox**: `apps/api/migrations/postgres/012_outbox_transaccional.sql` añade `event_id` UUID NOT NULL UNIQUE (default `gen_random_uuid()`), `locked_by` VARCHAR, `locked_until` TIMESTAMPTZ, status `dead`, índices para selección pendiente con lease y retry. Migración numerada nueva si 012 ya fue aplicada (regla: no reescribir aplicada).
2. **Slice 1.2 — UnitOfWork tx para Outbox**: refactor `insertOutbox*` en `service.go` y callers (`CreateTemplate`, `CreateAssignment`, `CompleteSession`) para insertar Outbox dentro de la misma tx de la operación de negocio, no vía `*sql.DB` suelto.
3. **Slice 1.3 — Worker durable Outbox**: `claimToken`, `FOR UPDATE SKIP LOCKED`, idempotencia por `event_id`, estados `pending`/`processing`/`published`/`dead`, backoff exponencial, `next_retry_at`.
4. **Slice 1.4 — PG local + evidencia C2**: levantar PostgreSQL local (stack memory-gateway o dedicada), ejecutar pruebas de aislamiento multi-tenant, adjuntar evidencia reproducible.
5. **Slice 1.5 — Confirmar bloqueo de migraciones**: documentar que no se aplica migración hasta evidencia PG; validar que migración 012 corre en PG local vacía antes de considerar aplicarla.

### Estructura de rutas / screens

No aplica.

### Componentes

No aplica.

### Types

No se añaden tipos de dominio nuevos; solo campos de esquema Outbox y firma de tx.

---

## 6. API (si aplica)

No aplica (capa de infraestructura, sin cambio de contrato HTTP externo).

| Método | Path | Purpose |
|---|---|---|
| — | — | — |

Contrato detalle: `apps/rules/08-api-specification.md`.

---

## 7. Fuera de scope (explícito)

- No se aplican migraciones en entornos compartidos (bloqueo hasta PG evidencia).
- No se implementa el worker como consumo de NATS aquí; solo el Outbox polling worker (NATS es capa separada).
- No se toca `apps/web` ni `apps/mobile`.
- No se implementan políticas comerciales (Fase 4).

---

## 8. Riesgos y decisiones abiertas

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Migración 012 ya aplicada en algún entorno → no reescribir | Medio | Crear migración numerada nueva (ej. `204_1_outbox_contract.sql`) si 012 ya fue aplicada; nunca modificar aplicada. |
| `*sql.DB` fuera de tx deja eventos huérfanos si falla negocio | Alto | UnitOfWork tx como AC-1.3; revisar todos los `insertOutbox*` callers. |
| PG local no disponible para evidencia C2 | Medio | Usar stack memory-gateway (Postgres :5434) o instancia dedicada dedicada; documentar cómo levantar. |
| Worker durable sin lease correcto → doble publicación | Alto | `FOR UPDATE SKIP LOCKED` + `locked_by`/`locked_until` + idempotencia `event_id`. |

---

## 9. Referencias

- Plan maestro: `docs/plans/closeout-plan-2026-11-02.md` §Fase 1.
- Migración actual: `apps/api/migrations/postgres/012_outbox_transaccional.sql`.
- Servicio Outbox actual: `apps/api/internal/application/running/service.go` (métodos `insertOutbox*`).
- Reglas: `apps/rules/04-database-design.md` (§migración, §multitenencia/RLS), `apps/rules/11-security.md` (§aislamiento), `apps/rules/05-backend-architecture.md` (§transacciones, §UnitOfWork).

---

## Definition of Done (Fase 1)

- Migración 012 corregida al contrato Outbox aprobado (event_id único, locked_by/unlocked, dead, índices)
- Outbox insert dentro de UnitOfWork tx (ningún `*sql.DB` suelto)
- Worker durable con claimToken + SKIP LOCKED + idempotencia + estados terminal/retry/backoff
- PG local levantado; evidencia C2 de aislamiento multi-tenant adjunta
- Bloqueo de migraciones confirmado hasta evidencia PG

---

**Roles responsables:** `dev-backend` + `db-architect`  
**Tiempo estimado:** 3-5 días  
**Prioridad:** P0 (bloquea aplicación de migraciones y seguridad C2)

---

## Plan de ejecución por slices (sugerido para dispatch)

| Slice | Título | Archivos | Rol | AC |
|---|---|---|---|---|
| 1.1 | Corregir migración 012 al contrato Outbox | `apps/api/migrations/postgres/012_outbox_transaccional.sql` (o nueva numerada) | db-architect | AC-1.1 |
| 1.2 | UnitOfWork tx para inserts de Outbox | `apps/api/internal/application/running/service.go` + callers | dev-backend | AC-1.3 |
| 1.3 | Worker durable Outbox (claimToken, SKIP LOCKED, idempotencia) | nuevo paquete worker en `apps/api/` | dev-backend | AC-1.2 |
| 1.4 | PG local + evidencia C2 aislamiento | scripts/local + evidencia adjunta | dev-backend | AC-1.4 |
| 1.5 | Bloqueo de migraciones documentado | `docs/plans/closeout-plan-2026-11-02.md` | dev-backend | AC-1.5 |
