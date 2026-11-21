# T-003: Commerce System — Plans & Payments (Go API) — Design Spec

> Feature: gestión de planes y pasarela de pago en el backend Go (API fuente de verdad).
> Estado al iniciar: los servicios `plan`, `payment`, `checkout`, `membership`, `subscription` ya existen y están montados en `cmd/api/routes_setup.go`. El spec documenta el contrato activo y los acceptance criteria verificables.

---

## 1. Problema

El coach necesita crear planes de suscripción y el atleta necesita comprarlos. El Go API es la única fuente de verdad para este comercio; web y mobile consumen sus endpoints. Si estos servicios no están verificados (build/test verdes), el checkout y la membresía no son confiables.

---

## 2. Roles y AC

| Rol | Quién es | Goal principal |
|---|---|---|
| Coach | Crea y gestiona sus propios planes de suscripción | CRUD de planes, ver sus membresías activas |
| Athlete | Ve planes disponibles del coach y compra una membresía | Ver estado de membresía, iniciar compra, cancelar |

### Acceptance Criteria

- [ ] **AC-1:** Given un coach autenticado, When crea un plan (`POST /plans`), Then devuelve 201 con el plan persistido y `coach_id` del coach autenticado.
- [ ] **AC-2:** Given un coach, When lista sus planes (`GET /plans`), Then devuelve solo sus planes (ownership, no planes de otro coach).
- [ ] **AC-3:** Given un atleta autenticado, When consulta planes disponibles (`GET /athletes/membership/plans`), Then devuelve los planes activos del coach vinculado al atleta.
- [ ] **AC-4:** Given un atleta, When consulta su estado de membresía (`GET /athletes/membership/status`), Then devuelve `hasActiveMembership`, `status` y `daysRemaining`.
- [ ] **AC-5:** Given sin contexto de tenant/usuario, When se llama a cualquier endpoint de comercio, Then devuelve 403 sin panic.
- [ ] **AC-6:** Given compra de membresía, When inicia checkout, Then devuelve URL de pago y `checkoutId` (flujo híbrido start → claim).
- [ ] **AC-7:** `go build ./...`, `go vet ./...` y `go test ./...` pasan sin errores en `apps/api`.

---

## 3. Criterios UX (obligatorios)

Aplican al consumidor frontend (web/mobile), condicionan el contrato:

- **Loading:** skeleton/spinner al consultar planes o estado de membresía.
- **Empty:** ilustración + copy + acción sugerida cuando el coach no tiene planes.
- **Error:** mensaje humano + retry; nunca stack trace.
- **Primary action:** una por pantalla en la pantalla de planes (ej. "Suscribirse a plan X").
- **Mobile:** touch targets ≥ 44pt, safe areas respetadas.

---

## 4. Flujo de usuario

```
Coach: crear plan → publicar plan → atleta ve plan → comprar → membresía activa
```

---

## 5. Diseño (la solución)

Implementada en el Go API siguiendo Clean Architecture + feature-first:

**Domain:**
- `internal/domain/plan/plan.go` — `Plan`, `Version`
- `internal/domain/plan/repository.go` — `ListByCoach`, `ListAllActive`, `GetByID`, `Create`, `Update`, `Delete`, `ListVersionsByPlan`
- `internal/domain/membership/` — `Membership` aggregate, `RecalculateStatus`
- `internal/domain/subscription/subscription.go` — `Subscription`, `PaymentProvider` port
- `internal/domain/checkout/` — checkout domain (hybrid start/claim)

**Application:**
- `internal/application/plan/service.go` — `ListPlans`, `CreatePlan`, `GetPlanByID`, `ListActivePlans`, `GetActiveVersionByPlan`
- `internal/application/membership/service.go` — `GetMembership` (recalcula estado), `CreateMembership`
- `internal/application/payment/service.go` — `CreateCartPreference` (Wompi, cart con validación de stock)
- `internal/application/checkout/service.go` — `Start` (hybrid checkout, recupera checkout pagado por email)
- `internal/application/subscription/service.go` — suscripciones y pagos

**Infrastructure:** repositorios PostgreSQL en `internal/infrastructure/{plan,membership,payment,checkout,subscription}/`

**API (handlers):** `internal/interfaces/http/handlers/{plan.go,payment.go,checkout.go,membership.go,subscription.go}`

**Rutas (montadas en `cmd/api/routes_setup.go:128-237`):**
- `GET /plans` (coach, sus planes) — `RegisterPlanRoutes`
- `POST /plans`, `PUT /plans/:id`, `DELETE /plans/:id` (coach CRUD)
- `GET /coaches/:coachId/plans`, `GET /plans` (público, sin auth) — `RegisterPublicPlanRoutes`
- `GET /athletes/membership/status`, `GET /memberships`, `POST /memberships`, `PUT /memberships/:id/cancel`, `PUT /memberships/:id/renew`, `POST /memberships/trial` — `RegisterMembershipRoutes`
- `POST /payments/…`, `GET /payments/availability` — rutas de pago
- Checkout híbrido (start/claim) — `checkoutHandler.RegisterCheckoutRoutes`

Todos bajo `RequireCoach()` / `RequireAthlete()` y `RequireTenantContext`.

---

## 6. API (endpoints activos)

| Método | Path | Purpose | Estado |
|---|---|---|---|
| GET | /plans | Listar planes del coach autenticado | Activo |
| POST | /plans | Crear plan (coach) | Activo |
| PUT | /plans/:id | Actualizar plan (coach) | Activo |
| DELETE | /plans/:id | Eliminar plan (coach) | Activo |
| GET | /coaches/:coachId/plans | Planes públicos de un coach | Activo |
| GET | /plans (público) | Todos los planes activos publicados | Activo |
| GET | /athletes/membership/status | Estado de membresía del atleta | Activo |
| GET | /memberships | Membresías del atleta | Activo |
| POST | /memberships | Crear membresía (coach) | Activo |
| PUT | /memberships/:id/cancel | Cancelar membresía | Activo |
| POST | /memberships/trial | Iniciar prueba (atleta) | Activo |
| GET | /payments/availability | Disponibilidad de pasarela de pago | Activo |
| POST | /checkout/… | Checkout híbrido (start/claim) | Activo |

Contrato detalle: `apps/rules/08-api-specification.md`.

---

## 7. Fuera de scope (explícito)

- Stripe nativo: el proyecto usa Wompi/MP para checkout (`payment service` inyecta `wompi.NewAdapter`). Stripe se menciona en la visión de negocio pero no es la implementación actual.
- Web/mobile frontend: consumen estos endpoints; no se tocan en este spec.
- Webhooks de pago entrantes (Wompi/MP callbacks): no son parte de este spec.

---

## 8. Riesgos y decisiones abiertas

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El atleta acceda a planes de otro coach | Medio | `ListByCoach` filtra por `coach_id`; rutas públicas solo exponen planes `is_active=true`. |
| Panic por contexto de tenant ausente | Medio | `middleware.GetCoachID` / `GetUserID` usan comma-ok (verificado en T-001). |
| Pasarela de pago caída | Medio | `GET /payments/availability` expone `checkout_allowed` / `fail_closed` para fail-closed en mobile. |

---

## 9. Referencias

- `apps/rules/MASTER_PROMPT.md` — principios de ingeniería y producto.
- `apps/rules/00-product-vision.md` — módulo Payments (Sección 4.6) y negocio (Sección 5).
- `apps/rules/05-backend-architecture.md` — Clean Architecture, handler pattern, CQRS.
- `apps/rules/08-api-specification.md` — contrato de API.
- `apps/rules/11-security.md` — todo autenticado, autorizado, validado; RLS defensa en profundidad.
- Spec similar previo: `docs/superpowers/specs/T-011-coach-landing-canvas.md`.

---

## Verificación

```
cd apps/api && go build ./... && go vet ./... && go test ./...
```

Todos deben pasar. Los paquetes de comercio (`plan`, `payment`, `checkout`, `membership`, `subscription`) deben tener tests verdes.
