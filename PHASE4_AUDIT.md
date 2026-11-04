# MR Training — Auditoría integral de cierre de Fase 4 Realtime
Fecha: 2026-11-04  
Rama: dev (commit 2e990ff)  
Repo: /Users/frg/Documents/Innotechlabs/Mao_Coaching/mr-training

## A. Estado ejecutivo

**Avance estimado de Fase 4: ~40-45%**

Cálculo:
- Mapeo y diagnóstico: 10% (completado según MASTER_PENDING)
- Escritura a Outbox desde servicio: ~15% (parcial, con issues)
- Worker/processor para publicar desde Outbox: 0% (no existe)
- Integración completa de los 5 eventos con transaccionalidad correcta: ~10% (3/5 escritos, pero no atómicos)
- SSE/entrega a clientes: ~5% (hub existe pero sin puente Outbox->Hub)
- Idempotencia/seguridad/recuperación: ~5% (parcial)

**Razón:** La migración 012 existe y el servicio ya escribe a `outbox` para algunos eventos, pero no hay worker que procese el outbox, las escrituras no son atómicas con la transacción de negocio, faltan eventos (template.updated, workout.started), el esquema de outbox no coincide con lo que el código espera (falta `event_id`, faltan leases `locked_by/locked_until`, estados difieren) y hay problemas de contrato/payload.

## B. Tabla de componentes

| Componente | Estado real | Evidencia | Notas |
|------------|-------------|-----------|-------|
| Migración 012 (`outbox_transaccional.sql`) | PARCIAL/BLOQUEADO | `apps/api/migrations/postgres/012_outbox_transaccional.sql` | Existe, pero le faltan: `event_id` (UNIQUE), `locked_by`, `locked_until`. Usa estado `failed` en comentarios vs `dead` esperado. `next_retry_at` nullable sin DEFAULT. Índices parciales pero incompletos vs diseño corregido. |
| Tabla `outbox` + esquema | DESINCRONIZADO | Servicio inserta `event_id` (gen_random_uuid()) pero migración 012 no lo crea | El código del servicio fallará al insertar si la tabla tiene el esquema actual de la migración. |
| Servicio Running (outbox writes) | PARCIAL | `apps/api/internal/application/running/service.go` | Escribe a outbox vía `s.db.ExecContext` directo (no usa repo.SaveOutbox, no usa misma transacción). 3/5 eventos escritos. |
| Repo `SaveOutbox` | EXISTE PERO NO USADO | `apps/api/internal/infrastructure/running/repository.go:791-820` | Implementación diferente (sin event_id, sin leases), no es utilizado por el servicio. |
| Worker/processor de Outbox | NO IMPLEMENTADO | Búsqueda global sin resultados (`worker.go`, `ProcessOutbox`) | No existe. Eventos quedan en `pending` sin procesarse. |
| DefaultHub (in-memory) | IMPLEMENTADO | `apps/api/internal/application/running/live.go` | Funciona, suscripciones por clave (workoutID/userID), non-blocking. Sin integración con Outbox. |
| SSE Handlers | PARCIAL | `apps/api/internal/interfaces/http/handlers/training.go` (RunningLive), `earnings.go` (EarningsLive) | Existen para running live (por workoutID) y earnings (por coachID). No hay SSE endpoints obvios para los 5 eventos de templates/assignments. |
| NATS JetStream | EXISTE PARA OTRO CASO | `cmd/api/main.go:161-210` (consumer de athlete.session.*) | No hay NATS para outbox/realtime de running events. Auditoría dice "No introducir NATS ni otro mecanismo" - correcto mantener Outbox+DefaultHub. |

## C. Cinco eventos

| Evento | Método/Archivo | Servicio | Repo | Transacción | Outbox insert | Misma tx (negocio+outbox) | Rollback si falla outbox | Contrato JSON real | event_id/aggregate_id | coach_id/athlete_id | Publicación directa DefaultHub | Tests | Estado |
|--------|-----------------|----------|------|-------------|---------------|---------------------------|---------------------------|-------------------|----------------------|---------------------|-------------------------------|-------|--------|
| `template.created` | `CreateTemplate` / `apps/api/internal/application/running/service.go:663-689` | `running.Service.CreateTemplate` | `repo.SaveTemplate` | **NO** (repo usa `r.exec` directo; outbox usa `s.db` directo, separado) | `insertOutboxTemplateCreated` (service:968-1000) | **NO** | **PARCIAL** - Si falla outbox, se retorna error pero el template ya fue guardado (no hay rollback). | Payload: `{"name": templateID, "coach_id": coachID, "version": 1}` (simplificado) | `event_id` = gen_random_uuid() (insertado), `aggregate_id` = templateID (tipo 'template') | `coach_id` = t.CoachID, `athlete_id` = NULL | **NO** (usa outbox) | `TestPhase4_TemplateCreated` existe (solo log, no verifica entrega). Tests unitarios/integración de CreateTemplate existen. | **PARCIAL** |
| `template.updated` | `UpdateTemplate` / `apps/api/internal/application/running/service.go:720-780` | `running.Service.UpdateTemplate` | `repo.SaveTemplate` (ON CONFLICT actualiza, incrementa versión) | **NO** | **NO EXISTE** | N/A | N/A | N/A | N/A | N/A | **NO** | Sin test específico de evento. | **NO IMPLEMENTADO** |
| `assignment.created` | `CreateAssignment`/`AssignTemplate` / `apps/api/internal/application/running/service.go:782-856` | `running.Service.CreateAssignment` | `repo.SaveAssignment` | **NO** (separados) | `insertOutboxAssignmentCreated` (service:1002-1030) | **NO** | **PARCIAL** - Comentario en código indica problema; si falla outbox retorna error pero assignment ya guardado. | Payload: `{"coach_id": coachID, "athlete_id": athleteID, "template_id": assignmentID, "status": "assigned"}` (**template_id incorrecto** - debería ser template real) | `event_id` = gen_random_uuid(), `aggregate_id` = assignmentID (tipo 'assignment') | `coach_id` = a.CoachID, `athlete_id` = a.AthleteID | **NO** | Tests de CreateAssignment existen. | **PARCIAL** |
| `workout.started` | `StartSession` / `apps/api/internal/application/running/service.go:858-944` | `running.Service.StartSession` | `repo.SaveSession`, `repo.SaveSnapshot`, `repo.UpdateAssignmentStatus` | **NO** | **NO LLAMADO** (existe `insertOutboxWorkoutStarted` pero no se invoca) | N/A | N/A | N/A | N/A | N/A | **NO** | Tests de StartSession existen. | **NO IMPLEMENTADO** |
| `workout.completed` | `CompleteSession`/`FinishSession` / `apps/api/internal/application/running/service.go:946-980,1030-1045` | `running.Service.CompleteSession` | `repo.UpdateSession`, `repo.UpdateAssignmentStatus` | **NO** | `insertOutboxWorkoutCompleted` (service:1032-1055) | **NO** | **PARCIAL** - Inserta outbox después de actualizar sesión; si falla, retorna error. No atómico. | Payload: `{"athlete_id": athleteID, "session_id": sessionID}` | `event_id` = gen_random_uuid(), `aggregate_id` = sessionID (tipo 'workout') | `coach_id` = NULL (en insert), `athlete_id` = athleteID | **NO** | Tests de CompleteSession/FinishSession existen. | **PARCIAL** |

**Notas:** 
- Los inserts a outbox usan `s.db.ExecContext` directamente con SQL embebido. El esquema que esperan (con `event_id`) difiere del de migración 012.
- `assignment.created` tiene payload con `template_id` seteado al `assignmentID` (bug de contrato).
- `workout.completed` pone `coach_id` NULL en outbox - según eventos, coach debería recibirlo; necesita saber coach_id (viene vía snapshot/assignment).

## D. Auditoría de migración 012

**Archivo:** `apps/api/migrations/postgres/012_outbox_transaccional.sql`

| Aspecto | Estado | Observación |
|---------|--------|-------------|
| Tabla y columnas | PARCIAL | Tiene `id` (UUID PK), `event_type`, `aggregate_type`, `aggregate_id`, `coach_id`, `athlete_id`, `payload` (JSONB), `occurred_at`, `published_at`, `attempts`, `next_retry_at`, `last_error`, `status`, `created_at`. **Falta** `event_id` (UNIQUE) que el código del servicio intenta insertar. |
| Diferencia `id` vs `event_id` | INCORRECTO/FALTANTE | Migración solo tiene `id`. Código inserta `event_id` con `gen_random_uuid()`. Según auditoría corregida, `event_id` debe ser el identificador canónico único por evento. |
| Restricciones/unicidad | PARCIAL | Sin UNIQUE en `event_id`. Sin restricciones claras. |
| Tipos IDs | OK | UUID para `id`, VARCHAR(255) para aggregate_id/coach_id/athlete_id. |
| Estados | DESINCRONIZADO | Comentario dice `pending, processing, published, failed`. Código/objetivo usa `pending, processing, published, dead`. Migración no fuerza CHECK constraint. |
| `locked_by`, `locked_until` | FALTANTE | No existen. Sin leases no hay reclamación segura con FOR UPDATE SKIP LOCKED ni recuperación por expiración. |
| `attempts`, `next_retry_at` | PARCIAL | Existen. `next_retry_at` es nullable sin DEFAULT. Código inserta NULL en algunos casos. Auditoría recomienda DEFAULT a `occurred_at` o usar COALESCE. |
| `last_error` | OK | Existe TEXT. |
| Índices | PARCIAL | `idx_outbox_pending` (status,next_retry_at) WHERE status='pending' - no considera leases ni next_retry_at NULL correctamente. Faltan índices para `processing` con `locked_until`. |
| Compatibilidad PostgreSQL | OK | Usa tipos estándar PG. |
| Compatibilidad migrador | OK | Sigue patrón IF NOT EXISTS. |
| `gen_random_uuid()` | OK | Requiere extensión `pgcrypto` (típicamente disponible en Supabase/Postgres). |
| `next_retry_at IS NULL` | PROBLEMÁTICO | Índice/consultas que filtran `next_retry_at <= NOW()` no seleccionarán NULL. Necesita COALESCE o DEFAULT. |
| Retención/limpieza | NO ESPECIFICADO | No hay política en migración. |

**Listo para ejecutar en local:** **NO** - Requiere correcciones para alinear con código actual y con diseño Outbox correcto (agregar event_id, leases, unificar estados, ajustar defaults/índices).

## E. Auditoría del worker

**Resultado:** **NO EXISTE** - No se encontró `worker.go` ni implementación equivalente que procese la tabla `outbox`.

Elementos requeridos vs estado:
- Inicio/cierre: N/A
- Ciclo de polling: N/A
- `FOR UPDATE SKIP LOCKED`: N/A
- Reclamación de lotes: N/A
- Leases y expiración: N/A
- Publicación fuera de transacción de reclamación: N/A
- Actualización condicional del propietario del lease: N/A
- Backoff exponencial con jitter: N/A
- MAX_ATTEMPTS=5: N/A
- Transición a `dead`: N/A
- Recuperación después de reinicios: N/A
- Manejo errores transitorios/permanentes: N/A
- Contextos/timeouts: N/A
- Graceful shutdown: N/A
- Prevención procesamiento concurrente: N/A

**Impacto:** Los eventos escritos a `outbox` nunca se publican a `DefaultHub` ni llegan a clientes SSE. El mecanismo Outbox está a medio camino (escritura) pero sin lectura/procesamiento.

## F. Auditoría de publicación realtime

**Componentes:**
- `runningapp.DefaultHub` (`apps/api/internal/application/running/live.go`): Hub en memoria con `sync.Map`, canales buffer 8, non-blocking publish, subscribe/unsubscribe por clave.
- `DefaultHub.Publish()` usado directamente en: `apps/api/internal/application/ally_purchase/service.go:163`, `apps/api/internal/interfaces/http/handlers/training.go:536`, `apps/api/internal/interfaces/http/handlers/training.go:1031`. **NO usado por running service** (ahora usa outbox).
- Suscriptores: RunningLive (training.go) se suscribe por `workoutID`; EarningsLive (earnings.go) se suscribe por `userID` (coach). Ambos con ownership check.
- Handlers SSE: RunningLive y EarningsLive. Marshall SSE con `marshalSSE`.
- Registro/eliminación: Subscribe/Unsubscribe con cleanup de mapa cuando queda vacío. Unsubscribe cierra canal.
- Ciclo de vida: Se envía evento `*.connected` inicial; stream hasta `ctx.Done()` (cliente desconecta). Limpieza en defer.
- Integración con worker: **NINGUNA** - sin worker que procese outbox.
- NATS JetStream: **NO** para estos eventos (solo hay consumer para athlete.session.*).
- Publicaciones duplicadas: Posibles si se publica dos veces; hub no deduplica. Sin event_id.
- Sin clientes conectados: Eventos se dropean/no hay listeners (hub solo entrega a suscriptores activos).
- Desconexión/reconexión: Funciona con suscripción/desuscripción; cliente reconecta crea nueva suscripción.

**¿Es suficiente PostgreSQL Outbox + DefaultHub para pruebas funcionales entre dos usuarios?**
**NO con el estado actual.** Requiere:
1. Worker que lea outbox con `FOR UPDATE SKIP LOCKED`, aplique leases, haga backoff/reintentos, transicione estados.
2. Puente outbox -> DefaultHub (publicar al canal correcto según claves: coach_id/athlete_id/workoutID según tipo de evento).
3. Corregir esquema de outbox para coincidir con código/diseño.
4. Hacer escrituras negocio+outbox atómicas (misma transacción).
5. Completar los 5 eventos (faltan template.updated, workout.started).
6. Definir estrategia de claves de suscripción para los 5 eventos (DefaultHub usa WorkoutID como campo pero se usa genéricamente; para templates/assignments ¿suscribir por coachID/athleteID?).

**Limitaciones:** In-memory hub se pierde al reiniciar proceso; sin persistencia/replay; sin clustering; sin garantías si no hay worker. Outbox provee persistencia/recuperación pero falta el procesador.

## G. Auditoría de idempotencia

| Aspecto | Estado | Evidencia/Notas |
|---------|--------|-----------------|
| `event_id` llega al consumidor | **NO** | Outbox tiene `id` pero código inserta `event_id` (falta en migración). DefaultHub/Event no llevan `event_id`. Consumers no reciben `event_id` consistente. |
| Almacenado persistentemente por consumidor | **DESCONOCIDO/NO IMPLEMENTADO** | No hay código visible que persista eventos procesados por consumidor para deduplicación. |
| UNIQUE por consumidor+evento | **NO** | Sin tabla de deduplicación de consumidores. |
| Procesar eventos duplicados | **POSIBLE** | Sin idempotencia de consumo. Hub no deduplica; worker no existe. |
| `workout.completed` ejecutado dos veces | **PARCIALMENTE PROTEGIDO** | `CompleteSession` revisa si assignment ya está completado (`assignment.Status == completed` retorna error "session already completed"). También hay guardas. Pero si evento se publica dos veces y hay consumidores que ejecuten efectos, pueden duplicarse. |
| Duplicación de XP | **RIESGO** | Lógica de XP no revisada en detalle aquí; la protección depende de que finalización sea idempotente a nivel de negocio. |
| Negocio + deduplicación en misma tx | **NO** | Sin mecanismo de deduplicación transaccional. |

**Distinción:**
- **Idempotencia de publicación:** No implementada (sin event_id consistente, sin deduplicación).
- **Idempotencia de consumo:** No implementada.
- **Efectos de negocio:** Parcialmente idempotentes para `workout.completed` (guardas en servicio), pero no garantizado end-to-end con eventos duplicados.

## H. Auditoría de seguridad SSE

**RunningLive** (`apps/api/internal/interfaces/http/handlers/training.go:957-1025`):
- Autenticación: Requiere `middleware.GetUserID(c) != ""` → 401 si no autenticado. ✅
- Rol: Obtiene role via `middleware.GetUserRole(c)` (se envía en evento connected). ✅
- Relación coach-athlete: Verifica ownership vía `h.service.GetAssignedWorkoutDetail(c.Context(), workoutID)`. ✅
- Ownership: Solo permite si `detail.Workout.CoachID == userID || detail.Workout.AthleteID == userID` → 403 si no. ✅
- Filtrado por coach_id/athlete_id: Se suscribe por `workoutID` (clave del hub). Filtrado se hace en handler (ownership) no solo por clave. ✅
- Prevención suscripción a recursos ajenos: Sí, con chequeo de ownership. ✅
- Protección IDs manipulados: Ownership check previene acceso cruzado. ✅
- Desconexión/limpieza: `defer runningapp.DefaultHub.Unsubscribe(...)` cierra canal y limpia mapa. ✅

**EarningsLive** (`apps/api/internal/interfaces/http/handlers/earnings.go:57-130`):
- Autenticación: Requiere userID → 401. ✅
- Rol: Requiere rol "coach" → 403 si no. ✅
- Suscripción por `userID` (coach). Solo coaches pueden suscribirse a su propio stream. ✅
- Limpieza con defer. ✅

**Matriz de acceso (casos reales):**

| Recurso | Acción | Coach propio | Coach ajeno | Atleta propio | Atleta ajeno | Sin auth | Resultado esperado |
|---------|--------|--------------|-------------|---------------|--------------|----------|-------------------|
| RunningLive `/workouts/:id/running-live` | Suscribirse SSE | Permitido (si es coach del workout) | Denegado (403) | Permitido (si es atleta asignado) | Denegado (403) | Denegado (401) | ✅ Correcto |
| EarningsLive `/coach/earnings-live` | Suscribirse SSE | Permitido (role coach) | N/A (suscribe a su propio userID) | Denegado (403 por rol) | Denegado | Denegado (401) | ✅ Correcto |

**Vulnerabilidades/pendientes:**
- Para eventos de templates/assignments (si se exponen por SSE), no hay endpoints visibles. Necesitaría definir claves de suscripción y ownership checks.
- DefaultHub no valida ownership - la validación está en handlers. Correcto mientras se valide antes de suscribirse.
- Sin rate limiting visible en SSE endpoints.
- Sin validación de origen/CORS específica para SSE (depende de configuración global).

## I. Validaciones ejecutadas

```bash
go build ./...  # PASS (sin errores)
go vet ./...    # PASS (sin errores reportados)
go test ./...   # FAIL solo en cmd/data-migrate (TestMigrationPlanOrdering) - ajeno a Fase 4/realtime
```

**Tests específicos relacionados con running/realtime:**
- `go test ./internal/application/running/...` → PASS (cached)
- `go test ./internal/integration/running/...` → PASS (cached)
- `go test ./internal/interfaces/http/handlers/...` → PASS (cached)
- `go test ./internal/middleware/...` → PASS (cached)

**Nota:** No hay PostgreSQL local corriendo en este entorno para pruebas de integración contra DB real; las pruebas de integración de running parecen usar setup/mocks o DB configurada según entorno. No se iniciaron contenedores.

**Comparación con baseline:** Se mantiene `go build ./...` recuperado. Warning preexistente en `membership_test.go:125` no aparece en vet/build actual. Tests de running siguen pasando.

## J. Matriz final de los ocho escenarios funcionales

| # | Escenario | Estado | Prueba existente | Evidencia | Qué falta para conseguir PASS |
|---|-----------|--------|-------------------|-----------|-------------------------------|
| 1 | Coach crea plantilla → atleta autorizado recibe `template.created` | **BLOCKED** | `TestPhase4_TemplateCreated` (solo log) | Servicio inserta en outbox, pero sin worker no se publica a DefaultHub/SSE. Sin endpoint SSE claro para este evento. | Crear worker para procesar outbox y publicar a canal adecuado (coach/atleta). Corregir esquema outbox (event_id). Definir suscripción para template.created. |
| 2 | Coach actualiza plantilla → atleta autorizado recibe `template.updated` | **FAIL/NOT IMPLEMENTED** | Ninguna específica | `UpdateTemplate` no inserta outbox. | Implementar inserción de `template.updated` en outbox (misma tx), agregar método, corregir esquema. |
| 3 | Coach asigna rutina → atleta recibe `assignment.created` | **BLOCKED** | Tests de CreateAssignment existen | Se inserta en outbox pero con payload incorrecto (`template_id` = assignmentID), sin worker, sin suscripción clara, no atómico. | Corregir payload, agregar worker, definir canal de entrega (atleta/coach), hacer atómico. |
| 4 | Atleta inicia entrenamiento → coach recibe `workout.started` | **FAIL/NOT IMPLEMENTED** | Tests de StartSession existen | `insertOutboxWorkoutStarted` existe pero no se llama desde `StartSession`. | Llamar inserción en `StartSession` (dentro de misma tx), obtener coach_id desde assignment/template/snapshot, agregar worker/publicación. |
| 5 | Atleta termina entrenamiento → coach recibe `workout.completed`, con una sola finalización y un solo XP | **BLOCKED** | Tests de CompleteSession/FinishSession existen | Se inserta outbox pero sin worker, `coach_id` NULL en outbox, no atómico. Lógica de negocio tiene guardas para evitar doble finalización. | Obtener coach_id correctamente, worker + publicación al coach, hacer atómico. Verificar idempotencia end-to-end. |
| 6 | Servidor se cae → eventos pendientes se recuperan | **BLOCKED** | Ninguna | Outbox persiste eventos, pero sin worker no hay recuperación/procesamiento. Leases faltantes. | Implementar worker con leases/expiración, recuperación de `processing` expirados, reintentos. |
| 7 | Evento se publica dos veces → no duplica efectos | **BLOCKED/RISK** | Ninguna | Sin event_id consistente, sin deduplicación de consumidor, sin tabla de idempotencia. Guardas parciales en negocio. | Agregar event_id, deduplicación por consumidor, efectos idempotentes o transaccionales. |
| 8 | Coach no recibe eventos de otros coaches ni de atletas ajenos | **BLOCKED/UNKNOWN** | Parcial en SSE (RunningLive/EarningsLive) | Ownership checks existen en SSE handlers actuales, pero para nuevos eventos no hay endpoints/suscripciones definidos. Sin worker/filtrado. | Definir suscripciones con filtrado por coach_id/athlete_id, validación de ownership, tests. |

**Nota sobre "running tab en create exercise":** El usuario mencionó que "el coach en create exercise tiene un tab llamado running y hay es donde debe ir y en evento si es de running crear todo tambien". Esto indica que los eventos de running deben integrarse correctamente en el flujo de creación de ejercicios/rutinas running - aspecto a considerar al completar los 5 eventos.

## K. Informe de cierre

### Estado por componente (resumen)
| Componente | Estado | Comentario |
|------------|--------|-------------|
| Outbox migration 012 | **BLOQUEADO** | Falta event_id, leases, estados/índices inconsistentes con código. |
| Escritura a outbox (servicio) | **PARCIAL** | 3/5 eventos; no atómico; payloads con errores; faltan 2 eventos. |
| Worker procesador | **NO IMPLEMENTADO** | Crítico - sin él no hay entrega. |
| DefaultHub + SSE | **PARCIAL** | Funciona para running live/earnings, pero no integrado con outbox para los 5 eventos. |
| Idempotencia | **INSUFICIENTE** | Guardas parciales en negocio, sin deduplicación end-to-end. |
| Seguridad SSE | **ACEPTABLE** | Ownership checks correctos donde existen endpoints. |

### Bloqueos comprobados
1. **Sin worker para procesar outbox** - eventos quedan pendientes.
2. **Esquema outbox desincronizado** (falta `event_id`, leases) vs código que inserta.
3. **Transaccionalidad rota** - negocio y outbox en conexiones/transacciones separadas.
4. **Eventos faltantes** - `template.updated` no se escribe; `workout.started` no se llama.
5. **Contratos incorrectos** - `assignment.created` payload tiene `template_id` = assignmentID; `workout.completed` sin `coach_id` correcto.
6. **Sin puente outbox->DefaultHub** y sin endpoints/suscripciones definidos para todos los 5 eventos.

### Lista exacta para cerrar Fase 4 (ordenada por prioridad/dependencia/esfuerzo)
| Orden | Tarea | Prioridad | Dependencia | Esfuerzo | Detalle |
|-------|-------|-----------|-------------|----------|---------|
| 1 | Corregir migración 012 / esquema outbox | P0 | Ninguna | S-M | Agregar `event_id` UUID UNIQUE, `locked_by` VARCHAR(255), `locked_until` TIMESTAMPTZ, unificar estados a pending/processing/published/dead, ajustar `next_retry_at` (DEFAULT occurred_at o COALESCE), índices para leases. Alinear con lo que código espera o alinear código. |
| 2 | Hacer negocio+outbox atómicos | P0 | 1 | M | Usar misma transacción (repo/service con tx). O usar `SaveOutbox` con tx. Eliminar escrituras separadas con `s.db` directo. Agregar rollback correcto. |
| 3 | Completar los 5 eventos | P0 | 2 | M | Agregar `template.updated` en UpdateTemplate; llamar `insertOutboxWorkoutStarted` en StartSession con `template_id` y `coach_id` correcto; corregir payloads (assignment.created debe llevar `template_id` real; workout.completed debe llevar/propagar `coach_id`). |
| 4 | Implementar worker de outbox | P0 | 1,2 | M-L | Polling con `FOR UPDATE SKIP LOCKED`, reclamación con leases, publicación fuera de tx de reclamación, backoff exponencial+jitter, MAX_ATTEMPTS=5 → dead, recuperación de leases expirados, graceful shutdown, prevención concurrente. |
| 5 | Puente worker -> DefaultHub + rutas/suscripciones | P0 | 4 | M | Publicar al canal correcto (coach_id/athlete_id/workoutID según evento). Definir endpoints SSE si necesarios o usar claves existentes. Validar ownership. |
| 6 | Idempotencia y deduplicación | P1 | 4,5 | M | Usar event_id consistente, deduplicación por consumidor, asegurar efectos idempotentes (XP, finalización). |
| 7 | Tests E2E coach<->athlete para los 5 eventos | P1 | 5,6 | M | Probar escenarios 1-8 de la matriz. |

### Criterios de aceptación para dar Fase 4 por terminada
- [ ] Los 5 eventos se escriben atómicamente con la operación de negocio (misma transacción, rollback correcto).
- [ ] Esquema outbox corregido y consistente (event_id, leases, estados unificados).
- [ ] Worker procesa outbox con FOR UPDATE SKIP LOCKED, leases, reintentos con backoff+jitter, MAX_ATTEMPTS=5 → dead.
- [ ] Eventos se publican desde outbox a DefaultHub/SSE con filtrado correcto por coach_id/athlete_id.
- [ ] Pruebas funcionales reales entre coach y athlete pasan: crear/actualizar template, asignar, iniciar, completar (con un solo XP/finalización).
- [ ] Recuperación tras caída: eventos pending/expirados se procesan tras reinicio.
- [ ] Idempotencia: evento duplicado no duplica efectos de negocio.
- [ ] Aislamiento: coach solo recibe eventos de sus atletas/recursos.
- [ ] `go build ./...` y `go vet ./...` pasan; tests relevantes pasan.
