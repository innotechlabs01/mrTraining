# Arquitectura de Integración QA — MR Training

**Estado:** Documento de diseño. No se modificó ningún archivo. No se exponen valores sensibles.

## 1. Arquitectura de tres consumidores

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│   VERCEL QA     │     │   EXPO EAS QA       │     │  GCP CLOUD RUN  │
│  Next.js Web    │     │  React Native App   │     │   API Go/Fiber  │
│                 │     │                     │     │                 │
│ Variables:      │     │ Variables:          │     │ Variables:      │
│ - NEXT_PUBLIC_* │     │ - EXPO_PUBLIC_*     │     │ - APP_ENV       │
│ - CLERK_*       │     │ - EXPO_PUBLIC_*     │     │ - DATABASE_URL  │
│ (protegidas)    │     │ (públicas, bundle)  │     │ - CLERK_SECRET_ │
│                 │     │                     │     │ - WOMPI_*       │
└─────────┬───────┘     └──────────┬──────────┘     └─────────┬───────┘
          │                        │                          │
          │ HTTP + Clerk JWT       │ HTTP + Clerk JWT         │
          ▼                        ▼                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    INFORMATION FLOW QA                              │
│                                                                     │
│  Infisical QA (fuente central)                                      │
│  ├─► Google Secret Manager QA ─► Cloud Run (secretos backend)      │
│  ├─► Vercel QA (variables protegidas frontend)                     │
│  └─► Expo EAS QA (variables públicas mobile)                       │
│                                                                     │
│  Consumidores → API Cloud Run → PostgreSQL QA / Redis QA / Clerk   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Consumidor 1 — Vercel (Next.js Web)

| Aspecto | Configuración QA |
|---------|-----------------|
| Dominio | Vercel QA (preview) |
| Variables públicas | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_GO_API_URL`, `NEXT_PUBLIC_APP_SCHEME`, `NEXT_PUBLIC_WEB_INVITE_URL`, `NEXT_PUBLIC_EXPO_GO_URL`, `NEXT_PUBLIC_SUPER_ADMIN_CLERK_IDS` |
| Variables privadas (servidor) | `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` |
| Proxy API | Rewrites `/api/v1/*`, `/public/*`, `/uploads/*`, `/health` → Cloud Run QA |
| Autenticación | Clerk QA (publishable key en cliente, secret key en servidor) |

### Consumidor 2 — Cloud Run (API Go)

| Aspecto | Configuración QA |
|---------|-----------------|
| Servicio | `mr-training-backend` (usar el existente, no crear segundo) |
| Región | `us-central1` |
| Puerto | `8080` (Cloud Run inyecta `PORT`) |
| Service Account | `qa-runner@mr-training-backend.iam.gserviceaccount.com` |
| Secretos | `DATABASE_URL_QA`, `CLERK_SECRET_KEY_QA`, `CLERK_PUBLISHABLE_KEY_QA`, `CLERK_WEBHOOK_SECRET_QA`, `WOMPI_PRIVATE_KEY_QA`, `WOMPI_INTEGRITY_SECRET_QA`, `WOMPI_EVENTS_SECRET_QA` |
| Versiones Secret Manager | Máximo 2 recuperables por secreto (actual + anterior) |
| Health checks | `/health`, `/ready` |

### Consumidor 3 — Expo EAS (Mobile)

| Aspecto | Configuración QA |
|---------|-----------------|
| Canal | `preview` |
| Distribución | Interna (no tiendas) |
| Bundle ID iOS | `com.innotechlabssas.mrtraining.qa` |
| Package Android | `com.innotechlabssas.mrtraining.qa` |
| Variables públicas | `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_GO_API_URL` |
| Variables prohibidas | Cualquier secreto privado (DB, Clerk secret, Wompi secret, Infisical) |

---

## 2. Flujo de sincronización de secretos

```
Infisical QA (fuente central)
│
├─► Sincronizador Go (infrastructure/secrets)
│   ├─► Comparación SHA-256 en memoria
│   ├─► No crear versión si valor no cambió
│   ├─► Allowlist obligatoria
│   ├─► Dry-run inicial
│   └─► Google Secret Manager QA (máximo 2 versiones)
│       └─► Cloud Run QA (--set-secrets)
│
├─► Vercel QA
│   └─► Variables protegidas (CLERK_SECRET_KEY, etc.)
│       └─► Next.js servidor
│
└─► Expo EAS QA
    └─► Variables públicas de build (EXPO_PUBLIC_*)
        └─► Bundle móvil (solo públicas)
```

### Reglas de sincronización

1. Infisical QA es la fuente central. No hay tres copias manuales.
2. No copiar secretos DEV a QA automáticamente.
3. No copiar QA a producción.
4. No sincronizar secretos privados a `EXPO_PUBLIC_*`.
5. No sincronizar credenciales privadas de backend a Vercel si no son necesarias.
6. No almacenar secretos en GitHub Actions si pueden consumirse de forma segura desde Infisical.
7. No exponer valores en logs.
8. Evitar cambios de variables que disparen despliegues innecesarios.
9. Máximo dos versiones recuperables por secreto QA.
10. No crear versiones duplicadas si el valor no cambió.
11. No ejecutar destrucciones durante la primera ejecución del pipeline.

---

## 3. Contratos de integración

### C1 — Web → API

| Contrato | Especificación QA |
|----------|-------------------|
| URL base | `NEXT_PUBLIC_GO_API_URL` → Cloud Run QA |
| Proxy | Next.js rewrites `/api/v1/*` → Cloud Run (misma origin, evita CORS) |
| Autenticación | Clerk JWT enviado en cabecera `Authorization` |
| Endpoints | `/health`, `/ready`, `/api/v1/*` |
| CORS | Orígenes: dominio Vercel QA, dominio mobile QA (sin comodines) |

### C2 — Mobile → API

| Contrato | Especificación QA |
|----------|-------------------|
| URL base | `EXPO_PUBLIC_GO_API_URL` → Cloud Run QA |
| Autenticación | Clerk Expo (JWT en cabecera) |
| Endpoints | `/api/v1/*` |
| Prohibido | Acceso directo a PostgreSQL, Redis, Secret Manager |

### C3 — API → Servicios externos

| Servicio | Conexión QA | Notas |
|----------|-------------|-------|
| PostgreSQL QA | `DATABASE_URL_QA` (Secret Manager) | Supabase, rol `mr_training_app` |
| Redis QA | `REDIS_URL_QA` (Secret Manager) | Opcional, fail-open |
| Clerk QA | `CLERK_SECRET_KEY_QA` (Secret Manager) | Autenticación backend |
| Wompi QA | `WOMPI_PRIVATE_KEY_QA` (Secret Manager) | Sandbox, no pagos reales |
| Infisical QA | `INFISICAL_*` (config bootstrap) | Fuente de verdad de secretos |

### C4 — CI/CD → GCP

| Contrato | Especificación QA |
|----------|-------------------|
| Autenticación | WIF (Workload Identity Federation), sin claves JSON |
| Service Account despliegue | `qa-deployer@mr-training-backend.iam.gserviceaccount.com` |
| Service Account ejecución | `qa-runner@mr-training-backend.iam.gserviceaccount.com` |
| Artifact Registry | `us-central1-docker.pkg.dev/mr-training-backend/mr-training/api` |
| Imagen | Etiqueta SHA del commit (inmutable, no `latest`) |

---

## 4. Puertos y URLs QA

| Componente | Puerto/QA | URL esperada |
|------------|-----------|--------------|
| Cloud Run API | `8080` (PORT inyectado) | `https://mr-training-backend-...us-central1.run.app` |
| Vercel Web | 443 (HTTPS) | `https://mr-training-qa.vercel.app` (por definir) |
| Mobile | N/A (dispositivo) | Conexión directa a Cloud Run API |

**Pendiente de unificar:** Web apunta a `mr-training-backend-380405351430.us-central1.run.app`, Mobile apunta a `mr-training-backend-fybayujyeq-uc.a.run.app`. Deben ser el mismo servicio.

---

## 5. Aislamiento y seguridad

| Aspecto | Configuración QA |
|---------|-----------------|
| Multi-tenant | RLS en PostgreSQL QA, aislamiento por coach |
| CORS | Orígenes explícitos (Vercel QA, mobile QA), sin `*` |
| Clerk | Entorno QA, no mezclar con DEV ni producción |
| Wompi | Sandbox, webhooks apuntan a API QA |
| Secretos | No en Git, no en bundle móvil, no en logs |
| Producción | Completamente aislada, sin acceso desde CI/CD QA |

---

**Fin del documento de arquitectura. No se incluyeron valores sensibles.**

Siguiente: `QA_MISSING_CONFIGURATION.md` — bloqueos y configuración faltante. Continuaré.
