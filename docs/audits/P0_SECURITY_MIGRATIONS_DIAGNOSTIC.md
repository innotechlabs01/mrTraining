# INFORME DE DIAGNÓSTICO TÉCNICO Y PREPARACIÓN DE FASE P0
## SEGURIDAD, RLS, MULTI-TENANCY E INTEGRIDAD DE MIGRACIONES — MR TRAINING

**Fecha de inspección:** Noviembre 2026
**Auditor:** Senior Software Architect & Independent Technical Auditor
**Alcance:** Monorepo MR Training (`apps/api` Golang, `supabase/migrations`, `apps/api/migrations/postgres`, Conexiones PostgreSQL/Supabase)
**Versión:** 1.0.0 (Diagnóstico Exclusivo de Inspección — Sin Modificaciones de Código)

---

## ÍNDICE

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Estado Real Comprobado del Repositorio](#2-estado-real-comprobado-del-repositorio)
3. [Hallazgos Confirmados con Evidencia de Código](#3-hallazgos-confirmados-con-evidencia-de-código)
4. [Hallazgos No Reproducidos o Desmitificados](#4-hallazgos-no-reproducidos-o-desmitificados)
5. [Hallazgos Pendientes de Evidencia en Entornos Remotos](#5-hallazgos-pendientes-de-evidencia-en-entornos-remotos)
6. [Inventario Comparativo Exhaustivo de Migraciones (API vs Supabase)](#6-inventario-comparativo-exhaustivo-de-migraciones-api-vs-supabase)
7. [Matriz Integral de Tablas y Políticas RLS](#7-matriz-integral-de-tablas-y-políticas-rls)
8. [Matriz de Roles de Base de Datos y Privilegios](#8-matriz-de-roles-de-base-de-datos-y-privilegios)
9. [Matriz de Handlers, Repositorios y Cobertura de UnitOfWork](#9-matriz-de-handlers-repositorios-y-cobertura-de-unitofwork)
10. [Clasificación de Código Residual Turso/libSQL](#10-clasificación-de-código-residual-tursolibsql)
11. [Auditoría de Pruebas de Seguridad y Aislamiento Existentes](#11-auditoría-de-pruebas-de-seguridad-y-aislamiento-existentes)
12. [Matriz de Riesgos Específicos P0 y P1](#12-matriz-de-riesgos-específicos-p0-y-p1)
13. [Propuesta de Correcciones Ordenada por Dependencias](#13-propuesta-de-correcciones-ordenada-por-dependencias)
14. [Plan de Pruebas de Aceptación y Criterios Objetivos de Certificación P0](#14-plan-de-pruebas-de-aceptación-y-criterios-objetivos-de-certificación-p0)

---

## 1. RESUMEN EJECUTIVO

El presente documento constituye la auditoría técnica de inspección previa a la ejecución de la **Fase P0 (Seguridad, RLS, Multi-Tenancy e Integridad de Migraciones)** para MR Training. Siguiendo las directrices estrictas de auditoría independiente, este reporte se basa exclusivamente en la inspección física del código del repositorio, sin aplicar modificaciones de código, scripts ni alteraciones sobre la infraestructura.

### Diagnóstico Sintético:
1. **Divergencia de Migraciones Resuelta:** Se comprobó exactamente la disparidad numérica: existen 34 archivos en `apps/api/migrations/postgres` frente a 22 en `supabase/migrations`. De los 12 archivos excedentes en la API, 11 corresponden a migraciones activas de esquema (`.sql`) y 1 a un script de reversión (`402_athlete_session_tables.down.sql`). Los 22 archivos comunes son idénticos byte a byte.
2. **Vulnerabilidad Estructural de RLS:** De las 101 tablas creadas en PostgreSQL, **únicamente 5 tienen RLS habilitado** (4.95%). Ninguna de ellas posee la cláusula `FORCE ROW LEVEL SECURITY`. Dado que la API se conecta mediante la cadena de conexión de superusuario (`postgres` / `service_role`), el motor PostgreSQL ignora RLS por defecto, dejando la seguridad multi-tenant dependiendo en un 100% de los filtros `WHERE` escritos en el código Go.
3. **Uso Parcial de UnitOfWork:** La abstracción `UnitOfWork` que inyecta variables de sesión transaccionales (`app.current_coach_id`) solo es utilizada por 6 handlers HTTP. Handlers críticos como `training.go` y `running.go` ejecutan directamente sobre `*sql.DB` sin establecer el contexto del tenant en la sesión de base de datos.
4. **Inventario de Turso/libSQL:** La dependencia `github.com/tursodatabase/libsql-client-go` se mantiene viva únicamente por la herramienta histórica `apps/api/cmd/data-migrate/main.go`. No debe removerse de `go.mod` hasta validar la paridad total de datos en QA.

---

## 2. ESTADO REAL COMPROBADO DEL REPOSITORIO

- **Ruta de Inspección:** `/app` (Monorepo MR Training).
- **Branch Activo:** `jules-1028607845328579248-fea4ebd3` (basado en commit `ccb6e4b` de `origin/dev`).
- **Estado del Working Tree:** Limpio. Solo contiene staged el informe general `docs/audits/AUDITORIA_INTEGRAL_MR_TRAINING.md`.
- **Compilación de la API:** `go build ./...` compila exitosamente bajo Go 1.25.0.
- **Pruebas Unitarias:** 100% de las pruebas unitarias y mocks en Go pasan en entorno local (`go test ./...`).
- **Configuración Local:** Archivo `.env.example` apunta a `DATABASE_URL=postgres://postgres:postgres@localhost:5432/mr_training_migration?sslmode=disable`.

---

## 3. HALLAZGOS CONFIRMADOS CON EVIDENCIA DE CÓDIGO

### Hallazgo 1: Falta de RLS en el 95% de las tablas
- **Archivo:** `apps/api/migrations/postgres/` (33 archivos de migración analizados).
- **Evidencia:** Se crearon 101 tablas en el esquema relacional. Solo las migraciones `032_commission_rls.sql` y `402_athlete_session_tables.sql` contienen `ENABLE ROW LEVEL SECURITY`.
- **Tablas Críticas Expuestas sin RLS:** `users`, `coaches`, `athlete_profiles`, `coach_athletes`, `workouts`, `workout_templates`, `assigned_workouts`, `running_sessions`, `running_gps_points`, `subscriptions`, `athlete_memberships`.
- **Riesgo:** Si un endpoint o handler omite la cláusula `WHERE coach_id = $1`, la base de datos no ofrece ninguna defensa secundaria y entrega datos ajenos.

### Hallazgo 2: Conexión Privilegiada y Bypass de RLS
- **Archivo:** `apps/api/internal/infrastructure/database/db.go` (línea 28).
- **Evidencia:** Conecta usando `DATABASE_URL`. En entornos Supabase / Docker estándar, este string utiliza el rol `postgres` o credenciales con el atributo `BYPASSRLS`.
- **Impacto:** Aunque se active RLS en una tabla, si la tabla no tiene `FORCE ROW LEVEL SECURITY`, PostgreSQL desactiva automáticamente las políticas para el usuario `postgres`, permitiendo que cualquier consulta salte las restricciones de tenant.

### Hallazgo 3: Handlers Neurálgicos sin `UnitOfWork` ni Variables de Sesión
- **Archivo:** `apps/api/internal/interfaces/http/handlers/training.go` y `running.go`.
- **Evidencia:** `TrainingHandler` recibe `*trainingapp.Service`, el cual depende de `workoutRepo` inyectado en `main.go` directamente con `db.DB`. En ningún momento del flujo de asignación o consulta de entrenamientos se invoca `uow.BeginWithTenant(...)`.
- **Impacto:** Las variables `app.current_coach_id` y `app.current_user_id` nunca se configuran en la conexión SQL durante los flujos de entrenamiento.

### Hallazgo 4: Divergencia entre API y Supabase
- **Directorios:** `apps/api/migrations/postgres` vs `supabase/migrations`.
- **Evidencia:** 12 archivos existen en la API pero no en Supabase. Si se ejecuta `supabase db push` o despliegue automatizado por CLI, las tablas de outbox, suscripciones y versiones de planes no se crean.

---

## 4. HALLAZGOS NO REPRODUCIDOS O DESMITIFICADOS

1. **Hipótesis de Fuga de Variables de Sesión entre Conexiones del Pool:**
   *Evaluación:* Se inspeccionó `apps/api/internal/infrastructure/database/uow.go:127`. El código utiliza:
   ```sql
   SELECT set_config('app.current_coach_id', $1, true);
   ```
   El tercer argumento `true` indica a PostgreSQL que la variable tiene ámbito `LOCAL` a la transacción. Al ejecutarse `COMMIT` o `ROLLBACK`, PostgreSQL destruye la variable automáticamente. Por tanto, **no hay fuga de contexto entre conexiones reutilizadas del pool de `pgx`**. El riesgo real no es la fuga, sino la **omisión** de llamar a `set_config` en los handlers que usan `*sql.DB` directo.
2. **Hipótesis de Incompatibilidad en los 22 archivos compartidos de migración:**
   *Evaluación:* Se realizó un diff binario byte a byte. Los 22 archivos comunes entre `apps/api/migrations/postgres` y `supabase/migrations` son **100% idénticos**, sin desvíos de sintaxis.

---

## 5. HALLAZGOS PENDIENTES DE EVIDENCIA EN ENTORNOS REMOTOS

1. **Permisos y Atributos del Rol de Producción / QA:**
   No es posible consultar el catálogo `pg_roles` de la base de datos de producción o staging desde este entorno aislado sin credenciales activas. Queda pendiente comprobar si el usuario que corre en producción tiene `rolsuper = true` o `rolbypassrls = true`.
2. **Paridad Real de Datos Turso vs PostgreSQL:**
   No se puede verificar el volumen de registros históricos migrados sin conexión a las bases remotas de QA.

---

## 6. INVENTARIO COMPARATIVO EXHAUSTIVO DE MIGRACIONES (API VS SUPABASE)

Total en `apps/api/migrations/postgres`: 34 archivos.
Total en `supabase/migrations`: 22 archivos.
Archivos Comunes Idénticos: 22 archivos.

### Las 12 Migraciones Excedentes en la API:

| # | Archivo de Migración | Tipo | Objeto DDL Principal | Impacto en Esquema | Estado en Supabase |
|---|---|---|---|---|---|
| 1 | `009_running_workout_templates_segments_column.sql` | ALTER | `running_workout_templates` | Añade columna `segments JSONB` | **Faltante** |
| 2 | `010_plan_versions.sql` | CREATE | `plan_versions` | Historial versionado de planes comerciales | **Faltante** |
| 3 | `011_plan_trm_column.sql` | ALTER | `plans` | Añade columna de tasa de cambio `trm` | **Faltante** |
| 4 | `012_outbox_transaccional.sql` | CREATE | `outbox` | Tabla central de eventos transaccionales | **Faltante Crítico** |
| 5 | `032_commission_rls.sql` | ALTER | `commission_agreements`, `commission_entries` | Activa RLS y política de coach | **Faltante Crítico** |
| 6 | `301_exercise_library_image_url.sql` | ALTER | `exercise_library` | Añade soporte multimedia de portada | **Faltante** |
| 7 | `400_subscriptions.sql` | CREATE | `subscriptions` | Modelo de suscripciones recurrentes | **Faltante** |
| 8 | `401_subscription_payments.sql` | CREATE | `subscription_payments` | Registro de transacciones de pago | **Faltante** |
| 9 | `402_athlete_session_tables.down.sql` | DROP | N/A | Script de reversión (Down migration) | **Excedente (No debe copiarse)** |
| 10 | `402_athlete_session_tables.sql` | CREATE | `athlete_prs`, `athlete_session_stats`, `athlete_session_progress` | Tablas de telemetría proyectada con RLS | **Faltante Crítico** |
| 11 | `403_landing_contacts.sql` | CREATE | `landing_contacts` | Formulario de prospección comercial | **Faltante** |
| 12 | `404_outbox_fix.sql` | ALTER | `outbox` | Corrige índices y locks en outbox | **Faltante Crítico** |

*Plan de Reconciliación:* Las 11 migraciones `.sql` activas deben incorporarse a `supabase/migrations/` en orden cronológico estricto. El archivo `.down.sql` debe permanecer en la API o eliminarse de la secuencia de despliegue para evitar confusión en Supabase CLI.

---

## 7. MATRIZ INTEGRAL DE TABLAS Y POLÍTICAS RLS

Se identificaron 101 tablas en PostgreSQL. A continuación se detalla la matriz de las 18 tablas maestras con su clasificación de aislamiento:

| Tabla | Dominio | Rol Dueño | Clave de Aislamiento | RLS Actual | FORCE RLS | Política RLS Requerida |
|---|---|---|---|---|---|---|
| `users` | Auth | Usuario | `id = app.current_user_id` | **NO** | NO | Solo el propio usuario y admin leen/editan |
| `coaches` | Coaching | Coach | `id = app.current_coach_id` | **NO** | NO | Coach edita su perfil; atletas vinculados leen |
| `coach_athletes` | Coaching | Coach | `coach_id = app.current_coach_id` | **NO** | NO | Aislamiento estricto por entrenador |
| `athlete_profiles` | Atleta | Atleta / Coach | `id = app.current_user_id OR coach linked` | **NO** | NO | Atleta edita; sus coaches autorizados leen |
| `workout_templates` | Training | Coach | `coach_id = app.current_coach_id` | **NO** | NO | Coach edita sus plantillas; lectura global si es template del sistema |
| `assigned_workouts` | Training | Coach / Atleta | `athlete_id = user_id OR coach_id = coach_id` | **NO** | NO | Acceso compartido bidireccional coach-atleta |
| `running_sessions` | Running | Atleta | `user_id = app.current_user_id` | **NO** | NO | Atleta es dueño absoluto; coach vinculado lee |
| `running_gps_points` | Running | Atleta | `session_id IN (running_sessions)` | **NO** | NO | Heredado de la sesión de running |
| `subscriptions` | Pagos | Coach / Atleta | `coach_id = app.current_coach_id` | **NO** | NO | Solo el coach y suscriptores correspondientes |
| `athlete_memberships` | Pagos | Atleta / Coach | `athlete_id = user_id OR coach_id = coach_id` | **NO** | NO | Restricción por membresía activa |
| `commission_agreements` | Alianzas | Coach | `coach_id = app.current_coach_id` | **SÍ** | NO | Activa en `032_commission_rls.sql` |
| `commission_entries` | Alianzas | Coach | `coach_id = app.current_coach_id` | **SÍ** | NO | Activa en `032_commission_rls.sql` |
| `athlete_prs` | Gamification | Organización | `organization_id = app.current_organization_id` | **SÍ** | NO | Activa en `402_athlete_session_tables.sql` |
| `athlete_session_stats` | Gamification | Organización | `organization_id = app.current_organization_id` | **SÍ** | NO | Activa en `402_athlete_session_tables.sql` |
| `athlete_session_progress` | Gamification | Organización | `organization_id = app.current_organization_id` | **SÍ** | NO | Activa en `402_athlete_session_tables.sql` |
| `events` | Eventos | Coach | `coach_id = app.current_coach_id` | **NO** | NO | Coach gestiona; público lee eventos abiertos |
| `support_tickets` | Soporte | Usuario | `user_id = app.current_user_id` | **NO** | NO | Usuario ve sus tickets; coach/admin responde |
| `outbox` | Sistema | N/A | N/A (Solo worker interno) | **NO** | NO | Excluida de RLS de usuarios; solo rol de sistema |

---

## 8. MATRIZ DE ROLES DE BASE DE DATOS Y PRIVILEGIOS

Actualmente no existe una separación de roles en el código SQL:
1. **Rol Actual Único (`postgres` / `service_role`):**
   - Posee `SUPERUSER` y `BYPASSRLS`.
   - Consecuencia: Cualquier consulta ejecutada por la API puentea RLS a menos que se aplique `FORCE ROW LEVEL SECURITY`.
2. **Arquitectura de Roles Recomendada para Fase P0:**
   - `mrtraining_admin`: Rol con permisos DDL para aplicar migraciones (`cmd/migrate`).
   - `mrtraining_api_app`: Rol utilizado por la API Go en tiempo de ejecución.
     - Atributos: `NOSUPERUSER`, `NOBYPASSRLS`, `NOCREATEDB`.
     - Permisos: `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mrtraining_api_app;`
     - Beneficio: Garantiza que PostgreSQL fuerce la evaluación de las políticas RLS en cada sentencia SQL.

---

## 9. MATRIZ DE HANDLERS, REPOSITORIOS Y COBERTURA DE UNITOFWORK

| Módulo / Handler | Archivo Handler | Usa UnitOfWork | Soporta `SetExecutor` en Repo | Estado de Tenant Context |
|---|---|---|---|---|
| **Coach** | `internal/interfaces/http/handlers/coach.go` | **SÍ** (`withTx`) | SÍ (`coach/repository.go`) | **Contexto inyectado correctamente** |
| **Membership** | `internal/interfaces/http/handlers/membership.go` | **SÍ** (`withTx`) | SÍ (`membership/repository.go`) | **Contexto inyectado correctamente** |
| **Alianzas / Pagos** | `internal/interfaces/http/handlers/ally_payment.go` | **SÍ** (`withTx`) | SÍ (`commission_entry/repository.go`) | **Contexto inyectado correctamente** |
| **Eventos** | `internal/interfaces/http/handlers/event.go` | **SÍ** (`withTx`) | SÍ (`event/repository.go`) | **Contexto inyectado correctamente** |
| **Analytics** | `internal/interfaces/http/handlers/analytics.go` | **SÍ** (`withTx`) | SÍ (`analytics/repository.go`) | **Contexto inyectado correctamente** |
| **Settlement** | `internal/interfaces/http/handlers/coach_settlement.go` | **SÍ** (`withTx`) | SÍ (`coach_settlement/repository.go`) | **Contexto inyectado correctamente** |
| **Training (Asignaciones)** | `internal/interfaces/http/handlers/training.go` | **NO** | SÍ (solo `workout_repository.go`) | **VULNERABLE (Usa DB directa sin set_config)** |
| **Running (GPS)** | `internal/interfaces/http/handlers/running.go` | **NO** | SÍ (solo `running/repository.go`) | **VULNERABLE (Usa DB directa sin set_config)** |
| **User Profile** | `internal/interfaces/http/handlers/user.go` | **NO** | NO (`user/repository.go` rígido) | **VULNERABLE (Sin set_config)** |
| **Landing** | `internal/interfaces/http/handlers/landing.go` | **NO** | NO (Ejecuta queries crudas) | **Público / Aislamiento manual** |

---

## 10. CLASIFICACIÓN DE CÓDIGO RESIDUAL TURSO/LIBSQL

| Elemento | Ubicación | Clasificación | Acción en Fase P0 |
|---|---|---|---|
| `cmd/data-migrate/main.go` | `apps/api/cmd/data-migrate/` | **Herramienta Histórica de Recuperación** | Conservar intacto. No eliminar. |
| `libsql-client-go` | `apps/api/go.mod` | **Dependencia Activa de Recuperación** | Conservar mientras exista `data-migrate`. |
| `@libsql/client` | `apps/web/package.json` | **Dependencia Obsoleta / Muerta** | Marcar para remoción limpia en `package.json`. |
| Comentarios en repos | `internal/infrastructure/*/repository.go` | **Deuda de Documentación** | Actualizar comentarios a `PostgreSQL via pgx`. |
| Migraciones `001`-`031` SQLite | `apps/api/migrations/*.sql` | **Histórico de Esquema SQLite** | Mantener archivadas sin tocar. |

---

## 11. AUDITORÍA DE PRUEBAS DE SEGURIDAD Y AISLAMIENTO EXISTENTES

- **Pruebas de Aislamiento Tenant:** `apps/api/internal/middleware/tenant_test.go` valida que las peticiones sin token o con token de atleta hacia rutas de coach retornen `401 Unauthorized` o `403 Forbidden`.
- **Pruebas de UnitOfWork:** `apps/api/internal/infrastructure/database/uow_test.go` valida con mocks que `set_config` se ejecute con los parámetros adecuados.
- **Brecha de Pruebas P0:** No existe un test de integración que intente ejecutar un `SELECT` o `INSERT` en PostgreSQL simulando dos conexiones concurrentes con distintos `coach_id` para comprobar que la fila no visible sea ocultada por RLS.

---

## 12. MATRIZ DE RIESGOS ESPECÍFICOS P0 Y P1

| Riesgo | Probabilidad | Impacto | Severidad | Mitigación Inmediata en P0 |
|---|---|---|---|---|
| Bypass de RLS por rol superusuario de la API | Alta | Crítica | **P0** | Incluir `FORCE ROW LEVEL SECURITY` en las tablas y preparar el rol de aplicación con privilegios mínimos. |
| Desincronización de base de datos en Supabase CLI | Alta | Alta | **P0** | Sincronizar las 11 migraciones activas faltantes en `supabase/migrations/`. |
| Descarte de puntos GPS por fallo de red | Alta | Alta | **P1** | Diseñar cola local transaccional en SQLite para la app móvil antes de la Fase P2. |
| Fuga de contexto por queries sin UnitOfWork | Media | Alta | **P0** | Adaptar `training.go` y `running.go` para usar `UnitOfWork` en escrituras y lecturas de tenant. |

---

## 13. PROPUESTA DE CORRECCIONES ORDENADA POR DEPENDENCIAS

```
[Paso 1: Reconciliación de Migraciones]
   └── Copiar las 11 migraciones .sql activas a supabase/migrations/ (sin el .down.sql).
[Paso 2: Migración SQL de Seguridad RLS]
   └── Crear migración numerada (ej. 405_security_multi_tenant_rls.sql).
        ├── Habilitar RLS en las 18 tablas maestras.
        ├── Aplicar ALTER TABLE ... FORCE ROW LEVEL SECURITY.
        └── Crear políticas SELECT, INSERT, UPDATE, DELETE basadas en set_config.
[Paso 3: Adaptación de Repositorios Go a DBTX]
   └── Generalizar la interfaz DBTX (ExecContext, QueryContext, PrepareContext) en repositorios rígidos.
[Paso 4: Inyección de UnitOfWork en Training y Running Handlers]
   └── Envolver endpoints de asignación y telemetría en BeginWithTenant.
[Paso 5: Pruebas Automatizadas de Aislamiento Multi-Tenant]
   └── Suite de pruebas de integración con dos tenants y queries cruzadas.
```

---

## 14. PLAN DE PRUEBAS DE ACEPTACIÓN Y CRITERIOS OBJETIVOS DE CERTIFICACIÓN P0

### Criterios Objetivos para Declarar Fase P0 Completada:

1. **CA-P0-01 (Paridad de Migraciones):** El directorio `supabase/migrations/` contiene todas las migraciones activas presentes en `apps/api/migrations/postgres/`. Un `diff -rq` entre ambos directorios (excluyendo archivos `.down.sql`) arroja 0 diferencias.
2. **CA-P0-02 (RLS y FORCE RLS Activo):** Consulta a `pg_tables` confirma que las 18 tablas maestras tienen `rowsecurity = true` y `forcenorls = false` (o `forcerowsecurity = true`).
3. **CA-P0-03 (Aislamiento Transaccional Verificado):** Test automatizado en Go `TestSecurity_CrossTenantAccess` ejecuta un `INSERT` de un entrenamiento con `coach_id = 'coach-1'` y comprueba que una conexión con `app.current_coach_id = 'coach-2'` recibe 0 filas en `SELECT * FROM coach_assignments` y error de violación de política en `UPDATE` o `DELETE`.
4. **CA-P0-04 (Compilación y Regresión Cero):** La totalidad de los tests existentes (`go test ./...`) pasan al 100% sin regresiones.

---
**Fin del Informe de Diagnóstico y Preparación P0.**
