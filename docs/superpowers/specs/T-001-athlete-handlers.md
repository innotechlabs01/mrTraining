# T-001: Activation of Athlete Handlers in Go API — Design Spec

> Feature: activación de los handlers de athlete en el Go API (endpoints de workout logging, metrics y messaging).
> Estado al iniciar este spec: los handlers, services, domain models, repository de postgres y rutas ya existen y están montadas en `cmd/api/routes_setup.go`. El spec documenta el contrato activo y los acceptance criteria verificables.

---

## 1. Problema

El frontend (web y mobile) necesita leer los datos del athlete desde el Go API como única fuente de verdad: lista de workouts asignados, time-series de métricas y hilos de mensajes. Si estos endpoints no están activos y verificados, el frontend no puede mostrar el dashboard del athlete ni su historial.

---

## 2. Roles y AC

| Rol | Quién es | Goal principal |
|---|---|---|
| Athlete | Usuario autenticato como atleta | Ver sus workouts, métricas y mensajes propios |
| Coach | Usuario autenticato como entrenador | Ver workouts, métricas y mensajes de sus atletas (ownership) |

### Acceptance Criteria

- [ ] **AC-1:** Given un atleta autenticado, When pide `GET /athletes/:id/workouts` con su propio ID, Then devuelve 200 con la lista de workouts del atleta (vacía si no hay).
- [ ] **AC-2:** Given un atleta autenticado, When pide `GET /athletes/:id/metrics`, Then devuelve 200 con time-series de métricas (peso, HR, VO2max).
- [ ] **AC-3:** Given un atleta autenticado, When pide `GET /athletes/:id/messages`, Then devuelve 200 con los hilos de mensajes y unread count.
- [ ] **AC-4:** Given un atleta, When pide los datos de otro atleta sin ser su coach, Then devuelve 403 (ownership enforced en `ensureAthleteAccess`).
- [ ] **AC-5:** Given sin contexto de tenant/usuario, When se llama a cualquier endpoint de athlete, Then devuelve 403 sin panic (middleware.GetUserID seguro).
- [ ] **AC-6:** Given workout logging, When un atleta completa una sesión (`POST /workouts/:id/session`, `/workouts/:id/sets`, `/workouts/sessions/:id/complete`), Then registra la sesión y los sets vinculados al workout.
- [ ] **AC-7:** Given progreso del atleta, When pide `GET /progress` y `GET /progress/summary`, Then devuelve agregados de progreso.
- [ ] **AC-8:** `go build ./...`, `go vet ./...` y `go test ./...` pasan sin errores.

---

## 3. Criterios UX (obligatorios)

Estos aplican al consumidor frontend (web/mobile), no al spec de API, pero condicionan el contrato:

- **Loading:** skeleton o spinner mientras se cargan workouts/métricas/mensajes.
- **Empty:** ilustración + copy + acción sugerida cuando no hay workouts ni métricas.
- **Error:** mensaje humano + retry; nunca stack trace.
- **Primary action:** una por pantalla en el dashboard del atleta (ej. "Completar sesión de hoy").
- **Mobile:** touch targets ≥ 44pt, safe areas respetadas.

---

## 4. Flujo de usuario

```
Autenticación → Selección de atleta → Dashboard (workouts, métricas, mensajes)
                                            ↓
                                    Seleccionar workout → Ejecutar sesión → Log sets → Completar
```

---

## 5. Diseño (la solución)

La solución ya está implementada en el Go API siguiendo Clean Architecture + feature-first:

**Domain:** `internal/domain/athlete/` — `Repository` interface, `WorkoutSummary`, `MetricPoint`, `MessageThread`.

**Application:** `internal/application/athlete/service.go` — `ListWorkouts`, `GetMetrics`, `ListMessages` con validación de `athleteID` y slices vacíos (no nil).

**Infrastructure:** `internal/infrastructure/athlete/repository.go` — implementación PostgreSQL del `Repository`.

**API (handlers):** `internal/interfaces/http/handlers/athlete.go` — `GetWorkouts`, `GetMetrics`, `GetMessages` con `ensureAthleteAccess` (atleta propio o coach/admin).

**Rutas (montadas en `cmd/api/routes_setup.go:501-504`):**
- `GET /athletes/:id/workouts` → `AthleteHandler.GetWorkouts`
- `GET /athletes/:id/metrics` → `AthleteHandler.GetMetrics`
- `GET /athletes/:id/messages` → `AthleteHandler.GetMessages`

**Workout logging (ya existentes en `training.go`):**
- `POST /workouts/:id/session` → `CreateWorkoutSession`
- `POST /workouts/:id/sets` → `LogWorkoutSet`
- `POST /workouts/sessions/:id/complete` → `CompleteSession`

**Progreso (ya existentes en `training.go`):**
- `GET /progress` → `GetProgress`
- `GET /progress/summary` → `GetProgressSummary`

Todos bajo auth (`RequireAthlete` / `RequireCoach`) y tenant context (`RequireTenantContext`).

---

## 6. API (endpoints activos)

| Método | Path | Purpose | Estado |
|---|---|---|---|
| GET | /athletes/:id/workouts | Lista workouts del atleta | Activo |
| GET | /athletes/:id/metrics | Time-series de métricas | Activo |
| GET | /athletes/:id/messages | Hilos de mensajes | Activo |
| POST | /workouts/:id/session | Crear sesión de workout | Activo |
| POST | /workouts/:id/sets | Log de sets | Activo |
| POST | /workouts/sessions/:id/complete | Completar sesión | Activo |
| GET | /progress | Progreso del atleta | Activo |
| GET | /progress/summary | Resumen de progreso | Activo |

Contrato detalle: `apps/rules/08-api-specification.md`.

---

## 7. Fuera de scope (explícito)

- Creación de workouts/programas (coach side): pertenece a T-002/T-003.
- Mensajería bidireccional completa (envío de mensajes): `message.go` existe pero el envío (`POST`) no es parte de este spec; solo lectura de hilos (`GET /athletes/:id/messages`).
- Métricas de escritura (POST de métricas): solo lectura en este spec.
- Frontend web/mobile: consumen estos endpoints; no se toca en este spec.

---

## 8. Riesgos y decisiones abiertas

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El atleta acceda a datos de otro atleta | Alto (IDOR) | `ensureAthleteAccess` verifica userID == athleteID o rol coach/admin; repo filtra por coach_id donde aplica. |
| Panic por contexto de tenant ausente | Medio | `middleware.GetUserID` + `GetUserRole` seguros (no usan type assertion sin comma-ok). |

---

## 9. Referencias

- `apps/rules/MASTER_PROMPT.md` — principios de ingeniería y producto.
- `apps/rules/00-product-vision.md` — módulo Training (Sección 4.1).
- `apps/rules/03-ux-workflows.md` — flujos de atleta (Sección 4).
- `apps/rules/05-backend-architecture.md` — Clean Architecture, handler pattern, CQRS.
- `apps/rules/08-api-specification.md` — contrato de API.
- Spec similar previo: `docs/superpowers/specs/T-011-coach-landing-canvas.md`.

---

## Verificación

```
cd apps/api && go build ./... && go vet ./... && go test ./...
```

Todos deben pasar. Los tests de unidad de `internal/application/athlete` y `internal/domain/athlete` ya cubren ListWorkouts/GetMetrics/ListMessages.
