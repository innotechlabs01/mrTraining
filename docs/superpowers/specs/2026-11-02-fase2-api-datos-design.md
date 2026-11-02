# Fase 2 — Cierre de contratos API + real data — Design Spec

> **Fase de cierre del plan `docs/plans/closeout-plan-2026-11-02.md`. Planificación desglosada en slices listos para PR. No incluye código de implementación.**

---

## 1. Problema

Dos iniciativas abiertas sin cerrar: (1) `api-endpoint-consolidation-ddd` (`openspec/changes/api-endpoint-consolidation-ddd/`) sigue pendiente en dominios Community/Nutrition/Store, plumbing de repositories/tests, JWT/RBAC, rate limit y tests de paridad; (2) `athlete-real-data-images` (`openspec/changes/athlete-real-data-images/`) pendiente: DTO camelCase + `imageUrl` en `exercise_library`, LEFT JOIN `exercise_library`, endpoints `{workout,exercises,session}`, remoción de mocks en Today/History, flujo Empezar/Continuar. Existen mismatches Go ↔ web/mobile (JSON keys, fechas, `null` vs `undefined`).

---

## 2. Roles y AC

| Rol | Quién es | Goal principal |
|---|---|---|
| dev-backend | Go API (apps/api) | Dominios Community/Nutrition/Store, repos, JWT/RBAC, rate limit, DTO camelCase, imageUrl, endpoints |
| dev-front | Next.js web + React Native mobile | Consumir contratos Go API, quitar mocks, Empezar/Continuar, alinear JSON keys |

### Acceptance Criteria

- [ ] **AC-2.1:** Given `api-endpoint-consolidation-ddd`, When se terminan dominios Community/Nutrition/Store con repositorios, JWT/RBAC, rate limit y tests de paridad, Then todos los endpoints críticos alcanzables vía Go API v1 y auth/RBAC central.
- [ ] **AC-2.2:** Given `athlete-real-data-images`, When DTOs Go emiten camelCase único y mobile parsea camelCase, Then cero snake_case leftover en contrato Go→mobile.
- [ ] **AC-2.3:** Given `image_url` en `exercise_library` (migración + Go domain/DTO/repo), When `LEFT JOIN exercise_library` en `getAssignedWorkoutExercises`, Then mobile recibe `imageUrl` por prescripción.
- [ ] **AC-2.4:** Given endpoints `{workout,exercises,session}`, When `GET /workouts/:id/detail` retorna `{workout, exercises}`, Then History/WorkoutList no muestran cards blank y WorkoutDetail muestra lista de ejercicios.
- [ ] **AC-2.5:** Given TodayScreen, When se remueven `MOCK_RECOMMENDATIONS`/`MOCK_ARTICLES`/`WEEKLY_CHALLENGE` y se usan datos reales, Then cero mocks en TodayScreen.
- [ ] **AC-2.6:** Given flujo Empezar/Continuar, When se decide por `status`+`progress` (completed→none/disabled Done; progress>0→Continuar; progress==0→Empezar `POST /workouts/:id/session`), Then botón correcto por caso.
- [ ] **AC-2.7:** Given auditoría de mismatches Go ↔ web/mobile, When se alinean JSON keys, fechas y `null` vs `undefined`, Then sin errores de parseo en móvil/web.

---

## 3. Criterios UX (obligatorios)

- **Loading:** skeleton o spinner contextual (nunca pantalla vacía) en Today/History/WorkoutList.
- **Empty:** ilustración + copy + acción sugerida cuando no hay datos reales.
- **Error:** mensaje humano + retry. Nunca stack trace.
- **Primary action:** una por pantalla (Empezar o Continuar, no ambos).
- **Mobile:** 60 FPS, touch targets ≥ 44pt, safe areas respetadas.

---

## 4. Flujo de usuario

```
Coach crea ejercicio con imagen (galería) → POST /exercises persiste imageUrl
Athlete abre Today → GET /workouts (real data + image) → rec sin mocks
Athlete abre History → GET /workouts (camelCase) → cards no blank
Athlete abre WorkoutDetail → GET /workouts/:id/detail → {workout, exercises} mostrados
Athlete ve card con progress>0 → botón Continuar (resume sesión)
Athlete ve card con progress==0 → botón Empezar (POST /workouts/:id/session)
Athlete ve card completed → botón Done / none (deshabilitado)
```

Incluir: back navigation, estados de error en cada paso, offline si aplica.

---

## 5. Diseño (la solución)

### Slices de trabajo (PR-ready, en orden)

**api-endpoint-consolidation-ddd:**
1. **Slice 2.1 — Dominios Community/Nutrition/Store**: repositorios, handlers, DTOs en `apps/api/internal/{community,nutrition,store}/`.
2. **Slice 2.2 — JWT/RBAC + rate limit**: middleware auth central, rate-limit v1, versionado `/api/v1`.
3. **Slice 2.3 — Tests de paridad**: comparar Go API vs Next.js legacy para endpoints críticos; cero 404 en flujos críticos.

**athlete-real-data-images:**
4. **Slice 2.4 — DTO camelCase único**: Go DTOs JSON tags a camelCase; mobile parsea camelCase; verificar ningún endpoint quede snake_case.
5. **Slice 2.5 — `image_url` en exercise_library**: migración `apps/web/migrations/019_exercise_image_url.sql` (aplicar manual a Turso, no runner), Go domain/DTO/repo read/write, LEFT JOIN a prescripciones.
6. **Slice 2.6 — Endpoints `{workout,exercises,session}`**: `GET /workouts/:id/detail` retorna `{workout, exercises}`; endpoint session.
7. **Slice 2.7 — TodayScreen real data**: quitar mocks, `activeWorkouts` + imagen, artículos de `blog_posts` u ocultar, Weekly Challenge real u ocultar.
8. **Slice 2.8 — Coach gallery picker**: `useExerciseLibrary` a Go `/exercises` (quitar mock), picker en `CreateExerciseModal`, persistir `imageUrl` vía `POST /exercises`, type `Exercise` gana `imageUrl`.
9. **Slice 2.9 — Empezar/Continuar**: lógica por `status`+`progress` en History/Detail cards.
10. **Slice 2.10 — Auditoría mismatches Go ↔ web/mobile**: JSON keys, fechas, `null` vs `undefined`.

### Estructura de rutas / screens

No aplica a backend; frontend consume contratos existentes.

### Componentes

| Componente | Responsabilidad |
|---|---|
| useExerciseLibrary (web) | MOCK → real `exerciseApi` |
| CreateExerciseModal (web) | gallery picker, persist imageUrl |
| TodayScreen (mobile) | real data, cero mocks |
| HistoryScreen / WorkoutListScreen (mobile) | camelCase parse, cards no blank |
| WorkoutDetailScreen (mobile) | {workout, exercises} mostrados |
| Empezar/Continuar button (mobile) | lógica status+progress |

### Types

Go DTOs: camelCase JSON tags, `imageUrl` en `Exercise`, `WorkoutExerciseResponse` con ejercicios.

---

## 6. API (si aplica)

**Regla:** endpoints nuevos se definen en `apps/api` (Go) primero.

| Método | Path | Purpose |
|---|---|---|
| GET | /api/v1/exercises | listado con imageUrl (coach gallery) |
| POST | /api/v1/exercises | crear/editar ejercicio con imageUrl |
| GET | /api/v1/workouts/:id/detail | retorna {workout, exercises} |
| POST | /api/v1/workouts/:id/session | iniciar sesión (Empezar) |
| GET | /api/v1/community/... | dominio Community |
| GET | /api/v1/nutrition/... | dominio Nutrition |
| GET | /api/v1/store/... | dominio Store |

Contrato detalle: `apps/rules/08-api-specification.md`.

---

## 7. Fuera de scope (explícito)

- Image upload/processing en coach flow (solo gallery, alcance confirmado).
- Columnas denormalizadas `image_url` en `workout_exercises`/`workout_template_exercises` (deferido).
- Imágenes de ejercicio en `WorkoutDetail`/`WorkoutExecution` (fuera de esta fase).
- Go migrations runner (se aplica manual a Turso como hoy).

---

## 8. Riesgos y decisiones abiertas

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Migración `019` no auto-aplicada; drift Turso vs Go | Medio | Migración numerada aplicada manual; verificar DB compartida antes de QA. |
| /detail roto pre-existente oculta trabajo de imagen | Alto | Fix /detail + casing como slice prerequisite, verificar antes de imágenes. |
| Mismatch snake/camel persiste si se salta un endpoint | Medio | Central Go DTO camelCase pass; test de fixture por pantalla móvil. |
| Índice de sesión para reanudar no expuesto | Medio | Añadir session/latest-index a detail DTO o lookup dedicado. |

---

## 9. Referencias

- Proposal: `openspec/changes/api-endpoint-consolidation-ddd/proposal.md`, `design.md`, `tasks.md`.
- Proposal: `openspec/changes/athlete-real-data-images/proposal.md`, `design.md`, `tasks.md`.
- Specs: `openspec/changes/athlete-real-data-images/specs/{mobile-today,db,go-api,mobile-history,web-coach}/spec.md`.
- Plan maestro: `docs/plans/closeout-plan-2026-11-02.md` §Fase 2.
- Reglas: `apps/rules/08-api-specification.md`, `apps/rules/04-database-design.md`.

---

## Definition of Done (Fase 2)

- Dominios Community/Nutrition/Store cerrados con repos, JWT/RBAC, rate limit, tests de paridad
- Go DTOs camelCase único, cero snake_case leftover
- `image_url` en exercise_library propagado a mobile vía LEFT JOIN
- Endpoints `{workout,exercises,session}` funcionando; `GET /workouts/:id/detail` → `{workout, exercises}`
- TodayScreen sin mocks; History/WorkoutList cards no blank; WorkoutDetail muestra ejercicios
- Empezar/Continuar correcto por `status`+`progress`
- Auditoría mismatches Go ↔ web/mobile cerrada

---

**Roles responsables:** `dev-backend` + `dev-front`  
**Tiempo estimado:** 4-6 días  
**Prioridad:** P1

---

## Plan de ejecución por slices (sugerido para dispatch)

| Slice | Título | Archivos | Rol | AC |
|---|---|---|---|---|
| 2.1 | Dominios Community/Nutrition/Store | `apps/api/internal/{community,nutrition,store}/` | dev-backend | AC-2.1 |
| 2.2 | JWT/RBAC + rate limit v1 | `apps/api/internal/auth/`, middleware | dev-backend | AC-2.1 |
| 2.3 | Tests de paridad Go vs legacy | tests de integración | dev-backend | AC-2.1 |
| 2.4 | DTO camelCase único | `apps/api/internal/interfaces/http/dto/` + mobile parse | dev-backend + dev-front | AC-2.2 |
| 2.5 | `image_url` en exercise_library | migración 019 + Go domain/DTO/repo | dev-backend | AC-2.3 |
| 2.6 | Endpoints {workout,exercises,session} | handlers training.go | dev-backend | AC-2.4 |
| 2.7 | TodayScreen real data (cero mocks) | `apps/mobile/.../TodayScreen.tsx` | dev-front | AC-2.5 |
| 2.8 | Coach gallery picker | `apps/web/.../useExerciseLibrary.ts`, `CreateExerciseModal` | dev-front | AC-2.3 |
| 2.9 | Empezar/Continuar | `apps/mobile/.../History,WorkoutDetail` | dev-front | AC-2.6 |
| 2.10 | Auditoría mismatches Go ↔ web/mobile | web/mobile + api dto | dev-front + dev-backend | AC-2.7 |
