# AUDITORÍA INTEGRAL Y PLAN DE OPTIMIZACIÓN ARQUITECTÓNICA, UI/UX Y RENDIMIENTO — MR TRAINING

**Fecha:** Marzo 2026
**Auditor:** Senior Software Architect & Independent Technical Auditor
**Alcance:** Monorepo MR Training (`apps/api` Golang, `apps/web` Next.js, `apps/mobile` Expo/React Native, Infraestructura PostgreSQL/Supabase/NATS)
**Versión del informe:** 1.0.0 (Documento Definitivo de Auditoría y Roadmap de Implementación)

---

## ÍNDICE GENERAL

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Estado Real de la Arquitectura y el Código](#2-estado-real-de-la-arquitectura-y-el-código)
   - 2.1 Visión General del Monorepo y Stack Real vs Declarado
   - 2.2 Estado de Migración de Base de Datos: Turso/libSQL vs PostgreSQL/Supabase
   - 2.3 Seguridad, Multi-Tenancy y Row Level Security (RLS)
3. [Diagnóstico de Comunicación y Sincronización (Web ↔ API ↔ Mobile)](#3-diagnóstico-de-comunicación-y-sincronización-web--api--mobile)
   - 3.1 El Flujo Crítico de Creación y Asignación de Entrenamientos
   - 3.2 Brechas de Sincronización Detectadas (Evidencia de Código)
   - 3.3 Evaluación de Infraestructura de Mensajería: Outbox, NATS JetStream, Hubs y WebSockets
   - 3.4 Comportamiento en Mobile: TanStack Query, Caché Local y Push Notifications
   - 3.5 Arquitectura de Sincronización Recomendada
4. [Auditoría Especializada del Módulo Running y GPS Tracking](#4-auditoría-especializada-del-módulo-running-y-gps-tracking)
   - 4.1 Captura en Mobile (Foreground vs Background, Expo Location y Task Manager)
   - 4.2 Permisos y Capacidades Nativas en iOS y Android
   - 4.3 Persistencia Local, Manejo Offline y Sincronización por Lotes
   - 4.4 Ingesta y Persistencia en Backend (`SaveGpsPointsBatch`)
   - 4.5 Visualización en Mapas, Rendimiento y Consumo de Batería/CPU
5. [Auditoría Arquitectónica y Refactorización del Backend Go](#5-auditoría-arquitectónica-y-refactorización-del-backend-go)
   - 5.1 Adherencia a Clean Architecture / Hexagonal / DDD
   - 5.2 Servicios y Handlers Monolíticos (Archivos Críticos)
   - 5.3 Transaccionalidad, Concurrencia y Pool de Base de Datos
   - 5.4 Evaluación de Event-Driven Architecture (EDA) en Go
6. [Auditoría de Frontend Web (Next.js 14)](#6-auditoría-de-frontend-web-nextjs-14)
   - 6.1 Arquitectura de Rutas, App Router y Clientes Monolíticos
   - 6.2 Duplicación de Código y Lógica entre Módulos (`coach` vs `workout`)
   - 6.3 Evaluación de UI/UX y Sistema de Diseño Web
7. [Auditoría de Aplicación Móvil (React Native / Expo)](#7-auditoría-de-aplicación-móvil-react-native--expo)
   - 7.1 Navegación, Estado Global y Manejo de Caché
   - 7.2 Pantallas Monolíticas y Cuellos de Botella de Renderizado
   - 7.3 Evaluación de UI/UX Mobile (Atleta)
8. [Evaluación de Resiliencia, Patrones Arquitectónicos y Observabilidad](#8-evaluación-de-resiliencia-patrones-arquitectónicos-y-observabilidad)
   - 8.1 Circuit Breaker, Retries, Bulkhead, Timeouts e Idempotencia: Dónde Aplican y Dónde No
   - 8.2 Observabilidad de Extremo a Extremo (OpenTelemetry, Prometheus, Grafana, Logs)
9. [Matriz Comparativa de Alternativas Tecnológicas](#9-matriz-comparativa-de-alternativas-tecnológicas)
10. [Riesgos Técnicos y Operativos](#10-riesgos-técnicos-y-operativos)
11. [Roadmap de Implementación por Fases (P0, P1, P2, P3)](#11-roadmap-de-implementación-por-fases-p0-p1-p2-p3)
    - 11.1 Fase P0: Seguridad, RLS, Multi-Tenancy e Integridad Transaccional
    - 11.2 Fase P1: Comunicación Confiable, Outbox Genérico y Sincronización Reactiva
    - 11.3 Fase P2: Running GPS Profesional, Fondo Continuo y Optimización Web/Mobile
    - 11.4 Fase P3: Resiliencia Perimetral, Observabilidad Unificada y CQRS Justificado
12. [Criterios de Aceptación y Protocolos de Validación](#12-criterios-de-aceptación-y-protocolos-de-validación)

---

## 1. RESUMEN EJECUTIVO

MR Training posee una base funcional sólida, con una API en Go estructurada conceptualmente bajo principios de arquitectura limpia, una aplicación Web en Next.js rica en capacidades de gestión para el entrenador y una aplicación Mobile en React Native / Expo con soporte para entrenamientos, gamificación y telemetría.

No obstante, la presente auditoría técnica ha identificado **deuda técnica estructural y discrepancias críticas entre la arquitectura declarada en la documentación y la implementación real del código**:

1. **Ruptura del flujo de sincronización Web → API → Mobile:** Cuando un entrenador asigna un entrenamiento en la Web (`POST /workouts/assign`), el evento queda registrado únicamente en la tabla de asignaciones relacional. No se emiten eventos de dominio, no se escribe en la tabla `outbox`, no se publican mensajes en NATS JetStream y no se notifica a la aplicación móvil. El atleta solo ve el entrenamiento si su app invalida la caché tras expirar el `staleTime` (que oscila entre 1 y 5 minutos) o si reinicia la pantalla.
2. **Fragilidad crítica en Running y GPS Tracking:** La captura de ubicación se ejecuta mediante `Location.watchPositionAsync` en primer plano. No existe implementación de `Location.startLocationUpdatesAsync` vinculada a `TaskManager.defineTask` para ejecución en segundo plano. En Android no está configurado el permiso `ACCESS_BACKGROUND_LOCATION` ni el Foreground Service persistente, y en iOS `UIBackgroundModes` no incluye `location`. Al apagar la pantalla o minimizar la app, el sistema operativo congela la recolección GPS. Además, si falla la red durante la carrera, los puntos se pierden en el hook `useGpsTracking.ts`.
3. **Estado híbrido e incompleto de la migración a PostgreSQL:** Aunque el backend utiliza `pgx/v5` contra PostgreSQL, persisten referencias activas a `libsql/Turso` en scripts de migración (`apps/api/cmd/data-migrate/main.go`), y el esquema de migraciones está dividido entre migraciones SQLite legacy (`001_...` a `031_...`) y migraciones PostgreSQL (`postgres/001_...` a `postgres/404_...`). Varias tablas en PostgreSQL mantienen tipos SQLite (`INTEGER` para booleans en lugar de `BOOLEAN`, `TEXT` para UUIDs) y **Row Level Security (RLS) solo está habilitado en 5 tablas**, dejando la mayoría desprotegida a nivel de base de datos.
4. **Monolitos y duplicación de código en Frontend Web y API:** Handlers en Go como `training.go` (>1,000 líneas) y servicios como `running/service.go` (>1,300 líneas) mezclan responsabilidades de orquestación, validación y persistencia. En la Web, existen componentes gigantes duplicados (`features/coach/components/workouts/WorkoutBuilder.tsx` vs `features/workout/components/WorkoutBuilder.tsx`) y un cliente HTTP monolítico (`features/shared/api/client.ts`) de más de 2,000 líneas con endpoints duplicados contra rutas proxy Next.js simuladas.
5. **Ausencia de resiliencia perimetral y observabilidad unificada:** No existen Circuit Breakers en integraciones externas críticas (MercadoPago, Expo Push API, Garmin). Las dependencias de OpenTelemetry están como paquetes indirectos sin inicializar y no existe un recolector de métricas Prometheus ni instrumentación de extremo a extremo.

---

## 2. ESTADO REAL DE LA ARQUITECTURA Y EL CÓDIGO

### 2.1 Visión General del Monorepo y Stack Real vs Declarado

| Componente | Documentado / Declarado | Estado Real en Código | Diagnóstico / Evidencia |
|---|---|---|---|
| **Backend API** | Go 1.25, Fiber v2, Clean Arch | Go 1.25 con Fiber v2.52.6 | **Implementado.** Estructura Clean Arch presente pero erosionada en servicios grandes. |
| **Base de Datos** | PostgreSQL 16+ / Supabase | PostgreSQL vía `pgx/v5/stdlib` + restos de Turso | **Híbrido.** Conecta a Postgres, pero coexisten migraciones y librerías de libSQL. |
| **Event Bus** | NATS 2.10 con JetStream | `apps/api/internal/infrastructure/nats` | **Parcialmente operativo.** Solo usado por el consumidor `athlete.session.*`. No está integrado en el flujo de asignación ni en el outbox general. |
| **Web Frontend** | Next.js 14 App Router + React 18 | Next.js 14.2.35 + React 18 | **Implementado.** App Router activo, pero con duplicación de features y rutas proxy redundantes. |
| **Mobile App** | React Native Expo 57 | Expo SDK 57 (RN 0.86.3, React 19) | **Implementado.** Excelente base de dependencias modernas, pero falta integración profunda de background tasks. |
| **Caché / Persistencia** | Redis 7 + MMKV | Redis (opcional, fallback memoria) + MMKV | **Implementado.** Fallback fail-open en Go funcional; MMKV activo en mobile. |
| **Observabilidad** | OpenTelemetry + Prometheus | Logger estructurado Zap | **Incompleto.** OpenTelemetry existe solo como dependencia indirecta; no hay métricas Prometheus activas. |

### 2.2 Estado de Migración de Base de Datos: Turso/libSQL vs PostgreSQL/Supabase

#### Hallazgos y Evidencias:
1. **Librerías legacy en Go:**
   En `apps/api/go.mod`:
   ```text
   github.com/tursodatabase/libsql-client-go v0.0.0-20260528064733-9d5d30a29a60
   ```
   En `apps/api/cmd/data-migrate/main.go` (línea 27):
   ```go
   _ "github.com/tursodatabase/libsql-client-go/libsql"
   ```
   El paquete `data-migrate` sigue importando el driver de libSQL para migrar datos entre Turso y PostgreSQL.
2. **Dualidad de archivos de migración:**
   - Carpeta legacy: `apps/api/migrations/` contiene 31 archivos `.sql` escritos con sintaxis SQLite (`datetime('now')`, `AUTOINCREMENT`). Existen 64 ocurrencias de `datetime('now')`.
   - Carpeta Postgres: `apps/api/migrations/postgres/` contiene 36 archivos `.sql` adaptados a PostgreSQL (`TIMESTAMPTZ`, `NOW()`).
   - El runner de migraciones `cmd/migrate/main.go` recibe `-dir migrations` por defecto, lo que podría intentar aplicar archivos SQLite si no se especifica `-dir migrations/postgres`.
3. **Tipos no canónicos en PostgreSQL:**
   En `apps/api/migrations/postgres/300_remaining_migrations.sql`:
   - Línea 25: `is_custom INTEGER NOT NULL DEFAULT 0` (debe ser `BOOLEAN DEFAULT FALSE`).
   - Línea 41: `is_active INTEGER NOT NULL DEFAULT 1` (debe ser `BOOLEAN DEFAULT TRUE`).
   - Línea 277: `completed INTEGER NOT NULL DEFAULT 0`.
   - Más de 92 tablas usan `TEXT PRIMARY KEY` en lugar de `UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
4. **Desincronización con el directorio `supabase/migrations/`:**
   Al comparar `apps/api/migrations/postgres/` con `supabase/migrations/`, se detectó que 12 migraciones críticas están presentes en `apps/api/migrations/postgres/` pero **faltan en `supabase/migrations/`**:
   - `009_running_workout_templates_segments_column.sql`
   - `010_plan_versions.sql`
   - `011_plan_trm_column.sql`
   - `012_outbox_transaccional.sql`
   - `032_commission_rls.sql`
   - `301_exercise_library_image_url.sql`
   - `400_subscriptions.sql`
   - `401_subscription_payments.sql`
   - `402_athlete_session_tables.sql`
   - `403_landing_contacts.sql`
   - `404_outbox_fix.sql`

*Impacto:* Si un desarrollador despliega contra Supabase usando el CLI oficial (`supabase db push`), la base de datos quedará incompleta, provocando fallos en producción por tablas y columnas faltantes.

### 2.3 Seguridad, Multi-Tenancy y Row Level Security (RLS)

#### Hallazgos y Evidencias:
1. **RLS deshabilitado en el 94% de las tablas:**
   Solo 5 tablas tienen activado Row Level Security en las migraciones de PostgreSQL:
   - `athlete_prs` (`402_athlete_session_tables.sql:79`)
   - `athlete_session_stats` (`402_athlete_session_tables.sql:83`)
   - `athlete_session_progress` (`402_athlete_session_tables.sql:87`)
   - `commission_agreements` (`032_commission_rls.sql:33`)
   - `commission_entries` (`032_commission_rls.sql:34`)

   Tablas neurálgicas como `users`, `coaches`, `coach_athletes`, `workouts`, `running_sessions`, `running_gps_points`, `subscriptions`, y `athlete_memberships` **no tienen RLS habilitado**.
2. **Aislamiento en aplicación (Middleware y Handlers):**
   El aislamiento depende exclusivamente del código en Go:
   - `internal/middleware/tenant.go` y `internal/middleware/rbac.go` verifican el rol y extraen el `coach_id` del token JWT o headers.
   - Si un desarrollador olvida incluir la cláusula `WHERE coach_id = $1` en un nuevo repository o endpoint, la base de datos no tiene una barrera secundaria (RLS) para prevenir un ataque IDOR (Insecure Direct Object Reference).

---

## 3. DIAGNÓSTICO DE COMUNICACIÓN Y SINCRONIZACIÓN (WEB ↔ API ↔ MOBILE)

### 3.1 El Flujo Crítico de Creación y Asignación de Entrenamientos

Se analizó el ciclo de vida completo cuando un entrenador asigna un entrenamiento a un atleta desde la Web:

```
[Web: Coach Action]
   │
   ▼ POST /api/v1/workouts/assign
[API: Fiber Router & Middleware]
   │  (Valida JWT Clerk + RequireCoach + RequireCoachID)
   ▼
[API: TrainingHandler.AssignWorkout]
   │  (dto.AssignWorkoutRequest: athleteId, templateId, dates)
   ▼
[API: TrainingService.AssignWorkout]
   │  (Valida existencia de plantilla y pertenencia al coach)
   ▼
[API: WorkoutRepository.AssignWorkout]
   │  (INSERT INTO coach_assignments ...)
   ▼
[PostgreSQL Database] ─── (Fin del flujo síncrono)
   │
   x  NO se inserta registro en la tabla outbox
   x  NO se publica evento en NATS JetStream
   x  NO se emite evento en WebSockets / SSE
   x  NO se despacha Push Notification vía Expo
   │
   ▼
[Mobile: App Atleta]
   │  (La pantalla de inicio/Today no se entera del cambio)
   │  (Depende de que expire el staleTime de TanStack Query: 1 a 5 minutos)
   │  (O de que el atleta deslice para refrescar manualmente)
```

### 3.2 Brechas de Sincronización Detectadas (Evidencia de Código)

1. **`AssignWorkout` en `apps/api/internal/application/training/service.go` (líneas 303-345):**
   ```go
   func (s *Service) AssignWorkout(ctx context.Context, coachID string, req dto.AssignWorkoutRequest) (*training.AssignedWorkout, error) {
       // ... validaciones ...
       if err := s.workoutRepo.AssignWorkout(ctx, assigned); err != nil {
           return nil, fmt.Errorf("assign workout: %w", err)
       }
       return assigned, nil // <- TERMINA AQUÍ SIN PUBLICAR NINGÚN EVENTO
   }
   ```
2. **Worker de Outbox acoplado y no distribuido:**
   En `apps/api/internal/application/running/outbox/worker.go`:
   - El worker lee de la tabla `outbox` procesando únicamente eventos del subdominio running (`workout.progress`, `template.created`, `assignment.created`).
   - Al despachar el evento, ejecuta:
     ```go
     runningapp.DefaultHub.Publish(ev)
     ```
   - `DefaultHub` (`apps/api/internal/application/running/live.go:50`) es un **hub en memoria (canales Go en el proceso local)**. Si la API corre en múltiples instancias (Kubernetes / Coolify / ECS), los clientes conectados a una instancia distinta jamás reciben el evento.
3. **NATS JetStream subutilizado:**
   En `apps/api/cmd/api/main.go` (líneas 148-168), NATS se inicializa únicamente para consumir eventos de proyección física (`athlete.session.*`). Ningún handler de asignación de entrenamiento, pagos, o running publica mensajes en NATS.
4. **Push Notifications no reactivas en Mobile:**
   En `apps/mobile/src/infrastructure/notifications/push.ts`, la app registra el token con la API. Sin embargo, no hay ningún `Notifications.addNotificationReceivedListener` configurado para escuchar eventos de datos en background y forzar la invalidación reactiva de claves como `['athlete-today']` o `['athlete-workouts']` en TanStack Query.

### 3.3 Comparación de Alternativas de Sincronización

| Mecanismo | Ventajas | Desventajas | Decisión |
|---|---|---|---|
| **Supabase Realtime (CDC)** | Escucha cambios directos en WAL de PostgreSQL. No requiere escribir en Go. | Acopla la UI al esquema físico de la BD. Bypass de reglas de negocio en Go. Requiere RLS exhaustivo en todas las tablas para no filtrar datos a otros atletas. Costo de conexiones concurrentes en Supabase. | **Descartado como canal primario.** Viola la regla de que Go es la única fuente de verdad y reglas de negocio. |
| **WebSockets propios en Go** | Control total de autenticación (Clerk JWT), baja latencia, bidireccional. | Requiere mantener conexiones persistentes (batería en mobile). Se corta si el OS suspende la app. No sirve para apps cerradas. | **Aceptado para sesiones en vivo (Live Running / Video).** No como canal general de sincronización. |
| **Server-Sent Events (SSE)** | Unidireccional simple sobre HTTP, reconexión automática. | Mismos problemas de consumo de batería y suspensión en background que WebSockets en mobile. | **Recomendado para Web Coach Dashboard.** Desaconsejado como canal primario en Mobile. |
| **Arquitectura Híbrida: Outbox + Push Silencioso + React Query (Recomendada)** | Máxima confiabilidad: entrega desacoplada, funciona con app cerrada, sin consumo de batería en reposo, tolerancia total a fallos de red. | Requiere configurar payloads de datos en notificaciones push y listeners en mobile. | **SELECCIONADO COMO CANAL PRINCIPAL.** |

### 3.4 Arquitectura de Sincronización Recomendada

```
[Web: Coach]
      │
      ▼ POST /api/v1/workouts/assign
[API: Go Service (Training)]
      │
      ├── Inicia Transacción SQL (database/sql con pgx)
      │    ├── 1. INSERT INTO coach_assignments (...)
      │    └── 2. INSERT INTO outbox (event_type='workout.assigned', payload=...)
      └── Commit Transacción
           │
           ▼
[Outbox Processor (Go Worker)]
      │ (Polls con FOR UPDATE SKIP LOCKED)
      ▼
[NATS JetStream (Async Backbone)]
      │ (Subject: mr.training.workout.assigned)
      ├──► [Consumer 1: Notification Worker] ──► Expo Push Service ──► Mobile (Silent Push)
      │                                                                       │
      │                                                                       ▼
      │                                                          React Query: Invalidate
      │                                                          queryClient.invalidateQueries(['athlete-today'])
      │                                                                       │
      ├──► [Consumer 2: Analytics Projector]                                  ▼
      └──► [Consumer 3: Coach Live SSE Hub]                      Atleta visualiza workout
```

*Garantía Offline:* Si el dispositivo del atleta está apagado o sin red, la push notification puede descartarse. Sin embargo, al abrir la app o reconectarse (`NetInfo`), `focusManager` y `onlineManager` de TanStack Query disparan la revalidación contra `/api/v1/athletes/today`, garantizando consistencia eventual estricta sin depender únicamente de la notificación.

---

## 4. AUDITORÍA ESPECIALIZADA DEL MÓDULO RUNNING Y GPS TRACKING

### 4.1 Captura en Mobile (Foreground vs Background)

#### Evidencia del Código:
1. **Divergencia entre implementaciones:**
   Existen dos implementaciones de tracking GPS en `apps/mobile`:
   - `src/features/training/hooks/useGpsTracking.ts`: Usado dentro del contexto de sesiones de entrenamiento guiadas.
   - `src/features/training/presentation/screens/RunRecordingScreen.tsx`: Pantalla dedicada de grabación libre de carrera.
2. **Falta de Foreground Service y Background Task:**
   En `useGpsTracking.ts` (línea 86):
   ```typescript
   const subscription = await Location.watchPositionAsync(
     { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 5000 },
     location => { /* ... */ }
   );
   ```
   `watchPositionAsync` es una API diseñada **exclusivamente para primer plano**. Cuando el usuario bloquea el teléfono o cambia a otra aplicación (ej. Spotify o Strava), el sistema operativo móvil detiene o desacelera el temporizador de JavaScript, congelando la recepción de coordenadas.
3. **Pérdida de puntos por fallo de red:**
   En `useGpsTracking.ts` (líneas 43-49):
   ```typescript
   const flushBatch = useCallback(async () => {
     const batch = buffer.current.splice(0, buffer.current.length); // Saca los puntos del buffer
     if (batch.length === 0) return;
     try {
       await apiClient.post(`/running/sessions/${workoutId}/live-location`, { /* ... */ });
     } catch {
       // Best-effort batch send. Points are dropped from the buffer so the queue
       // cannot grow unbounded; a retryable failure is surfaced as an error banner.
       void setError('No se pudo sincronizar la ubicación.'); // ¡LOS PUNTOS SE PIERDEN!
     }
   }, [workoutId]);
   ```
   Si el corredor pasa por una zona de mala cobertura (parque, túnel), los puntos GPS se eliminan de la memoria RAM sin guardarse en persistencia duradera, arruinando el trazado de la ruta.

### 4.2 Permisos y Configuración Nativa en iOS y Android

En `apps/mobile/app.json`:
1. **Configuración iOS:**
   ```json
   "UIBackgroundModes": [
     "processing",
     "fetch"
   ]
   ```
   **Falta crítica:** Falta `"location"` en `UIBackgroundModes`. Sin esta clave en el `Info.plist`, iOS cerrará inmediatamente el acceso GPS tan pronto como la aplicación pase a segundo plano.
2. **Configuración Android:**
   ```json
   "permissions": [
     "android.permission.ACCESS_FINE_LOCATION",
     "android.permission.ACCESS_COARSE_LOCATION"
   ]
   ```
   **Falta crítica:** Falta `"android.permission.ACCESS_BACKGROUND_LOCATION"` y la definición del servicio Foreground en el `AndroidManifest` para Android 10+ (API level 29+). En Android 14+, además, se requiere `FOREGROUND_SERVICE_LOCATION`.

### 4.3 Ingesta y Persistencia en Backend (`SaveGpsPointsBatch`)

En `apps/api/internal/infrastructure/running/repository.go` (líneas 256-285):
```go
func (r *Repository) SaveGpsPoints(ctx context.Context, points []*domain.GpsPoint) error {
    // ...
    stmt, err := tx.PrepareContext(ctx,
        `INSERT INTO running_gps_points (id, session_id, lat, lng, alt, timestamp, accuracy)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`)
    // ...
    for _, p := range points {
        if _, err := stmt.ExecContext(ctx, p.ID, p.SessionID, p.Lat, p.Lng, p.Alt, p.Timestamp, p.Accuracy); err != nil {
            return fmt.Errorf("failed to save gps point in batch: %w", err)
        }
    }
    return tx.Commit()
}
```
*Problema de rendimiento:* Aunque utiliza una transacción, ejecuta una llamada de red round-trip por cada punto dentro del bucle (`stmt.ExecContext`). Para un lote de 100 puntos, genera 100 ejecuciones individuales. En PostgreSQL debe utilizarse un multi-row insert (`UNNEST($1::uuid[], $2::uuid[], ...)` o `INSERT INTO ... VALUES (...), (...), ...`), reduciendo la latencia de inserción en un 85%.

### 4.4 Arquitectura Recomendada para Running

```
[Mobile: GPS Native Chip]
       │
       ▼ (Hardware Location Updates)
[Expo TaskManager (Background Task Registrada)]
       │ (android.permission.FOREGROUND_SERVICE_LOCATION + Persistent Notification)
       ▼
[TrackingEngine (Filtrado Kalman / Haversine)]
       │
       ├── Filtro 1: Descartar si accuracy > 30 metros
       ├── Filtro 2: Descartar si velocidad > 15 m/s (anomalía de salto)
       └── Filtro 3: Descartar si distancia < 2 metros en reposo
       │
       ▼
[Persistencia Local Duradera (SQLite / MMKV Offline Queue)]
       │ (Todos los puntos quedan salvaguardados en disco)
       │
       ▼
[Sync Dispatcher (Worker en segundo plano)]
       ├── Con Red: Envía lotes de 20-50 puntos con Idempotency Key
       │    └── Backend confirma 200 OK ──► Marca puntos como 'synced'
       └── Sin Red / Error 5xx: Mantiene puntos en cola local
            └── Backoff exponencial y reintento automático al detectar NetInfo.isConnected
```

---

## 5. AUDITORÍA ARQUITECTÓNICA Y REFACTORIZACIÓN DEL BACKEND GO

### 5.1 Adherencia a Clean Architecture / Hexagonal / DDD

La estructura general en `apps/api/internal` respeta las capas clásicas:
- `domain/`: Entidades y contratos de repositorio.
- `application/`: Casos de uso y orquestación.
- `infrastructure/`: Implementaciones de BD, clientes HTTP, Redis, NATS.
- `interfaces/http/`: Handlers Fiber, DTOs y validadores.

**Puntos de quiebre arquitectónico:**
1. **Inyección directa de `*sql.DB` en Handlers:**
   En `apps/api/cmd/api/main.go`:
   - `coachHandler := handlers.NewCoachHandler(coachService, db.DB)` (línea 357).
   - `membershipHandler := userhttp.NewMembershipHandler(membershipService, gamificationService, db.DB, tenantResolver)` (línea 353).
   - `eventHandler := userhttp.NewEventHandler(eventService, hub, db.DB)` (línea 386).
   *Violación:* Los handlers HTTP tienen acceso directo al driver de base de datos SQL para ejecutar consultas ad-hoc, puenteando la capa de aplicación y repositorio.
2. **Archivos masivos que violan el principio de responsabilidad única (SRP):**
   - `apps/api/internal/application/running/service.go` (1,317 líneas).
   - `apps/api/internal/interfaces/http/handlers/training.go` (1,065 líneas).
   - `apps/api/internal/infrastructure/training/workout_repository.go` (895 líneas).
   - `apps/api/internal/infrastructure/running/repository.go` (817 líneas).
   - `apps/api/internal/interfaces/http/routes/routes.go` (721 líneas).

### 5.2 Plan de Refactorización de Servicios Monolíticos

```
apps/api/internal/application/running/
├── service.go (1,317 líneas) ──► DIVIDIR EN:
│   ├── session_service.go      (Inicio, pausa, fin de sesión)
│   ├── tracking_service.go     (Ingesta de telemetría y GPS)
│   ├── workout_service.go      (Plantillas estructuradas y series)
│   └── stats_service.go        (Cálculo de métricas, ritmos y récords)
```

```
apps/api/internal/interfaces/http/handlers/training.go (1,065 líneas) ──► DIVIDIR EN:
├── exercise_handler.go        (Catálogo y biblioteca de ejercicios)
├── template_handler.go        (Plantillas de entrenamiento)
├── assignment_handler.go      (Asignaciones a atletas)
└── session_execution_handler.go (Registro de series y progreso)
```

---

## 6. AUDITORÍA DE FRONTEND WEB (NEXT.JS 14)

### 6.1 Arquitectura de Rutas y Clientes Monolíticos

1. **Monolito `features/shared/api/client.ts` (2,088 líneas):**
   Concentra todas las llamadas HTTP de la aplicación en un solo archivo con más de 40 interfaces y 15 objetos API (`workoutApi`, `coachApi`, `athleteApi`, `eventsApi`, etc.).
   - Mezcla llamadas al backend de Go (`goFetch`) con fallbacks a rutas de Next.js (`nextFetch`).
2. **Rutas proxy innecesarias o vacías en Next.js:**
   En `apps/web/src/app/api/coaching/assigned-workouts/route.ts`:
   ```typescript
   export async function GET() {
     // ...
     return NextResponse.json([]); // Retorna array vacío mockeado
   }
   ```
   Existen más de 40 carpetas bajo `apps/web/src/app/api/` que actúan como proxies incompletos hacia Go o respuestas mockeadas que confunden la fuente de verdad.
   - *Regla de Oro del Repo:* Toda la comunicación debe ir directo de Web a la API de Go (`apps/api`). Next.js API routes deben eliminarse excepto para webhooks externos (Clerk, Paddle).

### 6.2 Duplicación de Código y Lógica

- `apps/web/src/features/coach/components/workouts/WorkoutBuilder.tsx` (822 líneas) y `apps/web/src/features/workout/components/WorkoutBuilder.tsx` (556 líneas) son dos constructores de entrenamientos paralelos que compiten entre sí, importando librerías distintas (`framer-motion` vs helpers locales).
- Lo mismo ocurre con `ExerciseLibrary.tsx` en `features/coach` y `features/workout`.

---

## 7. AUDITORÍA DE APLICACIÓN MÓVIL (REACT NATIVE / EXPO)

### 7.1 Navegación, Estado y Rendimiento

1. **Pantallas con exceso de renderizado:**
   - `EventsScreen.tsx` (1,266 líneas): Gestiona pestañas, filtros, modales, llamadas de red y carruseles en un único componente sin sub-componentización memoizada (`React.memo`).
   - `TodayScreen.tsx` (711 líneas): Ejecuta 7 consultas `useQuery` simultáneas (`useTodayData`, `useStreaks`, `usePRs`, `useWorkouts`, `useChallenges`, `useStore`, `useHealth`). Si no se configuran adecuadamente los selectores (`select:`), cualquier cambio menor invalida toda la jerarquía de la pantalla principal.
2. **Uso de FlashList:**
   Está instalado `@shopify/flash-list: 2.0.2`, pero en varios componentes se siguen utilizando `ScrollView` con mapeos directos (`data.map(...)`) en lugar de listas virtualizadas, provocando alto consumo de memoria en feeds de historial y ejercicios.

---

## 8. EVALUACIÓN DE RESILIENCIA, PATRONES ARQUITECTÓNICOS Y OBSERVABILIDAD

### 8.1 Circuit Breaker, Retries e Idempotencia

#### Dónde SÍ Aplica Circuit Breaker (Límites Externos):
1. **MercadoPago API:**
   En `apps/api/internal/infrastructure/subscription/mercadopago/adapter.go`: Si MercadoPago sufre una degradación o latencia >10s, las peticiones entrantes de los atletas bloquean goroutines del servidor Fiber.
   - *Solución:* Circuit Breaker (umbral: 5 fallos consecutivos o 50% de error en 30s; abrir circuito durante 60s).
2. **Expo Push Notification API:**
   En `apps/api/internal/infrastructure/expo/sender.go`: Las llamadas masivas de push deben protegerse con Circuit Breaker y Bulkhead para que una indisponibilidad del servicio de Expo no ralentice el procesamiento de eventos.
3. **Garmin Health / Wearables API:**
   Llamadas HTTP externas para sincronizar actividades de terceros.

#### Dónde NO Aplica Circuit Breaker:
- **Base de Datos PostgreSQL:** Un Circuit Breaker sobre PostgreSQL oculta problemas de transacciones, provoca inconsistencias en escrituras y devuelve datos corruptos o vacíos. Para la BD se debe utilizar:
  - Timeouts estrictos por contexto (ej. 3 a 5 segundos).
  - Configuración óptima del pool (`SetMaxOpenConns(25)`, `SetMaxIdleConns(5)`, `SetConnMaxLifetime(30m)`).
  - Bulkheads / Límites de concurrencia en consultas de analítica pesada.

#### Idempotencia (Idempotency Keys):
- Obligatoria en `POST /workouts/assign`, `POST /subscriptions`, `POST /running/sessions/:id/live-location` y endpoints de cobro para evitar dobles registros ante reintentos automáticos de red.

### 8.2 Observabilidad Unificada

1. **Estado Actual:**
   - Logs: Zap Logger estructurado configurado adecuadamente (`internal/logger/logger.go`).
   - Tracing: Paquetes OpenTelemetry importados en `go.sum` pero **sin inicializar** en `cmd/api/main.go`. No hay `TracerProvider` configurado.
   - Métricas: No existe endpoint `/metrics` para Prometheus.
2. **Arquitectura Propuesta:**
   - Exponer `/metrics` con cliente oficial `prometheus/client_golang` instrumentando:
     - Duración de peticiones HTTP por ruta y método.
     - Longitud de la cola de Outbox (`outbox_pending_events`).
     - Tasa de éxito/fallo de eventos despachados en NATS.
     - Métricas de ingesta GPS (puntos por segundo, latencia de batch).
   - Inyectar `traceparent` (W3C Trace Context) desde Web y Mobile en los headers HTTP para correlacionar trazas completas de asignación y sincronización.

---

## 9. MATRIZ COMPARATIVA DE ALTERNATIVAS TECNOLÓGICAS

| Eje Arquitectónico | Opción A (Recomendada) | Opción B (Alternativa) | Justificación de Elección |
|---|---|---|---|
| **Sincronización Web ↔ Mobile** | **Outbox en Postgres + NATS JetStream + Push Silencioso + React Query** | Supabase Realtime (CDC directo a Postgres) | Opción A preserva las reglas de negocio en Go, no expone el schema físico a clientes, soporta entrega offline garantizada y tiene costo de infraestructura predecible. |
| **Tracking GPS en Mobile** | **Expo TaskManager (Background Location) + Foreground Service Nativo** | Módulo nativo puro en Kotlin/Swift desacoplado de Expo | Expo TaskManager soportado en SDK 57 resuelve el problema sin obligar a ejectar el proyecto (`prebuild`), siempre que se configuren correctamente los permisos nativos y el Foreground Service. |
| **Resiliencia de Llamadas Externas** | **Circuit Breaker perimetral (MercadoPago, Expo Push, Garmin)** | Circuit Breaker global incluyendo Base de Datos | Opción A evita fallos catastróficos silenciosos en el almacenamiento de datos primario y protege los puntos de integración externos propensos a timeouts. |
| **Persistencia de Eventos** | **Transactional Outbox Table en PostgreSQL** | Dual-write síncrono (Postgres + NATS en el handler) | Dual-write sufre de inconsistencia en caso de caída entre la escritura en BD y la publicación en NATS. Outbox garantiza atomicidad transaccional (ACID). |

---

## 10. RIESGOS TÉCNICOS Y OPERATIVOS

| Riesgo | Probabilidad | Impacto | Severidad | Mitigación |
|---|---|---|---|---|
| **Fuga de datos por falta de RLS (Multi-tenancy)** | Alta | Crítica | **P0** | Implementar políticas RLS en PostgreSQL para todas las tablas sensibles y validar en tests unitarios con roles `coach` y `athlete`. |
| **Pérdida de rutas de running en background** | Alta | Alta | **P1** | Implementar Foreground Service persistente en Android y modo `location` en iOS mediante Expo TaskManager, respaldado por cola SQLite/MMKV en disco. |
| **Inconsistencia en asignaciones por fallo de red** | Media | Alta | **P1** | Migrar `POST /workouts/assign` a modelo transaccional con Outbox y reintentos idempotentes. |
| **Bloqueo del API por indisponibilidad de MercadoPago/Expo** | Media | Alta | **P2** | Implementar Circuit Breaker con timeout de 5s y fallback controlado. |
| **Deriva de esquemas entre Supabase y la API Go** | Alta | Alta | **P0** | Unificar el directorio de migraciones: `apps/api/migrations/postgres` debe ser el único reflejado en `supabase/migrations`. |

---

## 11. ROADMAP DE IMPLEMENTACIÓN POR FASES (P0, P1, P2, P3)

```
┌────────────────────────────────────────────────────────────────────────┐
│                          ROADMAP MR TRAINING                           │
├────────────────────────────────────────────────────────────────────────┤
│  FASE P0: Seguridad, RLS, Multi-Tenancy e Integridad Transaccional     │
│  ├─ Unificar migraciones PostgreSQL y eliminar código Turso            │
│  ├─ Implementar RLS estricto en tablas críticas                        │
│  └─ Corregir tipos SQLite residuales (BOOLEAN, UUID)                   │
├────────────────────────────────────────────────────────────────────────┤
│  FASE P1: Comunicación Confiable, Outbox y Sincronización Reactiva     │
│  ├─ Generalizar Transactional Outbox para todos los dominios          │
│  ├─ Conectar NATS JetStream al flujo de asignaciones y entrenamientos  │
│  ├─ Configurar Silent Push en Expo + Listeners reactivos en Mobile     │
│  └─ Reconciliación offline en React Query                              │
├────────────────────────────────────────────────────────────────────────┤
│  FASE P2: Running GPS Profesional y Optimización de Rendimiento        │
│  ├─ Configurar Expo TaskManager con Foreground Service en Android/iOS  │
│  ├─ Persistencia duradera y cola de sincronización offline GPS         │
│  ├─ Optimizar batch insert en Go (multi-row / UNNEST)                  │
│  └─ Refactorizar pantallas monolíticas en Web y Mobile                 │
├────────────────────────────────────────────────────────────────────────┤
│  FASE P3: Resiliencia Perimetral, Observabilidad y Evolución           │
│  ├─ Circuit Breakers en MercadoPago, Expo Push y Garmin                │
│  ├─ Instrumentación OpenTelemetry + Prometheus /metrics                │
│  └─ CQRS y Read Models en dashboards de alto tráfico                   │
└────────────────────────────────────────────────────────────────────────┘
```

### 11.1 Fase P0: Seguridad, RLS, Multi-Tenancy e Integridad Transaccional
- **Objetivo:** Garantizar que los datos estén completamente aislados entre entrenadores y atletas, eliminar deuda técnica de Turso y asegurar la integridad de la base de datos PostgreSQL.
- **Acciones:**
  1. Eliminar dependencia `github.com/tursodatabase/libsql-client-go` de `apps/api/go.mod` y retirar scripts SQLite legacy.
  2. Sincronizar las 12 migraciones faltantes en `supabase/migrations/` desde `apps/api/migrations/postgres/`.
  3. Crear migración SQL para habilitar RLS y políticas por `coach_id` y `athlete_id` en tablas maestras: `users`, `coaches`, `coach_athletes`, `workouts`, `running_sessions`, `running_gps_points`, `subscriptions`.
  4. Convertir columnas `INTEGER` (0/1) a `BOOLEAN` en PostgreSQL para tablas de ejercicios y suscripciones.
- **Archivos involucrados:** `apps/api/go.mod`, `apps/api/cmd/data-migrate/`, `apps/api/migrations/postgres/`, `supabase/migrations/`.

### 11.2 Fase P1: Comunicación Confiable, Outbox Genérico y Sincronización Reactiva
- **Objetivo:** Lograr que la asignación de un entrenamiento se refleje en el móvil de forma instantánea y recuperable sin intervención manual del atleta.
- **Acciones:**
  1. Extender `outbox` (`internal/application/running/outbox`) a un worker general de dominio en `internal/infrastructure/outbox/worker.go`.
  2. Modificar `TrainingService.AssignWorkout` para insertar el evento `training.workout.assigned` en la tabla `outbox` dentro de la misma transacción SQL.
  3. Configurar publisher NATS JetStream para emitir eventos desde el outbox worker hacia el subject `mr.training.events.>`.
  4. Implementar consumidor de notificaciones en Go que despache una Push Notification silenciosa vía Expo (`content-available: 1`).
  5. En Mobile, configurar `Notifications.addNotificationReceivedListener` para ejecutar `queryClient.invalidateQueries({ queryKey: ['athlete-today'] })`.
- **Archivos involucrados:** `apps/api/internal/application/training/service.go`, `apps/api/internal/infrastructure/outbox/`, `apps/mobile/src/infrastructure/notifications/push.ts`, `apps/mobile/src/navigation/App.tsx`.

### 11.3 Fase P2: Running GPS Profesional, Fondo Continuo y Optimización Web/Mobile
- **Objetivo:** Garantizar seguimiento GPS ininterrumpido en carreras con pantalla bloqueada y optimizar la carga visual en Web y Mobile.
- **Acciones:**
  1. Configurar `Location.startLocationUpdatesAsync` con `TaskManager.defineTask` en `apps/mobile/src/features/training/infrastructure/LocationAdapter.ts`.
  2. Actualizar `app.json` con `ACCESS_BACKGROUND_LOCATION` y Foreground Service en Android, y modo `location` en iOS `UIBackgroundModes`.
  3. Unificar la lógica de GPS en mobile: implementar cola local en SQLite/MMKV que retenga puntos con backoff si falla la red, eliminando el descarte prematuro en `useGpsTracking.ts`.
  4. Optimizar `SaveGpsPoints` en Go mediante `UNNEST` multi-columna en una sola sentencia SQL.
  5. Dividir pantallas monolíticas: modularizar `EventsScreen.tsx` (1,266 líneas) y `CoachDashboard.tsx` (839 líneas) en sub-componentes puros.
- **Archivos involucrados:** `apps/mobile/app.json`, `apps/mobile/src/features/training/hooks/useGpsTracking.ts`, `apps/mobile/src/features/training/presentation/screens/RunRecordingScreen.tsx`, `apps/api/internal/infrastructure/running/repository.go`.

### 11.4 Fase P3: Resiliencia Perimetral, Observabilidad Unificada y CQRS Justificado
- **Objetivo:** Blindar la plataforma ante caídas de proveedores externos y proporcionar trazabilidad completa de extremo a extremo.
- **Acciones:**
  1. Implementar patrón Circuit Breaker (utilizando `sony/gobreaker`) en los adaptadores de MercadoPago (`mercadopago/adapter.go`) y Expo Push (`expo/sender.go`).
  2. Exponer `/metrics` en Fiber con Prometheus para latencias HTTP, tamaño de outbox y conteo de goroutines.
  3. Inicializar OpenTelemetry `TracerProvider` en `apps/api/cmd/api/main.go` para inyectar span context en llamadas de asignación y sincronización.
  4. Implementar vista materializada o read model en PostgreSQL para el Dashboard de Analítica del Coach, reduciendo consultas JOIN complejas en tiempo real.
- **Archivos involucrados:** `apps/api/cmd/api/main.go`, `apps/api/internal/infrastructure/subscription/mercadopago/adapter.go`, `apps/api/internal/infrastructure/expo/sender.go`.

---

## 12. CRITERIOS DE ACEPTACIÓN Y PROTOCOLOS DE VALIDACIÓN

| ID | Requerimiento / Prueba | Criterio de Aceptación Verificable | Protocolo de Validación |
|---|---|---|---|
| **CA-01** | Aislamiento Multi-Tenant (RLS) | Una petición autenticada como Atleta A o Coach B a `/api/v1/workouts` o consulta directa SQL con credenciales de usuario jamás debe retornar registros pertenecientes a otro usuario. | Test automatizado en Go (`tests/security_isolation_test.go`) ejecutando consultas cruzadas con tokens Clerk de diferentes tenants. |
| **CA-02** | Sincronización Web → Mobile | Cuando un coach asigna un entrenamiento en Web, el dispositivo móvil del atleta debe mostrar el entrenamiento en la pantalla Today en <3 segundos sin recarga manual ni reinicio de app. | Prueba E2E integrando Web y emulador móvil: crear asignación vía API/Web y verificar recepción del evento e invalidación de caché en React Query. |
| **CA-03** | Running en Segundo Plano | Con la pantalla del móvil bloqueada durante 15 minutos de desplazamiento, la app debe registrar puntos continuos con intervalos <= 5 segundos y precisión <= 30 metros, sin que el OS suspenda el proceso. | Prueba de campo en dispositivo físico Android y simulador iOS con trayecto simulado GPX y pantalla bloqueada. |
| **CA-04** | Resistencia Offline de Running | Ante corte total de conexión durante la carrera, ningún punto GPS debe perderse; al restablecer la red, la cola local debe sincronizar el 100% de los puntos restantes con el backend. | Mockear interrupción de red (`NetInfo.isConnected = false`), generar 50 puntos y verificar sincronización completa tras reconexión. |
| **CA-05** | Resiliencia de Pagos (Circuit Breaker) | Si la API de MercadoPago no responde o devuelve 500 durante 5 peticiones seguidas, el circuito debe abrirse inmediatamente, retornando error controlado al cliente en <100ms sin agotar conexiones. | Test de integración con servidor HTTP simulando latencia de 15s y verificación de transición de estados `Closed` -> `Open` -> `Half-Open`. |
| **CA-06** | Rendimiento de Batch GPS | La ingesta de un lote de 100 puntos en `/running/sessions/:id/live-location` debe responder en menos de 50ms (percentil 95) en PostgreSQL. | Benchmark en Go (`BenchmarkSaveGpsPointsBatch`) midiendo tiempo de ejecución y uso de memoria. |

---
**Fin del Documento de Auditoría Integral.**
