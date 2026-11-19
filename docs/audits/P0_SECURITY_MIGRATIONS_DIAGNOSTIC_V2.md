# INFORME DE DIAGNÓSTICO TÉCNICO Y AUDITORÍA FORENSE P0 (VERSIÓN 2.0.0)
## SEGURIDAD, RLS, MULTI-TENANCY E INTEGRIDAD FÍSICA DE MIGRACIONES — MR TRAINING

**Fecha de emisión:** Noviembre 2026
**Auditor:** Senior Software Architect & Independent Technical Auditor
**Alcance:** Monorepo MR Training (`apps/api` Golang, `supabase/migrations`, `apps/api/migrations/postgres`, Dump Físico PostgreSQL 17.11 `backups/mr_training_migration_pre413.dump`)
**Estado Global:** `MR TRAINING — NOT READY FOR QA`
**Modalidad:** Diagnóstico Exclusivo de Inspección Forense de Solo Lectura — Cero Modificaciones de Código, Esquema o Infraestructura

---

## ÍNDICE GENERAL

1. [Resumen Ejecutivo y Bloqueos P0](#1-resumen-ejecutivo-y-bloqueos-p0)
2. [Reconciliación Exhaustiva de Migraciones y Estado Físico](#2-reconciliación-exhaustiva-de-migraciones-y-estado-físico)
   - 2.1 Matriz Tripartita: Ledger vs Directorios de Migraciones
   - 2.2 Diagnóstico de las 7 Migraciones Ausentes del Ledger
   - 2.3 Desfase Crítico: Supabase CLI (22) vs API Postgres (43)
3. [Inventario Exhaustivo de las 111 Tablas Físicas de la Base de Datos](#3-inventario-exhaustivo-de-las-111-tablas-físicas-de-la-base-de-datos)
4. [Análisis Profundo de las 42 Tablas sin RLS y Riesgos de Exposición](#4-análisis-profundo-de-las-42-tablas-sin-rls-y-riesgos-de-exposición)
5. [Análisis de las 20 Tablas sin Privilegios DML para mr_training_app](#5-análisis-de-las-20-tablas-sin-privilegios-dml-para-mr_training_app)
6. [Auditoría de Roles, Privilegios, Propietarios y Vectores de Bypass](#6-auditoría-de-roles-privilegios-propietarios-y-vectores-de-bypass)
7. [Auditoría de Procesos Internos, Workers y Webhooks Externos](#7-auditoría-de-procesos-internos-workers-y-webhooks-externos)
   - 7.1 El Conflicto RLS en el Outbox Worker
   - 7.2 Webhooks Externos Desprovistos de Contexto de Usuario (Clerk, Wompi, Garmin)
   - 7.3 Arquitectura de Autorización Interna sin Bypass General
8. [Auditoría de la Capa Go: Repositorios, Servicios, DBTX y UnitOfWork](#8-auditoría-de-la-capa-go-repositorios-servicios-dbtx-y-unitofwork)
   - 8.1 Repositorios con Soporte DBTX vs Repositorios Rígidos (*sql.DB)
   - 8.2 Handlers con Contexto Transaccional vs Handlers Desprotegidos
9. [Matriz Integral de Riesgos Técnicos y Dependencias Operativas](#9-matriz-integral-de-riesgos-técnicos-y-dependencias-operativas)
10. [Plan Modular de Implementación por Dependencias y Protocolo de Pruebas](#10-plan-modular-de-implementación-por-dependencias-y-protocolo-de-pruebas)

---

## 1. RESUMEN EJECUTIVO Y BLOQUEOS P0

El presente informe constituye la auditoría forense definitiva previa a la ejecución modular de la **Fase P0 (Seguridad, RLS, Multi-Tenancy e Integridad de Migraciones)** de MR Training. Conforme a las instrucciones estrictas de auditoría independiente, se contrastó el código fuente en Go contra el ledger histórico `schema_migrations`, los directorios de migraciones y el dump estructural exacto de la base de datos PostgreSQL (`backups/mr_training_migration_pre413.dump`).

### Bloqueos Críticos P0 Detectados:

1. **Bloqueo P0-1 (Falsa Asunción de Migraciones No Aplicadas):**
   Las migraciones `405`, `406`, `407`, `409`, `410`, `411` y `412` **ya fueron ejecutadas físicamente** en la base de datos de desarrollo y están inscritas en el ledger `schema_migrations`. Intentar reejecutarlas a ciegas o asumir que el esquema PostgreSQL carece de RLS rompería las secuencias DDL existentes.
2. **Bloqueo P0-2 (Divergencia entre Ledger y Esquema Físico):**
   Existen 7 migraciones en el repositorio (`032`, `301`, `400`, `401`, `402`, `403`, `413`) que **no figuran en el ledger `schema_migrations`**. La inspección física reveló que:
   - `301_exercise_library_image_url.sql`: La columna `image_url` ya existe físicamente en la tabla `exercise_library`.
   - `032_commission_rls.sql`: La columna `coach_id` ya fue añadida a `commission_agreements`, pero las políticas RLS **no existen**.
   - `400`, `401`, `402`, `403`: Las tablas (`subscriptions`, `subscription_payments`, `athlete_prs`, `athlete_session_stats`, `athlete_session_progress`, `landing_contacts`) **no existen en la base de datos**.
   - `413_athlete_memberships_read.sql`: La política unificada no ha sido aplicada; persisten las 4 políticas de coach restrictivas de la migración `405`.
3. **Bloqueo P0-3 (Brecha RLS en 42 Tablas Físicas y 0 Tablas FORCE RLS):**
   De 111 tablas físicas:
   - **69 tablas tienen RLS habilitado** con 275 políticas activas.
   - **42 tablas carecen por completo de RLS** (incluyendo el módulo financiero/alianzas completo, tablas secundarias críticas de entrenamiento y tablas de perfiles de atletas).
   - **0 tablas tienen configurado `FORCE ROW LEVEL SECURITY`**. Si una conexión se realiza mediante `postgres` o roles con `BYPASSRLS`, el motor PostgreSQL desactiva todas las políticas RLS.
4. **Bloqueo P0-4 (Parálisis Operativa de mr_training_app en 20 Tablas Comerciales):**
   El usuario de ejecución de la API `mr_training_app` tiene permisos DML en 91 tablas, pero **carece de cualquier privilegio DML (`SELECT, INSERT, UPDATE, DELETE`) sobre 20 tablas** (el bloque de alianzas, comisiones y liquidaciones). Si la API Go corre bajo `mr_training_app`, cualquier intento de gestionar comercios o liquidaciones arroja error `42501 (permission denied)`.
5. **Bloqueo P0-5 (Colisión Crítica en Workers y Webhooks):**
   La tabla `outbox` tiene RLS activado exigiendo `coach_id = current_setting(app.current_coach_id)`. Sin embargo, el worker en segundo plano `apps/api/internal/application/running/outbox/worker.go` ejecuta un sondeo batch global (`SELECT ... FOR UPDATE SKIP LOCKED`) sin inyectar ninguna variable de sesión, lo que provocaría que un worker bajo `mr_training_app` devuelva siempre 0 filas y quede ciego. Del mismo modo, los webhooks externos (Clerk, Wompi, Garmin) procesan peticiones sin un token de sesión de usuario, requiriendo un patrón de autorización interna sin bypass general.

---

## 2. RECONCILIACIÓN EXHAUSTIVA DE MIGRACIONES Y ESTADO FÍSICO

### 2.1 Matriz Tripartita: Ledger vs Directorios de Migraciones

| Archivo de Migración | En `apps/api/migrations/postgres` | En `supabase/migrations` | En Ledger `schema_migrations` | Estado en Esquema Físico (Dump) |
|---|---|---|---|---|
| `001_running_sessions.sql` | SÍ | SÍ | SÍ (2026-10-29) | Tabla `running_sessions` existe, RLS activo |
| `002_device_connections.sql` | SÍ | SÍ | SÍ (2026-10-29) | Tabla `device_connections` existe, RLS activo |
| `003_running_workout_templates.sql` | SÍ | SÍ | SÍ (2026-10-29) | Tabla `running_workout_templates` existe, RLS activo |
| `004_running_workout_segments.sql` | SÍ | SÍ | SÍ (2026-10-29) | Tabla `running_workout_segments` existe, **Sin RLS** |
| `005_running_workout_assignments.sql` | SÍ | SÍ | SÍ (2026-10-29) | Tabla `running_workout_assignments` existe, RLS activo |
| `006_running_workout_snapshots.sql` | SÍ | SÍ | SÍ (2026-10-29) | Tabla `running_workout_snapshots` existe, RLS activo |
| `007_running_gps_points.sql` | SÍ | SÍ | SÍ (2026-10-29) | Tabla `running_gps_points` existe, RLS activo |
| `008_running_session_devices.sql` | SÍ | SÍ | SÍ (2026-10-29) | Tabla `running_session_devices` existe, RLS activo |
| `009_running_workout_templates_segments_column.sql` | SÍ | **NO** | SÍ (2026-11-01) | Columna `segments JSONB` existe en la tabla |
| `010_plan_versions.sql` | SÍ | **NO** | SÍ (2026-11-02) | Tabla `plan_versions` existe, **Sin RLS** |
| `011_plan_trm_column.sql` | SÍ | **NO** | SÍ (2026-11-02) | Columna `trm REAL` existe en `plans` |
| `012_outbox_transaccional.sql` | SÍ | **NO** | SÍ (2026-11-04) | Tabla `outbox` existe |
| `019_allies.sql` | **NO** (en root `migrations/`) | **NO** | SÍ (2026-11-06) | Tablas `allies`, `coach_ally_relationships` existen |
| `020_commissions.sql` | **NO** (en root `migrations/`) | **NO** | SÍ (2026-11-06) | Tablas `commission_agreements`, `financial_audit_events` existen |
| `023_ally_commerce.sql` | **NO** (en root `migrations/`) | **NO** | SÍ (2026-11-06) | Tablas `ally_operations`, `ally_redemptions` existen |
| `024_ally_payment_declarations.sql` | **NO** (en root `migrations/`) | **NO** | SÍ (2026-11-06) | Tabla `ally_payment_declarations` existe |
| `025_commission_entries.sql` | **NO** (en root `migrations/`) | **NO** | SÍ (2026-11-06) | Tablas `commission_entries`, `financial_adjustments` existen |
| `026_settlements.sql` | **NO** (en root `migrations/`) | **NO** | SÍ (2026-11-06) | Tablas `coach_settlements`, `settlement_items` existen |
| `032_commission_rls.sql` | SÍ | **NO** | **NO** | Columna `coach_id` existe; **Políticas RLS ausentes** |
| `101_memberships.sql` | SÍ | SÍ | SÍ (2026-10-29) | Tablas de membresías existen |
| `104_gamification.sql` | SÍ | SÍ | SÍ (2026-10-29) | Tablas de gamificación existen |
| `105_leaderboard.sql` | SÍ | SÍ | SÍ (2026-10-29) | Tabla `leaderboard_entries` existe |
| `106_coach_feed.sql` | SÍ | SÍ | SÍ (2026-10-29) | Tablas de feed existen |
| `107_video_analytics.sql` | SÍ | SÍ | SÍ (2026-10-29) | Tabla `video_analytics_sessions` existe |
| `108_video_challenges.sql` | SÍ | SÍ | SÍ (2026-10-29) | Tablas de retos existen |
| `109_workout_templates.sql` | SÍ | SÍ | SÍ (2026-10-29) | Tabla `workout_templates` existe |
| `110_challenge_exercises.sql` | SÍ | SÍ | SÍ (2026-10-29) | Tabla `challenge_exercises` existe, **Sin RLS** |
| `111_form_recordings.sql` | SÍ | SÍ | SÍ (2026-10-29) | Tabla `form_recordings` existe |
| `112_programs.sql` | SÍ | SÍ | SÍ (2026-10-29) | Tabla `programs` existe |
| `202_coaching_schema.sql` | SÍ | SÍ | SÍ (2026-10-29) | Esquema coaching maestro aplicado |
| `204_coach_isolation_schema.sql` | SÍ | SÍ | SÍ (2026-10-29) | Esquema aislamiento aplicado |
| `208_event_registrations.sql` | SÍ | SÍ | SÍ (2026-10-29) | Tabla `event_registrations` existe |
| `300_remaining_migrations.sql` | SÍ | SÍ | SÍ (2026-10-29) | Tablas secundarias creadas |
| `301_exercise_library_image_url.sql` | SÍ | **NO** | **NO** | **Ya aplicado manualmente**: columna `image_url` existe |
| `400_subscriptions.sql` | SÍ | **NO** | **NO** | **Pendiente real**: tabla `subscriptions` no existe |
| `401_subscription_payments.sql` | SÍ | **NO** | **NO** | **Pendiente real**: tabla `subscription_payments` no existe |
| `402_athlete_session_tables.sql` | SÍ | **NO** | **NO** | **Pendiente real**: tablas `athlete_prs`, stats no existen |
| `403_landing_contacts.sql` | SÍ | **NO** | **NO** | **Pendiente real**: tabla `landing_contacts` no existe |
| `404_outbox_fix.sql` | SÍ | **NO** | SÍ (2026-11-04) | Columnas `event_id`, `locked_by` en outbox existen |
| `405_rls_coach_isolation.sql` | SÍ | **NO** | SÍ (2026-11-05) | RLS habilitado en 17 tablas maestras |
| `406_rls_remaining_tables.sql` | SÍ | **NO** | SÍ (2026-11-05) | RLS habilitado en tablas adicionales |
| `407_users_coaches_links_rls.sql` | SÍ | **NO** | SÍ (2026-11-05) | RLS en `coaches` y `coach_athlete_links` |
| `409_child_sensible_rls.sql` | SÍ | **NO** | SÍ (2026-11-05) | RLS en 6 tablas hijas (`running_gps_points`, etc.) |
| `410_running_workout_assignments_rls_either_or.sql` | SÍ | **NO** | SÍ (2026-11-05) | Política dual coach/atleta aplicada |
| `411_fix_rls_athlete_correlation.sql` | SÍ | **NO** | SÍ (2026-11-05) | Corrección de correlación externa en 24 tablas |
| `412_wompi_payment_ledger.sql` | SÍ | **NO** | SÍ (2026-11-06) | Tablas del ledger Wompi creadas |
| `413_athlete_memberships_read.sql` | SÍ | **NO** | **NO** | **Pendiente real**: política self-read no aplicada |

### 2.2 Diagnóstico Detallado de las 7 Migraciones Ausentes del Ledger

1. `032_commission_rls.sql`:
   - *Intención:* Agregar columna `coach_id` a `commission_agreements` y habilitar RLS en `commission_agreements` y `commission_entries`.
   - *Estado físico comprobado:* La columna `coach_id` ya existe en `commission_agreements` (línea 798 del dump), pero RLS está **DESHABILITADO** en ambas tablas y las políticas `commission_*_tenant_isolation` no existen.
   - *Diagnóstico:* La migración fue aplicada parcialmente o sobreescrita. Requiere aplicar las políticas RLS.
2. `301_exercise_library_image_url.sql`:
   - *Intención:* Añadir `image_url TEXT` a `exercise_library`.
   - *Estado físico comprobado:* La tabla `exercise_library` ya posee la columna `image_url` en la base de datos (línea 1162 del dump).
   - *Diagnóstico:* No debe ejecutarse como DDL activo; basta con registrarla en el ledger `schema_migrations` para evitar que scripts idempotentes fallen.
3. `400_subscriptions.sql` y `401_subscription_payments.sql`:
   - *Intención:* Crear el modelo transaccional de suscripciones recurrentes.
   - *Estado físico comprobado:* Ni las tablas ni sus índices existen en el dump.
   - *Diagnóstico:* Migración legítimamente **pendiente** de ejecución.
4. `402_athlete_session_tables.sql`:
   - *Intención:* Crear tablas de proyección de NATS (`athlete_prs`, `athlete_session_stats`, `athlete_session_progress`).
   - *Estado físico comprobado:* No existen en el dump.
   - *Diagnóstico:* Migración legítimamente **pendiente** de ejecución.
5. `403_landing_contacts.sql`:
   - *Intención:* Formulario público de prospección.
   - *Estado físico comprobado:* No existe en el dump.
   - *Diagnóstico:* Migración legítimamente **pendiente** de ejecución.
6. `413_athlete_memberships_read.sql`:
   - *Intención:* Permitir al atleta leer su propia membresía (`athlete_id = app.current_user_id`) conservando escrituras exclusivas del coach.
   - *Estado físico comprobado:* En el dump (línea 7621), la política activa es `athlete_memberships_tenant_isolation_sel` que únicamente evalúa `coach_id = current_setting(app.current_coach_id)`. El atleta tiene bloqueada la lectura de su propia membresía bajo RLS.
   - *Diagnóstico:* Migración legítimamente **pendiente** de ejecución.

### 2.3 Desfase Crítico: Supabase CLI (22) vs API Postgres (43)
`supabase/migrations/` contiene únicamente 22 archivos frente a los 43 archivos de la API. Un despliegue automatizado con el CLI de Supabase dejaría el entorno cloud sin el 50% de las tablas del sistema (sin Outbox, sin suscripciones, sin Wompi ledger y sin 60 de las 69 políticas RLS).

---

## 3. INVENTARIO EXHAUSTIVO DE LAS 111 TABLAS FÍSICAS DE LA BASE DE DATOS

A continuación se presenta el catálogo físico completo extraído del catálogo de PostgreSQL (`backups/mr_training_migration_pre413.dump`), clasificado por dominio funcional:

#### Alianzas / Marketplace (20 tablas)

| Tabla | RLS Habilitado | FORCE RLS | Cant. Políticas | Rol Propietario | DML mr_training_app | Rol Dueño / Scope | Sensibilidad de Datos |
|---|---|---|---|---|---|---|---|
| `allies` | **NO** | NO | 0 | `postgres` | **NO** | Aliado | Alta (Comercial) |
| `ally_invitations` | **NO** | NO | 0 | `postgres` | **NO** | Aliado/Coach | Alta (Comercial) |
| `ally_locations` | **NO** | NO | 0 | `postgres` | **NO** | Aliado | Media (Ubicaciones) |
| `ally_members` | **NO** | NO | 0 | `postgres` | **NO** | Aliado | Alta (Personal Aliado) |
| `ally_operation_items` | **NO** | NO | 0 | `postgres` | **NO** | Aliado/Atleta | Alta (Transaccional) |
| `ally_operations` | **NO** | NO | 0 | `postgres` | **NO** | Aliado/Coach/Atleta | Alta (Financiera) |
| `ally_payment_declarations` | **NO** | NO | 0 | `postgres` | **NO** | Aliado/Coach | Alta (Financiera/Auditoría) |
| `ally_products` | **NO** | NO | 0 | `postgres` | **NO** | Aliado | Baja/Pública (Catálogo) |
| `ally_redemptions` | **NO** | NO | 0 | `postgres` | **NO** | Atleta/Aliado | Crítica (Tokens/Cupones) |
| `ally_services` | **NO** | NO | 0 | `postgres` | **NO** | Aliado | Baja/Pública (Catálogo) |
| `coach_ally_relationships` | **NO** | NO | 0 | `postgres` | **NO** | Coach/Aliado | Alta (Contratos/Comisiones) |
| `coach_payment_records` | **NO** | NO | 0 | `postgres` | **NO** | Coach/Aliado | Crítica (Registros Pagos) |
| `coach_settlements` | **NO** | NO | 0 | `postgres` | **NO** | Coach | Crítica (Liquidaciones Financieras) |
| `commission_agreements` | **NO** | NO | 0 | `postgres` | **NO** | Coach/Aliado | Crítica (Términos Comerciales) |
| `commission_entries` | **NO** | NO | 0 | `postgres` | **NO** | Coach | Crítica (Asientos de Comisión) |
| `financial_adjustments` | **NO** | NO | 0 | `postgres` | **NO** | Sistema/Coach | Crítica (Ajustes Saldo) |
| `financial_audit` | **NO** | NO | 0 | `postgres` | **SÍ** | Sistema | Crítica (Auditoría Financiera) |
| `financial_audit_events` | **NO** | NO | 0 | `postgres` | **NO** | Sistema | Crítica (Trazabilidad Eventos) |
| `settlement_documents` | **NO** | NO | 0 | `postgres` | **NO** | Coach | Alta (Comprobantes) |
| `settlement_items` | **NO** | NO | 0 | `postgres` | **NO** | Coach | Crítica (Detalle Liquidación) |

#### Entrenamiento / Workout (15 tablas)

| Tabla | RLS Habilitado | FORCE RLS | Cant. Políticas | Rol Propietario | DML mr_training_app | Rol Dueño / Scope | Sensibilidad de Datos |
|---|---|---|---|---|---|---|---|
| `assigned_workout_exercises` | **NO** | NO | 0 | `postgres` | **SÍ** | Atleta/Coach | Alta (Series/Ejercicios Asignados) |
| `assigned_workouts` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Atleta/Coach | Alta (Plan Asignado) |
| `coach_sessions` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach | Alta (Sesiones del Coach) |
| `exercise_library` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach/Sistema | Media (Librería / Custom Coach) |
| `program_workouts` | **NO** | NO | 0 | `postgres` | **SÍ** | Coach/Sistema | Media (Estructura Programas) |
| `programs` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach/Sistema | Media (Programas Entrenamiento) |
| `session_ai_adjustments` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach | Media (Sugerencias AI) |
| `session_athletes` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach/Atleta | Alta (Asistencia Sesiones) |
| `session_exercises` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach | Media (Ejercicios de Sesión) |
| `time_blocks` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach | Media (Bloques de Agenda) |
| `workout_exercises` | **NO** | NO | 0 | `postgres` | **SÍ** | Coach/Atleta | Alta (Detalle Ejercicios) |
| `workout_session_logs` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Atleta/Coach | Alta (Logs de Ejecución) |
| `workout_set_logs` | **NO** | NO | 0 | `postgres` | **SÍ** | Atleta/Coach | Alta (Series, Pesos, Reps) |
| `workout_template_exercises` | **NO** | NO | 0 | `postgres` | **SÍ** | Coach | Media (Plantilla Ejercicios) |
| `workout_templates` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach | Alta (Propiedad Intelectual Coach) |

#### Running / Telemetría (9 tablas)

| Tabla | RLS Habilitado | FORCE RLS | Cant. Políticas | Rol Propietario | DML mr_training_app | Rol Dueño / Scope | Sensibilidad de Datos |
|---|---|---|---|---|---|---|---|
| `device_connections` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Atleta | Alta (Tokens/Dispositivos Conectados) |
| `running_gps_points` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Atleta | Crítica (Telemetría Geolocalizada) |
| `running_session_devices` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Atleta | Media (Hardware Vinculado) |
| `running_sessions` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Atleta/Coach | Alta (Sesión de Carrera) |
| `running_workout_assignments` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach/Atleta | Alta (Asignación Running) |
| `running_workout_segments` | **NO** | NO | 0 | `postgres` | **SÍ** | Coach | Media (Intervalos y Ritmos) |
| `running_workout_snapshots` | **SÍ** | NO | 2 | `postgres` | **SÍ** | Coach/Atleta | Media (Snapshots Sesión) |
| `running_workout_templates` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach | Alta (Plantillas Running) |
| `wearable_oauth_tokens` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Atleta | Crítica (OAuth Tokens Wearables) |

#### Atleta / Salud / Gamificación (18 tablas)

| Tabla | RLS Habilitado | FORCE RLS | Cant. Políticas | Rol Propietario | DML mr_training_app | Rol Dueño / Scope | Sensibilidad de Datos |
|---|---|---|---|---|---|---|---|
| `athlete_favorites` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Atleta | Baja (Marcadores/Favoritos) |
| `athlete_health_devices` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Atleta | Media (Dispositivos Salud) |
| `athlete_health_metrics` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Atleta/Coach | Crítica (Biomarcadores/Salud) |
| `athlete_profiles` | **NO** | NO | 0 | `postgres` | **SÍ** | Atleta/Coach | Alta (Datos Personales Atleta) |
| `athlete_sleep_logs` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Atleta/Coach | Crítica (Biometría de Sueño) |
| `athlete_weight_history` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Atleta/Coach | Alta (Historial de Peso) |
| `challenge_attempts` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Atleta | Media (Intentos de Retos) |
| `challenge_exercises` | **NO** | NO | 0 | `postgres` | **SÍ** | Coach/Sistema | Media (Contenido de Retos) |
| `challenges` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach/Sistema | Media (Definición de Retos) |
| `form_metrics` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Atleta/Coach | Alta (Evaluación Postural/Forma) |
| `form_recordings` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Atleta/Coach | Alta (Grabaciones Video Forma) |
| `gamification_badges` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Atleta | Baja (Insignias Obtenidas) |
| `gamification_prs` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Atleta/Coach | Media (Récords Personales) |
| `gamification_streaks` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Atleta | Baja (Rachas Activas) |
| `gamification_workout_days` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Atleta | Baja (Días Completados) |
| `leaderboard_entries` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Atleta/Comunidad | Media (Tablas de Posiciones) |
| `readiness_checkins` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Atleta/Coach | Alta (Check-in Diario Fatiga/Ánimo) |
| `video_analytics_sessions` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Atleta/Coach | Alta (Sesiones de Análisis Video) |

#### Coaching / Comunidad / Mensajería (21 tablas)

| Tabla | RLS Habilitado | FORCE RLS | Cant. Políticas | Rol Propietario | DML mr_training_app | Rol Dueño / Scope | Sensibilidad de Datos |
|---|---|---|---|---|---|---|---|
| `ai_suggestions` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach | Media (Recomendaciones Coach) |
| `blog_posts` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach/Público | Baja/Pública (Artículos Blog) |
| `coach_athlete_links` | **SÍ** | NO | 8 | `postgres` | **SÍ** | Coach/Atleta | Crítica (Vínculos Multi-Tenant) |
| `coach_athletes` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach | Alta (Directorio Atletas del Coach) |
| `coach_feed_comments` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Comunidad Coach | Media (Comentarios en Feed) |
| `coach_feed_posts` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach | Media (Publicaciones Feed) |
| `coach_feed_reactions` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Comunidad Coach | Baja (Reacciones a Posts) |
| `coaches` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach | Alta (Perfil y Configuración Coach) |
| `community_forums` | **NO** | NO | 0 | `postgres` | **SÍ** | Comunidad | Media (Foros de Discusión) |
| `daily_highlights` | **NO** | NO | 0 | `postgres` | **SÍ** | Coach | Media (Resúmenes Destacados) |
| `daily_summaries` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach | Media (Métricas del Día Coach) |
| `dashboard_metrics` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach | Alta (Estadísticas Agregadas Coach) |
| `live_sessions` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach/Atleta | Alta (Clases en Vivo) |
| `message_threads` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach/Atleta | Crítica (Hilos de Mensajería) |
| `messages` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Usuario (Emisor) | Crítica (Conversaciones Privadas) |
| `pending_invites` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach | Alta (Invitaciones Pendientes) |
| `recent_activity` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach | Media (Historial de Acciones) |
| `revenue_history` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach | Crítica (Historial de Ingresos) |
| `support_tickets` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Usuario | Alta (Tickets de Soporte) |
| `thread_participants` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Usuario | Alta (Participantes en Conversación) |
| `ticket_messages` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Usuario/Soporte | Alta (Mensajes de Soporte) |

#### Eventos (6 tablas)

| Tabla | RLS Habilitado | FORCE RLS | Cant. Políticas | Rol Propietario | DML mr_training_app | Rol Dueño / Scope | Sensibilidad de Datos |
|---|---|---|---|---|---|---|---|
| `event_athletes` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach/Atleta | Alta (Participantes Evento) |
| `event_form_fields` | **NO** | NO | 0 | `postgres` | **SÍ** | Coach | Media (Campos de Formulario) |
| `event_form_responses` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Atleta/Coach | Alta (Respuestas Formulario) |
| `event_list_items` | **NO** | NO | 0 | `postgres` | **SÍ** | Coach | Media (Items de Lista Evento) |
| `event_registrations` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Atleta/Coach | Alta (Inscripciones Evento) |
| `events` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach/Público | Media (Eventos Deportivos) |

#### Planes / Membresías / Pagos (11 tablas)

| Tabla | RLS Habilitado | FORCE RLS | Cant. Políticas | Rol Propietario | DML mr_training_app | Rol Dueño / Scope | Sensibilidad de Datos |
|---|---|---|---|---|---|---|---|
| `athlete_memberships` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Atleta/Coach | Crítica (Membresías Activas) |
| `membership_payments` | **NO** | NO | 0 | `postgres` | **SÍ** | Atleta/Coach | Crítica (Pagos de Membresía) |
| `payment_methods` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Usuario | Crítica (Métodos de Pago) |
| `plan_distribution` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach | Alta (Distribución Planes) |
| `plan_features` | **NO** | NO | 0 | `postgres` | **SÍ** | Coach | Media (Características Plan) |
| `plan_training_modes` | **NO** | NO | 0 | `postgres` | **SÍ** | Coach | Media (Modalidades de Plan) |
| `plan_versions` | **NO** | NO | 0 | `postgres` | **SÍ** | Coach | Alta (Precios Versionados) |
| `plans` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach | Alta (Definición de Planes) |
| `platform_commission_terms` | **NO** | NO | 0 | `postgres` | **SÍ** | Sistema/Coach | Crítica (Términos Plataforma) |
| `wompi_ledger_adjustments` | **NO** | NO | 0 | `postgres` | **SÍ** | Sistema/Coach | Crítica (Ajustes Wompi) |
| `wompi_payment_ledger` | **SÍ** | NO | 1 | `postgres` | **SÍ** | Sistema/Coach | Crítica (Libro Mayor Wompi) |

#### Tienda / E-commerce (5 tablas)

| Tabla | RLS Habilitado | FORCE RLS | Cant. Políticas | Rol Propietario | DML mr_training_app | Rol Dueño / Scope | Sensibilidad de Datos |
|---|---|---|---|---|---|---|---|
| `products` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach | Media (Catálogo Productos Tienda) |
| `sales` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach | Crítica (Registro Ventas) |
| `store_order_items` | **NO** | NO | 0 | `postgres` | **SÍ** | Coach/Atleta | Alta (Items de Orden Tienda) |
| `store_orders` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach/Atleta | Alta (Órdenes Tienda) |
| `store_purchases` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Atleta/Coach | Alta (Compras Realizadas) |

#### Sistema / Infraestructura (6 tablas)

| Tabla | RLS Habilitado | FORCE RLS | Cant. Políticas | Rol Propietario | DML mr_training_app | Rol Dueño / Scope | Sensibilidad de Datos |
|---|---|---|---|---|---|---|---|
| `completed_session_names` | **NO** | NO | 0 | `postgres` | **SÍ** | Coach/Atleta | Baja (Nombres Derivados) |
| `good` | **NO** | NO | 0 | `postgres` | **NO** | Test/Artefacto | Nula (Artefacto de Prueba) |
| `outbox` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Sistema | Crítica (Eventos Transaccionales) |
| `public_page_config` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Coach/Público | Baja/Pública (Config Web) |
| `push_tokens` | **SÍ** | NO | 4 | `postgres` | **SÍ** | Usuario | Alta (Tokens Notificación Push) |
| `schema_migrations` | **NO** | NO | 0 | `postgres` | **SÍ** | Sistema | Crítica (Ledger Migraciones DDL) |

---

## 4. ANÁLISIS PROFUNDO DE LAS 42 TABLAS SIN RLS Y RIESGOS DE EXPOSICIÓN

El inventario físico confirmó que **42 de las 111 tablas** carecen de `ROW LEVEL SECURITY`. A continuación se analizan según su vector de exposición real y riesgo de negocio:

### Grupo A: Riesgo Crítico — Módulo Financiero y Alianzas (16 tablas)
Tablas: `allies`, `ally_invitations`, `ally_members`, `ally_operation_items`, `ally_operations`, `ally_payment_declarations`, `ally_redemptions`, `coach_ally_relationships`, `coach_payment_records`, `coach_settlements`, `commission_agreements`, `commission_entries`, `financial_adjustments`, `financial_audit_events`, `settlement_documents`, `settlement_items`.
- **Riesgo Concreto:** Contienen montos de comisiones, números de cuenta, liquidaciones monetarias y registros de transacciones. Si un handler omite un filtro SQL en Go, un coach podría ver o alterar las liquidaciones de otro coach.
- **Acción Requerida:** Habilitar RLS aislando por `coach_id = app.current_coach_id` para relaciones, asientos de comisión y liquidaciones. Para tablas compartidas de aliados (`allies`, `ally_operations`), aislar mediante pertenencia a la relación del coach.

### Grupo B: Riesgo Alto — Tablas Secundarias de Entrenamiento y Atletas (8 tablas)
Tablas: `assigned_workout_exercises`, `workout_exercises`, `workout_set_logs`, `workout_template_exercises`, `program_workouts`, `running_workout_segments`, `athlete_profiles`, `membership_payments`.
- **Riesgo Concreto:**
  - `workout_set_logs` y `assigned_workout_exercises` contienen el detalle íntimo de pesos, repeticiones y esfuerzo de los atletas. Al no tener RLS, una consulta directa filtrando solo por `id` permitiría leer o sobreescribir sets ajenos (IDOR).
  - `athlete_profiles`: Contiene datos personales sensibles (peso, altura, contacto de emergencia). Aunque el acceso pase por la API, la base de datos no tiene salvaguarda.
  - `membership_payments`: Detalle transaccional de pagos de membresía que complementa a `athlete_memberships`.
- **Acción Requerida:** Aplicar políticas RLS basadas en la relación con el padre protegido (`assigned_workouts`, `athlete_memberships`, `workout_templates`).

### Grupo C: Riesgo Medio — Contenido, Eventos y Planes Versionados (8 tablas)
Tablas: `plan_features`, `plan_training_modes`, `plan_versions`, `platform_commission_terms`, `wompi_ledger_adjustments`, `event_form_fields`, `event_list_items`, `challenge_exercises`.
- **Riesgo Concreto:** Contenido estructurado dependiente de entidades padre (`plans`, `events`, `challenges`).
- **Acción Requerida:** Extender RLS con subconsultas hacia el `coach_id` del padre.

### Grupo D: Riesgo Bajo / Público / Sistema (10 tablas)
Tablas: `ally_products`, `ally_services`, `ally_locations`, `community_forums`, `daily_highlights`, `completed_session_names`, `financial_audit`, `good`, `public_page_config`, `schema_migrations`.
- **Análisis:** `schema_migrations` y `financial_audit` son tablas del sistema gestionadas por la plataforma. `ally_products` y `community_forums` son catálogos públicos o compartidos. No requieren aislamiento por tenant individual, pero deben restringirse a solo lectura para usuarios no autenticados.

---

## 5. ANÁLISIS DE LAS 20 TABLAS SIN PRIVILEGIOS DML PARA mr_training_app

El usuario de ejecución de la aplicación `mr_training_app` tiene permisos DML sobre 91 tablas, pero **carece completamente de privilegios sobre 20 tablas**:

```text
allies, ally_invitations, ally_locations, ally_members, ally_operation_items,
ally_operations, ally_payment_declarations, ally_products, ally_redemptions, ally_services,
coach_ally_relationships, coach_payment_records, coach_settlements, commission_agreements,
commission_entries, financial_adjustments, financial_audit_events, good,
settlement_documents, settlement_items.
```

### Causa Raíz Comprobada:
Las migraciones de alianzas (`019` a `026`) fueron ejecutadas por el superusuario `postgres` sin incluir las sentencias correspondientes:
`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.<table> TO mr_training_app;`

### Impacto Operativo:
Si la API de Go se inicia utilizando `DATABASE_URL` con el rol `mr_training_app`, **el 100% de los endpoints del módulo de Alianzas, Liquidaciones y Comisiones fallarán inmediatamente con error SQL `42501 (permission denied for table)`**.

---

## 6. AUDITORÍA DE ROLES, PRIVILEGIOS, PROPIETARIOS Y VECTORES DE BYPASS

### 6.1 Matriz de Roles Físicos en PostgreSQL

| Rol | Superuser | Bypass RLS | Create DB | Propósito en Arquitectura |
|---|---|---|---|---|
| `postgres` | **SÍ** | **SÍ** | **SÍ** | Owner del esquema, ejecución exclusiva de migraciones DDL (`cmd/migrate`) |
| `mr_training_app` | **NO** | **NO** | **NO** | Rol de ejecución en runtime para la API Go |

### 6.2 El Vector de Bypass por Ausencia de `FORCE ROW LEVEL SECURITY`:
- En el dump actual, **ninguna de las 69 tablas con RLS tiene `FORCE ROW LEVEL SECURITY`**.
- *Consecuencia crítica:* Si la API de Go o un desarrollador se conecta utilizando la credencial por defecto `postgres` (como figura en `.env.example`), PostgreSQL desactiva la evaluación de RLS para todas las consultas.
- *Decisión Arquitectónica:* La aplicación en producción debe correr obligatoriamente bajo `mr_training_app`, garantizando que RLS sea forzado por el motor independientemente de `FORCE RLS`.

---

## 7. AUDITORÍA DE PROCESOS INTERNOS, WORKERS Y WEBHOOKS EXTERNOS

### 7.1 El Conflicto RLS en el Outbox Worker
- **Ubicación:** `apps/api/internal/application/running/outbox/worker.go` (líneas 65-85).
- **Evidencia del Código:**
  ```go
  rows, err := tx.QueryContext(ctx, `
      SELECT id, COALESCE(event_id::text, id::text), event_type, aggregate_type, aggregate_id, coach_id, athlete_id, payload, attempts
      FROM outbox
      WHERE status IN ('pending')
        AND (next_retry_at IS NULL OR next_retry_at <= NOW())
        AND (locked_until IS NULL OR locked_until < NOW())
      ORDER BY occurred_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT $1
  `, w.batch)
  ```
- **Conflicto RLS Comprobado:**
  En la base de datos (línea 8199 del dump), la tabla `outbox` tiene activa la política:
  `CREATE POLICY outbox_tenant_isolation_sel ON public.outbox FOR SELECT USING (coach_id = current_setting(app.current_coach_id, true));`
  Dado que el Outbox Worker es un proceso batch en segundo plano que corre a nivel de aplicación sin una solicitud HTTP de usuario, la variable `app.current_coach_id` es vacía/nula.
  **Bajo `mr_training_app`, el Outbox Worker no puede leer ningún evento de la tabla outbox (retorna 0 filas continuamente).**

### 7.2 Webhooks Externos Desprovistos de Contexto de Usuario
1. **Clerk Webhook (`clerk_webhook.go`):**
   - Recibe eventos de provisión de usuarios (`user.created`, `session.created`).
   - Las peticiones provienen de los servidores de Clerk y se validan criptográficamente con cabeceras SVIX (`svix-id`, `svix-timestamp`, `svix-signature`).
   - No existe un token de sesión ni un `coach_id` o `user_id` autenticado al momento de la llegada del webhook.
   - Ejecuta `userService.EnsureUser(...)`, `EnsureCoach(...)`, `EnsureAthleteProfile(...)`.
2. **Wompi Payment Webhook (`payment.go`):**
   - Recibe notificaciones asíncronas de aprobación o rechazo de transacciones.
   - Valida la firma del evento usando el secreto de Wompi.
   - Debe actualizar el estado en `wompi_payment_ledger` y activar la membresía del atleta.
3. **Garmin Webhook (`garmin_webhook.go`):**
   - Ingesta lotes de telemetría y salud procedentes de la nube de Garmin.

### 7.3 Arquitectura de Autorización Interna sin Bypass General
Para evitar un bypass general inseguro que debilite la seguridad multi-tenant, se establece la siguiente arquitectura:
1. **Separación Estricta de Contextos:**
   - Queda terminantemente **prohibido** crear políticas del tipo `USING (current_setting(app.bypass_rls, true) = true)`, ya que cualquier inyección SQL o código descuidado podría puentear RLS.
2. **Contexto de Sistema Tipado para Tareas en Background:**
   - Para el Outbox Worker y jobs batch internos, el proceso establecerá transaccionalmente una variable de alcance de sistema:
     `SELECT set_config(app.internal_execution_context, system_worker, true);`
   - La política RLS de la tabla `outbox` se diseñará específicamente como:
     ```sql
     CREATE POLICY outbox_worker_read_policy ON public.outbox
       FOR SELECT
       USING (
         current_setting(app.internal_execution_context, true) = system_worker
         OR (coach_id = NULLIF(current_setting(app.current_coach_id, true), ))
       );
     ```
3. **Contexto Específico de Provisión para Webhooks:**
   - En el webhook de Clerk, una vez validada la firma SVIX, el handler establecerá el contexto de provisión transaccional:
     `SELECT set_config(app.internal_execution_context, clerk_provisioning, true);`
     `SELECT set_config(app.current_user_id, target_user_id, true);`
   - Esto confina el permiso exclusivamente a la transacción que provisiona al usuario objetivo, sin abrir puertas traseras a la sesión completa.

---

## 8. AUDITORÍA DE LA CAPA GO: REPOSITORIOS, SERVICIOS, DBTX Y UNITOFWORK

### 8.1 Repositorios con Soporte DBTX vs Repositorios Rígidos (*sql.DB)

Se auditaron los 48 repositorios bajo `apps/api/internal/infrastructure/`:
- **38 Repositorios cuentan con soporte `WithExecutor` / `SetExecutor`:**
  `ally`, `ally_catalog`, `ally_operations`, `ally_payment_declaration`, `analytics`, `blog`, `checkin`, `coach`, `coach_settlement`, `coachfeed`, `commission`, `commission_entry`, `config`, `dashboard`, `event`, `exercise`, `favorite`, `formmetrics`, `formrecording`, `gamification`, `health`, `invite`, `leaderboard`, `membership`, `message`, `notification`, `payment_ledger`, `plan`, `product`, `running`, `store`, `subscription`, `support`, `today`, `trainingai`, `user`, `videoanalytics`, `workout`.
- **10 Repositorios Rígidos acoplados únicamente a `*sql.DB`:**
  `alert`, `athlete`, `audit`, `challenge`, `community`, `import`, `memory`, `onboarding`, `routine`, `videoview`.
  *Acción en Paso 3:* Adaptar estos 10 repositorios a la interfaz común `database.Executor` (`DBTX`).

### 8.2 Handlers con Contexto Transaccional vs Handlers Desprotegidos

Se auditaron 56 archivos de handlers HTTP:
- **9 Handlers implementan el patrón transaccional `withTx` con UnitOfWork:**
  `coach.go`, `membership.go`, `ally_payment.go`, `event.go`, `analytics.go`, `coach_settlement.go`, `message.go`, `support.go`, `running_workouts.go`.
  *Patrón canónico verificado en `coach.go`:*
  ```go
  uow := database.NewUnitOfWork(h.db)
  if err := uow.Begin(c.Context(), userID, coachID, middleware.GetUserRole(c)); err != nil {
      return appresponse.Error(c, fiber.StatusInternalServerError, "failed to begin transaction")
  }
  defer uow.Rollback(c.Context())
  svc := h.service.SetExecutor(uow.Tx())
  ```
- **47 Handlers ejecutan sin `UnitOfWork` ni `set_config`:**
  Sobresalen por su criticidad:
  - `training.go`: Todos los endpoints de plantillas, asignaciones (`POST /workouts/assign`) y registros de series ejecutan directo sobre el pool global.
  - `running.go`: Endpoints de telemetría GPS e inicio de sesión ejecutan sin `BeginWithTenant`.
  - `user.go`: Actualizaciones de perfil sin contexto transaccional.
  *Acción en Paso 4:* Generalizar la inyección de `withTx` en estos handlers neurálgicos.

---

## 9. MATRIZ INTEGRAL DE RIESGOS TÉCNICOS Y DEPENDENCIAS OPERATIVAS

| Riesgo Técnico / Operativo | Probabilidad | Impacto | Severidad | Mitigación Planificada en P0 |
|---|---|---|---|---|
| **Bloqueo del Outbox Worker por RLS** | Certeza (100%) | Crítica | **P0** | Política RLS con variable de contexto interno `system_worker` en transacciones del worker. |
| **Error 42501 en Módulo Comercial** | Certeza (100%) | Crítica | **P0** | Otorgar `GRANT DML` a `mr_training_app` sobre las 20 tablas de alianzas y liquidaciones. |
| **Bypass de RLS por rol de conexión** | Alta | Crítica | **P0** | Garantizar en configuración y tests que la API opere con el rol restringido `mr_training_app`. |
| **Fallo en Creación de Tablas Pendientes** | Media | Alta | **P0** | Aplicar ordenadamente las 5 migraciones pendientes de esquema (`400`, `401`, `402`, `403`, `413`). |
| **Fallo en Webhooks por falta de contexto** | Alta | Alta | **P0** | Establecer contexto de provisión transaccional localizado tras validación de firma criptográfica. |
| **Ruptura de Tests Unitarios por DBTX** | Baja | Media | **P1** | Preservar constructores existentes y retrocompatibilidad con mocks en la capa de repositorios. |

---

## 10. PLAN MODULAR DE IMPLEMENTACIÓN POR DEPENDENCIAS Y PROTOCOLO DE PRUEBAS

La ejecución de la Fase P0 se articulará en 5 pasos modulares estrictamente secuenciales. Cada paso requiere validación técnica y aprobación previa antes de avanzar al siguiente:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SECUENCIA MODULAR DE IMPLEMENTACIÓN P0               │
├─────────────────────────────────────────────────────────────────────────┤
│  PASO 1: Reconciliación e Integridad de Migraciones                     │
│  ├─ Sincronizar archivos faltantes en supabase/migrations               │
│  ├─ Registrar migraciones ya existentes físicamente en schema_migrations│
│  └─ Aplicar las 5 migraciones pendientes (400, 401, 402, 403, 413)      │
├─────────────────────────────────────────────────────────────────────────┤
│  PASO 2: Políticas RLS y Permisos de mr_training_app                    │
│  ├─ Otorgar GRANT DML sobre las 20 tablas comerciales a mr_training_app │
│  ├─ Diseñar y aplicar RLS sobre las 42 tablas sin protección            │
│  └─ Implementar contexto interno seguro para Outbox Worker y Webhooks   │
├─────────────────────────────────────────────────────────────────────────┤
│  PASO 3: Adaptación de Repositorios Go a DBTX                           │
│  ├─ Generalizar interfaz database.Executor en 10 repositorios rígidos   │
│  └─ Verificar no-regresión en suite de pruebas unitarias                │
├─────────────────────────────────────────────────────────────────────────┤
│  PASO 4: Inyección de UnitOfWork en Handlers Críticos                   │
│  ├─ Incorporar withTx en training.go (Asignaciones y Entrenamientos)   │
│  ├─ Incorporar withTx en running.go y user.go                           │
│  └─ Configurar contexto transaccional en webhooks tras firma            │
├─────────────────────────────────────────────────────────────────────────┤
│  PASO 5: Suite de Pruebas Reales de Aislamiento y Certificación         │
│  ├─ Pruebas cruzadas de aislamiento multi-tenant en PostgreSQL real     │
│  ├─ Validación bajo rol mr_training_app (sin privilegios de superuser)  │
│  └─ Emisión del informe final de certificación P0                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Criterios de Aceptación Objetivos para Cada Paso:
- **Criterio Paso 1:** `diff -rq` entre `apps/api/migrations/postgres` y `supabase/migrations` arroja 0 diferencias; las 111 tablas físicas y el ledger `schema_migrations` están en paridad total.
- **Criterio Paso 2:** Las 111 tablas tienen RLS habilitado o excepción documentada justificada; `mr_training_app` puede ejecutar DML en todas las tablas de negocio sin error 42501; el Outbox Worker puede leer lotes sin ser bloqueado.
- **Criterio Paso 3:** 100% de los repositorios aceptan `database.Executor`; `go test ./internal/infrastructure/...` pasa al 100%.
- **Criterio Paso 4:** Las peticiones a `training.go` y `running.go` ejecutan dentro de una transacción con `app.current_coach_id` verificado en logs de auditoría.
- **Criterio Paso 5:** Un Coach A autenticado recibe 0 registros e intento de escritura denegado al acceder a datos de un Coach B en PostgreSQL real bajo el rol `mr_training_app`.

---
**Fin del Informe Forense y Diagnóstico Técnico P0 (Versión 2.0.0).**
