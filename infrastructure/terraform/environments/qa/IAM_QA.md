# IAM Mínimo — Cloud Run QA (FASE D)

Este documento define la separación de identidades y los roles mínimos para QA.
**No se conceden Owner, Editor ni permisos globales.**

## Identidades separadas

| Identidad | Email (ejemplo) | Propósito |
|-----------|-----------------|-----------|
| GitHub Actions Deployer | `qa-deployer@mr-training-backend.iam.gserviceaccount.com` | Desplegar desde GitHub Actions (WIF) |
| Cloud Run Execution | `qa-runner@mr-training-backend.iam.gserviceaccount.com` | Identidad de ejecución del contenedor QA |
| Secret Sync | `qa-sync@mr-training-backend.iam.gserviceaccount.com` | Sincronizar secretos Infisical → Secret Manager |

## Roles mínimos por identidad

### 1. qa-deployer (GitHub Actions → GCP)
Solo los permisos necesarios para publicar y desplegar:

| Recurso | Rol | Justificación |
|---------|-----|---------------|
| Artifact Registry (`mr-training`) | `roles/artifactregistry.writer` | Push de imágenes Docker a `us-central1-docker.pkg.dev/mr-training-backend/mr-training/api` |
| Cloud Run (`mr-training-api-qa`) | `roles/run.developer` | Crear/actualizar revisiones del servicio QA |
| IAM | `roles/iam.serviceAccountUser` | Actuar como `qa-runner` al desplegar (requerido por `gcloud run deploy --service-account`) |
| Cloud Run (source) | `roles/run.invoker` | (opcional) Invocar el servicio para smoke tests |

### 2. qa-runner (Cloud Run → Secret Manager)
Solo lectura de secretos requeridos:

| Recurso | Rol | Justificación |
|---------|-----|---------------|
| Secret Manager (secretos QA) | `roles/secretmanager.secretAccessor` | Acceso de lectura a versiones de secretos (`DATABASE_URL_QA`, `CLERK_SECRET_KEY_QA`, etc.) |
| Cloud Run (ejecución) | `roles/run.invoker` | Identidad de ejecución del contenedor |

### 3. qa-sync (Infisical → Secret Manager)
Solo escritura en Secret Manager:

| Recurso | Rol | Justificación |
|---------|-----|---------------|
| Secret Manager (secretos QA) | `roles/secretmanager.admin` | Crear nuevas versiones de secretos (no destruir) |

## Workload Identity Federation (WIF)

| Elemento | Valor |
|----------|-------|
| Proyecto | `mr-training-backend` (380405351430) |
| Pool | `github-actions-qa` |
| Provider | `github-actions-qa` |
| Repositorio | `innotechlabs01/mrTraining` |
| Attribute condition | `assertion.repository == 'innotechlabs01/mrTraining' \&\& assertion.repository_owner == 'innotechlabs01'` |
| Attribute mapping | `google.subject = assertion.sub` |
| Rama/Environment autorizada | `QA` + GitHub Environment `qa` |
| No usar | `credentials_json` / claves JSON de Service Account |

## Configuración esperada en cd-qa.yml

```yaml
permissions:
  contents: read
  id-token: write

- id: auth
  uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: ${{ secrets.WIF_PROVIDER_QA }}
    service_account: ${{ secrets.WIF_SERVICE_ACCOUNT_QA }}
```

`WIF_PROVIDER_QA`: `projects/380405351430/locations/global/workloadIdentityPools/github-actions-qa/providers/github-actions-qa`

`WIF_SERVICE_ACCOUNT_QA`: `qa-deployer@mr-training-backend.iam.gserviceaccount.com`

## Cloud Run Service Account

Al desplegar, especificar:
```
--service-account qa-runner@mr-training-backend.iam.gserviceaccount.com
```

Así el contenedor QA ejecuta con la identidad de ejecución, no con la cuenta de despliegue.

## Producción

**Fuera del alcance de FASE D.** No se aplican estos roles a producción. Production requiere autorización explícita y su propia política de IAM.

## Verificación

Después de aplicar IAM en GCP real:
1. GitHub Actions puede autenticarse vía WIF (sin JSON key)
2. `gcloud auth configure-docker` funciona
3. `docker push` a Artifact Registry funciona
4. `gcloud run deploy` funciona con `--service-account qa-runner@...`
5. Cloud Run puede leer secretos de Secret Manager (`roles/secretmanager.secretAccessor`)
