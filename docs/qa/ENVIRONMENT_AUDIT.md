# Auditoría de Variables de Entorno — MR Training QA

**Estado:** Auditoría únicamente. No se modificó ningún archivo. No se exponen valores sensibles.

## 1. Resumen de componentes y destinos

| Componente | Entorno QA | Destino de despliegue | Fuente de verdad de secretos |
|------------|-----------|----------------------|------------------------------|
| API Go | QA | Google Cloud Run (`mr-training-backend`) | Infisical QA → Secret Manager QA |
| Web Next.js | QA | Vercel Preview | Infisical QA → Vercel variables protegidas |
| Mobile Expo | QA | EAS Preview (build interno) | Infisical QA → Expo EAS variables públicas |

---

## 2. Backend Go — `apps/api/`

### Archivos de entorno inspeccionados

| Archivo | Estado | Notas |
|---------|--------|-------|
| `.env.local` | Presente | Desarrollo local. Contiene valores de desarrollo, no QA. |
| `.env.local.example` | Presente | Plantilla sin valores reales. |
| `.env.cloudrun.bak` | Presente | Backup con valores reales (no usar). |

### Variables de configuración Go (desde `internal/config/config.go`)

| Variable | Obligatoria | Pública/Secreta | Fuente QA | Destino QA | Notas |
|----------|-------------|-----------------|-----------|------------|-------|
| `APP_ENV` | No | Secreta | Config QA | Cloud Run | `qa` |
| `APP_PORT` | No | Secreta | Config QA | Cloud Run | `8080` (Cloud Run inyecta `PORT`) |
| `APP_NAME` | No | Secreta | Config QA | Cloud Run | `mr-training-api` |
| `DATABASE_URL` | Sí | Secreta | Infisical QA | Secret Manager → Cloud Run | Conexión PostgreSQL QA |
| `CLERK_SECRET_KEY` | Sí | Secreta | Infisical QA | Secret Manager → Cloud Run | Clerk backend QA |
| `CLERK_PUBLISHABLE_KEY` | No | Pública | Infisical QA | Cloud Run / Vercel / Expo | Clerk publishable QA |
| `CLERK_JWKS_URL` | No | Secreta | Config QA | Cloud Run | JWKS para verificación de tokens |
| `CLERK_WEBHOOK_SECRET` | No | Secreta | Infisical QA | Cloud Run | Webhook signing |
| `CORS_ORIGINS` | No | Secreta | Config QA | Cloud Run | Orígenes web y mobile QA |
| `REDIS_URL` | No | Secreta | Infisical QA | Secret Manager → Cloud Run | Redis QA (opcional) |
| `NATS_URL` | No | Secreta | Config QA | Cloud Run | NATS QA |
| `WOMPI_PUBLIC_KEY` | No | Pública | Infisical QA | Cloud Run / Expo | Wompi sandbox QA |
| `WOMPI_PRIVATE_KEY` | Sí | Secreta | Infisical QA | Secret Manager → Cloud Run | Wompi private QA |
| `WOMPI_INTEGRITY_SECRET` | Sí | Secreta | Infisical QA | Secret Manager → Cloud Run | Wompi integrity QA |
| `WOMPI_EVENTS_SECRET` | Sí | Secreta | Infisical QA | Secret Manager → Cloud Run | Wompi events QA |
| `WOMPI_ENV` | No | Secreta | Config QA | Cloud Run | `sandbox` |
| `WOMPI_WEBHOOK_URL` | No | Secreta | Config QA | Cloud Run | Webhook Wompi QA |
| `APP_URL` | No | Secreta | Config QA | Cloud Run | URL base API QA |
| `WEB_APP_URL` | No | Secreta | Config QA | Cloud Run | URL frontend QA |
| `LOG_LEVEL` | No | Secreta | Config QA | Cloud Run | Nivel de logs |
| `RATE_LIMIT_MAX` | No | Secreta | Config QA | Cloud Run | Límite de rate limiting |
| `RATE_LIMIT_WINDOW` | No | Secreta | Config QA | Cloud Run | Ventana de rate limiting |
| `TRUSTED_PROXIES` | No | Secreta | Config QA | Cloud Run | IPs de proxy |
| `INFISICAL_ENABLED` | No | Secreta | Config QA | Cloud Run | `true` en QA |
| `INFISICAL_BASE_URL` | No | Secreta | Config QA | Cloud Run | URL Infisical QA |
| `INFISICAL_CLIENT_ID` | No | Secreta | CI/CD | GitHub Actions (solo despliegue) | No en contenedor |
| `INFISICAL_CLIENT_SECRET` | No | Secreta | CI/CD | GitHub Actions (solo despliegue) | No en contenedor |
| `INFISICAL_PROJECT_ID` | No | Secreta | Config QA | Cloud Run | Proyecto Infisical QA |
| `INFISICAL_ENVIRONMENT` | No | Secreta | Config QA | Cloud Run | `qa` |
| `INFISICAL_SECRET_PATH` | No | Secreta | Config QA | Cloud Run | `/` |
| `INFISICAL_CACHE_TTL` | No | Secreta | Config QA | Cloud Run | `5m` |
| `PLATFORM_SUPER_ADMIN_CLERK_ID` | No | Secreta | Config QA | Cloud Run | ID de super admin |
| `FIREBASE_*` | No | Secreta | N/A | No usado en QA | Opcional, omitir |
| `EMAIL_*` | No | Secreta | N/A | No usado en QA | Opcional, omitir |
| `DISCORD_WEBHOOK_URL` | No | Secreta | N/A | No usado en QA | Opcional, omitir |
| `MERCADO_PAGO_*` | No | Secreta | N/A | Legacy, omitir | Histórico |

### Puerto de escucha

El servidor Go honra la variable `PORT` (inyectada por Cloud Run) sobre `APP_PORT` (`wire.go` línea 141-143). Dockerfile expone `8080` tras el ajuste de FASE D. Cloud Run inyecta `PORT=8080`.

---

## 3. Frontend Next.js — `apps/web/`

### Archivos de entorno inspeccionados

| Archivo | Estado | Notas |
|---------|--------|-------|
| `.env.QA` | Presente | Configuración QA (Vercel CLI). |
| `.env.local` | Presente | Desarrollo local (`localhost:9090`). |
| `.env.example` | Presente | Plantilla sin valores reales. |

### Variables de entorno Next.js (desde `.env.QA` y `next.config.js`)

| Variable | Tipo | Obligatoria | Fuente QA | Destino QA | Notas |
|----------|------|-------------|-----------|------------|-------|
| `NEXT_PUBLIC_GO_API_URL` | Pública | Sí | Config QA | Vercel | URL de Cloud Run QA |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Pública | Sí | Clerk QA | Vercel | Publishable key QA |
| `CLERK_SECRET_KEY` | Privada | Sí | Infisical QA | Vercel (protegida) | No expuesta al navegador |
| `CLERK_PUBLISH_KEY` | Pública | Sí | Clerk QA | Vercel | Duplicado de publishable key |
| `CLERK_WEBHOOK_SECRET` | Privada | Sí | Infisical QA | Vercel (protegida) | Webhook signing |
| `NEXT_PUBLIC_SUPER_ADMIN_CLERK_IDS` | Pública | No | Config QA | Vercel | IDs de super admin |
| `BLOB_READ_WRITE_TOKEN` | Privada | Sí | Vercel | Vercel | Storage de Vercel (no Infisical) |
| `NEXT_PUBLIC_APP_SCHEME` | Pública | No | Config QA | Vercel | `mrtraining` |
| `NEXT_PUBLIC_WEB_INVITE_URL` | Pública | No | Config QA | Vercel | URL de invitación |
| `NEXT_PUBLIC_EXPO_GO_URL` | Pública | No | Config QA | Vercel | URL de Expo Go |
| `NEXT_PUBLIC_API_URL` | Pública | No | Config QA | Vercel | Opcional, mismo valor que GO_API_URL |
| `GO_API_ORIGIN` | Privada | No | Config QA | Vercel | Para modo proxy (rewrites) |

### Proxy de API (next.config.js)

- Rewrites: `/api/v1/:path*` → `GO_API_ORIGIN/api/v1/:path*`
- Rewrites: `/public/:path*` → `GO_API_ORIGIN/public/:path*`
- Rewrites: `/uploads/:path*` → `GO_API_ORIGIN/uploads/:path*`
- Rewrites: `/health` → `GO_API_ORIGIN/health`
- CSP `connect-src` incluye `NEXT_PUBLIC_GO_API_URL` y `NEXT_PUBLIC_API_URL`

### Problemas identificados

1. `NEXT_PUBLIC_GO_API_URL` en `.env.QA` apunta a `https://mr-training-backend-380405351430.us-central1.run.app` — verificar que coincida con el servicio real de Cloud Run QA.
2. `CLERK_PUBLISH_KEY` es duplicado de `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — posible inconsistencia.
3. No hay `NEXT_PUBLIC_API_URL` definido en `.env.QA` (comentado en `.env.example`).
4. Los valores de Clerk en `.env.QA` parecen ser de entorno `dev` (pk_test_...), no necesariamente QA.

---

## 4. Mobile Expo — `apps/mobile/`

### Archivos de entorno inspeccionados

| Archivo | Estado | Notas |
|---------|--------|-------|
| `.env.qa` | Presente | Configuración QA para EAS. |
| `.env` | Presente | Desarrollo local (localhost:9090, contiene TUNNEL_TOKEN real). |
| `app.config.js` | Presente | Lee variables `EXPO_PUBLIC_*` y las inyecta en `extra`. |
| `app.json` | Presente | Configuración base Expo (package ID dev, URLs hardcodeadas). |
| `eas.json` | Presente | Perfiles de build: development, preview, production. |

### Variables de entorno Mobile

| Variable | Tipo | Obligatoria | Fuente QA | Destino QA | Notas |
|----------|------|-------------|-----------|------------|-------|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Pública | Sí | Clerk QA | Expo EAS | En bundle — solo pública |
| `EXPO_PUBLIC_GO_API_URL` | Pública | Sí | Config QA | Expo EAS | URL de Cloud Run QA |
| `IOS_BUNDLE_IDENTIFIER` | Pública | No | Config QA | EAS | `com.innotechlabssas.mrtraining.qa` |
| `ANDROID_PACKAGE` | Pública | No | Config QA | EAS | `com.innotechlabssas.mrtraining.qa` |
| `TUNNEL_TOKEN` | Privada | No | Desarrollo local | No usar en QA | Solo tunnel local |
| `CLERK_SECRET_KEY` | Privada | Sí | N/A | Nunca en mobile | No debe ir al bundle |
| `CLERK_PUBLISH_KEY` | Pública | Sí | N/A | Nunca en mobile | No debe ir al bundle |

### Problemas identificados

1. `app.json` hardcodea `apiBaseUrl: https://mr-training.vercel.app` (Vercel, no Cloud Run) y `goApiUrl: http://192.168.58.104:9090` (IP local) — `app.config.js` sobreescribe con `EXPO_PUBLIC_GO_API_URL` si está definida.
2. `.env.qa` apunta a `https://mr-training-backend-fybayujyeq-uc.a.run.app` — verificar coincidencia con servicio Cloud Run QA.
3. `app.json` usa `runtimeVersion: { policy: "appVersion" }` — builds EAS generan nuevas versiones de runtime.
4. Mobile NO debe recibir `DATABASE_URL`, `CLERK_SECRET_KEY`, ni credenciales de Infisical.

---

## 5. Infraestructura de secretos

### `infrastructure/secrets/environments/qa/config.yaml`

| Parámetro | Valor QA | Notas |
|-----------|----------|-------|
| `keep_latest` | 2 | Exactamente 2 versiones recuperables |
| `max_versions_per_secret` | 2 | Límite estricto |
| `destroy_state` | `DESTROYED` | No DISABLED |
| `dry_run_default` | true | Dry-run por defecto |
| `destroy_unreferenced_after_days` | 0 | Inmediato |

### Allowlist de promoción (`infrastructure/secrets/allowlist/promotion-allowlist.yaml`)

Secretos autorizados para promoción a QA (12 secretos): CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY, CLERK_WEBHOOK_SECRET, WOMPI_PRIVATE_KEY, WOMPI_EVENTS_SECRET, WOMPI_INTEGRITY_SECRET, APP_URL, WOMPI_WEBHOOK_URL, ERROR_WEBHOOK_DISCOR, CORS_ORIGINS, APP_ENV, APP_PORT, LOG_LEVEL.

Bloqueados: DATABASE_URL, REDIS_URL, NATS_URL y sus variantes _QA.

### GitHub Actions

| Workflow | Rama | Autenticación | Estado |
|----------|------|---------------|--------|
| `cd-qa.yml` | QA | WIF (modificado localmente) | No en GitHub |
| `deploy-qa-api.yml` | qa | WIF (en origin/QA) | Usa `vercel --prod`, `INFISICAL_TOKEN` |
| `ci-qa.yml` | QA | Sin credenciales GCP | Pruebas solo |

---

## 6. Duplicados y contradicciones identificados

| Problema | Descripción | Riesgo |
|----------|-------------|--------|
| `CLERK_PUBLISH_KEY` vs `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Duplicado en web `.env.QA` | Confusión sobre cuál usar |
| `NEXT_PUBLIC_GO_API_URL` web | Apunta a `mr-training-backend-380405351430.us-central1.run.app` | Puede no coincidir con servicio real `mr-training-backend` |
| `EXPO_PUBLIC_GO_API_URL` mobile | Apunta a `mr-training-backend-fybayujyeq-uc.a.run.app` | Diferente al de web (posible servicio distinto) |
| `app.json` `apiBaseUrl` | `https://mr-training.vercel.app` | Apunta a Vercel, no a Cloud Run |
| `app.json` `goApiUrl` | `http://192.168.58.104:9090` | IP local hardcodeada |
| Dos servicios Cloud Run | `mr-training-backend` vs `mr-training-api-qa` | Confusión sobre cuál recibe tráfico |
| Dos ramas CD | `QA` (cd-qa.yml) vs `qa` (deploy-qa-api.yml) | Push a qa puede desplegar sin CI |

---

## 7. Servicios integrados QA

| Servicio | Configuración QA | Notas |
|----------|-----------------|-------|
| PostgreSQL QA | Supabase (db.gqipolozqustybfcoqlf.supabase.co) | Rol `mr_training_app` |
| Redis QA | Por definir | Opcional, fail-open |
| Clerk QA | Entorno de prueba (pk_test_/sk_test_) | Verificar que es QA, no dev |
| Wompi QA | Sandbox | No pagos reales |
| Infisical QA | Entorno QA | Fuente de verdad |
| Secret Manager QA | Proyecto `mr-training-backend` | Máximo 2 versiones recuperables |
| Vercel QA | Proyecto `mr-training` | Preview deployment |
| Expo EAS QA | Canal `preview` | Build interno, no tiendas |

---

**Fin de la auditoría de entorno. No se incluyeron valores sensibles.** 

Siguiente: `ENVIRONMENT_MATRIX.md`. Continuaré creando los documentos restantes.
