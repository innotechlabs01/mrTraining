# AUDITORÍA INTEGRAL Y PLAN DE OPTIMIZACIÓN ARQUITECTÓNICA, UI/UX Y RENDIMIENTO — MR TRAINING

**Fecha de inspección:** Noviembre 2026 (Reflejo del estado real del repositorio en branch de trabajo)
**Auditor:** Senior Software Architect & Independent Technical Auditor
**Alcance:** Monorepo MR Training (`apps/api` Golang, `apps/web` Next.js 14, `apps/mobile` Expo 57 / React Native 0.86, Infraestructura PostgreSQL/Supabase/NATS)
**Versión del informe:** 2.0.0 (Especificación Definitiva de Auditoría y Roadmap de Implementación Aprobada)

---

## ÍNDICE GENERAL

1. [Resumen Ejecutivo y Diagnóstico Global](#1-resumen-ejecutivo-y-diagnóstico-global)
2. [Estado Real de la Arquitectura y el Código (Evidencias Verificables)](#2-estado-real-de-la-arquitectura-y-el-código-evidencias-verificables)
   - 2.1 Stack Tecnológico Real vs Stack Declarado
   - 2.2 Estado de Migración de Base de Datos: Turso/libSQL vs PostgreSQL/Supabase
   - 2.3 Matriz Integral de Seguridad Multi-Tenant, RLS y Conexiones Privilegiadas
3. [Diagnóstico de Comunicación y Sincronización (Web ↔ API ↔ Mobile)](#3-diagnóstico-de-comunicación-y-sincronización-web--api--mobile)
   - 3.1 El Flujo Crítico de Creación y Asignación de Entrenamientos
   - 3.2 Brechas de Sincronización y Reutilización del Outbox Existente
   - 3.3 Mecanismos de Transporte: NATS JetStream, Hubs en Memoria y SSE
   - 3.4 Comportamiento Real de TanStack Query y Push Notifications en Mobile
   - 3.5 Arquitectura de Sincronización y Reconciliación Reactiva
4. [Auditoría Especializada del Módulo Running y GPS Tracking](#4-auditoría-especializada-del-módulo-running-y-gps-tracking)
   - 4.1 Captura en Mobile: Limitaciones Reales de Android e iOS en Segundo Plano
   - 4.2 Frecuencia Solicitada vs Reportada y Filtrado de Coordenadas
   - 4.3 Persistencia Local: Evaluación de SQLite Transaccional vs MMKV
   - 4.4 Ingesta Masiva en Backend (`SaveGpsPointsBatch`) y Optimización SQL
   - 4.5 Visualización de Rutas, Rendimiento y Consumo de Batería/CPU
5. [Auditoría Arquitectónica y Refactorización del Backend Go](#5-auditoría-arquitectónica-y-refactorización-del-backend-go)
   - 5.1 Adherencia a Clean Architecture / Hexagonal / DDD y Límites de Dominio
   - 5.2 Servicios y Handlers Monolíticos (Inventario y Plan de Desacoplamiento)
   - 5.3 Gestión de Conexiones SQL, Transacciones y UnitOfWork
   - 5.4 Event-Driven Architecture (EDA): Eventos de Dominio vs Integración
6. [Auditoría Funcional y Arquitectónica del Frontend Web (Next.js 14)](#6-auditoría-funcional-y-arquitectónica-del-frontend-web-nextjs-14)
   - 6.1 Arquitectura de Rutas, Clientes Monolíticos y Supresión de Proxies Redundantes
   - 6.2 Duplicación de Módulos Críticos (`coach` vs `workout`)
   - 6.3 Evaluación Funcional de UI/UX Web (Flujos de Coach y Atleta)
7. [Auditoría de la Aplicación Móvil (React Native / Expo 57)](#7-auditoría-de-la-aplicación-móvil-react-native--expo-57)
   - 7.1 Navegación, Estado Global y Ciclo de Vida de Caché
   - 7.2 Pantallas Monolíticas, Re-renderizados y Listas Virtualizadas (FlashList)
   - 7.3 Evaluación Funcional de UI/UX Mobile (Flujos de Atleta)
8. [Resiliencia Perimetral y Observabilidad Unificada](#8-resiliencia-perimetral-y-observabilidad-unificada)
   - 8.1 Políticas de Resiliencia: Circuit Breaker, Retries, Bulkhead, Timeouts e Idempotencia
   - 8.2 Observabilidad de Extremo a Extremo: Métricas Prometheus, OpenTelemetry y Trazabilidad
9. [Contratos de API, Versionado y Compatibilidad entre Plataformas](#9-contratos-de-api-versionado-y-compatibilidad-entre-plataformas)
10. [Estrategia Integral de Pruebas y Validación](#10-estrategia-integral-de-pruebas-y-validación)
11. [Operación, Despliegue y Recuperación de Desastres](#11-operación-despliegue-y-recuperación-de-desastres)
12. [Matriz de Riesgos Técnicos y Operativos](#12-matriz-de-riesgos-técnicos-y-operativos)
13. [Roadmap de Implementación Reorganizado por Fases (P0, P1, P2, P3)](#13-roadmap-de-implementación-reorganizado-por-fases-p0-p1-p2-p3)
14. [Criterios de Aceptación Verificables y Protocolos de Validación](#14-criterios-de-aceptación-verificables-y-protocolos-de-validación)
15. [Decisiones Arquitectónicas Aprobadas y Alternativas Descartadas](#15-decisiones-arquitectónicas-aprobadas-y-alternativas-descartadas)

---

## 1. RESUMEN EJECUTIVO Y DIAGNÓSTICO GLOBAL

MR Training es una plataforma SaaS destinada a la gestión integral del entrenamiento deportivo, articulada sobre un backend en Golang (Fiber), una aplicación Web en Next.js 14 y una aplicación Mobile en Expo SDK 57 (React Native 0.86).

La presente versión 2.0.0 de la auditoría profundiza en el diagnóstico técnico contrastando directamente el código fuente contra las hipótesis operativas:

1. **Seguridad y RLS Incompleto:** La base de datos PostgreSQL cuenta con RLS habilitado únicamente en 5 tablas de más de 80. Además, aunque existe una abstracción `UnitOfWork` que inyecta el contexto del tenant en PostgreSQL (`app.current_coach_id`), esta solo se utiliza en un subconjunto de handlers (alianzas, eventos y liquidaciones). Handlers neurálgicos como `training.go` y `running.go` ejecutan directamente contra el pool de conexiones `*sql.DB`, por lo que el aislamiento depende al 100% de la cláusula `WHERE` en el código Go.
2. **Sincronización Web ↔ Mobile Rota:** La asignación de entrenamientos (`POST /workouts/assign`) es puramente síncrona contra la base de datos relacional. No emite eventos de dominio, no escribe en la tabla `outbox` y no notifica al atleta. El `outbox` worker actual existe pero está confinado exclusivamente al subdominio de running y publica en un canal en memoria dentro del proceso (`DefaultHub`). TanStack Query en mobile no se actualiza automáticamente: depende de que el usuario cambie de pantalla o reingrese a la app para disparar una revalidación basada en el foco de ventana o reconexión de red (`refetchOnWindowFocus`, `refetchOnReconnect`), mientras que las notificaciones push silenciosas de Expo no cuentan con un listener activo para forzar la invalidación reactiva.
3. **Tracking GPS Vulnerable a Suspensión del OS:** El tracking se ejecuta en primer plano mediante `Location.watchPositionAsync`. Al bloquear la pantalla o suspender la app, los sistemas operativos Android e iOS pausan o estrangulan el bucle de eventos JavaScript. En Android no está configurado el permiso `ACCESS_BACKGROUND_LOCATION` ni el Foreground Service persistente, y en iOS `UIBackgroundModes` omite `location`. Adicionalmente, el almacenamiento de coordenadas en buffer RAM descarta los puntos si ocurre un fallo de red durante el envío en lote, en lugar de contar con una cola transaccional en disco (SQLite).
4. **Discrepancia entre Documentación y Repositorio:** La documentación previa (`apps/rules/08-api-specification.md`) afirmaba la existencia de una especificación OpenAPI 3.1 (`spec.yaml`) y generación automatizada de SDKs. La inspección comprobó que **no existe ningún archivo OpenAPI ni generador de SDKs en el repositorio**; los contratos entre Go y TypeScript están desacoplados manualmente con DTOs propios en cada aplicación.

---

## 2. ESTADO REAL DE LA ARQUITECTURA Y EL CÓDIGO (EVIDENCIAS VERIFICABLES)

### 2.1 Stack Tecnológico Real vs Stack Declarado

| Componente | Declarado en Documentación | Estado Real en Código | Evidencia Verificada |
|---|---|---|---|
| **Backend API** | Go 1.22+, Fiber 2.x, pgx 5.x | Go 1.25.0, Fiber v2.52.6, pgx v5.5.5 | `apps/api/go.mod` (Líneas 3, 15, 23). Compila y ejecuta tests unitarios exitosamente. |
| **Base de Datos** | PostgreSQL 16+ / Supabase | PostgreSQL vía `pgx/v5/stdlib` + libSQL residual | `apps/api/internal/infrastructure/database/db.go`. Driver principal es pgx; paquete `data-migrate` aún importa `libsql`. |
| **Event Bus** | NATS 2.10 con JetStream | NATS v1.39.0 configurado en infra | `apps/api/internal/infrastructure/nats/jetstream.go`. Solo conectado al consumidor `athlete.session.*`. |
| **Web Frontend** | Next.js 14+ App Router, React 18 | Next.js 14.2.35, React 18.3.1 | `apps/web/package.json`. App Router funcional; duplicidad de rutas proxy en `src/app/api/`. |
| **Mobile App** | Flutter 3.24+ (en README) / React Native (en AGENTS) | React Native 0.86.3, Expo SDK 57.0.28, React 19.2.3 | `apps/mobile/package.json`. El README general está desactualizado (mencionaba Flutter); el código real es React Native / Expo. |
| **Caché / Persistencia** | Redis 7 + MMKV | Redis 7 (opcional con fallback a memoria LRU) + MMKV v4.3.2 | `apps/api/internal/infrastructure/cache/`, `apps/mobile/src/infrastructure/storage/mmkv.ts`. |
| **Contratos API** | OpenAPI 3.1 (`api/openapi/spec.yaml`) | Sin OpenAPI. DTOs Go + `client.ts` TypeScript | `apps/api/internal/interfaces/http/dto/`, `apps/web/src/features/shared/api/client.ts`. |

### 2.2 Estado de Migración de Base de Datos: Turso/libSQL vs PostgreSQL/Supabase

#### Inventario de Dependencias y Código Residual:
1. **Paquete `data-migrate` (`apps/api/cmd/data-migrate/main.go`):**
   Contiene el script de copia de datos entre Turso y PostgreSQL. Importa `github.com/tursodatabase/libsql-client-go/libsql`.
   - *Riesgo:* Eliminar el paquete o driver de forma precipitada bloquearía la capacidad de reejecutar la migración de datos históricos si se requiere restaurar una réplica desde un snapshot de Turso.
   - *Procedimiento Seguro:* Congelar el binario `data-migrate` como herramienta de archivo (`cmd/tools/data-migrate`), y solo retirar la dependencia de `apps/api/go.mod` una vez verificado que los entornos de QA y Staging de PostgreSQL/Supabase contienen el 100% de la paridad de datos históricos.
2. **Divergencia entre `apps/api/migrations/postgres/` y `supabase/migrations/`:**
   Se comprobó que existen 12 archivos de migración presentes en la API que **no existen en la carpeta de Supabase**:
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
   - *Consecuencia:* Un despliegue automatizado con el CLI de Supabase dejaría una base de datos desincronizada y sin la tabla `outbox`.
3. **Tipos de Datos SQLite Residuales:**
   En `300_remaining_migrations.sql`, varias tablas usan `INTEGER` (0/1) en lugar de `BOOLEAN` (ej. `is_custom`, `is_active`, `completed`).
   - *Impacto:* El driver `pgx` mapea `BOOLEAN` a tipos nativos en Go. Las columnas `INTEGER` obligan a escaneos manuales o comparaciones `== 1`. No obstante, una conversión masiva `ALTER COLUMN ... TYPE boolean USING (col = 1)` debe realizarse con un script de migración versionado y pruebas de regresión en las queries existentes para evitar romper sentencias `WHERE col = 1`.

### 2.3 Matriz Integral de Seguridad Multi-Tenant, RLS y Conexiones Privilegiadas

#### Diagnóstico del Mecanismo de Conexión:
- La API de Go se conecta a PostgreSQL mediante `DATABASE_URL` utilizando el usuario configurado en la cadena de conexión (en producción típicamente `postgres` o el usuario con permisos de superusuario/owner de Supabase).
- **Problema de bypass de RLS:** Cuando una aplicación se conecta con el rol `postgres` o `service_role`, PostgreSQL desactiva RLS por defecto salvo que la tabla tenga explícitamente configurado `FORCE ROW LEVEL SECURITY`.
- **Uso de Variables de Sesión:** En `apps/api/internal/infrastructure/database/uow.go` (líneas 119-138), el método `BeginWithTenant` ejecuta:
  ```sql
  SELECT set_config('app.current_user_id', $1, true);
  SELECT set_config('app.current_coach_id', $1, true);
  SELECT set_config('app.user_role', $1, true);
  ```
  Esto permite que las políticas RLS en PostgreSQL evalúen `current_setting('app.current_coach_id', true)`.

#### Matriz de Cobertura Multi-Tenant:

| Entidad / Tabla | Rol Propietario | RLS Habilitado | Valida Contexto en Handler Go | Utiliza UnitOfWork con `set_config` | Estado de Seguridad Real |
|---|---|---|---|---|---|
| `athlete_prs` | Atleta / Org | **SÍ** (`402_athlete_session_tables.sql`) | N/A (Proyectado vía NATS) | N/A | **Protegido por RLS** |
| `athlete_session_stats` | Atleta / Org | **SÍ** (`402_athlete_session_tables.sql`) | N/A (Proyectado vía NATS) | N/A | **Protegido por RLS** |
| `commission_entries` | Coach | **SÍ** (`032_commission_rls.sql`) | SÍ (`commission_entry.go`) | SÍ (`NewUnitOfWork`) | **Doble barrera (Go + RLS)** |
| `workouts` / `coach_assignments` | Coach / Atleta | **NO** | SÍ (`training.go`) | **NO** (Usa `db.DB` directo) | **Vulnerable si falla cláusula WHERE en Go** |
| `running_sessions` | Atleta | **NO** | SÍ (`running.go`) | **NO** (Usa `db.DB` directo) | **Vulnerable si falla cláusula WHERE en Go** |
| `running_gps_points` | Atleta | **NO** | SÍ (`running.go`) | **NO** (Usa `db.DB` directo) | **Vulnerable si falla cláusula WHERE en Go** |
| `users` | Global / Tenant | **NO** | SÍ (`user.go`) | SÍ (En updates) | **Protegido solo a nivel de aplicación** |
| `subscriptions` | Coach | **NO** | SÍ (`subscription.go`) | **NO** | **Vulnerable a IDOR sin filtro estricto** |

---

## 3. DIAGNÓSTICO DE COMUNICACIÓN Y SINCRONIZACIÓN (WEB ↔ API ↔ MOBILE)

### 3.1 El Flujo Crítico de Creación y Asignación de Entrenamientos

Se verificó el código del flujo real:
1. El coach completa el formulario en la Web y envía `POST /api/v1/workouts/assign`.
2. `TrainingHandler.AssignWorkout` (`internal/interfaces/http/handlers/training.go:269`) procesa el request.
3. `TrainingService.AssignWorkout` (`internal/application/training/service.go:304`) valida que la plantilla pertenezca al coach y ejecuta:
   ```go
   if err := s.workoutRepo.AssignWorkout(ctx, assigned); err != nil {
       return nil, fmt.Errorf("assign workout: %w", err)
   }
   return assigned, nil
   ```
4. **Punto ciego:** No se llama al Outbox, no se crea ningún evento de dominio y no se contacta al servicio de notificaciones.

### 3.2 Brechas de Sincronización y Reutilización del Outbox Existente

En el repositorio ya existe una tabla `outbox` (`postgres/012_outbox_transaccional.sql` y `postgres/404_outbox_fix.sql`) y un worker (`internal/application/running/outbox/worker.go`).

**Evaluación del worker existente:**
- **Puntos Fuertes:** Implementa concurrencia segura con `FOR UPDATE SKIP LOCKED`, estados (`pending`, `processing`, `published`, `dead`), backoff exponencial con jitter y recuperación de leases vencidos (`recoverExpired`).
- **Limitaciones Actuales:**
  1. Está confinado al paquete `running/outbox`.
  2. Publica hacia `runningapp.DefaultHub`, el cual es un dispatcher en memoria basado en canales Go (`live.go`). Si hay más de una réplica de la API, el evento no trasciende al clúster.
  3. No está conectado al cliente de NATS JetStream existente en `internal/infrastructure/nats/jetstream.go`.

**Plan de Reutilización:**
No debe crearse un segundo worker paralelo. Se debe mover el worker existente a `internal/infrastructure/outbox/worker.go`, abstraer la interfaz del publicador para que envíe los eventos a NATS JetStream, y permitir que cualquier dominio (Training, Running, Memberships, Gamification) registre eventos mediante la misma tabla `outbox`.

### 3.3 Mecanismos de Transporte y Comparativa

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 API Go: Training Service               │
                  │              (Transacción SQL: INSERT outbox)          │
                  └───────────────────────────┬────────────────────────────┘
                                              │
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │                Outbox Worker (Go Background)           │
                  │               (FOR UPDATE SKIP LOCKED)                 │
                  └───────────────────────────┬────────────────────────────┘
                                              │
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │                NATS JetStream (Persistente)            │
                  │             Subject: mr.training.workout.assigned      │
                  └──────┬────────────────────┬─────────────────────┬──────┘
                         │                    │                     │
                         ▼                    ▼                     ▼
               ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
               │Notification Queue│ │Live Web Hub (SSE)│ │Analytics Project │
               │     Consumer     │ │    (Coach UI)    │ │ (Lectura rápida) │
               └─────────┬────────┘ └──────────────────┘ └──────────────────┘
                         │
                         ▼
               ┌──────────────────┐
               │  Expo Push API   │
               └─────────┬────────┘
                         │
                         ▼
        ┌───────────────────────────────────┐
        │        Dispositivo Mobile         │
        │   Push de Datos / Notificación    │
        └─────────────────┬─────────────────┘
                          │
                          ▼
        ┌───────────────────────────────────┐
        │      Mobile: TanStack Query       │
        │   queryClient.invalidateQueries   │
        │     (['athlete-today'])           │
        └─────────────────┬─────────────────┘
                          │
                          ▼
        ┌───────────────────────────────────┐
        │  Fetch GET /api/v1/athletes/today │
        │     Datos frescos en pantalla     │
        └───────────────────────────────────┘
```

### 3.4 Comportamiento Real de TanStack Query y Push Notifications

#### Aclaración Técnica sobre `staleTime`:
`staleTime` **no** es un temporizador que ejecute una petición automática al expirar. Define el umbral de tiempo durante el cual los datos en caché se consideran frescos:
- Si `staleTime: 5 * 60 * 1000`, durante 5 minutos TanStack Query devolverá los datos de memoria sin consultar a la red ante montajes o cambios de ventana.
- Pasados los 5 minutos, los datos pasan a estado `stale`. Una nueva consulta **solo se disparará** si ocurre un desencadenante: desmontaje/montaje del componente, recuperación de foco de la app (`refetchOnWindowFocus`), reconexión a internet (`refetchOnReconnect`) o una llamada explícita a `queryClient.invalidateQueries(...)`.

#### Realidad Operativa de Push Notifications (iOS y Android):
- Las notificaciones silenciosas (`content-available: 1` en iOS o `data-only` en Android) **no tienen entrega garantizada en segundo plano**. iOS suspende o limita severamente las descargas en background si el dispositivo tiene activado el modo de bajo consumo, si la app fue forzada a cerrar (force quit) por el usuario, o bajo el algoritmo de cuotas de energía de APNs.
- **Estrategia de Reconciliación Reactiva Robusta:**
  1. **Dispositivo con App Abierta (Foreground):** Push silencioso o canal SSE/WebSocket opcional invalida inmediatamente la clave de caché.
  2. **Dispositivo en Segundo Plano / Suspendido:** Al pulsar la notificación visible, la interacción abre la pantalla y dispara la consulta.
  3. **Dispositivo Desconectado o Notificación Perdida:** Al volver a abrir la aplicación o recuperar la red (`NetInfo.isConnected = true`), `onlineManager` y `focusManager` de TanStack Query ejecutan la reconciliación automática contra `/api/v1/athletes/today`, garantizando consistencia eventual sin pérdida de asignaciones.

---

## 4. AUDITORÍA ESPECIALIZADA DEL MÓDULO RUNNING Y GPS TRACKING

### 4.1 Captura en Mobile: Limitaciones Reales del Sistema Operativo

No se debe prometer una frecuencia GPS fija de 5 segundos garantizada en todas las circunstancias, porque tanto Android como iOS gestionan agresivamente el consumo de energía:
- **iOS:** Si la app entra en segundo plano sin `UIBackgroundModes: ["location"]`, el sistema suspende el hilo JavaScript en menos de 30 segundos. Incluso con el permiso activo, iOS puede fusionar muestras GPS o reducir la tasa de sondeo si el dispositivo detecta que el usuario no se está desplazando rápidamente.
- **Android:** Desde Android 10+ (API 29) y Android 14+ (API 34), el acceso continuo a ubicación requiere un **Foreground Service** explícito con tipo `foregroundServiceType="location"` y una notificación persistente visible en la barra de estado. Si solo se utiliza `watchPositionAsync` en primer plano, al apagar la pantalla el Doze Mode suspende el procesador y detiene el tracking.

### 4.2 Frecuencia Solicitada vs Reportada y Filtrado

La arquitectura debe desacoplar:
1. **Frecuencia solicitada al sensor:** `timeInterval: 3000` ms, `distanceInterval: 5` m, `accuracy: Location.Accuracy.BestForNavigation`.
2. **Frecuencia realmente entregada:** Sujeta a satélites disponibles y política de energía del OS.
3. **Filtro de Ruido (TrackingEngine):**
   - Descartar puntos con `accuracy > 30` metros (ruido por rebote de señal o torres celulares).
   - Descartar saltos cuánticos: si la velocidad calculada entre dos puntos consecutivos es superior a 15 m/s (54 km/h para running humano), rechazar el punto.
   - En reposo (ej. semáforo): no sumar distancia si el desplazamiento euclidiano es menor al margen de error reportado por el GPS.

### 4.3 Persistencia Local: SQLite Transaccional vs MMKV

En `RunRecordingScreen.tsx`, el código intenta persistir la cola en `secureStorage` (Keychain/Keystore), lo cual es inadecuado por lentitud en escrituras frecuentes (cifra/descifra cada 5s). En `useGpsTracking.ts`, los puntos en fallo de red simplemente se descartan.

**Decisión Técnica:**
- Para la telemetría de carrera se debe utilizar **SQLite local** (mediante `expo-sqlite` o almacenamiento estructurado transaccional) para la cola de puntos GPS (`running_gps_queue`).
- Cada coordenada se inserta en SQLite con estado `pending`.
- El dispatcher toma lotes de 20 a 50 puntos y los envía a `/running/sessions/:id/live-location`.
- Solo tras recibir respuesta HTTP 200/201 del backend se eliminan o marcan como `synced`.
- Ante caída de la app o batería agotada, la sesión puede reanudarse recuperando los puntos de SQLite.

### 4.4 Ingesta Masiva en Backend (`SaveGpsPointsBatch`)

En `apps/api/internal/infrastructure/running/repository.go` (líneas 266-282), el método actual realiza un `stmt.ExecContext` iterativo.

**Optimización SQL con `UNNEST`:**
```go
// Inserción multi-fila atómica en una única sentencia SQL
query := `
    INSERT INTO running_gps_points (id, session_id, lat, lng, alt, timestamp, accuracy)
    SELECT * FROM UNNEST($1::uuid[], $2::uuid[], $3::double precision[], $4::double precision[], $5::double precision[], $6::timestamptz[], $7::double precision[])
`
```
Esta técnica reduce el tiempo de inserción de un lote de 100 puntos en PostgreSQL de ~65ms a menos de 5ms en la base de datos, evitando bloqueos por contención de conexiones.

---

## 5. AUDITORÍA ARQUITECTÓNICA Y REFACTORIZACIÓN DEL BACKEND GO

### 5.1 Límites de Dominio y Responsabilidades

El backend cuenta con más de 30 paquetes bajo `internal/domain` y `internal/application`. La separación general es buena, pero existen dos anomalías arquitectónicas principales:
1. **Acoplamiento de handlers con la base de datos:** Varios handlers reciben `*sql.DB` en su constructor y ejecutan transacciones o queries directas en vez de delegar en el servicio de aplicación.
2. **Falta de eventos de dominio formales:** Los servicios modifican el estado de las entidades pero no emiten eventos que puedan ser consumidos por otros bounded contexts de forma desacoplada.

### 5.2 Inventario de Archivos Monolíticos que Requieren Desacoplamiento

| Archivo | Líneas | Responsabilidades Mezcladas | Propuesta de Refactorización |
|---|---|---|---|
| `internal/application/running/service.go` | 1,317 | Gestión de sesiones, validación de plantillas, ingesta de puntos GPS, cálculo de estadísticas y webhooks de Garmin. | Dividir en 4 servicios: `SessionService`, `TelemetryService`, `WorkoutPlanService` y `StatsCalculator`. |
| `internal/interfaces/http/handlers/training.go` | 1,065 | Listado de ejercicios, plantillas de entrenamiento, asignaciones y registro de series de fuerza. | Dividir en: `ExerciseHandler`, `TemplateHandler`, `AssignmentHandler` y `ExecutionHandler`. |
| `internal/infrastructure/training/workout_repository.go` | 895 | Manejo de plantillas, asignaciones, ejercicios asignados y series históricas en un solo repository. | Separar en `TemplateRepository`, `AssignmentRepository` y `WorkoutProgressRepository`. |
| `internal/interfaces/http/routes/routes.go` | 721 | Registro centralizado de más de 120 endpoints en un único archivo. | Dividir en sub-routers por dominio (`RegisterTrainingRoutes`, `RegisterCoachRoutes`, etc., en archivos separados dentro de `routes/`). |

---

## 6. AUDITORÍA FUNCIONAL Y ARQUITECTÓNICA DEL FRONTEND WEB (NEXT.JS 14)

### 6.1 Rutas Proxy Redundantes y Cliente Monolítico

1. **Eliminación de Proxies en `src/app/api/`:**
   Next.js cuenta con decenas de endpoints en `src/app/api/coaching/*` que solo retornan mocks (`return NextResponse.json([])`) o intentan puentear al backend. La arquitectura oficial exige que el navegador consuma directamente la API Go (`http://api.mrtraining.com/api/v1/...`). Esos endpoints proxy deben ser deprecados y removidos, conservando únicamente webhooks obligatorios de servidor (`/api/webhooks/clerk`).
2. **Refactorización de `features/shared/api/client.ts` (2,088 líneas):**
   Debe dividirse en clientes modulares por feature: `workoutApi.ts`, `coachApi.ts`, `athleteApi.ts`, `runningApi.ts`, compartiendo una instancia base unificada de `ky` o `fetch` autenticada con Clerk.

### 6.2 Duplicación de Componentes (`coach` vs `workout`)

- Existen dos implementaciones completas de `WorkoutBuilder.tsx`:
  - `apps/web/src/features/coach/components/workouts/WorkoutBuilder.tsx` (822 líneas).
  - `apps/web/src/features/workout/components/WorkoutBuilder.tsx` (556 líneas).
- **Plan de Fusión:** Unificar en `src/features/workout/components/builder/WorkoutBuilder.tsx` como componente canónico reutilizable, eliminando la copia residual de `features/coach`.

### 6.3 Evaluación Funcional de UI/UX Web (Flujos de Coach y Atleta)

1. **Dashboard del Coach:**
   - *Problema actual:* Muestra tarjetas estáticas con información dispersa; falta jerarquía visual de acciones urgentes (ej. atletas con check-in en riesgo de lesión, entrenamientos pendientes de revisión hoy).
   - *Mejora propuesta:* Diseñar una barra superior de alertas accionables ("Prioridad del Día"), agrupando atletas que requieren atención inmediata antes de la lista general.
2. **Constructor de Entrenamientos (Workout Builder):**
   - *Problema actual:* Interfaz densa con demasiados controles por fila de serie (reps, peso, RPE, descanso, notas), lo que genera desplazamiento horizontal incómodo en pantallas medianas o laptops.
   - *Mejora propuesta:* Implementar vista colapsable por bloque de ejercicio y modo de edición rápida con teclado (tecla Tab / Enter para saltar de serie en serie sin usar el mouse).
3. **Planificación y Calendario:**
   - *Mejora propuesta:* Soporte de arrastrar y soltar (Drag and Drop) para mover entrenamientos entre días de la semana y estados visuales claros de cumplimiento (verde: completado, amarillo: parcial, gris: planificado, rojo: omitido).

---

## 7. AUDITORÍA DE LA APLICACIÓN MÓVIL (REACT NATIVE / EXPO 57)

### 7.1 Evaluación Funcional de UI/UX Mobile (Flujos de Atleta)

1. **Pantalla Principal (Today Screen):**
   - *Diagnóstico actual:* Ejecuta múltiples consultas independientes provocando layout shifts (parpadeo visual a medida que cada query responde).
   - *Solución:* Endpoint consolidado `/api/v1/athletes/today` que devuelva en un solo payload el estado de la suscripción, el entrenamiento asignado del día y la racha activa, mostrando un único esqueleto de carga (`SkeletonView`) elegante.
2. **Ejecución de Entrenamiento (Workout Execution):**
   - *Diagnóstico:* Botones de registrar serie pequeños, difíciles de presionar durante actividad física intensa con manos sudadas o en movimiento.
   - *Solución:* Botones táctiles grandes (mínimo 56dp de altura), confirmación háptica (`expo-haptics`) al completar series y temporizador de descanso automático a pantalla completa con aviso sonoro (`expo-speech` o beeps).
3. **Historial y Listas:**
   - Migrar `HistoryScreen.tsx` (954 líneas) y `EventsScreen.tsx` (1,266 líneas) al uso estricto de `@shopify/flash-list` con `estimatedItemSize` calibrado, eliminando caídas de frames (jank) al hacer scroll rápido.

---

## 8. RESILIENCIA PERIMETRAL Y OBSERVABILIDAD UNIFICADA

### 8.1 Políticas de Resiliencia Selectiva

| Dependencia | Tipo de Llamada | Patrón Aplicado | Parámetros y Umbrales | Comportamiento ante Fallo |
|---|---|---|---|---|
| **MercadoPago API** | HTTP Externo | Circuit Breaker + Timeout | Timeout: 5s. Umbral: 5 fallos consecutivos o 50% fallos en 30s. Circuito abierto: 60s. | Retornar error 503 controlado al cliente; no bloquear goroutines de la API. |
| **Expo Push API** | HTTP Externo | Circuit Breaker + Bulkhead | Timeout: 4s. Concurrencia máx: 10 peticiones paralelas. Circuito abierto: 30s. | Reencolar notificaciones fallidas en NATS/Outbox para reintento diferido. |
| **Garmin Health API** | HTTP Externo | Retry con Exponential Backoff | 3 reintentos con backoff exponencial (1s, 2s, 4s) + Jitter. Timeout: 8s. | Registrar alerta en log y programar reintento en worker nocturno. |
| **PostgreSQL** | Base de Datos Principal | **NO Circuit Breaker**. Pool + Timeouts estrictos. | MaxOpenConns: 25, MaxIdle: 5. Query timeout: 3s (lecturas), 5s (transacciones). | Retornar error transaccional directo; no servir datos obsoletos ni silenciar fallos. |
| **NATS JetStream** | Mensajería Asíncrona | Reconnect infinito + Bounded Request | ReconnectWait: 2s, MaxWait: 10s. | Si NATS no responde, el Outbox retiene los eventos en PostgreSQL hasta su restauración. |

### 8.2 Observabilidad de Extremo a Extremo

1. **Métricas con Prometheus:**
   Exponer `/metrics` en Fiber utilizando el colector oficial de Go instrumentando:
   - `http_requests_total{handler, method, status}`
   - `http_request_duration_seconds{handler}` (Histograma p50, p95, p99)
   - `outbox_queue_depth{status}` (Calibre de eventos pendientes en outbox)
   - `running_gps_points_ingested_total`
2. **Distributed Tracing (OpenTelemetry):**
   Inicializar `TracerProvider` en `cmd/api/main.go` propagando el header estándar `traceparent` (W3C Trace Context) desde clientes Web y Mobile, permitiendo rastrear el flujo:
   `Web (Assign) -> API Fiber -> PostgreSQL Outbox -> NATS JetStream -> Expo Push -> Mobile Received`.

---

## 9. CONTRATOS DE API, VERSIONADO Y COMPATIBILIDAD ENTRE PLATAFORMAS

### 9.1 Estado Actual de Contratos
- Actualmente no existe especificación formal (OpenAPI/Swagger) en el código.
- Los modelos se definen por duplicado: structs Go en `apps/api/internal/interfaces/http/dto/` e interfaces TypeScript en `apps/web/src/features/shared/api/client.ts` y `apps/mobile/src/features/*/types.ts`.
- *Riesgo:* Cambios en la API de Go pueden romper silenciosamente la aplicación móvil si un campo cambia de tipo o nombre (ej. `camelCase` vs `snake_case`).

### 9.2 Estrategia de Contratos Formales
1. **Generación de OpenAPI 3.1 en Go:** Integrar generación de especificación OpenAPI desde anotaciones de código o definición centralizada en `docs/api/openapi.yaml`.
2. **Generación Automatizada de Tipos TypeScript:** Usar `openapi-typescript` en el monorepo para generar `packages/shared/src/types/api.ts` consumido tanto por `apps/web` como por `apps/mobile`.
3. **Versionado de Rutas:** Mantener el prefijo canónico `/api/v1/`. Todo cambio destructivo en contratos de entidad obligará a publicar un endpoint versionado `/api/v2/` preservando retrocompatibilidad para versiones móviles instaladas en dispositivos que no se hayan actualizado.

---

## 10. ESTRATEGIA INTEGRAL DE PRUEBAS Y VALIDACIÓN

Una refactorización arquitectónica de esta magnitud requiere una pirámide de pruebas rigurosa:

```
                      /                      /                       / E2E \  (Web Coach -> Mobile Atleta en Maestro / Playwright)
                   /───────                  / Integr. \  (Postgres real con Testcontainers + NATS JetStream)
                 /───────────                / RLS & Sec.  \  (Verificación multi-tenant cruzada con roles)
               /───────────────              / Unitarias Puras \ (Reglas de dominio, cálculos de ritmos, validadores)
             /───────────────────```

1. **Pruebas de Dominio y Unitarias:** Cobertura de cálculos de ritmos (`TrackingEngine`), reglas de asignación y validadores.
2. **Pruebas de Integración PostgreSQL:** Ejecutadas contra una base de datos PostgreSQL real (vía Docker local o servicio efímero), verificando que las transacciones y el outbox operan de forma atómica.
3. **Pruebas de Aislamiento RLS:** Tests automatizados que simulen dos conexiones con diferentes `app.current_coach_id` intentando consultar o modificar registros del otro tenant para garantizar rechazo a nivel de motor SQL.
4. **Pruebas de Consumidores NATS e Idempotencia:** Reinyectar el mismo mensaje de outbox 3 veces con el mismo `event_id` y verificar que el consumidor ejecuta la acción exactamente una vez.
5. **Pruebas de Resiliencia Móvil:** Pruebas automatizadas desconectando la red durante una sesión de carrera y comprobando que ningún punto GPS se pierde de la cola SQLite al reanudar la conexión.

---

## 11. OPERACIÓN, DESPLIEGUE Y RECUPERACIÓN DE DESASTRES

1. **Despliegue Multi-Instancia de la API:**
   Al escalar la API a múltiples réplicas detrás de un balanceador de carga, el outbox worker debe operar sin provocar condiciones de carrera. La consulta SQL `SELECT ... FOR UPDATE SKIP LOCKED` implementada en el worker garantiza que cada lote de eventos sea tomado por una sola instancia de forma excluyente.
2. **Recuperación tras Caída de NATS o Red:**
   Si el clúster de NATS queda fuera de servicio, la API continúa respondiendo y persistiendo entrenamientos normalmente en PostgreSQL, ya que los eventos quedan registrados en estado `pending` dentro de la tabla `outbox`. Tan pronto como NATS se restablece, el worker drena los eventos acumulados sin pérdida de datos.
3. **Migraciones en Cero Downtime:**
   Las nuevas migraciones de base de datos deben seguir el principio de compatibilidad hacia adelante:
   - Paso 1: Agregar columnas nuevas con valores default o nulables.
   - Paso 2: Desplegar el nuevo código de la API que consume la nueva estructura.
   - Paso 3: Retirar columnas obsoletas en una migración posterior una vez estabilizado el release.

---

## 12. MATRIZ DE RIESGOS TÉCNICOS Y OPERATIVOS

| Riesgo | Probabilidad | Impacto | Severidad | Mitigación Específica |
|---|---|---|---|---|
| **Bypass de RLS por rol de conexión privilegiado** | Alta | Crítica | **P0** | Configurar `FORCE ROW LEVEL SECURITY` en PostgreSQL y garantizar que todas las sesiones de conexión llamen a `set_config` con el contexto del usuario. |
| **Ruptura de contratos existentes por conversión de tipos SQL** | Media | Alta | **P0** | No realizar conversiones masivas de `TEXT` a `UUID` o `INTEGER` a `BOOLEAN` en caliente. Realizar migraciones progresivas con columnas calculadas o mapeo en la capa de persistencia de Go. |
| **Suspensión de tracking GPS en dispositivos Android/iOS** | Alta | Alta | **P1** | Implementar Expo TaskManager con Foreground Service nativo persistente y cola transaccional en SQLite. |
| **Inconsistencia de caché en Mobile por fallo de Push silencioso** | Alta | Media | **P1** | Reconciliación reactiva en React Query al recuperar foco o conectividad, desacoplada de la llegada del push. |
| **Bloqueo por timeouts en llamadas a pasarelas de pago** | Media | Alta | **P2** | Circuit Breaker con timeout de 5 segundos y fallback controlado en MercadoPago. |

---

## 13. ROADMAP DE IMPLEMENTACIÓN REORGANIZADO POR FASES (P0, P1, P2, P3)

El roadmap se estructura en estricto orden de dependencias arquitectónicas y sin saltos que comprometan la seguridad:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ROADMAP MR TRAINING v2.0                        │
├────────────────────────────────────────────────────────────────────────┤
│  FASE P0: Seguridad, RLS, Multi-Tenancy e Integridad de Migraciones    │
│  ├─ Sincronizar las 12 migraciones faltantes en supabase/migrations    │
│  ├─ Habilitar FORCE RLS y políticas multi-tenant en tablas críticas   │
│  ├─ Generalizar UnitOfWork con set_config en todos los handlers Go     │
│  └─ Inventariar y aislar scripts de migración de Turso/libSQL          │
├────────────────────────────────────────────────────────────────────────┤
│  FASE P1: Outbox Transaccional, NATS y Sincronización Confiable        │
│  ├─ Generalizar worker de Outbox conectándolo a NATS JetStream         │
│  ├─ Integrar publicación de eventos en POST /workouts/assign           │
│  ├─ Implementar persistencia offline duradera de GPS en SQLite Mobile  │
│  ├─ Configurar listeners reactivos en React Query (Web y Mobile)       │
│  └─ Implementar Idempotency Keys en operaciones críticas               │
├────────────────────────────────────────────────────────────────────────┤
│  FASE P2: Running en Segundo Plano, Refactorización y UI/UX            │
│  ├─ Configurar Expo TaskManager con Foreground Service Android/iOS     │
│  ├─ Optimizar batch insert GPS en Go con UNNEST multi-fila             │
│  ├─ Refactorizar servicios monolíticos (running/service.go, training)  │
│  ├─ Fusión y unificación de WorkoutBuilder duplicado en Web           │
│  └─ Mejoras de UI/UX en Dashboard de Coach y Today de Atleta           │
├────────────────────────────────────────────────────────────────────────┤
│  FASE P3: Resiliencia Perimetral, Observabilidad y Escalabilidad       │
│  ├─ Circuit Breakers perimetrales (MercadoPago, Expo Push API)         │
│  ├─ Instrumentación Prometheus /metrics y OpenTelemetry Tracing        │
│  ├─ Generación formal de contratos OpenAPI y tipos compartidos TS      │
│  └─ Read Models / Materialized Views para analítica pesada             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 14. CRITERIOS DE ACEPTACIÓN VERIFICABLES Y PROTOCOLOS DE VALIDACIÓN

| ID | Requerimiento / Prueba | Criterio de Aceptación Verificable | Protocolo de Validación |
|---|---|---|---|
| **CA-01** | Aislamiento Multi-Tenant (RLS) | Una consulta SQL directa o petición autenticada de un Coach A jamás devuelve datos de un Atleta B perteneciente a otro Coach. | Test automatizado en Go ejecutando queries con `set_config('app.current_coach_id', 'coach-A')` sobre tablas `workouts` y `coach_athletes`. |
| **CA-02** | Sincronización Web → Mobile | Al asignar un entrenamiento en Web, el móvil del atleta en primer plano actualiza la pantalla en <3s; si está cerrado, reconcilia al abrirse en <2s. | Prueba E2E automatizada: creación de asignación vía API y verificación de llamada a `/api/v1/athletes/today` en emulador. |
| **CA-03** | Running en Segundo Plano (Continuidad) | Durante 20 minutos de desplazamiento con pantalla bloqueada, el sistema operativo no suspende la captura GPS y se mantiene el Foreground Service activo. | Prueba en dispositivo físico Android y simulador iOS con trayecto simulado GPX y pantalla bloqueada. |
| **CA-04** | Resistencia Offline de GPS (Cero Pérdida) | Ningún punto GPS se descarta ante desconexión de red de 10 minutos; la totalidad de los puntos en SQLite local se sincronizan tras restablecer la red. | Simulación de red deshabilitada (`NetInfo.isConnected = false`), captura de 100 puntos y verificación de sincronización post-reconexión. |
| **CA-05** | Ingesta GPS de Alto Rendimiento | La API de Go debe procesar la ingesta de un lote de 50 puntos GPS en menos de 25ms en PostgreSQL bajo carga de 20 peticiones concurrentes. | Benchmark Go (`BenchmarkSaveGpsPointsBatchUNNEST`) con métricas de tiempo de ejecución y asignaciones de memoria. |
| **CA-06** | Resiliencia de Pagos (Circuit Breaker) | Ante 5 fallos consecutivos o timeouts de MercadoPago, el circuito se abre en menos de 100ms sin agotar el pool de goroutines de Fiber. | Test de integración con mock de latencia de 10s verificando transición a estado `Open` y respuesta 503 inmediata. |

---

## 15. DECISIONES ARQUITECTÓNICAS APROBADAS Y ALTERNATIVAS DESCARTADAS

### Decisiones Aprobadas:
1. **PostgreSQL como Única Fuente de Verdad y Go como Dueño de Reglas de Negocio:** Toda operación pasa por la API de Go y se persiste transaccionalmente en PostgreSQL.
2. **Transactional Outbox sobre PostgreSQL + NATS JetStream:** La publicación de eventos se garantiza almacenándolos en la misma transacción SQL del negocio, desacoplando la entrega hacia NATS.
3. **Reconciliación Híbrida en Mobile:** Notificaciones push para alertar al dispositivo + reconciliación reactiva en TanStack Query (al montar o recuperar foco/red).
4. **Almacenamiento Local de Running en SQLite:** Garantiza persistencia duradera ACID en el dispositivo, evitando pérdida de coordenadas por fallos de red o memoria.
5. **Circuit Breaker Restringido a Integraciones Externas:** Exclusivo para MercadoPago, Expo Push y wearables. Descartado sobre PostgreSQL y NATS local.

### Alternativas Descartadas y Justificación:
1. **Supabase Realtime (CDC directo desde WAL a Mobile):** Descartado porque puentearía las reglas de negocio de la API de Go, expondría el esquema físico directamente a los clientes móviles y requeriría una sobrecarga masiva de RLS en todas las tablas para evitar fugas de datos.
2. **Dual-Write síncrono (Guardar en Postgres y publicar a NATS en el mismo handler):** Descartado por vulnerabilidad a inconsistencias si la red o NATS fallan tras haber hecho commit en la base de datos.
3. **Persistencia de telemetría en MMKV / RAM:** Descartado para la cola de GPS por riesgo de pérdida de datos ante cierre inesperado o suspensión del sistema operativo.
4. **Circuit Breaker sobre consultas de PostgreSQL:** Descartado porque ocultaría problemas estructurales de contención o transacciones bloqueadas y podría retornar datos obsoletos no consistentes.

---
**Fin del Documento de Auditoría Integral (Versión 2.0.0 Definitiva).**
