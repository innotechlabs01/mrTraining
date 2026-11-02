# Task List — Running Workouts Structured

## Phase 1: Foundation — DDL faltante + migraciones nuevas
- [x] Task 1: Crear migración DDL de `running_sessions` y `device_connections` (faltantes en repo)
- [x] Task 2: Crear migración `running_workout_templates` + `running_workout_segments`
- [x] Task 3: Crear migración `running_workout_assignments` + `running_workout_snapshots`
- [x] Task 4: Aplicar migraciones a PostgreSQL local, verificar desde base vacía

### Checkpoint: Foundation
- [ ] `go build ./...` verde en apps/api
- [ ] Migraciones aplicables desde base PG vacía
- [ ] `schema_migrations` tracking funciona

## Phase 2: Backend — Domain + Repository + Service
- [x] Task 5: Domain entities Go + repository interfaces
- [x] Task 6: PostgreSQL repository implementation
- [x] Task 7: Application service (plantillas, asignar, start/complete con snapshot)
- [x] Task 8: Unit tests de repository y servicio

### Checkpoint: Backend Foundation
- [ ] `go build ./...` verde
- [ ] `go test ./...` verde

## Phase 3: Backend — API handlers + routes + DTOs
- [x] Task 9: DTOs Go para plantillas, segmentos, asignaciones, snapshots
- [x] Task 10: Handlers Go (CRUD plantillas, asignar, listar, start/complete sesión)
- [x] Task 11: Rutas en `routes.go` con middleware de autorización
- [x] Task 12: Integración con `runningapp.DefaultHub` (eventos live)

### Checkpoint: Backend API
- [ ] `go build ./...` verde
- [ ] `go test ./...` verde

## Phase 4: Mobile — Lista y detalle de entrenamientos
- [x] Task 13: Pantalla `RunningWorkoutListScreen`
- [x] Task 14: Pantalla `RunningWorkoutDetailScreen`
- [x] Task 15: Hooks React Query + API client para running
- [ ] Task 16: Jest tests móviles (componentes y hooks)

### Checkpoint: Mobile List/Detail
- [x] `npx tsc --noEmit` verde (solo error preexistente en IntervalTracker.tsx)
- [x] `npm test` verde (393 tests)

## Phase 5: Mobile — Ejecución guiada
- [x] Task 17: Pantalla `RunningExecutionScreen`
- [ ] Task 18: GPS en lote + offline queue (MMKV) + reintento idempotente
- [ ] Task 19: Sync de sesión iniciada/completada con backend
- [ ] Task 20: Jest tests de ejecución y sync

### Checkpoint: Mobile Execution
- [x] Pantalla de ejecución creada (básica, sin GPS real aún)
- [ ] Pendiente: GPS real, audio cues, offline sync

## Phase 6: Mobile — Resumen y sincronización
- [x] Task 21: Pantalla `RunningSessionSummaryScreen`
- [ ] Task 22: Vincular `running_sessions` con `running_workout_assignments` (snapshot)
- [ ] Task 23: Tests de integración móvil-endpoint
- [ ] Task 24: Lint + build móvil

### Checkpoint: Mobile Complete
- [ ] Pendiente

## Phase 7: Pruebas finales y documentación
- [ ] Task 25: Tests de integración API contra PG QA
- [ ] Task 26: Verificación de aislamiento coach/atleta
- [ ] Task 27: Documentar migraciones, contratos, env vars
- [ ] Task 28: Resumen final al usuario

### Checkpoint: Complete
- [ ] Todas las fases verdes
- [ ] Sin referencias a Turso activas en nuevo código
- [ ] Clerk sin cambios
- [ ] Plan de corte y reversión documentado
