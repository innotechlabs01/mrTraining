# T-002: Mobile Athlete Feature Connection — Design Spec

> Feature: conectar las features del atleta en `apps/mobile` (React Native/Expo) al Go API como única fuente de verdad.
> Estado al iniciar: mobile ya consume el Go API vía `apiClient` (baseURL `${GO_API_URL}/api/v1`) con un `GO_API_PATH_MAP` que traduce paths mobile → paths Go. La mayoría de los endpoints ya existen en el API. El spec documenta el contrato activo, los gaps menores y los acceptance criteria.

---

## 1. Problema

La app móvil del atleta necesita leer y escribir sus datos en el Go API: membresía, planes disponibles, workouts, running (templates/assignments/sesiones), check-ins, salud, notificaciones y pagos. Si algún endpoint consumido por mobile no existe en el API, o si el path map de mobile apunta a rutas que no existen, la app falla en runtime sin ser detectable en compile-time.

---

## 2. Roles y AC

| Rol | Quién es | Goal principal |
|---|---|---|
| Athlete | Usuario de la app móvil | Ver membresía, comprar planes, ejecutar workouts, registrar running, ver métricas de salud |
| Coach | (indirecto) | Sus planes y workouts son visibles y comprados por sus atletas desde mobile |

### Acceptance Criteria

- [ ] **AC-1:** Cada endpoint consumido por mobile (vía `apiClient` o `smartClient`) existe en el Go API montado en `cmd/api/routes_setup.go`.
- [ ] **AC-2:** El `GO_API_PATH_MAP` de `apps/mobile/src/infrastructure/api/client.ts` no contiene entradas que apunten a rutas inexistentes.
- [ ] **AC-3:** Mobile compila: `npx tsc --noEmit` (o equivalente) sin errores de tipo.
- [ ] **AC-4:** Los tests de mobile pasan: `npm test` (Jest) verde.
- [ ] **AC-5:** `go build ./...`, `go vet ./...` y `go test ./...` del API pasan (no hay regresión por cambios en mobile que toquen contrato compartido).

---

## 3. Criterios UX (obligatorios)

Aplican a las pantallas mobile que consumen estos endpoints:

- **Loading:** spinner/esqueleto mientras se carga membresía, planes o workouts.
- **Empty:** ilustración + copy + acción sugerida cuando no hay membresía ni planes.
- **Error:** mensaje humano + retry (ej. `MembershipGate` ya es fail-closed con estado `error`).
- **Primary action:** una por pantalla (ej. "Suscribirse" en MembershipCheckScreen).
- **Mobile:** touch targets ≥ 44pt, safe areas respetadas.

---

## 4. Flujo de usuario

```
Autenticación (Clerk) → MembershipCheckScreen (verificar membresía)
  ├─ tiene membresía activa → AthleteTabs (entrenamiento, progreso, recuperación)
  └─ sin membresía → MembershipPlansListScreen → comprar plan (MercadoPago preference)
```

---

## 5. Diseño (la solución)

**Contrato mobile → Go API (verificado en código):**

| Mobile path (consumido) | Go API path (montado) | Estado |
|---|---|---|
| `GET /athletes/membership/status` | `GET /athletes/membership/status` (routes.go:113) | ✅ Existe |
| `GET /athletes/membership/plans` | `GET /athletes/membership/plans` (routes.go:116) | ✅ Existe |
| `PUT /memberships/:id/cancel` | `PUT /memberships/:id/cancel` (routes.go:122) | ✅ Existe |
| `POST /payments/membership/preference` | `POST /payments/membership/preference` (payment.go:33) | ✅ Existe |
| `GET /subscriptions/me` | `GET /subscriptions/me` (subscription.go:33, routes.go:731) | ✅ Existe |
| `GET /workouts` (vía `/athlete/workouts`) | `GET /workouts` (routes.go:78, atleta autenticado) | ✅ Existe |
| `GET /running/workouts/templates` | `GET /running/workouts/templates` (routes.go:244) | ✅ Existe |
| `GET /running/workouts/assignments` | `GET /running/workouts/assignments` (routes.go:246) | ✅ Existe |
| `POST /running/workouts/sessions/start` | `POST /running/workouts/sessions/start` (routes.go:252) | ✅ Existe |
| `POST /running/workouts/sessions/:id/complete` | `POST /running/workouts/sessions/:id/complete` (routes.go:253) | ✅ Existe |
| `GET /payments/availability` | `GET /payments/availability` (routes.go:742) | ✅ Existe |
| `GET /athletes/today` | `GET /athletes/today` (routes.go:314) | ✅ Existe |
| `GET /users/me` | `GET /users/me` (routes.go:28) | ✅ Existe |
| `GET /athletes/onboard` | `GET /athletes/onboard` (routes.go:322) | ✅ Existe |
| `POST /invites/accept` | `POST /invites/accept` (routes.go:329) | ✅ Existe |
| `GET /health/metrics`, `/health/sleep`, `/health/devices` | existen (routes.go:293-298) | ✅ Existen |
| `GET /notifications`, `GET /devices` | existen (routes.go:204-205, 199-201) | ✅ Existen |

**Gap menor identificado:**
- `GO_API_PATH_MAP` contiene `/athlete/running → /running`. La ruta `/running` **no existe** como ruta plana en el API (solo `/running/sessions`, `/running/stats`, etc.) y mobile no la usa en ningún llamado (`smartClient`/`apiClient` con `/running` plano). Es una entrada muerta del path map → debe eliminarse.

**Componentes mobile relevantes (ya implementados, consumen el API):**
- `apps/mobile/src/features/auth/services/membershipService.ts` — `getMembershipStatus`, `getAvailablePlans`, `cancelMembership`, `purchaseMembership`
- `apps/mobile/src/features/auth/services/clerkApi.ts` — autenticación Clerk (token JWT para el API)
- `apps/mobile/src/features/payments/paymentAvailability.ts` — `getPaymentAvailability` (`GET /payments/availability`)
- `apps/mobile/src/features/subscription/infrastructure/subscriptionService.ts` — `getMySubscription` (`GET /subscriptions/me`)
- `apps/mobile/src/features/membership/presentation/MembershipGate.tsx` — gate fail-closed
- `apps/mobile/src/features/auth/presentation/screens/MembershipCheckScreen.tsx` — pantalla de planes
- `apps/mobile/src/features/training/application/useRunningWorkouts.ts` — running templates/assignments/sesiones
- `apps/mobile/src/features/training/application/useWorkoutExecutionData.ts` — ejecución de workout (`/athlete/workouts/:id`)

---

## 6. API (contrato consumido por mobile)

Todos bajo `/api/v1/` y auth (`RequireAthlete` / `RequireCoach`) + `RequireTenantContext`:

| Método | Path | Usado por mobile |
|---|---|---|
| GET | /athletes/membership/status | membershipService |
| GET | /athletes/membership/plans | membershipService |
| PUT | /memberships/:id/cancel | membershipService |
| POST | /payments/membership/preference | membershipPayment |
| GET | /subscriptions/me | subscriptionService |
| GET | /workouts | useWorkoutExecutionData |
| GET | /running/workouts/templates | useRunningWorkouts |
| GET | /running/workouts/assignments | useRunningWorkouts |
| POST | /running/workouts/sessions/start | useRunningWorkouts |
| POST | /running/workouts/sessions/:id/complete | useRunningWorkouts |
| GET | /payments/availability | paymentAvailability |
| GET | /athletes/today | (onboarding/today) |
| GET | /users/me | clerkApi/profile |
| GET | /athletes/onboard | onboarding |
| POST | /invites/accept | onboarding |

Contrato detalle: `apps/rules/08-api-specification.md`.

---

## 7. Fuera de scope (explícito)

- Crear nuevos endpoints de negocio: este spec solo conecta lo que ya existe; si falta un endpoint para una feature móvil, se trata como gap y se especifica aparte.
- Stripe nativo: el proyecto usa Wompi/MP para checkout.
- E2E en dispositivo real: requiere emulador/configuración que no está disponible en esta sesión; se cubre con tests de unidad (Jest) y verificación de contratos.

---

## 8. Riesgos y decisiones abiertas

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Path map con entrada muerta (`/athlete/running → /running`) | Bajo (no se usa, pero es código muerto confuso) | Eliminar la entrada del path map. |
| Cambio de contrato en el API sin actualizar mobile | Medio | El path map y los DTOs de mobile son el contrato; cualquier cambio de ruta debe reflejarse en ambos. |
| No hay dispositivo real para E2E | Bajo | Se mitiga con tests de unidad y verificación de que las rutas existan en el API. |

---

## 9. Referencias

- `apps/rules/MASTER_PROMPT.md` — principios de ingeniería y producto.
- `apps/rules/00-product-vision.md` — módulo Training, Nutrition, Recovery, Payments.
- `apps/rules/03-ux-workflows.md` — flujos de atleta (Sección 4) y mobile-first (Sección 7).
- `apps/rules/05-backend-architecture.md` — Clean Architecture, handler pattern.
- `apps/rules/07-mobile-architecture.md` — arquitectura mobile (si existe).
- `apps/rules/08-api-specification.md` — contrato de API.
- `apps/rules/11-security.md` — todo autenticado y autorizado.
- `apps/mobile/AGENTS.md` — reglas específicas de mobile.

---

## Verificación

```
# API (no debe tener regresión por cambios de contrato)
cd apps/api && go build ./... && go vet ./... && go test ./...

# Mobile (compile + tests, sin emulador)
cd apps/mobile && npx tsc --noEmit && npm test
```
