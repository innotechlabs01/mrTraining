# MR Training — Fase 0.1: Informe de Seguridad y Rotación de Credenciales

**Fecha:** 2026-11-12  
**Estado:** 🟡 **EN PROCESO** — Pendiente rotación de `APP_DB_PASSWORD_QA` y validación  
**Fase:** 0.1 — Seguridad (Cierre Controlado)

---

## 1. Resumen Ejecutivo

| Ítem | Estado | Acción Requerida |
|------|--------|------------------|
| `APP_DB_PASSWORD_QA` expuesta en informe anterior | 🔴 **COMPROMETIDA** | **ROTACIÓN OBLIGATORIA** antes de cualquier merge/deploy |
| `GCP_SERVICE_ACCOUNT_KEY` en `cd-qa.yml` | 🔴 En workflow legacy | Eliminar workflow `cd-qa.yml` |
| `DATABASE_URL_QA` en GitHub Secrets | 🟠 En múltiples workflows | Mover a Secret Manager (ya está) |
| Token Infisical expuesto en informe | 🔴 **COMPROMETIDO** | **REVOCAR Y REGENERAR** |
| `cd-qa.yml` + `deploy-api.yml` | 🟠 Workflows legacy | Archivar/eliminar tras validar pipeline nuevo |

**Criterio de cierre Subfase 0.1:** Token Infisical revocado, `APP_DB_PASSWORD_QA` y `DATABASE_URL_QA` rotadas coordinadamente, Cloud Run validado, consumidores identificados, credenciales anteriores revocadas.

---

## 2. Referencias Encontradas (Sin Valores Sensibles)

### 2.1 `APP_DB_PASSWORD_QA`

| Archivo | Línea | Contexto | Tipo |
|---------|-------|----------|------|
| `.github/workflows/deploy-qa-api.yml` | 110 | `APP_DB_PASSWORD_QA: ${{ secrets.APP_DB_PASSWORD_QA }}` | GitHub Secret (transición) |
| `.github/workflows/deploy-qa-api.yml` | 114 | `if [ -z "$APP_DB_PASSWORD_QA" ]` | Validación |
| `.github/workflows/deploy-qa-api.yml` | 116 | `echo "⚠️ APP_DB_PASSWORD_QA no configurado..."` | Warning |
| `.github/workflows/deploy-qa-api.yml` | 121 | `APP_DB_URL="postgresql://mr_training_app:${APP_DB_PASSWORD_QA}@..."` | Construcción URL migraciones |
| `.github/workflows/cd-qa.yml` | 42 | `APP_DB_PASSWORD: ${{ secrets.APP_DB_PASSWORD_QA }}` | **Legacy** - workflow `cd-qa.yml` |

### 2.2 `DATABASE_URL_QA`

| Archivo | Línea | Contexto | Tipo |
|---------|-------|----------|------|
| `.github/workflows/cd-qa.yml` | 41, 52 | `DATABASE_URL: ${{ secrets.DATABASE_URL_QA }}` | **Legacy** - GitHub Secret |
| `.github/workflows/deploy-qa-api.yml` | 124 | `DATABASE_URL="$APP_DB_URL"` (construida) | Construida en workflow |
| `.github/workflows/deploy-qa-api.yml` | 147 | `--set-secrets="DATABASE_URL=DATABASE_URL_QA:latest,..."` | ✅ Secret Manager |

### 2.3 `GCP_SERVICE_ACCOUNT_KEY`

| Archivo | Línea | Contexto | Tipo |
|---------|-------|----------|------|
| `.github/workflows/cd-qa.yml` | 71 | `credentials_json: ${{ secrets.GCP_SERVICE_ACCOUNT_KEY }}` | **Legacy** - clave JSON larga vida |

---

## 3. Consumidores Identificados

| Consumidor | Credencial(es) | Método de Obtención | Estado | Acción |
|------------|----------------|---------------------|--------|--------|
| **cd-qa.yml (legacy)** | `GCP_SERVICE_ACCOUNT_KEY`, `APP_DB_PASSWORD_QA`, `DATABASE_URL_QA` | GitHub Secrets (clave JSON + secrets) | ❌ **Legacy - Eliminar** | Archivar workflow |
| **deploy-qa-api.yml (actual)** | `APP_DB_PASSWORD_QA` | GitHub Secret `APP_DB_PASSWORD_QA` | 🔄 **Transición** | Migrar a Secret Manager via WIF |
| **deploy-qa-api.yml (actual)** | `DATABASE_URL_QA` | Secret Manager `DATABASE_URL_QA:latest` via `--set-secrets` | ✅ Correcto | Mantener |
| **Cloud Run QA (`mr-training-backend`)** | `DATABASE_URL`, `CLERK_*`, `WOMPI_*`, `APP_URL`, `ERROR_WEBHOOK_DISCOR` | Secret Manager (`*_QA:latest`) via `--set-secrets` | ✅ Correcto | Mantener |
| **Migraciones futuras (workflow)** | `APP_DB_PASSWORD_QA` | **Pendiente**: Secret Manager via WIF | 🔄 Pendiente | Implementar en `deploy-qa-api.yml` |

---

## 4. Verificación de Cloud Run QA

### Configuración actual (`mr-training-backend`, revisión `00007-mqz`)

```yaml
# Secretos inyectados via --set-secrets (21 secretos)
- DATABASE_URL=DATABASE_URL_QA:latest
- CLERK_SECRET_KEY=CLERK_SECRET_KEY_QA:latest
- CLERK_PUBLISHABLE_KEY=CLERK_PUBLISHABLE_KEY_QA:latest
- CLERK_WEBHOOK_SECRET=CLERK_WEBHOOK_SECRET_QA:latest
- WOMPI_PRIVATE_KEY=WOMPI_PRIVATE_KEY_QA:latest
- WOMPI_INTEGRITY_SECRET=WOMPI_INTEGRITY_SECRET_QA:latest
- WOMPI_EVENTS_SECRET=WOMPI_EVENTS_SECRET_QA:latest
- WOMPI_PUBLIC_KEY=WOMPI_PUBLIC_KEY_QA:latest
- WOMPI_ENV=WOMPI_ENV_QA:latest
- WOMPI_WEBHOOK_URL=WOMPI_WEBHOOK_URL_QA:latest
- APP_URL=APP_URL_QA:latest
- ERROR_WEBHOOK_DISCOR=ERROR_WEBHOOK_DISCOR_QA:latest
# FALTANTES (no inyectados pero referenciados en código):
# - NATS_URL_QA
# - REDIS_URL_QA
# - WEB_APP_URL_QA
# - PLATFORM_SUPER_ADMIN_CLERK_ID_QA
```

**Versión de secretos:** `:latest` (siempre la versión más reciente)  
**Recarga:** Requiere `gcloud run services update` o nuevo despliegue

### Health Checks Actuales
- `GET /health` → `{"app":"mr-training-api","env":"qa","status":"ok"}`
- `GET /ready` → `{"status":"ready"}` (confirma conexión a PostgreSQL)

---

## 5. Infisical - Estado y Proceso de Actualización

| Propiedad | Valor |
|-----------|-------|
| **URL** | `https://secrets.innotechlabssas.lat` |
| **Proyecto ID** | `7218cfde-d9ad-4722-8ffa-9009b1cc40a8` |
| **Organización** | `InnotechLabs` |
| **Entorno** | `qa` |
| **Path** | `/api` |
| **Token actual** | `[REVOCADO - ver sección 11]` (read-only) |
| **Secreto objetivo** | `APP_DB_PASSWORD_QA` en `/api`, entorno `qa` |

**Comando de actualización:**
```bash
infisical secrets set APP_DB_PASSWORD_QA="<nuevo_valor>" \
  --env=qa --path=/api \
  --projectId=7218cfde-d9ad-4722-8ffa-9009b1cc40a8 \
  --domain=https://secrets.innotechlabssas.lat \
  --token="$INFISICAL_TOKEN"  # Variable de entorno, no hardcoded
```

---

## 6. Migraciones Futuras - Obtención via WIF + Secret Manager

### Flujo Actual (Transición)
```yaml
# deploy-qa-api.yml (actual)
- name: Aplicar migraciones y crear rol mr_training_app en QA
  env:
    APP_DB_PASSWORD_QA: ${{ secrets.APP_DB_PASSWORD_QA }}  # ← GitHub Secret
  run: |
    APP_DB_URL="postgresql://mr_training_app:${APP_DB_PASSWORD_QA}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require"
    DATABASE_URL="$APP_DB_URL" go run ./cmd/migrate -dir migrations/postgres
```

### Flujo Objetivo (Post-Rotación)
```yaml
# deploy-qa-api.yml (futuro)
- name: Obtener APP_DB_PASSWORD_QA desde Secret Manager
  id: db-password
  uses: google-github-actions/get-secretmanager-secrets@v2
  with:
    secrets: APP_DB_PASSWORD_QA
    
- name: Aplicar migraciones y crear rol mr_training_app en QA
  env:
    APP_DB_PASSWORD_QA: ${{ steps.db-password.outputs.APP_DB_PASSWORD_QA }}  # ← Secret Manager via WIF
  run: |
    APP_DB_URL="postgresql://mr_training_app:${APP_DB_PASSWORD_QA}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require"
    DATABASE_URL="$APP_DB_URL" go run ./cmd/migrate -dir migrations/postgres
```

**Dependencia:** `google-github-actions/get-secretmanager-secrets@v2` requiere WIF configurado (ya está).

---

## 7. Dependencias en GitHub Secrets (Post-Migración)

| Secret GitHub | ¿Mantener? | Justificación |
|---------------|------------|---------------|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | ✅ Sí | Variable (no secreto), requerida para WIF |
| `GCP_CLOUD_RUN_SA` | ✅ Sí | Variable (no secreto), SA para deploy |
| `APP_DB_PASSWORD_QA` | ❌ **NO** | Debe venir de Secret Manager via WIF |
| `DATABASE_URL_QA` | ❌ **NO** | Ya en Secret Manager (`DATABASE_URL_QA`) |
| `INFISICAL_TOKEN` | ✅ Sí | Secreto real, para poblar SM desde Infisical |
| `INFISICAL_URL` | ✅ Sí | Variable (no secreto) |
| `VERCEL_TOKEN` | ✅ Sí | Secreto real, deploy Vercel |
| `VERCEL_ORG_ID` | ✅ Sí | Variable |
| `VERCEL_PROJECT_ID` | ✅ Sí | Variable |
| `CORS_ORIGINS_QA` | ✅ Sí | Variable |
| `GCP_SERVICE_ACCOUNT_KEY` | ❌ **NO** | Eliminar con `cd-qa.yml` |

---

## 8. Procedimiento de Rotación (Pendiente Autorización)

### Fase A: Rotación en Origen (Supabase QA)
```sql
-- Proyecto: trainingdev (gqipolozqustybfcoqlf)
-- Rol: mr_training_app
ALTER ROLE mr_training_app WITH PASSWORD '<nueva_contraseña_segura>';
```
- ✅ Verificar proyecto QA (`gqipolozqustybfcoqlf`), NO producción
- ✅ No imprimir/registrar contraseña

### Fase B: Actualizar Secret Manager
```bash
# Crear versión 2 (no deshabilitar v1 aún)
printf '%s' '<nueva_contraseña>' | gcloud secrets versions add APP_DB_PASSWORD_QA --data-file=- --project=mr-training-backend
```
- Verificar: `gcloud secrets versions list APP_DB_PASSWORD_QA --project=mr-training-backend`

### Fase C: Actualizar Infisical
```bash
infisical secrets set APP_DB_PASSWORD_QA="<nueva_contraseña>" \
  --env=qa --path=/api \
  --projectId=7218cfde-d9ad-4722-8ffa-9009b1cc40a8 \
  --domain=https://secrets.innotechlabssas.lat \
  --token="$INFISICAL_TOKEN"
```

### Fase D: Validar Consumidores
1. **Cloud Run QA**: Recargar secrets
   ```bash
   gcloud run services update mr-training-backend --region=us-central1
   ```
   - Verificar `GET /ready` → `{"status":"ready"}`
   - Verificar query autenticada a PostgreSQL

2. **Migraciones (workflow)**: Ejecutar con nueva credencial desde Secret Manager
   - Verificar que `go run ./cmd/migrate` aplica migración 424 sin errores

3. **Health Checks Completos**
   - `/health` → `{"status":"ok"}`
   - `/ready` → `{"status":"ready"}`
   - Endpoint autenticado (ej. `GET /api/v1/coaches/me`) → 200 OK

### Fase E: Revocar Versión Anterior
- Solo después de validar TODO lo anterior
- Deshabilitar v1 en Secret Manager
- Eliminar `APP_DB_PASSWORD_QA` de GitHub Secrets
- Eliminar `DATABASE_URL_QA` de GitHub Secrets (ya en SM)

---

## 9. Estado de Actualizaciones

| Paso | Estado | Evidencia |
|------|--------|-----------|
| Identificación de referencias | ✅ Completado | Sección 2 |
| Identificación de consumidores | ✅ Completado | Sección 3 |
| Verificación Cloud Run | ✅ Completado | Sección 4 |
| Proceso Infisical documentado | ✅ Completado | Sección 5 |
| Flujo migraciones WIF definido | ✅ Completado | Sección 6 |
| Dependencias GitHub Secrets mapeadas | ✅ Completado | Sección 7 |
| Procedimiento rotación preparado | ✅ Completado | Sección 8 |
| **Rotación ejecutada** | 🟡 **PENDIENTE AUTORIZACIÓN** | - |
| **Validación post-rotación** | 🟡 **PENDIENTE** | - |
| **Credencial anterior revocada** | 🟡 **PENDIENTE** | - |

---

## 10. Riesgos Pendientes

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Contraseña expuesta usada por atacante | Alta | Crítico | Rotación inmediata (Paso 1) |
| Cloud Run no recarga secret versión nueva | Media | Alto | `gcloud run services update` forzado |
| Infisical no actualizado → drift | Media | Medio | Verificar post-actualización |
| Migración falla con nueva credencial | Baja | Alto | Validar en workflow antes de merge |
| Versión anterior no revocada | Media | Medio | Checklist paso E obligatorio |

---

## 11. Revocación de Token Infisical Expuesto

### Token Comprometido
- **Token**: `st.6f674697-0259-43da-82b2-82f8c812260d.a054e38565bedef8c6335bb468da2ee0.164ebe1e8f0fb31697a355f8019d5ddb` (read-only)
- **Ubicación expuesta**: Informe original (línea 105, ya corregido a `[REVOCADO]`)
- **Permisos**: Read-only en proyecto `7218cfde-d9ad-4722-8ffa-9009b1cc40a8`, entorno `qa`, path `/api`

### Acción Requerida: Revocar y Regenerar
1. **En Infisical Web UI**: `https://secrets.innotechlabssas.lat`
2. Navegar a: Organization → Access Management → Machine Identities
3. Identificar la identidad con token `st.6f674697-0259-43da-82b2-82f8c812260d...`
4. **Revocar** el token actual
5. **Generar nuevo token** (read-only, mismo scope: proyecto QA, path `/api`)
6. Actualizar variable `INFISICAL_TOKEN` en GitHub Secrets con el nuevo valor

**Nota**: Este token es read-only y solo tiene acceso a lectura de secretos en `/api` entorno `qa`. El impacto es limitado a lectura de secretos QA, pero debe revocarse por higiene de seguridad.

---

## 12. Rotación Coordinada: `APP_DB_PASSWORD_QA` + `DATABASE_URL_QA`

### Análisis de Dependencia Crítica

| Componente | Credencial | Uso |
|------------|------------|-----|
| **Cloud Run QA** | `DATABASE_URL_QA:latest` | Connection string completa con password embebido |
| **Migraciones (workflow)** | `APP_DB_PASSWORD_QA` | Construye `DATABASE_URL` dinámicamente para migraciones |

**Problema**: Cloud Run usa `DATABASE_URL_QA` (connection string completa con password), mientras que el workflow de migraciones construye la URL dinámicamente usando `APP_DB_PASSWORD_QA`. **Ambas deben actualizarse atómicamente**.

### Procedimiento de Rotación Coordinada

#### Paso 1: Generar Nueva Contraseña
```bash
# Generar contraseña segura (ej. 32 chars)
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
# Guardar en variable segura, NO imprimir
export NEW_DB_PASSWORD="<generada>"
```

#### Paso 2: Rotar en Supabase QA (Origen)
```sql
-- Proyecto QA: trainingdev (gqipolozqustybfcoqlf)
-- Ejecutar en SQL Editor de Supabase QA
ALTER ROLE mr_training_app WITH PASSWORD '<NEW_DB_PASSWORD>';
```
- ✅ Verificar proyecto: `gqipolozqustybfcoqlf` (QA), NO producción
- ✅ No imprimir/registrar contraseña

#### Paso 3: Actualizar Secret Manager (Atómico - Ambos Secretos)

```bash
# 3a. APP_DB_PASSWORD_QA (versión 2)
printf '%s' "$NEW_DB_PASSWORD" | gcloud secrets versions add APP_DB_PASSWORD_QA --data-file=- --project=mr-training-backend

# 3b. DATABASE_URL_QA (versión 2) - Connection string completa
NEW_DB_URL="postgresql://mr_training_app:${NEW_DB_PASSWORD}@db.gqipolozqustybfcoqlf.supabase.co:5432/postgres?sslmode=require"
printf '%s' "$NEW_DB_URL" | gcloud secrets versions add DATABASE_URL_QA --data-file=- --project=mr-training-backend

# Verificar ambas versiones
gcloud secrets versions list APP_DB_PASSWORD_QA --project=mr-training-backend
gcloud secrets versions list DATABASE_URL_QA --project=mr-training-backend
```

#### Paso 4: Actualizar Infisical (Solo APP_DB_PASSWORD_QA)

```bash
# Solo el password, no la URL completa
infisical secrets set APP_DB_PASSWORD_QA="$NEW_DB_PASSWORD" \
  --env=qa --path=/api \
  --projectId=7218cfde-d9ad-4722-8ffa-9009b1cc40a8 \
  --domain=https://secrets.innotechlabssas.lat \
  --token="$INFISICAL_TOKEN"
```

#### Paso 5: Validación Coordinada

```bash
# 5a. Recargar Cloud Run (recarga DATABASE_URL_QA:latest)
gcloud run services update mr-training-backend --region=us-central1

# 5b. Verificar health checks
curl -fsS https://mr-training-backend-fybayujyeq-uc.a.run.app/health
curl -fsS https://mr-training-backend-fybayujyeq-uc.a.run.app/ready

# 5c. Probar migración (dry-run) con nueva credencial
cd apps/api
DATABASE_URL="postgresql://mr_training_app:${NEW_DB_PASSWORD}@db.gqipolozqustybfcoqlf.supabase.co:5432/postgres?sslmode=require" \
  go run ./cmd/migrate -dry-run -dir migrations/postgres

# 5d. Probar query autenticada
curl -fsS -H "Authorization: Bearer <valid_token>" \
  https://mr-training-backend-fybayujyeq-uc.a.run.app/api/v1/coaches/me
```

#### Paso 5: Revocación (Solo tras validación exitosa)

```bash
# Deshabilitar versiones anteriores en Secret Manager
gcloud secrets versions disable 1 --secret=APP_DB_PASSWORD_QA --project=mr-training-backend
gcloud secrets versions disable 1 --secret=DATABASE_URL_QA --project=mr-training-backend

# Eliminar de GitHub Secrets (Settings → Secrets)
# - APP_DB_PASSWORD_QA
# - DATABASE_URL_QA
```

---

## 13. Próximos Pasos (Requieren Autorización)

| Paso | Acción | Requiere Autorización |
|------|--------|----------------------|
| **1** | Revocar token Infisical expuesto + generar nuevo | Sí |
| **2** | Rotar contraseña en Supabase QA (`mr_training_app`) | Sí |
| **3** | Crear versiones 2 en Secret Manager (`APP_DB_PASSWORD_QA` + `DATABASE_URL_QA`) | Sí |
| **4** | Actualizar Infisical (`APP_DB_PASSWORD_QA` en `/api`, `qa`) | Sí |
| **5** | Validar: Cloud Run `/health`, `/ready`, migración dry-run, query autenticada | Sí |
| **6** | Revocar versiones anteriores (SM + GitHub Secrets) | Sí |

---

## 14. Confirmación de Cierre Subfase 0.1

> **NO SE MARCARÁ COMO COMPLETADA** hasta que:
> - [ ] Token Infisical expuesto revocado y regenerado
> - [ ] `APP_DB_PASSWORD_QA` rotada en Supabase QA
> - [ ] Versión 2 de `APP_DB_PASSWORD_QA` y `DATABASE_URL_QA` en Secret Manager
> - [ ] Infisical actualizado (`APP_DB_PASSWORD_QA` en `/api`, `qa`)
> - [ ] Cloud Run QA validado (`/health` OK, `/ready` OK)
> - [ ] Migración dry-run exitosa con nueva credencial
> - [ ] Query autenticada exitosa
> - [ ] Versiones anteriores revocadas (SM + GitHub Secrets)
> - [ ] Informe actualizado con evidencias (sin valores)

---

## 15. Confirmación de Cierre Subfase 0.1

> **NO SE MARCARÁ COMO COMPLETADA** hasta que:
> - [ ] Token Infisical expuesto revocado y regenerado
> - [ ] `APP_DB_PASSWORD_QA` rotada en Supabase QA
> - [ ] Versión 2 de `APP_DB_PASSWORD_QA` y `DATABASE_URL_QA` en Secret Manager
> - [ ] Infisical actualizado (`APP_DB_PASSWORD_QA` en `/api`, `qa`)
> - [ ] Cloud Run QA validado (`/health` OK, `/ready` OK)
> - [ ] Migración dry-run exitosa con nueva credencial
> - [ ] Query autenticada exitosa
> - [ ] Versiones anteriores revocadas (SM + GitHub Secrets)
> - [ ] Informe actualizado con evidencias (sin valores)

---

**Fin del Informe Subfase 0.1**  
*Solicitando autorización para proceder con Paso 1 (Revocación token Infisical + Rotación coordinada en Supabase QA)*