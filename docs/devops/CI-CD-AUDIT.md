# MR Training — CI/CD & GitOps Audit for Cloud Run

**Fecha:** 2026-11-12  
**Auditor:** Senior DevOps / Platform Engineer  
**Alcance:** Fase 1 — Solo auditoría (sin cambios)  
**Proyecto GCP:** `mr-training-backend`  
**Región:** us-central1 (servicios), us-east1 (config por defecto)

---

## 1. Estado Actual

### 1.1 Resumen Ejecutivo

| Componente | Estado | Observaciones |
|------------|--------|---------------|
| **Backend Go (API)** | ✅ Desplegado en Cloud Run QA | `mr-training-backend` en us-central1, revisión `00007-mqz` |
| **Frontend Web (Next.js)** | ❌ Sin Dockerfile / Sin despliegue Cloud Run | Desplegado en Vercel (rama `qa` como producción) |
| **Mobile (Expo/React Native)** | ✅ Config QA lista | `app.config.js` dinámico, `.env.qa`, secretos en SM |
| **Base de Datos QA** | ⚠️ Supabase `trainingdev` | Migración 424 pendiente en `supabase/migrations` |
| **CI/CD** | ⚠️ Parcial | Workflows existen pero hay gaps (ver sección 3) |
| **Terraform** | ❌ No existe | Sin IaC para recursos GCP |
| **Infisical** | ✅ Configurado | Self-hosted en `secrets.innotechlabssas.lat`, WIF pool activo |

### 1.2 Flujo Actual (QA)

```
Push a rama QA
    │
    ├─► cd-qa.yml: Migraciones → Cloud Run (usa GCP_SERVICE_ACCOUNT_KEY ❌)
    ├─► deploy-qa-api.yml: Infisical → Secret Manager → Cloud Run + Vercel (WIF ✅)
    └─► ci-qa.yml / ci-dev.yml: Tests unitarios + migraciones dry-run (Postgres local)
```

**Problema crítico:** Dos workflows de CD para QA (`cd-qa.yml` y `deploy-qa-api.yml`) con autenticación distinta (clave JSON vs WIF). El `cd-qa.yml` usa `GCP_SERVICE_ACCOUNT_KEY` (clave de larga vida), mientras que `deploy-qa-api.yml` usa WIF correctamente.

---

## 2. Recursos Existentes (GCP)

### 2.1 Proyecto y Región

| Propiedad | Valor |
|-----------|-------|
| **Project ID** | `mr-training-backend` |
| **Project Number** | `380405351430` |
| **Región servicios** | `us-central1` |
| **Región config por defecto** | `us-east1` (corregir a `us-central1`) |

### 2.2 Cloud Run Services

| Servicio | Estado | Service Account | URL | Última revisión |
|----------|--------|-----------------|-----|-----------------|
| `mr-training-backend` | ✅ Activo (Ready) | `cloud-run-api@mr-training-backend.iam.gserviceaccount.com` | `https://mr-training-backend-fybayujyeq-uc.a.run.app` | `00007-mqz` (2026-11-12) |
| `mr-training-backend-test` | ❌ Fallido | `cloud-run-api@...` | — | — |

**Configuración `mr-training-backend` (revisión `00007-mqz`):**
- Imagen: `us-central1-docker.pkg.dev/mr-training-backend/mr-training/api:qa-c7231e7`
- Puerto: 8080
- CPU: 1 vCPU | Memoria: 512 MiB
- Min/Max instancias: 1 / 5
- Service Account: `cloud-run-api@mr-training-backend.iam.gserviceaccount.com`
- Secrets inyectados (21): `DATABASE_URL_QA`, `CLERK_*_QA`, `WOMPI_*_QA`, `APP_URL_QA`, `ERROR_WEBHOOK_DISCOR_QA`, `PLATFORM_SUPER_ADMIN_CLERK_ID_QA` (faltan `NATS_URL_QA`, `REDIS_URL_QA`, `WEB_APP_URL_QA`)

### 2.3 Artifact Registry

| Repositorio | Formato | Ubicación |
|-------------|---------|-----------|
| `mr-training` | Docker | `us-central1-docker.pkg.dev` |

### 2.4 Service Accounts

| Email | Display Name | Roles otorgados |
|-------|--------------|-----------------|
| `cloud-run-api@mr-training-backend.iam.gserviceaccount.com` | Cloud Run API Service Account | `roles/artifactregistry.reader`, `roles/secretmanager.secretAccessor` |
| `380405351430-compute@developer.gserviceaccount.com` | Default compute SA | (default) |

### 2.5 Workload Identity Federation

| Recurso | Estado | Configuración |
|---------|--------|---------------|
| Pool: `github-actions-qa` | ✅ ACTIVE | `projects/380405351430/locations/global/workloadIdentityPools/github-actions-qa` |
| Provider: `github-actions-qa` | ✅ ACTIVE | `attributeCondition: assertion.repository == 'innotechlabs01/mrTraining'` |
| Mapeo atributos | ✅ | `google.subject=assertion.sub`, `attribute.ref=assertion.ref`, `attribute.repository=assertion.repository` |

### 2.6 Secret Manager (Solo sufijo `_QA`)

**21 secretos versionados** (ver sección 4.2 para lista completa).  
Todos con `replicationPolicy: automatic`.

### 2.7 APIs Habilitadas

- `run.googleapis.com` (Cloud Run)
- `artifactregistry.googleapis.com` (Artifact Registry)
- `secretmanager.googleapis.com` (Secret Manager)
- `cloudbuild.googleapis.com` (Cloud Build)
- `iam.googleapis.com` (IAM)

---

## 3. Auditoría del Repositorio

### 3.1 Dockerfiles

| App | Dockerfile | Estado | Observaciones |
|-----|------------|--------|---------------|
| **API (Go)** | `apps/api/Dockerfile` | ✅ Multi-stage, non-root, Alpine 3.19, Go 1.25 | Correcto para Cloud Run |
| **Web (Next.js)** | ❌ No existe | Requerido para Cloud Run | Debe crearse con multi-stage (builder + runner) |
| **Mobile** | `apps/mobile/Dockerfile` | ✅ Existe | Para builds EAS / CI, no para Cloud Run |

### 3.2 GitHub Actions Workflows (`.github/workflows/`)

| Archivo | Trigger | Propósito | Estado | Problemas |
|---------|---------|-----------|--------|-----------|
| `ci.yml` | push/PR `main`, `develop` | Tests bloqueantes + preview/prod deploy (stubs) | ✅ Base sólida | Deploy stubs sin implementar |
| `ci-dev.yml` | push/PR `dev` | Tests Go/Web/Mobile + migraciones local Postgres | ✅ Funcional | Usa Postgres local, no Supabase |
| `ci-qa.yml` | push/PR `QA` | Mismo que dev pero rama QA | ✅ Funcional | Rama `QA` (mayúscula) vs `qa` (minúscula) |
| `cd-qa.yml` | push `QA` | **CD Legacy**: Migraciones + Cloud Run | ⚠️ **Deprecado** | Usa `GCP_SERVICE_ACCOUNT_KEY` (clave JSON larga vida) ❌ |
| `deploy-api.yml` | push `main` `apps/api/**` | Deploy a Render (legacy) | ⚠️ Legacy | Render ya no es target |
| `deploy-qa-api.yml` | push/PR `qa` + dispatch | **CD Actual**: Infisical → SM → Cloud Run + Vercel | ✅ **Activo** | WIF ✅, usa `deploy-qa-api.yml` correctamente |

**Inconsistencia crítica de nomenclatura:** Ramas `QA` (mayúscula) vs `qa` (minúscula). GitHub trata ramas case-sensitive. Los workflows `cd-qa.yml` y `ci-qa.yml` escuchan `QA`; `deploy-qa-api.yml` escucha `qa`. Esto causa que pushes a `qa` no disparen `cd-qa.yml`/`ci-qa.yml`, y pushes a `QA` no disparen `deploy-qa-api.yml`.

### 3.3 Scripts de Soporte

| Script | Propósito | Estado |
|--------|-----------|--------|
| `scripts/ensure-app-role.sh` | Crea rol `mr_training_app` en PG | ✅ Idempotente, condicional |
| `scripts/sync-migrations.sh` | Sincroniza `apps/api/migrations/postgres` ↔ `supabase/migrations` | ✅ `--check/--fix/--ci` |
| `scripts/check-migrations-portable.sh` | Valida migraciones portables | ✅ |
| `scripts/worktree.sh` | Gestión worktrees | ✅ (no usado en CI) |

### 3.4 Migraciones (Estado de Sincronización)

```
apps/api/migrations/postgres/: 55 archivos (001...424 + seed)
supabase/migrations/:          54 archivos (falta 424_grants_mr_training_app_all_tables.sql)
```

**Migración 424** (`424_grants_mr_training_app_all_tables.sql`) creada en `dev`, pendiente de aplicar en QA y sincronizar a `supabase/migrations`.

### 3.5 Makefile Targets

| Target | Descripción |
|--------|-------------|
| `test-all` / `test-go` / `test-web` | Tests completos |
| `build-all` / `build-go` / `build-web` | Builds |
| `lint-all` / `fmt-all` | Lint/Format |
| `ci-local` | Simula CI localmente |

---

## 4. Riesgos Identificados

| # | Riesgo | Severidad | Impacto | Mitigación |
|---|--------|-----------|---------|------------|
| **R1** | **Autenticación dual CD QA**: `cd-qa.yml` usa `GCP_SERVICE_ACCOUNT_KEY` (clave JSON larga vida) | 🔴 Crítico | Fuga de credenciales, no rotables, no auditables | **Eliminar `cd-qa.yml`**, usar solo `deploy-qa-api.yml` con WIF |
| **R2** | **Rama case-sensitivity**: `QA` vs `qa` | 🔴 Crítico | Workflows no disparan según case de rama | Estandarizar a `qa` (minúscula) en todos los workflows y branch protection |
| **R3** | **CD Legacy activo**: `cd-qa.yml` y `deploy-api.yml` (Render) | 🟠 Alto | Confusión, despliegues duplicados, credenciales legacy | Archivar/eliminar `cd-qa.yml`, `deploy-api.yml` |
| **R4** | **Web sin Dockerfile**: No desplegable en Cloud Run | 🟠 Alto | Web atada a Vercel, no portable | Crear `apps/web/Dockerfile` multi-stage para Cloud Run |
| **R5** | **Migración 424 no sincronizada**: Falta en `supabase/migrations` | 🟠 Alto | QA sin grants `mr_training_app` → 42501 en API | `sync-migrations.sh --fix` + merge `dev → QA` |
| **R6** | **Falta Terraform**: Sin IaC para recursos GCP | 🟠 Alto | Drift, no reproducible, manual | Crear módulo Terraform para Cloud Run, AR, SM, WIF, SA |
| **R7** | **Secretos incompletos en Cloud Run**: Faltan `NATS_URL_QA`, `REDIS_URL_QA`, `WEB_APP_URL_QA`, `PLATFORM_SUPER_ADMIN_CLERK_ID_QA` | 🟠 Alto | App falla en runtime si requiere esos secrets | Completar `--set-secrets` en `deploy-qa-api.yml` |
| **R8** | **Región config por defecto**: `us-east1` vs servicios en `us-central1` | 🟡 Medio | Confusión en comandos `gcloud` sin `--region` | `gcloud config set compute/region us-central1` |
| **R9** | **Sin Terraform**: Recursos creados manualmente | 🟡 Medio | Drift, no versionado, no reproducible | Ver sección 7 |
| **R10** | **Rama `QA` remota desincronizada**: 29 migraciones viejas, sin fixes recientes | 🟡 Medio | Próximo deploy a QA falla | Merge `dev → QA` antes de próximo push |

---

## 5. Configuración Faltante

### 5.1 GitHub Secrets Requeridos (Configurar en repo `innotechlabs01/mrTraining`)

| Secreto | Descripción | Estado |
|---------|-------------|--------|
| `GCP_PROJECT_ID` | `mr-training-backend` | ✅ (en workflows) |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/380405351430/locations/global/workloadIdentityPools/github-actions-qa/providers/github-actions-qa` | ⚠️ Pendiente |
| `GCP_CLOUD_RUN_SA` | `cloud-run-api@mr-training-backend.iam.gserviceaccount.com` | ⚠️ Pendiente |
| `GCP_SERVICE_ACCOUNT_KEY` | **ELIMINAR** (usado por `cd-qa.yml` legacy) | 🔴 Eliminar |
| `CORS_ORIGINS_QA` | `https://mr-training-git-qa-innotechlabs-projects.vercel.app/` | ⚠️ Pendiente |
| `INFISICAL_URL` | `https://secrets.innotechlabssas.lat` | ⚠️ Pendiente |
| `INFISICAL_TOKEN` | Token máquina Infisical (read-only) | ⚠️ Pendiente |
| `APP_DB_PASSWORD_QA` | `Tvj91mtBvYO2xguluG1T` (rol `mr_training_app` QA) | ✅ En SM, faltan en GH |
| `VERCEL_TOKEN` | Token Vercel (Settings → Tokens) | ⚠️ Pendiente |
| `VERCEL_ORG_ID` | `team_ANEIvJ4euu5lD1X9Zq2XumVa` | ✅ En workflow |
| `VERCEL_PROJECT_ID` | `prj_OILOwz2lZRvqw24nV7tmrKyz3vhw` | ✅ En workflow |
| `DATABASE_URL_QA` | Ya en Secret Manager (`DATABASE_URL_QA`) | ✅ En SM |
| `NATS_URL_QA`, `REDIS_URL_QA`, `WEB_APP_URL_QA`, `PLATFORM_SUPER_ADMIN_CLERK_ID_QA` | Faltan en Cloud Run deployment | ⚠️ Agregar a workflow |

### 5.2 Branch Protection Rules (Configurar en GitHub)

| Rama | Reglas |
|------|--------|
| `main` | Require PR reviews (2), status checks (`ci.yml` → `all-tests-passed`), linear history, no force push |
| `dev` | Require PR reviews (1), status checks (`ci-dev.yml`), no force push |
| `qa` | Require PR reviews (1), status checks (`ci-qa.yml` → renombrar a `qa`), no force push, **solo `qa` (minúscula)** |

### 5.3 GitHub Environments

| Environment | Protection Rules | Secrets |
|-------------|------------------|---------|
| `qa` | Required reviewers (1), wait timer 0min | `VERCEL_TOKEN`, `APP_DB_PASSWORD_QA` (referencia a SM) |
| `production` | Required reviewers (2), wait timer 5min | TBD |

---

## 6. Arquitectura Recomendada

### 6.1 Principios

1. **GitOps**: El estado deseado vive en Git; CI/CD converge hacia él.
2. **Imagen inmutable**: Misma imagen (digest) promovida QA → Prod.
3. **Secretos fuera del repo**: Solo referencias en workflows; valores en Secret Manager / Infisical.
4. **WIF obligatorio**: Cero claves JSON en GitHub Secrets.
4. **Separación QA/Prod**: Recursos, SAs, secretos, dominios aislados.
5. **Imagen por SHA**: Tag = `git-sha`; promoción por digest, no re-build.

### 6.2 Flujo CI/CD Propuesto

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GIT FLOW                                     │
│  feature/* → dev (CI) → qa (CI + CD QA) → main (CD Prod + approve) │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        CI (por push/PR)                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │  Go API     │  │   Web       │  │  Mobile     │                │
│  │  - lint     │  │  - lint     │  │  - typecheck│                │
│  │  - build    │  │  - build    │  │               │                │
│  │  - test     │  │  - test     │  │               │                │
│  │  - migrate  │  │               │  │               │                │
│  └─────────────┘  └─────────────┘  └─────────────┘                │
│         │              │              │                            │
│         └──────────────┼──────────────┘                            │
│                        ▼                                           │
│              ✅ All Tests Passed (required check)                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        CD QA (push a qa)                            │
│  1. WIF Auth (OIDC) → GCP                                          │
│  2. Infisical (read-only) → Poblar Secret Manager (*_QA)           │
│  3. Migraciones (rol mr_training_app via APP_DB_PASSWORD_QA)       │
│  4. Build Docker (tag = git-sha) → Push Artifact Registry          │
│  5. Deploy Cloud Run QA (--set-secrets, WIF, digest)               │
│  6. Smoke test /health + /ready                                    │
│  7. Deploy Vercel Web (--prod, solo rama qa)                       │
│  7. Registrar URL en Innotech-secrets / emitir evento              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        CD PROD (PR main + approval)                 │
│  1. Requiere approval manual (Environment: production)             │
│  2. Promueve MISMA imagen (digest) de QA → Prod                    │
│  2. Deploy Cloud Run Prod (service distinto, secrets *_PROD)       │
│  3. Smoke test + canary (10% traffic) → 100%                       │
│  4. Rollback instantáneo a revisión anterior si falla              │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.3 Separación de Secretos por Ambiente

| Patrón | QA | Producción |
|--------|-----|------------|
| **Infisical** | Entorno `qa`, paths `/api`, `/web`, `/mobile` | Entorno `production`, mismos paths |
| **Secret Manager** | Sufijo `_QA` (ej. `DATABASE_URL_QA`) | Sufijo `_PROD` (ej. `DATABASE_URL_PROD`) |
| **Cloud Run** | `--set-secrets=KEY=SECRET_QA:latest` | `--set-secrets=KEY=SECRET_PROD:latest` |
| **Vercel** | Project `mr-training`, Production Branch = `qa` | Project `mr-training-prod` o mismo con branch `main` |
| **Cloud Run Service** | `mr-training-backend` (QA) | `mr-training-backend-prod` (Prod) |
| **Service Account** | `cloud-run-api@...` (QA) | `cloud-run-api-prod@...` (Prod) |
| **Artifact Registry** | Mismo repo, tags `qa-<sha>` | Mismo repo, tags `prod-<sha>` (promovidos) |

### 6.4 Imagen y Promoción

```
Build (CI/CD QA)
    │
    ▼
Tag: us-central1-docker.pkg.dev/PROJECT/REPO/api:qa-<git-sha>
    │
    ▼
Push → Artifact Registry
    │
    ▼
Deploy Cloud Run QA (image = qa-<git-sha>)
    │
    ▼
[Tests pasan] → Promote to Prod
    │
    ▼
Retag: us-central1-docker.pkg.dev/PROJECT/REPO/api:prod-<git-sha>
    │         (o copiar digest: sha256:...)
    ▼
Deploy Cloud Run Prod (image = prod-<git-sha> / digest)
```

**Regla de oro:** Nunca re-build para producción. Misma imagen, mismo digest.

---

## 7. Plan de Implementación por Fases

### Fase 0: Limpieza y Fundamentos (Semana 1) — **BLOQUEANTE**

| Tarea | Responsable | Criterio de Aceptación |
|-------|-------------|------------------------|
| 0.1 Estandarizar rama `qa` (minúscula) en todos los workflows | DevOps | Todos los `.yml` escuchan `qa` (minúscula); branch protection en `qa` |
| 0.2 Eliminar `cd-qa.yml` y `deploy-api.yml` (legacy) | DevOps | Archivos archivados/eliminados; solo `deploy-qa-api.yml` para CD QA |
| 0.3 Configurar GitHub Secrets (ver §5.1) | DevOps | Todos los secrets listados en §5.1 presentes en repo settings |
| 0.4 Branch protection en `qa` (minúscula) + `main` | DevOps | Reglas aplicadas; `ci-qa.yml` renombrado a `qa` |
| 0.5 `gcloud config set compute/region us-central1` | DevOps | `gcloud config get-value compute/region` → `us-central1` |
| 0.6 Sincronizar migración 424: `sync-migrations.sh --fix` + commit | Backend | `supabase/migrations/424_grants_mr_training_app_all_tables.sql` existe |
| 0.7 Merge `dev → QA` (PR #34) | Backend | QA actualizada con fixes; migración 424 presente |
| 0.8 `REVOKE ADMIN OPTION FOR mr_training_app FROM postgres;` en QA | Backend | Verificado en SQL Editor QA |
| 0.9 Configurar GitHub Environments `qa` y `production` | DevOps | Environments creados con protection rules |

### Fase 1: CI/CD QA Robusto (Semana 2)

| Tarea | Responsable | Criterio de Aceptación |
|-------|-------------|------------------------|
| 1.1 Validar `deploy-qa-api.yml` end-to-end (push a `qa`) | DevOps | Pipeline verde; Cloud Run QA deployed; `/ready` OK |
| 1.2 Completar `--set-secrets` en Cloud Run (faltantes: `NATS_URL_QA`, `REDIS_URL_QA`, `WEB_APP_URL_QA`, `PLATFORM_SUPER_ADMIN_CLERK_ID_QA`) | Backend | Todos los secrets que la API usa inyectados |
| 1.3 Verificar `/ready` endpoint usa `mr_training_app` (no `postgres`) | Backend | Logs muestran conexión como `mr_training_app`; RLS activo |
| 1.4 Vercel deploy automático en workflow (verificar `--prod` solo en `qa`) | Frontend | Push a `qa` → Vercel deploy preview/prod automático |
| 1.5 Smoke tests extendidos: `/health`, `/ready`, endpoint autenticado | QA | Tests pasan en workflow post-deploy |

### Fase 2: Dockerfile Web + Cloud Run Web (Semana 3)

| Tarea | Responsable | Criterio de Aceptación |
|-------|-------------|------------------------|
| 2.1 Crear `apps/web/Dockerfile` multi-stage (builder + runner, non-root, Alpine) | Frontend | `docker build` exitoso; imagen < 200MB |
| 2.2 Agregar job `deploy-web-qa` al workflow (build + push + deploy Cloud Run) | DevOps | Web QA en Cloud Run (no solo Vercel) |
| 2.2 Configurar dominio `qa.innotechlabssas.lat` → Cloud Run Web | DevOps | `https://web-qa.innotechlabssas.lat` responde |
| 2.3 Migrar Vercel → Cloud Run para QA (opcional: mantener Vercel como fallback) | Frontend | Decisión documentada; una sola fuente de verdad |

### Fase 3: Terraform IaC (Semana 4-5)

| Tarea | Responsable | Criterio de Aceptación |
|-------|-------------|------------------------|
| 3.1 Crear estructura `terraform/` con módulos | DevOps | Estructura: `modules/{cloud-run,artifact-registry,secret-manager,wif,iam,service-accounts}` |
| 3.2 Módulo `artifact-registry` (repo `mr-training`) | DevOps | `terraform plan` → crea repo `mr-training` en us-central1 |
| 3.3 Módulo `service-accounts` (SA Cloud Run QA + Prod) | DevOps | SAs creadas con roles mínimos |
| 3.4 Módulo `workload-identity` (pool + provider GitHub) | DevOps | WIF pool/provider importados/creados |
| 3.5 Módulo `secret-manager` (replicación automática, labels) | DevOps | Secretos `_QA` y `_PROD` gestionados por TF |
| 3.6 Módulo `cloud-run` (servicio API QA + Prod, Web QA + Prod) | DevOps | `terraform plan` muestra recursos sin drift |
| 3.7 Backend state: GCS bucket + locking (Cloud Storage) | DevOps | State remoto, versionado, bloqueo |
| 3.8 Importar recursos existentes (`terraform import`) | DevOps | `terraform plan` → `No changes` |
| 3.9 CI para Terraform (`terraform fmt`, `validate`, `plan` en PR) | DevOps | Workflow `terraform.yml` en `.github/workflows/` |

### Fase 4: Producción (Semana 6)

| Tarea | Responsable | Criterio de Aceptación |
|-------|-------------|------------------------|
| 4.1 Crear recursos Prod via Terraform (SA, Cloud Run, Secrets `_PROD`) | DevOps | `terraform apply` en workspace `production` |
| 4.2 Workflow `deploy-prod-api.yml` (manual approval, promote digest) | DevOps | `workflow_dispatch` + `environment: production` |
| 4.3 Canary deploy: 10% → 50% → 100% con health checks | DevOps | Rollback automático si error rate > 5% |
| 4.4 Dominio prod: `api.innotechlabssas.lat` → Cloud Run Prod | DevOps | `https://api.innotechlabssas.lat` responde |
| 4.4 Runbook de rollback documentado | DevOps | `gcloud run services update-traffic` documentado |

### Fase 4: Observabilidad y Madurez (Continuo)

| Tarea | Criterio de Aceptación |
|-------|------------------------|
| Structured logging (JSON) en API + Cloud Logging | Logs parseables en Cloud Logging |
| Métricas Prometheus (`/metrics`) + Cloud Monitoring | Dashboards: latencia p50/p95/p99, error rate, CPU, memoria |
| Alertas: error rate > 1%, latencia p95 > 2s, CPU > 80% | Alertas en PagerDuty/Slack |
| Distributed tracing (OpenTelemetry) | Traces en Cloud Trace |
| SLOs definidos y reportados mensualmente | Documento SLO/SLA publicado |

---

## 8. Costos Potenciales (Estimación Mensual USD)

| Recurso | QA | Producción | Notas |
|---------|-----|------------|-------|
| **Cloud Run (API)** | ~$15-30 | ~$50-150 | CPU 1 vCPU, 512MiB, 1-5 instancias; request-based |
| **Cloud Run (Web)** | ~$10-20 | ~$30-80 | Si se migra de Vercel |
| **Artifact Registry** | ~$2 | ~$5 | Storage + network egress |
| **Secret Manager** | ~$1 | ~$1 | 21 secretos QA + ~21 PROD; 6 versiones cada uno |
| **Cloud Build** | ~$5 | ~$10 | Builds diarios; 120 min/día gratis |
| **Cloud Logging/Monitoring** | ~$5 | ~$15 | Logs + métricas + alertas |
| **Vercel (Web QA)** | $0 (Hobby) | $20 (Pro) | Si se mantiene Vercel para Web |
| **Supabase (QA/Prod)** | $25 (Pro) | $25+ | Plan Pro incluye DB, Auth, Realtime |
| **Infisical (self-hosted)** | $0 | $0 | En infra propia |
| **Terraform State (GCS)** | <$1 | <$1 | Bucket versionado |
| **TOTAL ESTIMADO** | **~$68/mes** | **~$236/mes** | Muy aproximado; depende de tráfico real |

> **Nota:** Cloud Run factura por uso real (vCPU-segundos, GiB-segundos, requests). QA con tráfico bajo costará ~$15-30. Producción escalará según uso real.

---

## 9. Criterios de Aceptación (Definition of Done)

### Auditoría (Esta fase)
- [x] Informe `docs/devops/CI-CD-AUDIT.md` creado y revisado
- [x] Recursos GCP inventariados
- [x] Workflows auditados y riesgos documentados
- [x] Arquitectura propuesta y plan de fases entregado

### Fase 0 (Bloqueante)
- [ ] Rama `qa` estandarizada (minúscula) en todos los workflows
- [ ] Workflows legacy eliminados (`cd-qa.yml`, `deploy-api.yml`)
- [ ] GitHub Secrets configurados (§5.1)
- [ ] Branch protection en `qa` y `main`
- [ ] Migración 424 sincronizada y merge `dev → QA` completado
- [ ] Limpieza `ADMIN OPTION` en QA ejecutada

### Fase 1 (CI/CD QA)
- [ ] Pipeline `deploy-qa-api.yml` verde end-to-end
- [ ] Cloud Run QA `/health` y `/ready` OK
- [ ] Vercel deploy automático en QA
- [ ] Secrets completos en Cloud Run (sin faltantes)

### Fase 2 (Web Cloud Run)
- [ ] `apps/web/Dockerfile` funcional
- [ ] Web QA en Cloud Run (o decisión documentada de mantener Vercel)

### Fase 3 (Terraform)
- [ ] `terraform plan` sin errores ni drift
- [ ] Recursos existentes importados
- [ ] CI de Terraform en PRs

### Fase 4 (Producción)
- [ ] Cloud Run Prod desplegado via Terraform
- [ ] Workflow `deploy-prod` con approval manual
- [ ] Canary deploy + rollback probado
- [ ] Dominio prod funcional

---

## 10. Próximos Pasos Inmediatos

1. **Aprobar este informe** → Autorizar Fase 0
2. **Ejecutar Fase 0** (esta semana) — Es bloqueante para todo lo demás
3. **Programar revisión** de arquitectura con equipo (30 min)
3. **Asignar owners** por tarea en tablero (BOARD.md / GitHub Projects)

---

**Fin del Informe de Auditoría**  
*Documento vivo — actualizar conforme avancen las fases*