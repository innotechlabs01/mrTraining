# MR Training — Auditoría e Integración con Infisical

**Fase:** 1-6 (Auditoría y Diseño)  
**Estado:** Pendiente de aprobación para implementación  
**Fecha:** 2026-11-10  
**Repositorio:** `/Users/frg/Documents/Innotechlabs/Mao_Coaching/mr-training`  
**Infisical Self-Hosted:** `http://127.0.0.1:80` (v0.167.5)

---

## 1. Arquitectura Encontrada

MR Training es un monorepo con tres aplicaciones principales:

| Aplicación | Ruta | Tecnología | Rol |
|---|---|---|---|
| Backend Go | `apps/api/` | Go 1.25 + Fiber v2, Clean Architecture | Fuente de verdad del negocio |
| Frontend Web | `apps/web/` | Next.js 14, App Router, Clerk v6 | Dashboard coach + landing |
| Móvil | `apps/mobile/` | Expo 54 / React Native 0.81 | App atleta |

### Backend Go (`apps/api/`)
- **Configuración:** `apps/api/internal/config/config.go` carga variables de entorno mediante `godotenv.Load()` (lee `.env` y `config/.env.local`).
- **Entry points:** `cmd/api/main.go`, `cmd/worker/main.go`, `cmd/migrate/main.go`, `cmd/data-migrate/main.go`.
- **Dependencia de base de datos:** `jackc/pgx/v5` con `database/sql` sobre PostgreSQL/Turso.
- **Validación en producción:** `DATABASE_URL` y `CLERK_SECRET_KEY` son obligatorias; `CORS_ORIGINS` no puede ser `*` en producción.

### Frontend Web (`apps/web/`)
- Next.js 14 App Router. Consume Go API vía `NEXT_PUBLIC_GO_API_URL` o `GO_API_ORIGIN` (proxy de rewrites).
- Algunas API Routes de Next.js consumen `CLERK_SECRET_KEY` directamente (webhooks, invitaciones).
- Usa `@vercel/blob` (`BLOB_READ_WRITE_TOKEN`).

### Móvil (`apps/mobile/`)
- Expo + React Navigation. Lee variables vía `process.env.*` y `app.json` (`extra.clerkPublishableKey`, `extra.apiBaseUrl`, `extra.goApiUrl`).
- `app.json` tiene claves empotradas en `extra`.

---

## 2. Inventario de Variables de Entorno (sin valores)

### Root (`.env.example`, `.env.local`, `.env.migration`)

| Variable | Servicio | Archivo consumidor | Entorno | Tipo | Obligatoria | Ruta Infisical sugerida |
|---|---|---|---|---|---|---|
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Clerk | apps/web, apps/mobile | dev/qa/prod | Pública | Sí | /web, /mobile |
| CLERK_SECRET_KEY | Clerk | apps/api, apps/web | dev/qa/prod | Privado | Sí | /api |
| CLERK_WEBHOOK_SECRET | Clerk | apps/api, apps/web | dev/qa/prod | Privado | Sí | /api |
| NEXT_PUBLIC_CLERK_SIGN_IN_URL | Clerk UI | apps/web | dev | Pública | No | /web |
| NEXT_PUBLIC_CLERK_SIGN_UP_URL | Clerk UI | apps/web | dev | Pública | No | /web |
| NEXT_PUBLIC_APP_URL | App | apps/web | dev | Pública | No | /web |
| API_URL | Go API | apps/web | dev | Pública | No | /web |
| DATABASE_URL | PostgreSQL | apps/api, apps/web | dev/qa/prod | Privado | Sí | /api |
| DATABASE_MAX_CONNS | PostgreSQL | apps/api | dev | No sensible | No | /api |
| DATABASE_MIN_CONNS | PostgreSQL | apps/api | dev | No sensible | No | /api |
| REDIS_URL | Redis | apps/api | dev/qa/prod | Privado | No | /api |
| REDIS_PASSWORD | Redis | apps/api | dev | Privado | No | /api |
| NATS_URL | NATS | apps/api | dev/qa/prod | Privado | No | /api |
| S3_ENDPOINT | Almacenamiento | apps/api | dev | Privado | No | /api |
| S3_ACCESS_KEY | Almacenamiento | apps/api | dev | Privado | Sí | /api |
| S3_SECRET_KEY | Almacenamiento | apps/api | dev | Privado | Sí | /api |
| S3_BUCKET | Almacenamiento | apps/api | dev | No sensible | No | /api |
| S3_PUBLIC_URL | Almacenamiento | apps/api | dev | Pública | No | /api |
| POLAR_ACCESS_TOKEN | Pagos | apps/api | dev | Privado | Sí | /api |
| POLAR_WEBHOOK_SECRET | Pagos | apps/api | dev | Privado | Sí | /api |
| POLAR_DEFAULT_PRODUCT_ID | Pagos | apps/api | dev | No sensible | No | /api |
| AI_PROVIDER | IA | apps/api | dev | No sensible | No | /api |
| AI_API_KEY | IA | apps/api | dev | Privado | Sí | /api |
| AI_MODEL | IA | apps/api | dev | No sensible | No | /api |
| AI_MAX_TOKENS | IA | apps/api | dev | No sensible | No | /api |
| JWT_SECRET | Criptografía | apps/api | dev | Privado | Sí | /api |
| JWT_ACCESS_TOKEN_EXPIRY | Criptografía | apps/api | dev | No sensible | No | /api |
| JWT_REFRESH_TOKEN_EXPIRY | Criptografía | apps/api | dev | No sensible | No | /api |
| SENTRY_DSN | Monitoreo | apps/api | dev | Privado | No | /api |
| POSTHOG_API_KEY | Analítica | apps/api | dev | Privado | No | /api |
| POSTHOG_HOST | Analítica | apps/api | dev | Pública | No | /api |
| ENABLE_AI_WORKOUT_GENERATOR | Feature flag | apps/api | dev | No sensible | No | /api |
| ENABLE_AI_NUTRITION_PLANNER | Feature flag | apps/api | dev | No sensible | No | /api |
| ENABLE_MARKETPLACE | Feature flag | apps/api | dev | No sensible | No | /api |
| ENABLE_SOCIAL_LOGIN | Feature flag | apps/api | dev | No sensible | No | /api |
| MAINTENANCE_MODE | Operaciones | apps/api | dev | No sensible | No | /api |
| NEXT_PUBLIC_EXPO_LINK_BASE | Mobile deep links | apps/web | dev | Pública | No | /web |
| NEXT_PUBLIC_WEB_INVITE_URL | Mobile deep links | apps/web | dev | Pública | No | /web |
| TURSO_DATABASE_NAME | Migración | scripts | dev | No sensible | No | /integrations |
| TURSO_DATABASE_URL | Migración | scripts | dev | Privado | Sí | /integrations |
| TURSO_AUTH_TOKEN | Migración | scripts | dev | Privado | Sí | /integrations |
| POSTGRES_LOCAL_URL | Migración | scripts | dev | Privado | Sí | /integrations |
| SUPABASE_QA_DATABASE_URL | Migración | scripts | qa | Privado | Sí | /integrations |
| SUPABASE_ANON_KEY | Supabase | apps/api/config/.env.qa | qa | Privado | Sí | /api |
| SUPABASE_SERVICE_ROLE | Supabase | apps/api/config/.env.qa | qa | Privado | Sí | /api |
| MIGRATION_TARGET | Migración | scripts | dev | No sensible | No | /integrations |
| ALLOW_PRODUCTION_MIGRATION | Migración | scripts | dev | No sensible | No | /integrations |

### apps/api/config (`.env.example`, `.env.local`, `.env.qa`)

| Variable | Servicio | Archivo consumidor | Entorno | Tipo | Obligatoria | Ruta Infisical sugerida |
|---|---|---|---|---|---|---|
| APP_ENV | App | config.go | dev/qa/prod | No sensible | No | /api |
| APP_PORT | App | config.go | dev/qa/prod | No sensible | No | /api |
| APP_NAME | App | config.go | dev/qa/prod | No sensible | No | /api |
| DATABASE_URL | PostgreSQL | config.go, DatabaseConnection() | dev/qa/prod | Privado | Sí | /api |
| CLERK_SECRET_KEY | Clerk | config.go | dev/qa/prod | Privado | Sí | /api |
| CLERK_PUBLISHABLE_KEY | Clerk | config.go | dev/qa/prod | Pública | Sí | /api |
| CLERK_JWKS_URL | Clerk | config.go | dev/qa/prod | Pública | No | /api |
| CLERK_WEBHOOK_SECRET | Clerk | config.go | dev/qa/prod | Privado | Sí | /api |
| FIREBASE_PROJECT_ID | FCM | config.go | dev/qa/prod | No sensible | No | /api |
| FIREBASE_CLIENT_EMAIL | FCM | config.go | dev/qa/prod | Privado | No | /api |
| FIREBASE_PRIVATE_KEY | FCM | config.go | dev/qa/prod | Privado | No | /api |
| CORS_ORIGINS | CORS | config.go | dev/qa/prod | No sensible | Sí | /api |
| REDIS_URL | Redis | config.go | dev/qa/prod | Privado | No | /api |
| PLATFORM_SUPER_ADMIN_CLERK_ID | Plataforma | config.go | dev/qa/prod | Privado | No | /api |
| NATS_URL | NATS | config.go | dev/qa/prod | Privado | No | /api |
| ERROR_WEBHOOK_DISCOR | Discord | config.go | dev/qa/prod | Privado | No | /api |
| TRUSTED_PROXIES | Proxy | config.go | dev/qa/prod | No sensible | No | /api |
| RATE_LIMIT_MAX | Rate limit | config.go | dev/qa/prod | No sensible | No | /api |
| RATE_LIMIT_WINDOW | Rate limit | config.go | dev/qa/prod | No sensible | No | /api |
| MERCADO_PAGO_WEBHOOK_URL | Pagos (legacy) | config.go | dev/qa/prod | Pública | No | /api |
| MERCADO_PAGO_SECRET_KEY | Pagos (legacy) | config.go | dev/qa/prod | Privado | Sí | /api |
| MERCADO_PAGO_PUBLIC_KEY | Pagos (legacy) | config.go | dev/qa/prod | Pública | No | /api |
| MERCADO_PAG_SECRET_WEBHOOK | Pagos (legacy) | config.go | dev/qa/prod | Privado | Sí | /api |
| MERCADO_PAGO_WEBHOOK_SECRET | Pagos (legacy) | config.go | dev/qa/prod | Privado | Sí | /api |
| WOMPI_PUBLIC_KEY | Pagos (activo) | config.go | dev/qa/prod | Pública | Sí | /api |
| WOMPI_PRIVATE_KEY | Pagos (activo) | config.go | dev/qa/prod | Privado | Sí | /api |
| WOMPI_INTEGRITY_SECRET | Pagos (activo) | config.go | dev/qa/prod | Privado | Sí | /api |
| WOMPI_EVENTS_SECRET | Pagos (activo) | config.go | dev/qa/prod | Privado | Sí | /api |
| WOMPI_ENV | Pagos (activo) | config.go | dev/qa/prod | No sensible | No | /api |
| WOMPI_WEBHOOK_URL | Pagos (activo) | config.go | dev/qa/prod | Pública | No | /api |
| APP_URL | App | config.go | dev/qa/prod | Pública | No | /api |
| EmailSMTPHost | Email | config.go | dev/qa/prod | Privado | No | /api |
| EmailSMTPPort | Email | config.go | dev/qa/prod | No sensible | No | /api |
| EmailSMTPUsername | Email | config.go | dev/qa/prod | Privado | No | /api |
| EmailSMTPPassword | Email | config.go | dev/qa/prod | Privado | No | /api |
| EmailFromName | Email | config.go | dev/qa/prod | Pública | No | /api |
| EmailEnabled | Email | config.go | dev/qa/prod | No sensible | No | /api |
| DiscordWebhookURL | Discord | config.go | dev/qa/prod | Privado | No | /api |
| LOG_LEVEL | Logging | config.go | dev/qa/prod | No sensible | No | /api |

### apps/web (`.env.example`, `.env.local`)

| Variable | Servicio | Archivo consumidor | Entorno | Tipo | Obligatoria | Ruta Infisical sugerida |
|---|---|---|---|---|---|---|
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Clerk | middleware.ts, pages | dev/qa/prod | Pública | Sí | /web |
| CLERK_SECRET_KEY | Clerk | webhooks, invite | dev/qa/prod | Privado | Sí | /web |
| CLERK_WEBHOOK_SECRET | Clerk | webhooks | dev/qa/prod | Privado | Sí | /web |
| DATABASE_URL | PostgreSQL | lib/db | dev | Privado | No | /api |
| NEXT_PUBLIC_GO_API_URL | Go API | client.ts, proxy | dev/qa/prod | Pública | Sí | /web |
| GO_API_ORIGIN | Go API | next.config.js | dev/qa/prod | Pública | No | /web |
| NEXT_PUBLIC_API_URL | Next.js API | next.config.js | dev | Pública | No | /web |
| NEXT_PUBLIC_APP_SCHEME | App | pages | dev | Pública | No | /web |
| NEXT_PUBLIC_WEB_INVITE_URL | Deep links | pages | dev | Pública | No | /web |
| NEXT_PUBLIC_EXPO_GO_URL | Expo | pages | dev | Pública | No | /web |
| NEXT_PUBLIC_SUPER_ADMIN_CLERK_IDS | Plataforma | middleware.ts, admin | dev | Privado | No | /web |
| BLOB_READ_WRITE_TOKEN | Almacenamiento | @vercel/blob | dev | Privado | Sí | /web |
| VERCEL_OIDC_TOKEN | CI/CD | .env.local | dev | Privado | Sí | /integrations |

### apps/mobile (`.env`, `app.json`)

| Variable | Servicio | Archivo consumidor | Entorno | Tipo | Obligatoria | Ruta Infisical sugerida |
|---|---|---|---|---|---|---|
| TUNNEL_TOKEN | Cloudflare tunnel | docker-compose.yml | dev | Privado | No | /mobile |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Clerk | .env, App.tsx | dev | Pública | Sí | /mobile |
| CLERK_SECRET_KEY | Clerk | clerkApi.ts | dev | Privado | No | /mobile |
| CLERK_PUBLISH_KEY | Clerk | clerkApi.ts | dev | Pública | No | /mobile |
| EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY | Clerk | App.tsx | dev | Pública | Sí | /mobile |
| EXPO_PUBLIC_GO_API_URL | Go API | client.ts | dev | Pública | Sí | /mobile |
| app.json extra.clerkPublishableKey | Clerk | App.tsx | dev | Pública | Sí | /mobile |
| app.json extra.apiBaseUrl | API | app.json | dev | Pública | No | /mobile |
| app.json extra.goApiUrl | Go API | client.ts | dev | Pública | No | /mobile |

---

## 3. Clasificación de Secretos

### Secretos privados (nunca en frontend/móvil)
- `CLERK_SECRET_KEY` — /api, /web
- `CLERK_WEBHOOK_SECRET` — /api, /web
- `DATABASE_URL` — /api
- `REDIS_URL` — /api
- `REDIS_PASSWORD` — /api
- `NATS_URL` — /api
- `S3_ACCESS_KEY` — /api
- `S3_SECRET_KEY` — /api
- `POLAR_ACCESS_TOKEN` — /api
- `POLAR_WEBHOOK_SECRET` — /api
- `AI_API_KEY` — /api
- `JWT_SECRET` — /api
- `SENTRY_DSN` — /api
- `POSTHOG_API_KEY` — /api
- `FIREBASE_CLIENT_EMAIL` — /api
- `FIREBASE_PRIVATE_KEY` — /api
- `MERCADO_PAGO_SECRET_KEY` — /api (legacy)
- `MERCADO_PAG_SECRET_WEBHOOK` — /api (legacy)
- `MERCADO_PAGO_WEBHOOK_SECRET` — /api (legacy)
- `WOMPI_PRIVATE_KEY` — /api (activo)
- `WOMPI_INTEGRITY_SECRET` — /api (activo)
- `WOMPI_EVENTS_SECRET` — /api (activo)
- `EmailSMTPPassword` — /api
- `EmailSMTPUsername` — /api
- `DiscordWebhookURL` — /api
- `PLATFORM_SUPER_ADMIN_CLERK_ID` — /api
- `BLOB_READ_WRITE_TOKEN` — /web
- `VERCEL_OIDC_TOKEN` — /integrations
- `TUNNEL_TOKEN` — /mobile
- Migración: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `POSTGRES_LOCAL_URL`, `SUPABASE_QA_DATABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE` — /integrations

### Variables públicas (NEXT_PUBLIC_*, EXPO_PUBLIC_*)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — /web, /mobile
- `CLERK_PUBLISHABLE_KEY` — /api
- `CLERK_PUBLISH_KEY` — /mobile
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — /mobile
- `EXPO_PUBLIC_GO_API_URL` — /mobile
- `NEXT_PUBLIC_GO_API_URL` — /web
- `NEXT_PUBLIC_APP_URL` — /web
- `API_URL` — /web
- `S3_PUBLIC_URL` — /api
- `POLAR_DEFAULT_PRODUCT_ID` — /api
- `AI_MODEL`, `AI_MAX_TOKENS`, `AI_PROVIDER` — /api
- `NEXT_PUBLIC_API_URL` — /web
- `NEXT_PUBLIC_APP_SCHEME` — /web
- `NEXT_PUBLIC_WEB_INVITE_URL` — /web, /mobile
- `NEXT_PUBLIC_EXPO_GO_URL` — /web, /mobile
- `NEXT_PUBLIC_SUPER_ADMIN_CLERK_IDS` — /web
- `NEXT_PUBLIC_EXPO_LINK_BASE` — /web

### Configuración no sensible
- `APP_ENV`, `APP_PORT`, `APP_NAME` — /api
- `DATABASE_MAX_CONNS`, `DATABASE_MIN_CONNS` — /api
- `CORS_ORIGINS` — /api
- `FIREBASE_PROJECT_ID` — /api
- `CLERK_JWKS_URL` — /api
- `MERCADO_PAGO_WEBHOOK_URL`, `MERCADO_PAGO_PUBLIC_KEY` — /api
- `WOMPI_PUBLIC_KEY`, `WOMPI_ENV`, `WOMPI_WEBHOOK_URL` — /api
- `APP_URL` — /api, /web
- `EmailSMTPHost`, `EmailSMTPPort`, `EmailFromName`, `EmailEnabled` — /api
- `TRUSTED_PROXIES`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW` — /api
- `LOG_LEVEL` — /api
- Feature flags — /api

### Credenciales de infraestructura
- PostgreSQL: `DATABASE_URL`, `SUPABASE_QA_DATABASE_URL`, `POSTGRES_LOCAL_URL`
- Redis: `REDIS_URL`, `REDIS_PASSWORD`
- NATS: `NATS_URL`
- S3: `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`
- Supabase: `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE`

### Variables aparentemente obsoletas
- `MERCADO_PAGO_*` — MercadoPago es legacy; Wompi es el proveedor activo.
- `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET` — Polar.sh en migración a Go.
- `FIREBASE_*` — FCM opcional, skip si vacío.
- `DiscordWebhookURL` / `ERROR_WEBHOOK_DISCOR` — opcional.
- `NEXT_PUBLIC_API_URL` — comentado en web/.env.example, fallback de legacy.
- `DATABASE_URL` en apps/web — web no debería conectar directo a DB (regla API-first).

---


---

## 4. Matriz de Migración a Infisical

| Variable | Origen actual | Destino Infisical | Entorno | Ruta | Notas |
|---|---|---|---|---|---|
| DATABASE_URL | .env, .env.qa, .env.local | /api | dev/qa/prod | /api | Migrar primero |
| CLERK_SECRET_KEY | .env, .env.qa, .env.local | /api | dev/qa/prod | /api | Migrar primero |
| CLERK_WEBHOOK_SECRET | .env, .env.qa, .env.local | /api | dev/qa/prod | /api | |
| CLERK_PUBLISHABLE_KEY | .env, .env.qa, .env.local | /api | dev/qa/prod | /api | Pública, duplicar en /web |
| NATS_URL | .env, config/.env.* | /api | dev/qa/prod | /api | |
| REDIS_URL | .env, config/.env.* | /api | dev/qa/prod | /api | |
| WOMPI_PRIVATE_KEY | .env.local, .env.qa | /api | dev/qa/prod | /api | Crítico, solo backend |
| WOMPI_INTEGRITY_SECRET | .env.local, .env.qa | /api | dev/qa/prod | /api | Crítico, solo backend |
| WOMPI_EVENTS_SECRET | .env.local, .env.qa | /api | dev/qa/prod | /api | Crítico, solo backend |
| WOMPI_PUBLIC_KEY | .env.local, .env.qa | /api | dev/qa/prod | /api | Pública |
| WOMPI_ENV | .env.local, .env.qa | /api | dev/qa/prod | /api | |
| WOMPI_WEBHOOK_URL | .env.local, .env.qa | /api | dev/qa/prod | /api | |
| S3_ACCESS_KEY | .env.example | /api | dev | /api | |
| S3_SECRET_KEY | .env.example | /api | dev | /api | |
| AI_API_KEY | .env.example | /api | dev | /api | |
| JWT_SECRET | .env.example | /api | dev | /api | |
| BLOB_READ_WRITE_TOKEN | apps/web/.env.local | /web | dev | /web | |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | .env, .env.local | /web, /mobile | dev/qa/prod | /web, /mobile | Pública, compartir |
| NEXT_PUBLIC_GO_API_URL | .env.local, .env, app.json | /web, /mobile | dev/qa/prod | /web, /mobile | Pública |
| EXPO_PUBLIC_GO_API_URL | apps/mobile/.env | /mobile | dev | /mobile | Pública |
| app.json extra.clerkPublishableKey | apps/mobile/app.json | /mobile | dev | /mobile | Pública |
| NEXT_PUBLIC_WEB_INVITE_URL | .env.example, .env.local | /web | dev | /web | Pública |
| NEXT_PUBLIC_APP_SCHEME | apps/web/.env.example | /web | dev | /web | Pública |
| NEXT_PUBLIC_EXPO_GO_URL | apps/web/.env.example | /web | dev | /web | Pública |
| NEXT_PUBLIC_SUPER_ADMIN_CLERK_IDS | apps/web/.env.local | /web | dev | /web | |
| TUNNEL_TOKEN | apps/mobile/.env | /mobile | dev | /mobile | |
| TURSO_DATABASE_URL | .env.migration | /integrations | dev | /integrations | Solo migración |
| TURSO_AUTH_TOKEN | .env.migration | /integrations | dev | /integrations | Solo migración |
| POSTGRES_LOCAL_URL | .env.migration | /integrations | dev | /integrations | Solo migración |
| SUPABASE_QA_DATABASE_URL | .env.migration | /integrations | qa | /integrations | Solo QA |
| SUPABASE_ANON_KEY | apps/api/config/.env.qa | /integrations | qa | /integrations | Solo QA |
| SUPABASE_SERVICE_ROLE | apps/api/config/.env.qa | /integrations | qa | /integrations | Solo QA |

**Regla de no-duplicación:** Un secreto privado vive en una sola ruta. Las públicas (NEXT_PUBLIC_*) se replican en las rutas de los consumidores.

---

## 5. Estructura de Infisical

**Organización:** `InnotechLabs`  
**Proyecto:** `MR Training`  
**Entornos:** `development`, `qa`, `production`  
**Rutas:** `/api`, `/web`, `/mobile`, `/integrations`

### Asignación de variables por ruta

| Ruta | Consumidor | Variables |
|---|---|---|
| `/api` | Go API (`apps/api`) | DATABASE_URL, CLERK_SECRET_KEY, CLERK_WEBHOOK_SECRET, REDIS_URL, NATS_URL, WOMPI_*, S3_*, AI_API_KEY, JWT_SECRET, EmailSMTP_*, PLATFORM_SUPER_ADMIN_CLERK_ID, CORS_ORIGINS, LOG_LEVEL, etc. |
| `/web` | Next.js (`apps/web`) | NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, CLERK_WEBHOOK_SECRET, NEXT_PUBLIC_GO_API_URL, NEXT_PUBLIC_SUPER_ADMIN_CLERK_IDS, BLOB_READ_WRITE_TOKEN, NEXT_PUBLIC_WEB_INVITE_URL, NEXT_PUBLIC_APP_SCHEME, NEXT_PUBLIC_EXPO_GO_URL |
| `/mobile` | Expo/RN (`apps/mobile`) | NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY, EXPO_PUBLIC_GO_API_URL, TUNNEL_TOKEN |
| `/integrations` | Scripts de migración, CI | TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, POSTGRES_LOCAL_URL, SUPABASE_QA_DATABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE, VERCEL_OIDC_TOKEN |

### Reglas aplicadas
- Nunca compartir secretos entre entornos (cada entorno tiene sus propios valores).
- Nunca colocar secretos privados en rutas de frontend (`/web`, `/mobile`).
- `NEXT_PUBLIC_*` y `EXPO_PUBLIC_*` son públicas y pueden vivir en `/web` y `/mobile`.
- Credenciales de Wompi permanecen exclusivamente en `/api` (backend).
- No duplicar secretos innecesariamente.
- No colocar credenciales administrativas en el repositorio.

---

## 6. Comandos de Ejecución Propuestos

Uso de **Infisical CLI** para inyectar variables al proceso sin modificar el código ni introducir SDK.

### Backend Go
```bash
# Development
infisical run --env=development --path=/api -- go run ./cmd/api

# QA
infisical run --env=qa --path=/api -- go run ./cmd/api

# Worker
infisical run --env=development --path=/api -- go run ./cmd/worker

# Migraciones (solo /integrations)
infisical run --env=development --path=/integrations -- go run ./cmd/migrate
infisical run --env=qa --path=/integrations -- go run ./cmd/data-migrate
```

### Frontend Next.js
```bash
# Development
infisical run --env=development --path=/web -- next dev

# Build (las variables NEXT_PUBLIC_* se inyectan en tiempo de build)
infisical run --env=production --path=/web -- next build
```

### Móvil Expo
```bash
# Development
infisical run --env=development --path=/mobile -- npx expo start

# Android / iOS
infisical run --env=development --path=/mobile -- npx expo run:android
infisical run --env=development --path=/mobile -- npx expo run:ios
```

### Pruebas
```bash
# Backend
infisical run --env=development --path=/api -- go test ./...

# Web
infisical run --env=development --path=/web -- pnpm test

# Mobile
infisical run --env=development --path=/mobile -- npm test
```

### Estrategia de inyección
- **Infisical CLI (`infisical run`)** es el mecanismo preferido: inyecta variables como variables de entorno al proceso hijo sin escribirlas en disco.
- **Alternativa (si el CLI no está disponible):** exportar a un archivo temporal protegido (`chmod 600`), cargar con `source`, y eliminar inmediatamente después. No se recomienda como estándar.
- **No se introduce Infisical SDK** en el código de ninguna aplicación (regla obligatoria #12).

---

## 7. Estrategia GitHub Actions

### Machine Identity
- Crear una **Service Account (machine identity)** exclusiva para MR Training en Infisical.
- Otorgar acceso solo a los entornos necesarios: `qa` para despliegues de QA, `production` para despliegues de producción.
- **No** otorgar acceso a `development` desde GitHub Actions (development es local).

### Autenticación
- Evaluar **OIDC** si la instancia de Infisical self-hosted y el método de autenticación elegidos lo soportan.
- Si no hay OIDC, usar **Infisical CLI con token de servicio** almacenado como secreto de GitHub Actions (`INFISICAL_TOKEN`, `INFISICAL_URL`, `INFISICAL_ENV`, `INFISICAL_PATH`).
- El token de servicio tiene alcance limitado al proyecto `MR Training` y los entornos `qa`/`production`.

### Reglas de seguridad en CI/CD
- No almacenar secretos de aplicación directamente en GitHub Actions Secrets (solo el token de Infisical).
- No imprimir secretos en logs (usar `infisical run` que no expone valores).
- No exponer secretos en artefactos de construcción.
- Separación estricta entre QA y producción: workflows distintos, tokens distintos, aprobaciones manuales para producción.
- Infisical local en `127.0.0.1` **no es accesible desde GitHub Actions**; se debe usar la instancia remota de Infisical o el token de servicio contra la instancia self-hosted expuesta de forma segura.

### Ejemplo conceptual de workflow
```yaml
jobs:
  deploy-qa:
    runs-on: ubuntu-latest
    environment: qa
    steps:
      - uses: actions/checkout@v4
      - uses: infisical/get-secrets-action@v1
        with:
          infisical_url: ${{ secrets.INFISICAL_URL }}
          infisical_token: ${{ secrets.INFISICAL_TOKEN }}
          environment: qa
          path: /api
      - run: infisical run --env=qa --path=/api -- go run ./cmd/api
```

*(Este workflow es conceptual; no se configura todavía la conexión real.)*

---

## 8. Riesgos Detectados

| Riesgo | Impacto | Mitigación |
|---|---|---|
| `.env` y `.env.local` con valores reales commiteados | Alto — secretos expuestos en Git | Migrar a Infisical, agregar a `.gitignore`, rotar valores expuestos |
| `app.json` con `clerkPublishableKey`, `apiBaseUrl`, `goApiUrl` empotrados | Medio — claves públicas en código | Mover a Infisical `/mobile`, inyectar en build de Expo |
| `CLERK_SECRET_KEY` en `apps/web/` (Next.js API Routes) | Medio — clave de backend en frontend | Revisar si es estrictamente necesario; mantener solo en `/api` |
| `DATABASE_URL` en `apps/web/` | Alto — frontend no debe conectar directo a DB | Eliminar, usar solo Go API (regla API-first) |
| `BLOB_READ_WRITE_TOKEN` en `apps/web/.env.local` | Medio — token de Vercel Blob expuesto | Migrar a Infisical `/web` |
| Variables de migración (`TURSO_*`, `SUPABASE_*`) en `.env.migration` | Alto — credenciales de DB en repositorio | Migrar a Infisical `/integrations`, rotar tokens |
| `WOMPI_*` y `MERCADO_PAGO_*` coexistiendo | Medio — confusión entre proveedores activo/legacy | Deprecar `MERCADO_PAGO_*` después de confirmar que no se usa |
| `DiscordWebhookURL` con URL real | Bajo — webhook expuesto | Rotar URL después de migración |
| Infisical local (`127.0.0.1`) no accesible desde GitHub Actions | Medio — CI/CD no puede usar instancia local | Usar instancia remota self-hosted con token de servicio |
| Variables aparentemente sin uso (`DATABASE_URL` en web, `NEXT_PUBLIC_API_URL` comentado) | Bajo — confusión | Documentar como obsoletas o eliminar tras validación |

---

## 9. Variables Críticas que Deben Migrarse Primero

1. `DATABASE_URL` — acceso directo a base de datos
2. `CLERK_SECRET_KEY` — autenticación backend
3. `CLERK_WEBHOOK_SECRET` — webhooks de autenticación
4. `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET` — pagos activos
5. `S3_ACCESS_KEY`, `S3_SECRET_KEY` — almacenamiento de archivos
6. `AI_API_KEY` — proveedor de IA
7. `BLOB_READ_WRITE_TOKEN` — almacenamiento web (Vercel)
8. `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `SUPABASE_QA_DATABASE_URL` — migración de datos
9. `JWT_SECRET` — firma de tokens
10. `SUPABASE_SERVICE_ROLE` — acceso administrativo a Supabase QA

---

## 10. Plan de Implementación por Fasas

### Fase 1 — Auditoría y Diseño (actual, completada)
- [x] Inventario de variables de entorno
- [x] Clasificación de secretos
- [x] Diseño de estructura de Infisical (organizaciones, proyectos, entornos, rutas)
- [x] Comandos de ejecución propuestos
- [x] Estrategia GitHub Actions conceptual
- [x] Informe de auditoría (`docs/infisical-integration-audit.md`)
- [ ] **Aprobación del usuario para continuar**

### Fase 2 — Preparación de Infisical Self-Hosted
- [ ] Verificar instancia en `http://127.0.0.1:80` (v0.167.5) accesible
- [ ] Crear organización `InnotechLabs` y proyecto `MR Training`
- [ ] Crear entornos: `development`, `qa`, `production`
- [ ] Crear rutas: `/api`, `/web`, `/mobile`, `/integrations`
- [ ] Crear service account para GitHub Actions (qa + production)

### Fase 3 — Migración de Secretos (sin tocar código de aplicación)
- [ ] Importar variables a Infisical por ruta y entorno
- [ ] Verificar que no se copien valores al repositorio
- [ ] Rotar valores que estuvieron expuestos en Git (claves Clerk, Wompi, S3, etc.)
- [ ] Validar que `.env` y `.env.local` se agregan a `.gitignore`

### Fase 4 — Integración Local con Infisical CLI
- [ ] Instalar `infisical-cli` en entornos de desarrollo
- [ ] Probar `infisical run --env=development --path=/api -- go run ./cmd/api`
- [ ] Probar `infisical run --env=development --path=/web -- next dev`
- [ ] Probar `infisical run --env=development --path=/mobile -- npx expo start`
- [ ] Probar pruebas: `infisical run --env=development --path=/api -- go test ./...`

### Fase 5 — Integración en GitHub Actions
- [ ] Configurar `INFISICAL_TOKEN`, `INFISICAL_URL` como secretos de GitHub
- [ ] Crear workflows para QA y producción con machine identity
- [ ] Validar que no se impriman secretos en logs
- [ ] Validar separación QA/producción

### Fase 6 — Cierre y Documentación
- [ ] Actualizar `docs/` con procedimientos operativos
- [ ] Capacitar al equipo en uso de `infisical run`
- [ ] Retirar `.env` y `.env.local` con valores reales del repositorio
- [ ] **Usuario da aprobación final para Done**

---

## 11. Resultado de la Auditoría

| Métrica | Valor |
|---|---|
| Variables identificadas | ~80 |
| Secretos privados | ~35 |
| Variables públicas | ~25 |
| Variables no sensibles / configuración | ~20 |
| Variables aparentemente obsoletas | ~8 |
| Componentes afectados | `apps/api`, `apps/web`, `apps/mobile`, scripts de migración |
| Variables críticas para migrar primero | DATABASE_URL, CLERK_SECRET_KEY, CLERK_WEBHOOK_SECRET, WOMPI_PRIVATE_KEY, WOMPI_INTEGRITY_SECRET, WOMPI_EVENTS_SECRET, S3_ACCESS_KEY, S3_SECRET_KEY, AI_API_KEY, BLOB_READ_WRITE_TOKEN, JWT_SECRET, SUPABASE_SERVICE_ROLE |
| Problemas detectados | Valores commiteados en Git, claves en app.json, DATABASE_URL en web, Wompi/MercadoPago coexistiendo, Infisical local inaccesible desde CI/CD |
| Próxima fase recomendada | Fase 2: Preparación de Infisical Self-Hosted (crear organización, proyecto, entornos, rutas) |

---

**Estado:** Esperando aprobación del usuario para iniciar la Fase 2. No se ha modificado ningún archivo de aplicación, `.env`, Docker, base de datos, GitHub ni GCP. No se han copiado secretos reales a Infisical todavía.

