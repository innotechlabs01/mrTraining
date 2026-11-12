# MR Training — Fase 2: Preparación de Infisical

**Estado:** Listo para revisión y aprobación  
**Fecha:** 2026-11-10  
**Instancia Infisical:** http://127.0.0.1:80 (v0.167.5)  
**Repositorio MR Training:** /Users/frg/Documents/Innotechlabs/Mao_Coaching/mr-training  
**Informe de referencia:** docs/infisical-integration-audit.md (Fase 1, aprobada)

---

## 1. Estado de Infisical

| Componente | Estado | Detalle |
|---|---|---|
| Infisical aplicación | ✅ Saludable | Contenedor `innotech-secrets-infisical`, Up 3 days, healthy |
| Puerto expuesto | ✅ 127.0.0.1:80 | Mapeado a 8080 interno |
| API status | ✅ 200 OK | `GET /api/status` responde correctamente |
| PostgreSQL | ✅ Saludable | `innotech-secrets-postgres`, healthy |
| Redis | ✅ Saludable | `innotech-secrets-redis`, healthy |
| emailConfigured | ❌ false | No hay SMTP configurado |
| inviteOnlySignup | ✅ true | Registro solo por invitación |
| redisConfigured | ✅ true | |
| CLI Infisical | ❌ No instalada | `infisical` no disponible en PATH |

**Nota:** Como `inviteOnlySignup: true` y `emailConfigured: false`, no se puede crear el primer usuario administrador mediante registro automático con correo. Las operaciones de creación de organización, proyecto, entornos y rutas requieren intervención manual a través de la interfaz web de Infisical (`http://127.0.0.1:80`).

---

## 2. Organización y Proyecto

| Elemento | Valor | Origen |
|---|---|---|
| Organización | `InnotechLabs` | Solicitado en Fase 2 |
| Proyecto | `MR Training` | Solicitado en Fase 2 |
| Slug del proyecto | `mr-training` | Sugerido, consistente con el repositorio |

**Acción requerida (manual):** Acceder a `http://127.0.0.1:80`, crear organización `InnotechLabs` y dentro de ella el proyecto `MR Training`. Si la organización o proyecto ya existen, reutilizarlos sin duplicar.

---

## 3. Entornos y Rutas

| Entorno | Ruta | Consumidor | Uso |
|---|---|---|---|
| development | `/api` | Go API (`apps/api`) | Desarrollo local del backend |
| development | `/web` | Next.js (`apps/web`) | Desarrollo local del frontend web |
| development | `/mobile` | Expo/RN (`apps/mobile`) | Desarrollo local de la app móvil |
| development | `/integrations` | Scripts de migración, CI | Scripts de migración de DB |
| qa | `/api` | Go API | Entorno QA |
| qa | `/web` | Next.js | Entorno QA web |
| qa | `/integrations` | Scripts de migración QA | Migración a Supabase QA |
| production | `/api` | Go API | Producción |
| production | `/web` | Next.js | Producción web |
| production | `/mobile` | Expo/RN | Producción móvil |

**Regla de asignación:** Las rutas se asignan según el consumidor real identificado en la Fase 1. Las variables públicas (`NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`) pueden vivir en `/web` y `/mobile`. Los secretos privados viven exclusivamente en `/api` y `/integrations`.

**Acción requerida (manual):** En la interfaz web de Infisical, crear los 3 entornos y las 4 rutas dentro del proyecto `MR Training`.

---

## 4. Permisos e Identidades de Máquina

Se diseñan 3 identidades independientes con mínimo privilegio:

| Identidad | Entornos | Rutas | Propósito |
|---|---|---|---|
| `mr-training-local` | development | /api, /web, /mobile, /integrations | Desarrollo local, pruebas manuales |
| `mr-training-github` | qa, production | /api, /web, /mobile, /integrations | GitHub Actions CI/CD |
| `mr-training-cloud-run` | production | /api, /web | Despliegue en Google Cloud Run |

### Reglas de mínimo privilegio aplicadas

- **No** crear tokens administrativos globales.
- `mr-training-local` **no tiene acceso** a entornos qa ni production.
- `mr-training-github` **no tiene acceso** a entorno development.
- `mr-training-cloud-run` **no tiene acceso** a entornos development ni qa.
- Cada identidad tiene acceso solo a las rutas que necesita para su función.
- **No** entregar acceso de producción a la identidad de desarrollo.
- **No** crear credenciales reales de GitHub todavía (se crearán en Fase 6).

### Método de autenticación para CI/CD

- Evaluar OIDC si la instancia self-hosted lo soporta.
- Alternativa: token de servicio de Infisical almacenado como secreto de GitHub Actions (`INFISICAL_TOKEN`, `INFISICAL_URL`, `INFISICAL_ENV`, `INFISICAL_PATH`).
- Infisical local en `127.0.0.1` **no es accesible desde GitHub Actions**; se usará la instancia self-hosted expuesta de forma segura o el token de servicio contra la instancia remota.

**Acción requerida (manual):** Crear las 3 identidades de máquina en la interfaz web de Infisical y asignar los permisos según la tabla anterior.

---

## 5. Matriz de Migración (sin valores)

| Variable | Entorno | Ruta Infisical | Consumidor | Tipo | Criticidad | Acción requerida |
|---|---|---|---|---|---|---|
| DATABASE_URL | dev/qa/prod | /api | Go API | Privado | Crítica | Migrar primero |
| CLERK_SECRET_KEY | dev/qa/prod | /api | Go API, Next.js webhooks | Privado | Crítica | Migrar primero |
| CLERK_WEBHOOK_SECRET | dev/qa/prod | /api | Go API, Next.js webhooks | Privado | Crítica | Migrar primero |
| CLERK_PUBLISHABLE_KEY | dev/qa/prod | /api | Go API config | Público | Alta | Migrar |
| NATS_URL | dev/qa/prod | /api | Go API | Privado | Media | Migrar |
| REDIS_URL | dev/qa/prod | /api | Go API | Privado | Media | Migrar |
| WOMPI_PRIVATE_KEY | dev/qa/prod | /api | Go API | Privado | Crítica | Solo backend |
| WOMPI_INTEGRITY_SECRET | dev/qa/prod | /api | Go API | Privado | Crítica | Solo backend |
| WOMPI_EVENTS_SECRET | dev/qa/prod | /api | Go API | Privado | Crítica | Solo backend |
| WOMPI_PUBLIC_KEY | dev/qa/prod | /api | Go API | Público | Alta | |
| WOMPI_ENV | dev/qa/prod | /api | Go API | No sensible | Media | |
| WOMPI_WEBHOOK_URL | dev/qa/prod | /api | Go API | Público | Media | |
| S3_ACCESS_KEY | dev | /api | Go API | Privado | Alta | |
| S3_SECRET_KEY | dev | /api | Go API | Privado | Alta | |
| AI_API_KEY | dev | /api | Go API | Privado | Alta | |
| JWT_SECRET | dev | /api | Go API | Privado | Crítica | |
| BLOB_READ_WRITE_TOKEN | dev | /web | Next.js (Vercel Blob) | Privado | Alta | |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | dev/qa/prod | /web, /mobile | Next.js, Expo | Público | Alta | Compartir entre /web y /mobile |
| NEXT_PUBLIC_GO_API_URL | dev/qa/prod | /web, /mobile | Next.js, Expo | Público | Alta | Compartir entre /web y /mobile |
| EXPO_PUBLIC_GO_API_URL | dev | /mobile | Expo | Público | Alta | |
| app.json extra.clerkPublishableKey | dev | /mobile | Expo | Público | Alta | |
| NEXT_PUBLIC_WEB_INVITE_URL | dev | /web | Next.js | Público | Media | |
| NEXT_PUBLIC_APP_SCHEME | dev | /web | Next.js | Público | Baja | |
| NEXT_PUBLIC_EXPO_GO_URL | dev | /web | Next.js | Público | Baja | |
| NEXT_PUBLIC_SUPER_ADMIN_CLERK_IDS | dev | /web | Next.js middleware | Privado | Media | |
| TUNNEL_TOKEN | dev | /mobile | Expo tunnel | Privado | Media | |
| TURSO_DATABASE_URL | dev | /integrations | Scripts de migración | Privado | Crítica | Solo migración |
| TURSO_AUTH_TOKEN | dev | /integrations | Scripts de migración | Privado | Crítica | Solo migración |
| POSTGRES_LOCAL_URL | dev | /integrations | Scripts de migración | Privado | Crítica | Solo migración |
| SUPABASE_QA_DATABASE_URL | qa | /integrations | Scripts de migración QA | Privado | Crítica | Solo QA |
| SUPABASE_ANON_KEY | qa | /integrations | Scripts de migración QA | Privado | Crítica | Solo QA |
| SUPABASE_SERVICE_ROLE | qa | /integrations | Scripts de migración QA | Privado | Crítica | Solo QA |

**Regla de no-duplicación:** Un secreto privado vive en una sola ruta. Las públicas se replican en las rutas de los consumidores.

**Acción requerida:** Esta matriz es para preparación. **No importar secretos reales todavía.**

---

## 6. Exposición Detectada en Git

Se inspeccionó el historial Git de mr-training sin imprimir valores de secretos.

### Archivos identificados con posible exposición

| Archivo | Estado en Git | Tipo de exposición | Commits involucrados |
|---|---|---|---|
| `apps/mobile/app.json` | Trackeado | Clave pública Clerk en `extra.clerkPublishableKey`, `apiBaseUrl`, `goApiUrl` | d81fe5b, 2e76ae0, f5fbe66, 2463747, c9bf5c3, 3597df9, 16b498c, 8836fb8 |
| `apps/api/internal/config/config.go` | Trackeado | Lee `CLERK_SECRET_KEY`, `WOMPI_PRIVATE_KEY` de entorno (no hardcodeado) | Múltiples |
| `apps/api/internal/config/config_test.go` | Trackeado | Referencia `sk_test_` en tests (valores de ejemplo/mock) | 511c19f, b24a632, 0a6b4b1, 508ab68, 196c041, 8648273 |
| `apps/api/internal/middleware/auth_test_helper_test.go` | Trackeado | Referencia `sk_test_` en test helper | 0d19ac8 |
| `apps/api/internal/integration/wompicheckouttest/checkout_test.go` | Trackeado | Referencia `WOMPI_PRIVATE_KEY` en test | 3c6c0bf |
| `apps/api/internal/config/tmp2_test.go`, `tmp_err_test.go` | Trackeado | Referencia `WOMPI_PRIVATE_KEY` en tests temporales | 3c6c0bf |
| `apps/web/.env.example` | Trackeado | Ejemplos de variables (sin valores reales necesariamente) | 32844ec |
| `.env.example` (root) | Trackeado | Ejemplos de variables (sin valores reales necesariamente) | a23a6ed |
| `apps/apps/mobile/ios/.xcode.env`, `.xcode.env.local` | Trackeado | Puede contener secretos de Xcode | a23a6ed, 2665a20, 85a3711 |
| `apps/apps/mobile/android/app/debug.keystore` | Trackeado | Keystore de depuración Android | a23a6ed |
| `e2e/credentials.env.example` | Trackeado | Ejemplo de credenciales e2e | Historial |
| `apps/api/cmd/api/api` | Trackeado | Binario de Go commiteado (no debería estar en Git) | Historial |
| `render.yaml` | Trackeado | Configuración de despliegue Render | babcc33 |

### Archivos con valores reales actualmente en working tree (ignotados por .gitignore)

Estos archivos existen localmente pero están ignorados por `.gitignore` (`*.env*`). **No están trackeados actualmente**, pero pueden haber estado trackeados en commits anteriores antes de agregarse al `.gitignore`:

- `apps/mobile/.env` — Contiene `TUNNEL_TOKEN`, `CLERK_SECRET_KEY`, `CLERK_PUBLISH_KEY`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_GO_API_URL`
- `apps/web/.env.local` — Contiene `BLOB_READ_WRITE_TOKEN`, `VERCEL_OIDC_TOKEN`, `NEXT_PUBLIC_GO_API_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_SUPER_ADMIN_CLERK_IDS`
- `apps/api/config/.env.local` — Contiene `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `DATABASE_URL`, `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`, `ERROR_WEBHOOK_DISCOR`
- `.env.migration` — Contiene `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `POSTGRES_LOCAL_URL`, `SUPABASE_QA_DATABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE`
- `.env.migration.backup-20261028-183650` — Backup del anterior

### Credenciales que deben rotarse (por exposición potencial en Git)

| Proveedor | Variable | Razón | Acción |
|---|---|---|---|
| Clerk | `CLERK_SECRET_KEY` | Aparece en `apps/web/.env.local` y `apps/api/config/.env.local` (historial posible) | Rotar en Clerk, migrar a Infisical |
| Clerk | `CLERK_WEBHOOK_SECRET` | Aparece en `apps/api/config/.env.local` | Rotar en Clerk, migrar a Infisical |
| Wompi | `WOMPI_PRIVATE_KEY` | Aparece en `apps/api/config/.env.local` y tests | Rotar en Wompi, migrar a Infisical |
| Wompi | `WOMPI_INTEGRITY_SECRET` | Aparece en `apps/api/config/.env.local` | Rotar en Wompi, migrar a Infisical |
| Wompi | `WOMPI_EVENTS_SECRET` | Aparece en `apps/api/config/.env.local` | Rotar en Wompi, migrar a Infisical |
| Supabase | `SUPABASE_SERVICE_ROLE` | Aparece en `.env.migration` | Rotar en Supabase, migrar a Infisical |
| Supabase | `SUPABASE_QA_DATABASE_URL` | Aparece en `.env.migration` | Rotar en Supabase, migrar a Infisical |
| Turso | `TURSO_AUTH_TOKEN` | Aparece en `.env.migration` | Rotar en Turso, migrar a Infisical |
| S3/MinIO | `S3_ACCESS_KEY`, `S3_SECRET_KEY` | Aparece en `.env.example` (valores de ejemplo por defecto) | Rotar si se usaron en producción |
| Discord | `ERROR_WEBHOOK_DISCOR` | URL de webhook expuesta en `.env.local` y `.env.qa` | Rotar URL de webhook |
| Vercel | `BLOB_READ_WRITE_TOKEN` | Aparece en `apps/web/.env.local` | Rotar en Vercel |
| Vercel | `VERCEL_OIDC_TOKEN` | Aparece en `apps/web/.env.local` | Rotar en Vercel |

### Riesgos de exposición en ramas y repositorios remotos

- El repositorio tiene múltiples ramas activas (QA, dev, main, feature/*, fix/*, etc.) que pueden contener versiones antiguas de archivos con secretos.
- `apps/mobile/app.json` está trackeado y expone `clerkPublishableKey` (clave pública) y URLs de API.
- `apps/api/cmd/api/api` es un binario commiteado — no debería estar en Git.
- Los archivos `.env.local` y `.env.migration` están ignorados actualmente pero pueden haber sido trackeados antes de agregarse al `.gitignore`.

**Restricción aplicada:** No se ejecutó `git filter-repo`, no se reescribió historial, no se hizo force push, no se eliminaron archivos, no se revocaron ni rotaron credenciales automáticamente.

---

## 7. Plan de Rotación por Proveedor

| Proveedor | Pasos de rotación | Cuándo |
|---|---|---|
| Clerk | 1. Crear nueva clave secreta en Clerk dashboard<br>2. Actualizar en Infisical `/api` y `/web`<br>3. Actualizar aplicaciones locales<br>4. Revocar clave antigua | Fase 3 |
| Wompi | 1. Generar nuevas claves en Wompi dashboard (sandbox primero)<br>2. Actualizar en Infisical `/api`<br>3. Probar en development<br>4. Revocar claves antiguas | Fase 3 |
| Supabase | 1. Rotar `SUPABASE_SERVICE_ROLE` y `SUPABASE_QA_DATABASE_URL`<br>2. Actualizar en Infisical `/integrations`<br>3. Validar conexión QA | Fase 3 |
| Turso | 1. Rotar `TURSO_AUTH_TOKEN`<br>2. Actualizar en Infisical `/integrations`<br>3. Validar migración local | Fase 3 |
| Discord | 1. Crear nuevo webhook en Discord<br>2. Actualizar en Infisical `/api`<br>3. Revocar webhook antiguo | Fase 3 |
| Vercel | 1. Rotar `BLOB_READ_WRITE_TOKEN` y `VERCEL_OIDC_TOKEN`<br>2. Actualizar en Infisical `/web`<br>3. Validar despliegue | Fase 5 |
| S3/MinIO | 1. Rotar `S3_ACCESS_KEY` y `S3_SECRET_KEY`<br>2. Actualizar en Infisical `/api`<br>3. Validar acceso a storage | Fase 4 |

---

## 8. Operaciones Pendientes de Aprobación Manual

Las siguientes operaciones requieren intervención humana a través de la interfaz web de Infisical (`http://127.0.0.1:80`) o de los proveedores externos:

1. **Crear organización `InnotechLabs`** en Infisical (si no existe)
2. **Crear proyecto `MR Training`** dentro de la organización
3. **Crear entornos:** `development`, `qa`, `production`
4. **Crear rutas:** `/api`, `/web`, `/mobile`, `/integrations`
5. **Crear identidades de máquina:** `mr-training-local`, `mr-training-github`, `mr-training-cloud-run` con los permisos definidos en la sección 4
6. **Rotar credenciales expuestas en Git** (sección 7) — requiere acceso a los dashboards de Clerk, Wompi, Supabase, Turso, Discord, Vercel
7. **Validar que Infisical local es accesible** desde las máquinas de desarrollo antes de migrar secretos

**No se ha modificado ningún archivo de aplicación, `.env`, Docker, base de datos, GitHub ni GCP. No se han importado secretos reales a Infisical todavía.**

---

**Estado:** Esperando aprobación para iniciar la Fase 3 (rotación y migración controlada de secretos de development).
