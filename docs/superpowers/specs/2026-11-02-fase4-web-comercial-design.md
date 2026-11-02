# Fase 4 — Web coach para cierre comercial — Design Spec

> **Fase de cierre del plan `docs/plans/closeout-plan-2026-11-02.md`. Planificación desglosada en slices listos para PR. No incluye código de implementación.**

---

## 1. Problema

El cierre comercial del coach está incompleto: (1) coach public landing pages (`T-004` en BOARD.md) pendiente sobre Go API; (2) motor de políticas comerciales (comisiones, excepciones, historial) no implementado; RLS para comisiones incompleto; (3) flujos críticos con posibles 404 (redirect/proxy) no validados con E2E Playwright. Fase 2 (consolidación API) es prerequisite: la landing y las políticas consumen contratos Go API.

---

## 2. Roles y AC

| Rol | Quién es | Goal principal |
|---|---|---|
| dev-front | Next.js web (apps/web) | Landing coach T-004, anti-404 E2E, consumir Go API |
| ux-ui-designer | Diseño UX (apps/web) | Landing visual, criterios UX, diseño de páginas |
| dev-backend | Go API (apps/api) | Motor de políticas + comisiones + RLS (si endpoints nuevos) |

### Acceptance Criteria

- [ ] **AC-4.1:** Given coach public landing pages (`T-004`), When se completan sobre Go API, Then coach tiene perfil público dinámico para vender planes.
- [ ] **AC-4.2:** Given motor de políticas comerciales, When es parametrizable (comisiones, excepciones, historial), Then se puede configurar comisión por plan/atleta con historial de cambios.
- [ ] **AC-4.3:** Given RLS para comisiones, When se implementa, Then organización A no ve comisiones de organización B (defensa en profundidad).
- [ ] **AC-4.4:** Given redirect/proxy, When se valida con Playwright E2E, Then flujos críticos sin 404 (cero 404 en rutas críticas).
- [ ] **AC-4.5:** Given consumo de Go API, When web llama endpoints Go (no Next.js API routes para datos), Then API-first respetado.

---

## 3. Criterios UX (obligatorios)

- **Loading:** skeleton o spinner contextual.
- **Empty:** ilustración + copy + acción sugerida.
- **Error:** mensaje humano + retry.
- **Primary action:** una por pantalla.
- **Mobile:** 60 FPS, touch targets ≥ 44pt, safe areas (landing también responsive).

---

## 4. Flujo de usuario

```
Visitante llega a landing coach → ve perfil público del coach + planes
Visitante selecciona plan → flujo de compra/suscripción (Polar/Stripe)
Coach configura comisión → motor de políticas (comisión, excepción, historial)
Coach ve historial de comisiones → RLS aísla por organización
Navegación por flujos críticos → Playwright verifica cero 404
```

Incluir: back navigation, estados de error en cada paso.

---

## 5. Diseño (la solución)

### Slices de trabajo (PR-ready, en orden)

1. **Slice 4.1 — Coach public landing pages (`T-004`)**: páginas públicas dinámicas de coach sobre Go API (perfil, planes, reserva).
2. **Slice 4.2 — Motor de políticas comerciales**: comisiones parametrizables, excepciones, historial de cambios (backend Go si endpoints nuevos; else consumir existentes).
3. **Slice 4.3 — RLS para comisiones**: políticas de fila por organización en tabla de comisiones.
4. **Slice 4.4 — Anti-404 E2E Playwright**: validar flujos críticos sin 404; redirect/proxy funcionando.
5. **Slice 4.5 — API-first verificación**: web consume Go API directamente (no Next.js API routes para datos).

### Estructura de rutas / screens

`/(app)/coach/<slug>/` (landing pública), rutas de planes y compra.

### Componentes

| Componente | Responsabilidad |
|---|---|
| CoachPublicProfile | Shell de landing pública |
| CoachPlansList | Lista de planes del coach |
| PolicyEngine | configurar comisión/excepción/historial |
| CommissionTable | tabla de comisiones con RLS |

### Types

Tipos derivados del contrato Go API (OpenAPI), no escritos a mano.

---

## 6. API (si aplica)

**Regla:** endpoints nuevos se definen en `apps/api` (Go) primero.

| Método | Path | Purpose |
|---|---|---|
| GET | /api/v1/coaches/:slug | perfil público de coach |
| GET | /api/v1/coaches/:slug/plans | planes públicos del coach |
| POST | /api/v1/policies/commission | configurar comisión |
| GET | /api/v1/commissions | listar comisiones (RLS por org) |

Contrato detalle: `apps/rules/08-api-specification.md`.

---

## 7. Fuera de scope (explícito)

- Migraciones de base de datos (bloqueadas hasta Fase 1).
- Rediseño visual de pantallas móviles B/C (Fase 5).
- SSR-only routes / webhooks internos (out of scope de api-endpoint-consolidation).

---

## 8. Riesgos y decisiones abiertas

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Motor de políticas requiere endpoints Go nuevos no definidos | Medio | Definir contrato en Go API antes de implementar frontend. |
| RLS para comisiones sin migración (bloqueada Fase 1) | Alto | RLS se aplica con migración; no se avanza sin Fase 1 evidencia PG. |
| 404 en flujos críticos tras consolidación API | Medio | Proxy fallback + contract tests (Fase 2) + E2E Playwright (esta fase). |

---

## 9. Referencias

- BOARD.md: `T-004` Coach Public Landing Pages.
- Proposal: `openspec/changes/api-endpoint-consolidation-ddd/proposal.md`.
- Plan maestro: `docs/plans/closeout-plan-2026-11-02.md` §Fase 4.
- Reglas: `apps/rules/06-frontend-architecture.md`, `apps/rules/08-api-specification.md`, `apps/rules/04-database-design.md` (RLS), `apps/rules/11-security.md`.

---

## Definition of Done (Fase 4)

- Coach public landing pages (`T-004`) sobre Go API completadas
- Motor de políticas comerciales (comisiones, excepciones, historial) implementado
- RLS para comisiones por organización
- Playwright E2E: flujos críticos sin 404
- Web consume Go API (API-first), cero Next.js API routes para datos

---

**Roles responsables:** `dev-front` + `ux-ui-designer` (+ `dev-backend` si endpoints nuevos)  
**Tiempo estimado:** 3-5 días  
**Prioridad:** P2

---

## Plan de ejecución por slices (sugerido para dispatch)

| Slice | Título | Archivos | Rol | AC |
|---|---|---|---|---|
| 4.1 | Coach public landing pages T-004 | `apps/web/app/(app)/coach/` | dev-front + ux-ui-designer | AC-4.1 |
| 4.2 | Motor de políticas comerciales | `apps/api/internal/payments/` (o existente) | dev-backend | AC-4.2 |
| 4.3 | RLS para comisiones | migración (bloqueada hasta Fase 1) + policy | dev-backend | AC-4.3 |
| 4.4 | Anti-404 E2E Playwright | `apps/web/` e2e tests | dev-front | AC-4.4 |
| 4.5 | Verificación API-first web | `apps/web/` clientes | dev-front | AC-4.5 |
