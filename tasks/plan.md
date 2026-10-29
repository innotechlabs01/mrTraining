# Implementation Plan: Running Workouts Structured (Coach + Athlete)

## Overview

Extend MR Training with structured running workouts: coach designs templates with ordered segments (warmup, intervals, recovery, cooldown), assigns to authorized athletes, athlete executes guided on mobile with GPS + audio cues, sees real summary post-session, coach reviews results. License note: RunnerUp (GPL-3.0) is reference only — no code copied.

## Architecture Decisions

- Backend: Go + Fiber, Clean Architecture/DDD (domain → application → infrastructure → API), PostgreSQL (`pgx/stdlib`), UUIDv7 PKs, `TIMESTAMPTZ`, soft deletes where needed.
- Existing running domain reused: `RunningSession`, `GpsPoint`, `DeviceConnection`, live SSE hub, Garmin provider. New entities: `RunningWorkoutTemplate`, `RunningWorkoutSegment`, `RunningWorkoutAssignment`, `RunningWorkoutSnapshot`.
- Missing DDL: `running_sessions` and `device_connections` have no migration DDL — create it before building on top.
- Mobile: Expo + React Native, React Navigation, TanStack Query, MMKV for offline queue, existing `RunRecordingScreen`/`RunningRouteView` reused where appropriate.
- No code copied from RunnerUp (GPL-3.0 conflict). Reference only.

## Task List

### Phase 1: Foundation — DDL faltante + migraciones nuevas
- [ ] Task 1: Crear migración DDL de `running_sessions` y `device_connections` (faltantes en repo)
- [ ] Task 2: Crear migración `running_workout_templates` + `running_workout_segments`
- [ ] Task 3: Crear migración `running_workout_assignments` + `running_workout_snapshots`
- [ ] Task 4: Aplicar migraciones a PostgreSQL local, verificar desde base vacía

### Checkpoint: Foundation
- [ ] `go build ./...` verde en apps/api
- [ ] Migraciones aplicables desde base PG vacía (dry-run + apply)
- [ ] `schema_migrations` tracking funciona

### Phase 2: Backend — Domain + Repository + Service
- [ ] Task 5: Domain entities Go (RunningWorkoutTemplate, Segment, Assignment, Snapshot) + repository interfaces
- [ ] Task 6: PostgreSQL repository implementation para plantillas, segmentos, asignaciones, snapshots
- [ ] Task 7: Application service (crear/editar plantilla, asignar, iniciar sesión con snapshot, finalizar sesión)
- [ ] Task 8: Unit tests de repository y servicio contra PG local (skip si no hay DATABASE_URL)

### Checkpoint: Backend Foundation
- [ ] `go build ./...` verde
- [ ] `go test ./...` verde (skip tests sin PG)
- [ ] Ningún test omitido por error de código

### Phase 3: Backend — API handlers + routes + DTOs
- [ ] Task 9: DTOs Go para plantillas, segmentos, asignaciones, snapshots, sesión iniciada
- [ ] Task 10: Handlers Go (CRUD plantillas, asignar, listar asignaciones, start/complete sesión con snapshot)
- [ ] Task 11: Rutas registradas en `routes.go` con middleware de autorización (coach/atleta)
- [ ] Task 12: Integración con `runningapp.DefaultHub` para eventos live de sesión iniciada/completada

### Checkpoint: Backend API
- [ ] `go build ./...` verde
- [ ] `go test ./...` verde
- [ ] Endpoints registrados y accesibles (swagger/documentación interna si existe)

### Phase 4: Mobile — Lista y detalle de entrenamientos
- [ ] Task 13: Pantalla `RunningWorkoutListScreen` (asignaciones de hoy con estado)
- [ ] Task 14: Pantalla `RunningWorkoutDetailScreen` (detalle previo: segmentos, objetivos pace/FC, mapa planificado, botón comenzar)
- [ ] Task 15: Hooks React Query + API client para listar/detalle asignaciones running
- [ ] Task 16: Jest tests de componentes y hooks móviles

### Checkpoint: Mobile List/Detail
- [ ] `npx tsc --noEmit` verde en apps/mobile
- [ ] `npm test` verde en apps/mobile
- [ ] Navegación entre list y detalle funciona (verificación de código)

### Phase 5: Mobile — Ejecución guiada
- [ ] Task 17: Pantalla `RunningExecutionScreen` (segmento actual, tiempo/distancia restante, pace actual, controles pausa/reanuda/finaliza, audio cues)
- [ ] Task 18: Registro de GPS en lote con offline queue (MMKV) y reintento idempotente
- [ ] Task 19: Sincronización de sesión iniciada/completada con backend (idempotente, sin duplicados)
- [ ] Task 20: Jest tests de ejecución y sync

### Checkpoint: Mobile Execution
- [ ] `npx tsc --noEmit` verde
- [ ] `npm test` verde
- [ ] Flujo de ejecución guiada revisado en código

### Phase 6: Mobile — Resumen y sincronización
- [ ] Task 21: Pantalla `RunningSessionSummaryScreen` (distancia, duración, pace medio, intervalos plan vs reales, mapa recorrido)
- [ ] Task 22: Vincular `running_sessions` con `running_workout_assignments` (instantánea al iniciar)
- [ ] Task 23: Tests de integración móvil-endpoint (contrato)
- [ ] Task 24: Lint + build móvil

### Checkpoint: Mobile Complete
- [ ] `npx tsc --noEmit` verde
- [ ] `npm test` verde
- [ ] `npm run lint` verde (solo warnings menores aceptables)
- [ ] `npm run build` (expo prebuild o expo build) verde si es posible

### Phase 7: Pruebas finales y documentación
- [ ] Task 25: Tests de integración API (endpoints running estructurado contra PG QA)
- [ ] Task 26: Verificación de aislamiento coach/atleta (pruebas de autorización)
- [ ] Task 27: Documentar migraciones aplicadas, contratos API, variables de entorno
- [ ] Task 28: Resumen final al usuario con resultados reales y bloqueos restantes

### Checkpoint: Complete
- [ ] Todas las fases anteriores verdes
- [ ] No referencias a Turso activas en el nuevo código
- [ ] Clerk se mantiene como auth (sin cambios)
- [ ] Plan de corte y reversión documentado (pendiente de ejecución en fase posterior)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `running_sessions` / `device_connections` sin DDL | High | Crear migración DDL explícita en Phase 1 |
| RunnerUp licencia GPL-3.0 | High | Solo referencia funcional, cero código copiado |
| Esquema Turso remoto no exportado | Medium | Esquema provisional; validar contra Supabase QA antes de prod |
| GPS segundo plano / pantalla bloqueada | Medium | Documentar limitación; usar expo-background-fetch existente |
| Duplicados de puntos GPS al reintentar | Medium | Upsert idempotente por (session_id, timestamp) en backend |

## Open Questions

- ¿Se dispone de acceso a Supabase QA y volcado del esquema Turso para validar el esquema provisional antes de aplicar en producción?
- ¿El móvil ya tiene navegación registrada para las nuevas pantallas (RunningWorkoutListScreen, etc.) o se debe agregar a `Navigation.tsx`?

## Definition of Done (per task)

- [ ] Código compila (go build / tsc / expo prebuild)
- [ ] Tests pasan o hacen skip documentado (sin DATABASE_URL real)
- [ ] Lint sin errores nuevos
- [ ] Acceptance criteria de la tarea cumplidos
- [ ] Cambios documentados en el plan
