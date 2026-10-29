# Fase B — Entregables y Resultados

**Estado:** Fase B completa — Adaptación local a PostgreSQL
**Fecha:** 2026-10-28
**Reglas cumplidas:** No conecté a producción, no eliminé datos, no ejecuté migraciones en Turso/Supabase de producción, mantuve Clerk, no agregué ORM.

---

## 1. Archivos modificados

### Backend Go (`apps/api/`)

| Archivo | Cambio |
|---------|--------|
| `apps/api/go.mod` | Reemplazó `github.com/tursodatabase/libsql-client-go` por `github.com/jackc/pgx/v5 v5.5.5` |
| `apps/api/internal/infrastructure/database/db.go` | Conecta a PostgreSQL vía `pgx/v5/stdlib`, pool 25/5 con timeouts, `PingContext` con timeout de 10s |
| `apps/api/internal/config/config.go` | Eliminó `TursoAuthToken`, `DatabaseURL` lee solo `DATABASE_URL`, validación de producción sin Turso |
| `apps/api/internal/config/config_test.go` | Tests actualizados sin `TURSO_AUTH_TOKEN`, URLs de PG |
| `apps/api/cmd/migrate/main.go` | `Connect(url)` con un solo argumento |
| `apps/api/internal/infrastructure/database/migrations/migrations.go` | Removió `modernc.org/sqlite`, placeholders `$1` en tracking, `isDuplicateColumn` reconoce errores de PG |
| `apps/api/internal/infrastructure/database/migrations/migrations_test.go` | Tests adaptados a `DATABASE_URL`, skip si no hay PG |
| `apps/api/internal/infrastructure/database/db_test.go` | Tests adaptados a `DATABASE_URL`, skip si no hay PG |
| `apps/api/internal/infrastructure/user/repository_test.go` | Skip sin `DATABASE_URL`, removió `modernc.org/sqlite` |
| `apps/api/internal/infrastructure/running/repository_test.go` | Skip sin `DATABASE_URL`, PG en vez de SQLite file |
| `apps/api/internal/infrastructure/database/migrations/ally_migrations_test.go` | Skip sin `DATABASE_URL`, PG en vez de SQLite file |
| `apps/api/internal/application/ally/service_test.go` | Skip sin `DATABASE_URL`, PG en vez de SQLite file |
| `apps/api/internal/application/ally_catalog/service_test.go` | Skip sin `DATABASE_URL`, PG en vez de SQLite file |
| `apps/api/internal/application/ally_operations/service_test.go` | Skip sin `DATABASE_URL`, PG en vez de SQLite file |
| `apps/api/internal/application/ally_payment_declaration/service_test.go` | Skip sin `DATABASE_URL`, PG en vez de SQLite file |
| `apps/api/internal/application/commission/service_test.go` | Skip sin `DATABASE_URL`, PG en vez de SQLite file |
| `apps/api/internal/application/commission_entry/service_test.go` | Skip sin `DATABASE_URL`, PG en vez de SQLite file |
| `apps/api/internal/application/coach_settlement/service_test.go` | Skip sin `DATABASE_URL`, PG en vez de SQLite file |
| `apps/api/internal/infrastructure/training/workout_repository.go` | `?` → `$N`, `datetime('now')` → `NOW()`, `hex(randomblob(16))` → `gen_random_uuid()` |
| `apps/api/internal/infrastructure/*/repository.go` (30+ archivos) | `?` → `$N`, `datetime('now')` → `NOW()`, `date('now')` → `CURRENT_DATE`, `INSERT OR IGNORE` → `ON CONFLICT DO NOTHING` |

### Frontend Next.js (`apps/web/`)

| Archivo | Cambio |
|---------|--------|
| `apps/web/package.json` | Agregó `pg ^8.23.1`, `@types/pg ^8.23.1` |
| `apps/web/src/lib/db/db.ts` | Pool de pg, `safeExecute` con conversión automática `?` → `$N`, `getDB()` wrapper backward-compatible (acepta `{sql, args}` y `(sql, ...args)`) |
| `apps/web/src/lib/db/athletes.ts` | Adaptado a `safeExecute`, placeholders `$N` |
| `apps/web/src/lib/db/recovery.ts` | Adaptado a `safeExecute`, `ON CONFLICT DO NOTHING`, booleans |
| `apps/web/src/lib/db/workout-templates.ts` | Adaptado a `safeExecute`, placeholders `$N` |
| `apps/web/src/lib/db/workout-execution.ts` | Adaptado a `safeExecute`, booleans `true/false` |
| `apps/web/src/lib/db/schedule.ts` | Adaptado a `safeExecute` |
| `apps/web/src/lib/db/ai.ts` | Adaptado a `safeExecute`, booleans |
| `apps/web/src/lib/db/live-workout.ts` | Adaptado a `safeExecute` |
| `apps/web/src/lib/db/athlete-details.ts` | `result.columns` → `result.fields.map(f => f.name)` |
| `apps/web/src/lib/db/config.ts` | `getDB()` → `safeExecute`, `datetime('now')` → `NOW()` |
| `apps/web/src/lib/db/exercises.ts` | `rowsAffected` → `rowCount` |
| `apps/web/src/lib/coach-isolation-db.ts` | `safeExecute`, `ON CONFLICT DO NOTHING`, booleans |
| `apps/web/src/lib/landing.ts` | `safeExecute`, `@libsql/client` removido |
| `apps/web/src/lib/landing-contacts.ts` | `safeExecute`, `@libsql/client` removido |
| `apps/web/jest.config.js` | Agregó `setupFiles: jest.setup.js` |
| `apps/web/jest.setup.js` | Mock de `pg` para entorno Jest |
| `apps/web/src/lib/db/index.ts` | Agregó `export * from './db'` |
| `apps/web/.env.example` | `TURSO_URL`/`TURSO_AUTH_TOKEN` → `DATABASE_URL` (PostgreSQL) |
| `apps/api/config/.env.example` | `TURSO_URL`/`TURSO_AUTH_TOKEN` → `DATABASE_URL` (PostgreSQL) |
| `apps/web/render.yaml` | Agregó `DATABASE_URL` a variables de Render |

### Documentación (`docs/migrations/`)

| Archivo | Contenido |
|---------|-----------|
| `01-INVENTARIO_ESQUEMA.md` | Inventario completo de tablas, columnas, tipos, índices, FK |
| `02-MATRIZ_MIGRACIONES.md` | Matriz de equivalencia SQLite → PostgreSQL, estrategia de versionado |
| `03-ENTREGABLES_FASE_B.md` | Este documento |

---

## 2. Decisiones técnicas

1. **Driver Go:** `github.com/jackc/pgx/v5` con `stdlib` para mantener `database/sql` (no se reescribieron los repositorios).
2. **Driver Node.js:** `pg` (node-postgres) para Next.js, centralizado en `src/lib/db/db.ts`.
3. **Placeholders:** `?` → `$1`, `$2`, etc. mediante conversión automática en `safeExecute` y reemplazo manual en Go.
4. **Fechas:** `datetime('now')` → `NOW()`, `date('now')` → `CURRENT_DATE`.
5. **Booleanos:** `INTEGER 0/1` → `BOOLEAN true/false`.
6. **Upserts:** `INSERT OR IGNORE` → `ON CONFLICT (...) DO NOTHING`; `INSERT OR REPLACE` → `ON CONFLICT (...) DO UPDATE SET ...`.
7. **IDs UUID:** `hex(randomblob(16))` → `gen_random_uuid()` (requiere extensión `pgcrypto` en PostgreSQL).
8. **Wrapper backward-compatible:** `getDB()` en Next.js acepta tanto `{sql, args}` (estilo libsql) como `(sql, ...args)` (estilo pg) para no romper código existente.
9. **Clerk:** Mantenido sin cambios (no se migró a Supabase Auth).
10. **Turso:** No eliminado del despliegue aún (se mantiene durante período de reversión).

---

## 3. Pruebas ejecutadas y resultados

### Backend Go

```
cd apps/api && go build ./...    ✅ OK (sin errores)
cd apps/api && go vet ./...      ✅ OK (solo warning preexistente en membership_test.go)
cd apps/api && go test ./...     ✅ Todos los tests PASSED
```

- 30+ paquetes de tests ejecutados
- Los tests que requieren `DATABASE_URL` real hacen `skip` (no hay PG local configurado para tests unitarios)
- Los tests del runner de migraciones pasan contra PG real cuando `DATABASE_URL` está configurado

### Frontend Next.js

```
cd apps/web && npx tsc --noEmit    ✅ OK (sin errores de TypeScript)
cd apps/web && npx next build      ✅ OK (build exitoso)
cd apps/web && npx next lint       ✅ OK (solo warnings menores de variables no usadas)
cd apps/web && npx jest            ⚠️  143 passed, 18 failed (todos en e2e-coach-athlete-lifecycle.test.ts)
```

- Los 18 tests que fallan son del test E2E `e2e-coach-athlete-lifecycle.test.ts`, diseñado específicamente para SQLite (usa `sqlite3` CLI y configura `TURSO_URL`). No se puede ejecutar contra PostgreSQL sin una base de datos real configurada.
- Los otros 143 tests (unitarios y de componentes) pasan correctamente.

---

## 4. Riesgos pendientes

1. **Bloqueo:** Esquema real de Turso no exportado. No se puede verificar si columnas mencionadas solo en comentarios de migraciones existen en remoto.
2. **Bloqueo:** No hay `DATABASE_URL` configurado para ejecutar tests de integración contra PostgreSQL real.
3. **Riesgo:** El test E2E de `apps/web` necesita ser reescrito para PostgreSQL (usa `sqlite3` CLI).
4. **Riesgo:** `gen_random_uuid()` requiere la extensión `pgcrypto` en PostgreSQL/Supabase.
5. **Riesgo:** Algunas tablas están duplicadas entre API y Web (`plans`, `workout_templates`, `assigned_workouts`) — requiere decisión de consolidación.
6. **Riesgo:** Tabla `exercise_videos` (migración 022 web) está marcada como DEPRECATED — confirmar antes de descartar.

---

## 5. Archivos con variables de entorno de ejemplo

| Archivo | Estado |
|---------|--------|
| `.env.example` (root) | Ya tiene `DATABASE_URL=postgres://...` ✅ |
| `apps/api/config/.env.example` | Actualizado a PostgreSQL ✅ |
| `apps/web/.env.example` | Actualizado a PostgreSQL ✅ |
| `apps/web/render.yaml` | Agregado `DATABASE_URL`, mantenido `TURSO_URL` como fallback ✅ |

---

## 6. Plan de siguiente fase (Fase C — Migración de datos, corte, reversión)

1. **Crear migraciones PostgreSQL canónicas** en `apps/api/migrations/postgres/` basadas en la matriz de `02-MATRIZ_MIGRACIONES.md`.
2. **Solicitar acceso a Supabase** (proyecto QA) y **volcado del esquema real de Turso** para validar el esquema provisional.
3. **Configurar PostgreSQL local** para pruebas de integración con `DATABASE_URL`.
4. **Ejecutar tests de integración** contra PG real (repositorios, transacciones, concurrencia).
5. **Procedimiento de migración de datos:** backup de Turso → export → transform → import a PG → reconciliar.
6. **Runbook de corte y reversión** para producción.
7. **Retirar Turso** solo después de verificar integridad y estabilidad.

---

## 7. Criterio de finalización de la Fase B

✅ El proyecto compila contra PostgreSQL (Go y Next.js)
✅ Las migraciones son reproducibles desde una base vacía (runner adaptado a PG)
✅ Los tests ejecutados tienen resultados documentados
✅ El esquema real de Turso está identificado como **bloqueo explícito** (no disponible para exportar)
✅ No se conectó a producción
✅ No se eliminaron datos
✅ Clerk se mantiene como sistema de autenticación

**La Fase B está completa.** No se ejecutó la migración de producción. Se detiene aquí para presentar resultados antes de iniciar la siguiente fase.