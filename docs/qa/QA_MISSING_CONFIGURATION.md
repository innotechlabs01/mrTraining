# Configuración Faltante y Bloqueos QA — MR Training

**Estado:** Documento de diagnóstico. No se modificó ningún archivo. No se exponen valores sensibles.

## 1. Bloqueos críticos para desplegar QA

| # | Bloqueo | Componente | Impacto | Acción requerida |
|---|---------|-----------|---------|------------------|
| 1 | WIF pool/provider no configurado en GCP | CI/CD | No se puede autenticar GitHub Actions sin claves JSON | Crear pool `github-actions-qa` y provider en proyecto `mr-training-backend` |
| 2 | Service Accounts no creadas | CI/CD / Cloud Run | No hay identidad de despliegue ni de ejecución | Crear `qa-deployer`, `qa-runner`, `qa-sync` |
| 3 | IAM roles no aplicados | Cloud Run / Secret Manager | Cloud Run no puede leer secretos; GitHub no puede desplegar | Aplicar roles mínimos según `IAM_QA.md` |
| 4 | GitHub Environment `qa` no existe | GitHub Actions | No hay regla de protección que exija CI exitoso antes de CD | Crear environment `qa` con protección por workflow `CI - QA` |
| 5 | GitHub Secrets faltantes | CI/CD | `WIF_PROVIDER_QA`, `WIF_SERVICE_ACCOUNT_QA`, `APP_DB_PASSWORD_QA`, `INFISICAL_CLIENT_ID_QA`, `INFISICAL_CLIENT_SECRET_QA` | Configurar en GitHub |
| 6 | Infisical QA no configurada con Universal Auth | Secretos | No hay máquina identity para autenticación real en QA | Crear Universal Auth en Infisical QA, obtener Client ID/Secret |
| 7 | Dos servicios Cloud Run competidores | Cloud Run | `mr-training-backend` vs `mr-training-api-qa` | Elegir uno (recomendado: `mr-training-backend`), eliminar el otro |
| 8 | Dos ramas CD inconsistentes | GitHub Actions | `cd-qa.yml` escucha `QA`, `deploy-qa-api.yml` escucha `qa` | Consolidar en una sola rama (`qa` minúscula) |
| 9 | CI y CD no conectados | GitHub Actions | `deploy-qa-api.yml` no tiene `needs` de CI | Agregar dependencia explíciente de CI exitoso |
| 10 | `vercel --prod` en CD QA | Vercel | Publica QA en producción | Cambiar a Vercel Preview, nunca `--prod` |
| 11 | URLs de API inconsistentes entre Web y Mobile | Frontend / Mobile | Web apunta a un servicio, Mobile a otro | Unificar a un solo URL de Cloud Run QA |
| 12 | `app.json` hardcodea URLs locales/Vercel | Mobile | `apiBaseUrl` apunta a Vercel, `goApiUrl` a IP local | Verificar que `app.config.js` sobreescriba correctamente con `EXPO_PUBLIC_GO_API_URL` |

---

## 2. Variables de entorno faltantes por componente

### Backend Go (Cloud Run)

| Variable | Estado | Por qué falta |
|----------|--------|---------------|
| `DATABASE_URL_QA` | Faltante en Secret Manager | Debe sincronizarse desde Infisical QA |
| `CLERK_SECRET_KEY_QA` | Faltante en Secret Manager | Debe sincronizarse desde Infisical QA |
| `CLERK_WEBHOOK_SECRET_QA` | Faltante en Secret Manager | Debe sincronizarse desde Infisical QA |
| `WOMPI_PRIVATE_KEY_QA` | Faltante en Secret Manager | Debe sincronizarse desde Infisical QA |
| `WOMPI_INTEGRITY_SECRET_QA` | Faltante en Secret Manager | Debe sincronizarse desde Infisical QA |
| `WOMPI_EVENTS_SECRET_QA` | Faltante en Secret Manager | Debe sincronizarse desde Infisical QA |
| `REDIS_URL_QA` | Faltante en Secret Manager | Opcional, si Redis está habilitado |
| `NATS_URL_QA` | Faltante en Secret Manager | Opcional |

### Frontend Web (Vercel)

| Variable | Estado | Por qué falta |
|----------|--------|---------------|
| `NEXT_PUBLIC_GO_API_URL` | Definida en `.env.QA` | Verificar que coincida con servicio Cloud Run real |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Definida en `.env.QA` | Verificar que es entorno QA, no dev |
| `CLERK_SECRET_KEY` | Definida en `.env.QA` | Debe moverse a variables protegidas de Vercel |
| `CLERK_WEBHOOK_SECRET` | Definida en `.env.QA` | Debe moverse a variables protegidas de Vercel |

### Mobile (Expo EAS)

| Variable | Estado | Por qué falta |
|----------|--------|---------------|
| `EXPO_PUBLIC_GO_API_URL` | Definida en `.env.qa` | Verificar que coincida con servicio Cloud Run real |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Definida en `.env.qa` | Verificar que es entorno QA |
| `EXPO_PUBLIC_APP_ENV` | Faltante | No definida en `.env.qa` |

### CI/CD (GitHub)

| Variable | Estado | Por qué falta |
|----------|--------|---------------|
| `WIF_PROVIDER_QA` | Faltante | No configurada |
| `WIF_SERVICE_ACCOUNT_QA` | Faltante | No configurada |
| `INFISICAL_CLIENT_ID_QA` | Faltante | No configurada |
| `INFISICAL_CLIENT_SECRET_QA` | Faltante | No configurada |
| `INFISICAL_BASE_URL_QA` | Faltante | No configurada |
| `INFISICAL_PROJECT_ID_QA` | Faltante | No configurada |
| `GCP_PROJECT_ID` | Faltante | No configurada |
| `CORS_ORIGINS_QA` | Faltante | No configurada |
| `APP_DB_PASSWORD_QA` | Faltante | No configurada |

---

## 3. Configuración de Secret Manager QA (pendiente)

| Secreto | Versiones esperadas | Estado | Nota |
|---------|-------------------|--------|------|
| `DATABASE_URL_QA` | 2 (actual + anterior) | Faltante | Crear desde Infisical QA |
| `CLERK_SECRET_KEY_QA` | 2 (actual + anterior) | Faltante | Crear desde Infisical QA |
| `CLERK_PUBLISHABLE_KEY_QA` | 2 (actual + anterior) | Faltante | Crear desde Infisical QA |
| `CLERK_WEBHOOK_SECRET_QA` | 2 (actual + anterior) | Faltante | Crear desde Infisical QA |
| `WOMPI_PRIVATE_KEY_QA` | 2 (actual + anterior) | Faltante | Crear desde Infisical QA |
| `WOMPI_INTEGRITY_SECRET_QA` | 2 (actual + anterior) | Faltante | Crear desde Infisical QA |
| `WOMPI_EVENTS_SECRET_QA` | 2 (actual + anterior) | Faltante | Crear desde Infisical QA |
| `REDIS_URL_QA` | 2 (actual + anterior) | Faltante | Opcional |
| `NATS_URL_QA` | 2 (actual + anterior) | Faltante | Opcional |

---

## 4. Configuración de CI/CD QA (pendiente)

### GitHub Actions

| Elemento | Estado | Acción |
|----------|--------|--------|
| Workflow CI unificado | Faltante | Crear `.github/workflows/ci-qa.yml` que ejecute Go, Web, Mobile en paralelo |
| Workflow CD unificado | Faltante | Consolidar `cd-qa.yml` y `deploy-qa-api.yml` en uno solo |
| Rama oficial `qa` | Faltante | Crear en GitHub (actualmente solo `QA` mayúscula) |
| GitHub Environment `qa` | Faltante | Crear con protección por CI exitoso |
| WIF proveedor | Faltante | Configurar en GCP y GitHub Secrets |
| Service Account despliegue | Faltante | Crear en GCP |
| Service Account ejecución | Faltante | Crear en GCP |

### Pipeline esperado

```
Push a qa
  │
  ├─► CI (paralelo): Go build + tests, Web lint+build, Mobile typecheck+tests
  │     │
  │     └─► Si falla cualquiera → CD bloqueado
  │
  └─► CD (solo si CI pasó):
        ├─► WIF autenticación
        ├─► Migraciones QA (obligatorias)
        ├─► Sync Infisical → Secret Manager (SHA-256, no duplicados)
        ├─► Build + push imagen (SHA commit)
        ├─► Desplegar Cloud Run QA
        ├─► Desplegar Vercel Preview
        ├─► Smoke tests /health, /ready
        └─► Reporte de despliegue
```

---

## 5. Configuración de Vercel QA (pendiente)

| Elemento | Estado | Acción |
|----------|--------|--------|
| Proyecto Vercel QA | Por verificar | Verificar `VERCEL_PROJECT_ID`, `VERCEL_ORG_ID` |
| Variables protegidas | Por configurar | `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `NEXT_PUBLIC_GO_API_URL` |
| Preview deployment | Por configurar | Usar preview, nunca `--prod` para QA |
| Dominio QA | Por definir | `mr-training-qa.vercel.app` (por definir) |

---

## 6. Configuración de Expo EAS QA (pendiente)

| Elemento | Estado | Acción |
|----------|--------|--------|
| Perfil `preview` | Existe en `eas.json` | Verificar distribución interna |
| Variables públicas | Parcialmente en `.env.qa` | Agregar `EXPO_PUBLIC_APP_ENV` |
| Build interno | No ejecutado | Generar después de validar CI |
| Canal | `preview` | No publicar a tiendas |

---

## 7. Dependencias de Clerk y Wompi

### Clerk QA

| Elemento | Estado | Nota |
|----------|--------|------|
| Entorno QA | Por verificar | Verificar que `pk_test_`/`sk_test_` sean de QA, no de dev |
| Publishable key | Definida en web/mobile | Debe ser la misma en ambos |
| Secret key | Definida en web | Debe moverse a Secret Manager para API |
| Webhook secret | Definida en web | Debe moverse a Secret Manager para API |
| JWKS URL | En `config.go` | Por verificar |

### Wompi QA

| Elemento | Estado | Nota |
|----------|--------|------|
| Entorno | `sandbox` | En `config.go` como `WOMPI_ENV` |
| Public key | Definida en mobile `.env.qa` | Por verificar |
| Private key | Faltante en Secret Manager | Crear desde Infisical QA |
| Integrity secret | Faltante en Secret Manager | Crear desde Infisical QA |
| Events secret | Faltante en Secret Manager | Crear desde Infisical QA |
| Webhook URL | En `config.go` | Debe apuntar a API QA |
| Pagos reales | Prohibido | Solo sandbox |

---

## 8. Bloqueos de seguridad

| # | Problema | Riesgo | Mitigación |
|---|----------|--------|------------|
| 1 | `.env.qa` de mobile no está en gitignore | Secreto potencialmente expuesto | Verificar `.gitignore` |
| 2 | `CLERK_PUBLISH_KEY` duplicado en web | Confusión sobre clave correcta | Estandarizar a `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| 3 | `app.json` hardcodea `apiBaseUrl: https://mr-training.vercel.app` | Mobile apunta a Vercel, no a API | Verificar sobreescritura en `app.config.js` |
| 4 | `vercel --prod` en CD QA | QA en producción | Cambiar a preview |
| 5 | `credentials_json` en `cd-qa.yml` original | Clave JSON expuesta | Ya corregido localmente a WIF |
| 6 | `INFISICAL_TOKEN` en `deploy-qa-api.yml` | Token de larga vida | Reemplazar por Universal Auth |

---

## 9. Resumen de pasos antes de implementar

1. Crear rama `qa` en GitHub (si no existe)
2. Crear GitHub Environment `qa` con protección CI
3. Configurar WIF en GCP y GitHub Secrets
4. Crear Service Accounts y aplicar IAM
5. Configurar Infisical QA con Universal Auth
6. Sincronizar secretos Infisical → Secret Manager QA (dry-run primero)
7. Configurar variables Vercel QA y Expo EAS QA
8. Unificar URLs de API entre Web y Mobile
9. Consolidar workflows CI/CD en uno solo
10. Ejecutar pipeline y validar endpoints

**Fin del documento de bloqueos. No se incluyeron valores sensibles.**

Siguiente: `QA_TEST_STRATEGY.md`, `QA_TEST_MATRIX.md`, `QA_TEST_DATA.md` (plan de pruebas ampliado).
