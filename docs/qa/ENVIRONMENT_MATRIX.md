# Matriz Central de Variables de Entorno — MR Training QA

**Estado:** Documento de diseño. No se modificó ningún archivo. No se exponen valores sensibles.

## Leyenda

| Columna | Descripción |
|---------|-------------|
| **Nombre** | Nombre real de la variable de entorno |
| **Componente** | Quién la consume (API, Web, Mobile, CI) |
| **Archivo** | Dónde se declara o lee |
| **Obligatoria** | Sí / No |
| **Tipo** | Pública / Secreta |
| **Fuente QA** | Infisical QA / Config QA / Clerk / Wompi / Vercel |
| **Destino QA** | Cloud Run / Vercel / Expo EAS / GitHub Actions |
| **Duplicada** | Sí / No — si existe con otro nombre en otro componente |
| **Nombre distinto** | Sí / No — si el nombre difiere entre componentes |
| **Riesgo** | Bajo / Medio / Alto |
| **Estado** | Validado / Pendiente / Conflicto |

## A. Variables públicas (pueden ir al bundle de frontend/mobile)

| Nombre | Componente | Archivo | Oblig. | Tipo | Fuente QA | Destino QA | Duplicada | Nombre distinto | Riesgo | Estado |
|--------|-----------|---------|--------|------|-----------|------------|-----------|-----------------|--------|--------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Web | `.env.QA`, `next.config.js` | Sí | Pública | Clerk QA | Vercel | Sí | `CLERK_PUBLISH_KEY` | Medio | Conflicto |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Mobile | `.env.qa`, `app.config.js` | Sí | Pública | Clerk QA | Expo EAS | Sí | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Medio | Pendiente |
| `NEXT_PUBLIC_GO_API_URL` | Web | `.env.QA`, `next.config.js` | Sí | Pública | Config QA | Vercel | Sí | `EXPO_PUBLIC_GO_API_URL` | Alto | Conflicto |
| `EXPO_PUBLIC_GO_API_URL` | Mobile | `.env.qa`, `app.config.js` | Sí | Pública | Config QA | Expo EAS | Sí | `NEXT_PUBLIC_GO_API_URL` | Alto | Conflicto |
| `NEXT_PUBLIC_APP_SCHEME` | Web | `.env.QA` | No | Pública | Config QA | Vercel | No | — | Bajo | Validado |
| `NEXT_PUBLIC_WEB_INVITE_URL` | Web | `.env.QA` | No | Pública | Config QA | Vercel | No | — | Bajo | Validado |
| `NEXT_PUBLIC_EXPO_GO_URL` | Web | `.env.QA` | No | Pública | Config QA | Vercel | No | — | Bajo | Validado |
| `NEXT_PUBLIC_SUPER_ADMIN_CLERK_IDS` | Web | `.env.QA` | No | Pública | Config QA | Vercel | No | — | Bajo | Validado |
| `EXPO_PUBLIC_APP_ENV` | Mobile | (no definido) | No | Pública | Config QA | Expo EAS | No | — | Bajo | Faltante |
| `WOMPI_PUBLIC_KEY` | Web/Mobile/API | `.env.qa` (mobile) | No | Pública | Infisical QA | Vercel / Expo / Cloud Run | No | — | Medio | Pendiente |

## B. Variables privadas de frontend (solo servidor Next.js / Vercel)

| Nombre | Componente | Archivo | Oblig. | Tipo | Fuente QA | Destino QA | Duplicada | Nombre distinto | Riesgo | Estado |
|--------|-----------|---------|--------|------|-----------|------------|-----------|-----------------|--------|--------|
| `CLERK_SECRET_KEY` | Web | `.env.QA` | Sí | Secreta | Infisical QA | Vercel (protegida) | Sí | (mismo nombre en API) | Alto | Pendiente |
| `CLERK_WEBHOOK_SECRET` | Web | `.env.QA` | No | Secreta | Infisical QA | Vercel (protegida) | Sí | (mismo nombre en API) | Alto | Pendiente |
| `GO_API_ORIGIN` | Web | `next.config.js` | No | Secreta | Config QA | Vercel | No | — | Bajo | Validado |
| `BLOB_READ_WRITE_TOKEN` | Web | `.env.QA` | Sí | Secreta | Vercel | Vercel | No | — | Alto | No es Infisical |

## C. Variables privadas de backend (Cloud Run + Secret Manager)

| Nombre | Componente | Archivo | Oblig. | Tipo | Fuente QA | Destino QA | Duplicada | Nombre distinto | Riesgo | Estado |
|--------|-----------|---------|--------|------|-----------|------------|-----------|-----------------|--------|--------|
| `DATABASE_URL` | API | `config.go` | Sí | Secreta | Infisical QA | Secret Manager → Cloud Run | No | — | Alto | Pendiente |
| `CLERK_SECRET_KEY` | API | `config.go` | Sí | Secreta | Infisical QA | Secret Manager → Cloud Run | Sí | (mismo nombre en Web) | Alto | Pendiente |
| `CLERK_PUBLISHABLE_KEY` | API | `config.go` | No | Secreta | Infisical QA | Secret Manager → Cloud Run | Sí | (mismo nombre en Web/Mobile) | Medio | Pendiente |
| `CLERK_JWKS_URL` | API | `config.go` | No | Secreta | Config QA | Cloud Run | No | — | Bajo | Validado |
| `CLERK_WEBHOOK_SECRET` | API | `config.go` | No | Secreta | Infisical QA | Secret Manager → Cloud Run | Sí | (mismo nombre en Web) | Alto | Pendiente |
| `CORS_ORIGINS` | API | `config.go` | No | Secreta | Config QA | Cloud Run | No | — | Medio | Pendiente |
| `REDIS_URL` | API | `config.go` | No | Secreta | Infisical QA | Secret Manager → Cloud Run | No | — | Medio | Pendiente |
| `NATS_URL` | API | `config.go` | No | Secreta | Config QA | Cloud Run | No | — | Bajo | Validado |
| `WOMPI_PRIVATE_KEY` | API | `config.go` | Sí | Secreta | Infisical QA | Secret Manager → Cloud Run | No | — | Alto | Pendiente |
| `WOMPI_INTEGRITY_SECRET` | API | `config.go` | Sí | Secreta | Infisical QA | Secret Manager → Cloud Run | No | — | Alto | Pendiente |
| `WOMPI_EVENTS_SECRET` | API | `config.go` | Sí | Secreta | Infisical QA | Secret Manager → Cloud Run | No | — | Alto | Pendiente |
| `WOMPI_ENV` | API | `config.go` | No | Secreta | Config QA | Cloud Run | No | — | Bajo | Validado |
| `WOMPI_WEBHOOK_URL` | API | `config.go` | No | Secreta | Config QA | Cloud Run | No | — | Medio | Pendiente |
| `APP_URL` | API | `config.go` | No | Secreta | Config QA | Cloud Run | No | — | Bajo | Validado |
| `WEB_APP_URL` | API | `config.go` | No | Secreta | Config QA | Cloud Run | No | — | Bajo | Validado |
| `LOG_LEVEL` | API | `config.go` | No | Secreta | Config QA | Cloud Run | No | — | Bajo | Validado |
| `RATE_LIMIT_MAX` | API | `config.go` | No | Secreta | Config QA | Cloud Run | No | — | Bajo | Validado |
| `RATE_LIMIT_WINDOW` | API | `config.go` | No | Secreta | Config QA | Cloud Run | No | — | Bajo | Validado |
| `TRUSTED_PROXIES` | API | `config.go` | No | Secreta | Config QA | Cloud Run | No | — | Bajo | Validado |
| `INFISICAL_BASE_URL` | API | `config.go` | No | Secreta | Config QA | Cloud Run | No | — | Medio | Pendiente |
| `INFISICAL_PROJECT_ID` | API | `config.go` | No | Secreta | Config QA | Cloud Run | No | — | Medio | Pendiente |
| `INFISICAL_ENVIRONMENT` | API | `config.go` | No | Secreta | Config QA | Cloud Run | No | — | Bajo | Validado |
| `INFISICAL_SECRET_PATH` | API | `config.go` | No | Secreta | Config QA | Cloud Run | No | — | Bajo | Validado |
| `INFISICAL_CACHE_TTL` | API | `config.go` | No | Secreta | Config QA | Cloud Run | No | — | Bajo | Validado |
| `PLATFORM_SUPER_ADMIN_CLERK_ID` | API | `config.go` | No | Secreta | Config QA | Cloud Run | No | — | Medio | Pendiente |
| `APP_ENV` | API | `config.go` | No | Secreta | Config QA | Cloud Run | No | — | Bajo | Validado |
| `APP_PORT` | API | `config.go` | No | Secreta | Config QA | Cloud Run | No | — | Bajo | Validado |
| `PORT` | API | Cloud Run (inyectado) | Sí | Secreta | Cloud Run | Cloud Run | No | `APP_PORT` | Bajo | Validado |

## D. Variables de infraestructura (solo GitHub Actions / CI)

| Nombre | Componente | Archivo | Oblig. | Tipo | Fuente QA | Destino QA | Duplicada | Nombre distinto | Riesgo | Estado |
|--------|-----------|---------|--------|------|-----------|------------|-----------|-----------------|--------|--------|
| `INFISICAL_CLIENT_ID` | CI | GitHub Secrets | Sí | Secreta | CI/CD | GitHub Actions | No | — | Alto | Pendiente |
| `INFISICAL_CLIENT_SECRET` | CI | GitHub Secrets | Sí | Secreta | CI/CD | GitHub Actions | No | — | Alto | Pendiente |
| `WIF_PROVIDER_QA` | CI | GitHub Secrets | Sí | Secreta | CI/CD | GitHub Actions | No | — | Alto | Faltante |
| `WIF_SERVICE_ACCOUNT_QA` | CI | GitHub Secrets | Sí | Secreta | CI/CD | GitHub Actions | No | — | Alto | Faltante |
| `GCP_PROJECT_ID` | CI | GitHub Secrets | Sí | Secreta | CI/CD | GitHub Actions | No | — | Alto | Pendiente |
| `CORS_ORIGINS_QA` | CI | GitHub Secrets | No | Secreta | Config QA | GitHub Actions | No | — | Medio | Pendiente |
| `APP_DB_PASSWORD_QA` | CI | GitHub Secrets | Sí | Secreta | CI/CD | Migraciones QA | No | — | Alto | Pendiente |

## E. Variables de mobile (solo configuración segura para distribución)

| Nombre | Componente | Archivo | Oblig. | Tipo | Fuente QA | Destino QA | Duplicada | Nombre distinto | Riesgo | Estado |
|--------|-----------|---------|--------|------|-----------|------------|-----------|-----------------|--------|--------|
| `IOS_BUNDLE_IDENTIFIER` | Mobile | `.env.qa`, `app.config.js` | No | Pública | Config QA | EAS | No | — | Bajo | Validado |
| `ANDROID_PACKAGE` | Mobile | `.env.qa`, `app.config.js` | No | Pública | Config QA | EAS | No | — | Bajo | Validado |
| `TUNNEL_TOKEN` | Mobile | `.env` | No | Secreta | Desarrollo local | Nunca en QA | No | — | Alto | No usar en QA |

---

## 8. Variables que NO deben llegar a cada destino

| Destino | Variables prohibidas | Razón |
|---------|---------------------|-------|
| Expo EAS (bundle) | `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`, `INFISICAL_*`, `REDIS_URL`, `NATS_URL` | Nunca secretos en el bundle móvil |
| Vercel (cliente) | `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `DATABASE_URL`, `REDIS_URL`, `WOMPI_PRIVATE_KEY`, `INFISICAL_*` | Solo servidor Next.js |
| Cloud Run | `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET` | Solo CI/CD, no contenedor |

---

## 9. Resumen de conflictos y faltantes

### Conflictos de nombre (mismo concepto, nombre distinto)

| Concepto | Nombre en Web | Nombre en Mobile | Nombre en API | Acción |
|----------|--------------|------------------|---------------|--------|
| Clerk publishable key | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | `CLERK_PUBLISHABLE_KEY` | Estandarizar |
| Go API URL | `NEXT_PUBLIC_GO_API_URL` | `EXPO_PUBLIC_GO_API_URL` | (sin equivalente) | Estandarizar |
| Puerto | `APP_PORT` | (no usa) | `APP_PORT` + `PORT` | Estandarizar |

### Valores contradictorios (mismo nombre, valor distinto entre componentes)

| Nombre | Valor en Web (.env.QA) | Valor en Mobile (.env.qa) | Acción |
|--------|----------------------|--------------------------|--------|
| Go API URL | `https://mr-training-backend-380405351430.us-central1.run.app` | `https://mr-training-backend-fybayujyeq-uc.a.run.app` | Unificar a un solo servicio Cloud Run QA |

### Variables faltantes

| Nombre | Componente | Motivo |
|--------|-----------|--------|
| `EXPO_PUBLIC_APP_ENV` | Mobile | No definida en `.env.qa` |
| `WIF_PROVIDER_QA` | CI | No configurada en GitHub Secrets |
| `WIF_SERVICE_ACCOUNT_QA` | CI | No configurada en GitHub Secrets |
| `APP_DB_PASSWORD_QA` | CI | No configurada en GitHub Secrets |

---

**Fin de la matriz. No se incluyeron valores sensibles.**

Siguiente: `QA_INTEGRATION_ARCHITECTURE.md`. Continuaré.
