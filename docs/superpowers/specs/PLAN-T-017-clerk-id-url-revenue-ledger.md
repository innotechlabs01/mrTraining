# Plan T-017 — Eliminar exposición de Clerk ID en URLs del admin + verificar ingresos wompi_payment_ledger

**Estado:** Propuesta (plan únicamente, sin cambios de código)
**Board ref:** T-017 (TODO en BOARD.md)
**Fecha:** 2026-11-18
**Autor:** Architect (dispatched worker)

---

## 1. Contexto y problema

Hay dos problemas relacionados bajo la misma ticket T-017:

### 1.1 Clerk ID expuesto en URL path (riesgo de seguridad)

El frontend `apps/web/src/app/(app)/admin/coaches/page.tsx` llama a
`POST /api/v1/admin/coaches/:id/skip-substitution` pasando `coach.id` directamente
en el path (líneas 87-92, 146).

`coach.id` proviene de `AdminCoachSummary.ID`, poblado por `queryCoaches`
(`apps/api/internal/interfaces/http/handlers/admin.go:344`). Ese CTE hace un
`UNION` de:

- `SELECT c.id FROM coaches c` → id interno de la tabla `coaches` (UUID interno)
- `SELECT u.id FROM users u WHERE u.role = 'coach'` → **`users.id`, que es el Clerk ID**

Por tanto `coach.id` puede ser un Clerk ID o un id interno, según si el coach
tiene fila en `coaches`. El backend `ToggleSkipSubscription` (admin.go:480)
acepta ambos (`:id` puede ser `users.id` o `coaches.id`) y hace fallback por
email. El propio comentario del handler (líneas 477-479) reconoce:
> "The frontend must not expose Clerk IDs in URLs; this endpoint accepts them for backward compatibility"

**Riesgo (per `apps/rules/11-security.md`):**
- Los Clerk IDs en el path quedan grabados en **logs de acceso del servidor** (regla §7.2: "Secrets never appear in... Log output").
- Quedan en **Referer headers** al navegar fuera de la app (regla §6.4 Referrer-Policy).
- Quedan en el **historial del navegador**.
- Un Clerk ID es un identificador de autenticación: su exposición facilita enumeración y ataques dirigidos contra cuentas de coach.
- Violación del principio "Everything logged" — dato sensible de identidad en logs.

### 1.2 Ingresos no visibles en wompi_payment_ledger (super admin dashboard)

`GET /api/v1/admin/revenue` → `GetRevenueStats` en
`apps/api/internal/infrastructure/crm/repository.go:228`.

Consulta `wompi_payment_ledger` con:
- `WHERE status NOT IN ('pending', 'reversed')` → **excluye pagos con status `pending`**.
- Scope por `coachAndAthleteScope`: coaches activos (`is_active = 1`) y sus atletas
  mediante `coach_athlete_links` activos.
- Filtros de fecha: `period_start::date = CURRENT_DATE` (hoy), `>= date_trunc('month', NOW())` (mes), etc.

Posibles causas de que devuelva 0:
1. Pagos con status `pending` (excluidos por la consulta).
2. `coach_id` / `athlete_id` en el ledger no coinciden con coaches activos o links inactivos (desajuste de IDs).
3. RLS: migración `427_super_admin_dashboard_rls.sql` añade política
   `policy_wompi_ledger_select_super_admin` que permite SELECT solo cuando
   `current_coach_id` está vacío. Si el contexto de app setea `current_coach_id` a algo no vacío, el super admin vería 0 filas.
4. No hay filas en `wompi_payment_ledger` para el periodo (datos reales ausentes).

El dashboard frontend (`apps/web/src/app/(app)/admin/dashboard/page.tsx:240-243`)
ya tiene un fallback: suma `revenue_month` de cada coach si `/revenue` devuelve 0.
Pero el endpoint agregado `/revenue` sigue devolviendo 0.

---

## 2. Descomposición (slices)

Cada slice es implementable y revisable de forma independiente.

### Slice A — Backend: resolver skip-subscription por coaches.id interno (dev-backend)

**Objetivo:** `ToggleSkipSubscription` trabaje con el id interno de `coaches`, no con Clerk `users.id`.

1. Añadir al `AdminCoachSummary` un campo `coach_id` (interno, de tabla `coaches`) garantizado, separado de `id` (que puede ser Clerk).
   - En `queryCoaches`, para la rama de `users` (coaches sin fila en `coaches`), asegurar existencia de fila en `coaches` (upsert/reparación) o devolver un id interno estable.
2. `ToggleSkipSubscription`: aceptar `:id` como `coaches.id` internamente; mantener fallback por `users.id` solo para retrocompatibilidad (marcado deprecado), pero **no registrar el valor crudo en logs**.
3. Añadir tests de unidad: lookup por coaches.id, lookup por users.id (fallback), 404 cuando no existe en ninguna tabla, y que no se loguee el Clerk ID.

### Slice B — Frontend: enviar coaches.id interno en la URL (dev-front)

**Objetivo:** El navegador nunca envíe un Clerk ID en el path de skip-subscription.

1. En `apps/web/src/app/(app)/admin/coaches/page.tsx`, `toggleSkipSubscription` usar el campo interno `coach.coach_id` (nuevo de Slice A) en lugar de `coach.id` al construir la URL.
2. Si `coach.coach_id` está vacío, deshabilitar el toggle / mostrar error en lugar de enviar un posible Clerk ID.
3. Actualizar la interfaz `Coach` con el campo `coach_id`.
4. Tests frontend: verificar que la URL construida no contenga patrón de Clerk ID (`user_...`).

### Slice C — Backend: investigar y corregir GetRevenueStats / wompi_payment_ledger (dev-backend)

**Objetivo:** Identificar causa raíz de ingresos = 0 y corregirla.

1. Ejecutar contra la base local vacía (regla de migraciones: verificar en local antes de QA):
   - `SELECT status, count(*) FROM wompi_payment_ledger GROUP BY status` → ver si hay filas `pending`.
   - `SELECT coach_id, athlete_id FROM wompi_payment_ledger` vs `coaches.id` / `users.id` → detectar desajuste.
   - Verificar si RLS bloquea al super admin (contexto `app.current_coach_id`).
2. Según hallazgo, aplicar corrección:
   - Si son `pending`: decidir si incluir `pending` en ingresos (con desglose) o dejar excluido y mostrar estado pendiente por separado.
   - Si es desajuste de IDs: normalizar `coach_id`/`athlete_id` en el ledger o ajustar el scope de la consulta.
   - Si es RLS: asegurar que el handler del super admin no setee `current_coach_id` (usa `db.DB` directo, sin set_config) o añadir política adecuada.
3. Añadir tests de unidad de `GetRevenueStats` cubriendo: filas `pending` excluidas, filas `approved` incluidas, scope de coach inactivo excluido.

### Slice D — Frontend: dashboard muestra estado de ingresos (dev-front, opcional/según Slice C)

1. Si `GetRevenueStats` devuelve 0 por pagos pendientes, mostrar en el dashboard una nota "ingresos pendientes de confirmación" en lugar de 0 silencioso.
2. Mantener el fallback existente a `revenue_month` de coaches.

---

## 3. Asignación de roles

| Slice | Rol | Responsable |
|-------|-----|-------------|
| A | dev-backend (Go/Fiber) | Backend: handler, repo, tests |
| B | dev-front (Next.js) | Frontend: page, types, tests |
| C | dev-backend (Go/Fiber) | Backend: GetRevenueStats, investigación de datos, tests |
| D | dev-front (Next.js) | Frontend: dashboard nota de pendientes |

Arquitecto: revisa plan y contratos. QA: valida pruebas. Code reviewer + security-hacker: revisanSlice A/B por exposición de IDs en logs/Referer.

---

## 4. Criterios de aceptación

### Seguridad (Clerk ID en URL)
1. Ninguna petición de skip-subscription construida por el frontend incluya un Clerk ID (`user_...`) en el path de la URL.
2. `POST /api/v1/admin/coaches/:id/skip-subscription` devuelve 200 cuando se pasa un `coaches.id` interno válido.
3. Devuelve 404 solo cuando el coach no existe en ninguna tabla (`users` ni `coaches`).
4. Los logs del handler no contienen el valor crudo de `:id` ni el Clerk ID.
5. Referer headers y historial del navegador quedan libres de Clerk IDs al usar el toggle.

### Ingresos (wompi_payment_ledger)
6. Se identifica y documenta la causa raíz de ingresos = 0 (status pending, desajuste de IDs, RLS, o falta de datos).
7. Los pagos con status `approved` (o el status de pago válido) aparecen en `GET /api/v1/admin/revenue` para el super admin.
8. `go build ./...` y `go test ./...` verdes en `apps/api`.
9. `pnpm lint`, `pnpm test`, `pnpm build` verdes en `apps/web`.

---

## 5. Riesgos

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Coaches que solo existen en `users` (sin fila en `coaches`) no tienen `coaches.id` interno | Medio | Slice A garantiza una fila en `coaches` (upsert/reparación) o id interno estable antes de exponerlo al frontend. |
| Retrocompatibilidad: clientes existentes envían `users.id` | Bajo | Mantener fallback en backend (deprecado), pero frontend deja de enviarlo. |
| RLS en tabla `coaches` sin política de super admin (migración 427 no cubre `coaches`) — root cause D del spec previo | Medio | Verificar si `coaches` tiene RLS habilitada; si es así, añadir política de super admin o evitar consultar `coaches` directamente desde el handler del super admin. |
| Pagos realmente en `pending` (aún no confirmados por Wompi) | Bajo | No son ingresos definitivos; mostrar por separado o excluirlos con nota clara. |
| Desajuste `coach_id`/`athlete_id` en ledger histórico | Medio | Consultar y normalizar datos; no asumir que los IDs coinciden con `users.id`. |
| Cambio de contrato (`coach_id` nuevo en `AdminCoachSummary`) | Bajo | Coordinar con Web y Mobile per regla API-first; solo Web consume este endpoint hoy. |

---

## 6. ¿Qué NO se toca en este plan

- No se migra de Turso/LibSQL a PostgreSQL (la regla obliga a `pgx`/`database/sql` con PostgreSQL, pero ese cambio es aparte de esta tarea).
- No se modifica el móvil (no consume este endpoint).
- No se añaden capacidades nuevas de pago; solo se corrige lectura/reporting de ingresos existentes.
- No se eliminan los fallbacks de retrocompatibilidad del backend sin coordinación previa con Web.

---

## 7. Próximos pasos (tras aprobación del plan)

1. Crear worktree `feature/t-017-clerk-id-url-revenue` (no trabajar en `main`).
2. Implementar Slice A (backend) + Slice B (frontend) en paralelo, coordinando el contrato `coach_id`.
3. Implementar Slice C (investigación + corrección de GetRevenueStats).
4. Ejecutar `go build ./... && go test ./...` en API y `pnpm lint && pnpm test && pnpm build` en Web.
5. PR a `dev`, review chain (QA → code reviewer → security-hacker), USER GATE, merge.
