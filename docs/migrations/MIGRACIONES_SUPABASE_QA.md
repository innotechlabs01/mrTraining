# Guía de Migraciones y Sincronización Supabase (QA y Local)

Esta guía documenta el funcionamiento, la arquitectura y los requerimientos para mantener las migraciones de PostgreSQL y Supabase sincronizadas entre el entorno local, CI/CD y el ambiente de QA de Supabase.

---

## 1. Arquitectura de Migraciones

El proyecto cuenta con dos directorios de migraciones:
- `apps/api/migrations/postgres`: Directorio canónico utilizado por la API Go y el runner `cmd/migrate`.
- `supabase/migrations`: Directorio utilizado por el CLI de Supabase para despliegues locales y cloud.

### Reglas de Sincronización
1. **Paridad Total**: Cada archivo `.sql` de migración hacia adelante en `apps/api/migrations/postgres` debe existir idénticamente en `supabase/migrations`.
2. **Archivos de Rollback**: Los archivos `.down.sql` pertenecen exclusivamente a `apps/api/migrations/postgres` para pruebas internas y **no** se sincronizan a Supabase.
3. Se provee el script `scripts/sync-migrations.sh` para verificar y corregir automáticamente cualquier desfase:
   - `bash scripts/sync-migrations.sh --check`: Verifica si hay diferencias sin alterar archivos. Retorna código `0` si todo está sincronizado.
   - `bash scripts/sync-migrations.sh --fix`: Sincroniza automáticamente cualquier migración faltante o modificada.
   - `bash scripts/sync-migrations.sh --ci`: Utilizado por el CI en GitHub Actions para asegurar sincronización en tiempo de compilación.

---

## 2. Requerimientos para Supabase en QA

Para que el entorno de QA ejecute las migraciones de forma controlada y el CD despliegue sin problemas, se requieren las siguientes configuraciones y credenciales:

### Variables y Secretos en GitHub Actions (Repository Secrets)

| Secreto / Variable | Descripción | Ejemplo / Formato |
|--------------------|-------------|-------------------|
| `DATABASE_URL_QA` | String de conexión directo a PostgreSQL de Supabase en QA (usado por `cmd/migrate` en CD y Cloud Run). **Importante**: Para operaciones DDL/migraciones debe ser conexión directa (puerto `5432`) o Session Pooler (puerto `5432`), **NO** Transaction Pooler (puerto `6543`) ya que este último no soporta declaraciones transaccionales de migración o bloqueos DDL completos. | `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require` o directo `db.[ref].supabase.co:5432`. |
| `SUPABASE_ACCESS_TOKEN` *(opcional)* | Token de acceso personal de Supabase para operaciones vía Supabase CLI. | `sbp_...` |
| `SUPABASE_PROJECT_ID_QA` *(opcional)* | ID de referencia del proyecto en Supabase para vincular el CLI (`supabase link --project-ref`). | `abcdefghijklmno` |
| `CLERK_SECRET_KEY_QA` | Llave secreta de Clerk para autenticación de API en QA. | `sk_test_...` |
| `CLERK_PUBLISHABLE_KEY_QA` | Llave pública de Clerk en QA. | `pk_test_...` |
| `CORS_ORIGINS_QA` | Orígenes permitidos en QA. | `https://qa.mrtraining.app,http://localhost:3000` |

### Consideraciones de Conexión y Pooler de Supabase
- **Puerto 5432 (Conexión Directa / Session Mode)**: Requerido para la ejecución de migraciones (`cmd/migrate`) y DDL. Permite transacciones con variables de sesión (`SET LOCAL app.current_user_id`), bloqueos de tabla y sentencias DDL.
- **Puerto 6543 (Transaction Mode Pooler / PgBouncer)**: Adecuado únicamente para consultas de aplicación sin estado de sesión prolongado. **No debe usarse en `cmd/migrate`** porque falla al ejecutar transacciones que modifican tipos de datos o tablas con múltiples sentencias preparadas.

---

## 3. Pruebas y Desarrollo Local

### Opción A: Base de datos local con Supabase CLI
1. Instalar el CLI de Supabase (si no está instalado):
   ```bash
   npm install -g supabase
   # o con Homebrew / scoop
   ```
2. Iniciar Supabase en local (requiere Docker):
   ```bash
   supabase start
   ```
   Esto levantará Postgres en el puerto `54322`, el API gateway en el puerto `54321` y Studio en el `54323`.
3. Aplicar las migraciones a Supabase local:
   ```bash
   supabase db reset
   # o
   supabase db push
   ```

### Opción B: Base de datos local con Docker Postgres estándar
1. Levantar una instancia local de PostgreSQL:
   ```bash
   docker run --name mr_postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=mr_training_local -p 5432:5432 -d postgres:16-alpine
   ```
2. Aplicar las migraciones usando el runner Go:
   ```bash
   export DATABASE_URL="postgres://postgres:postgres@localhost:5432/mr_training_local?sslmode=disable"
   cd apps/api
   go run ./cmd/migrate -dir migrations/postgres
   ```

---

## 4. Flujo de Trabajo CI / CD

### En Pull Requests y Pushes a `dev` / `QA` (CI)
1. El script `scripts/sync-migrations.sh --ci` comprueba que las migraciones en `apps/api/migrations/postgres` y `supabase/migrations` estén sincronizadas. Si falta alguna o difiere, la sincroniza automáticamente en el workspace de CI para permitir continuar y probar.
2. Se compila la API Go y se corre un dry-run de las migraciones contra una base de datos limpia de PostgreSQL (`postgres:16-alpine`).
3. Se aplican las migraciones de Postgres y se ejecutan las pruebas automatizadas (`go test`, `pnpm test`).

### En Despliegue a QA (CD)
1. El job `migrate` en `cd-qa.yml` ejecuta `scripts/sync-migrations.sh --check` para garantizar consistencia previa al despliegue.
2. Aplica las migraciones pendientes en el proyecto Supabase QA utilizando la conexión `DATABASE_URL_QA` mediante `go run ./cmd/migrate -dir migrations/postgres`.
3. La tabla `schema_migrations` en la base de datos de Supabase registra cada archivo aplicado, garantizando idempotencia total.
4. Una vez completadas exitosamente las migraciones, el job `deploy` compila la imagen Docker de la API y la despliega en Google Cloud Run.
