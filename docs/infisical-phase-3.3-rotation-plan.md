# MR Training — Etapa 3.3: Plan Controlado de Rotación de Credenciales (Development)

**Estado:** Listo para revisión y aprobación  
**Fecha:** 2026-11-10  
**Repositorio:** /Users/frg/Documents/Innotechlabs/Mao_Coaching/mr-training  
**Referencias:** docs/infisical-integration-audit.md, docs/infisical-phase-2-report.md  
**Entorno objetivo:** Development únicamente  
**Entornos excluidos:** QA y Producción (no se tocan en esta etapa)

---

## Fase A — Validación de Exposición

### A.1 Archivos rastreados por Git (actualmente)

El comando `git ls-files` confirma que los únicos archivos relacionados con credenciales que están **rastreados actualmente** por Git son:

| Archivo | Estado | Tipo de contenido |
|---|---|---|
| `.env.example` | Rastreado | Valores de ejemplo (placeholders) |
| `apps/api/config/.env.example` | Rastreado | Valores de ejemplo (placeholders) |
| `apps/web/.env.example` | Rastreado | Valores de ejemplo (placeholders) |
| `apps/mobile/app.json` | Rastreado | Clave pública Clerk + URLs (no secretos privados) |
| `e2e/credentials.env.example` | Rastreado | Ejemplo de credenciales e2e |

### A.2 Archivos NO rastreados por Git (ignorados vía .gitignore)

Estos archivos existen en el working tree pero **no están rastreados por Git** (`git check-ignore` los confirma):

| Archivo | Estado | Tipo de contenido |
|---|---|---|
| `apps/mobile/.env` | Ignorado | Credenciales locales de desarrollo |
| `apps/web/.env.local` | Ignorado | Credenciales locales de desarrollo |
| `apps/api/config/.env.local` | Ignorado | Credenciales locales de desarrollo |
| `.env.migration` | Ignorado | Credenciales de migración local |
| `.env.migration.backup-20261028-183650` | Ignorado | Backup de credenciales de migración |
| `.env.local` (root) | Ignorado | Credenciales locales de desarrollo |

**Conclusión clave:** `.env.local` no significa automáticamente exposición en Git. Estos archivos están ignorados y nunca fueron rastreados (el historial Git no contiene commits que los hayan añadido).

### A.3 Credenciales en el historial Git

Buscado en `git log --all -p` y `git log --all -S`:

| Patrón buscado | Archivos donde aparece | Naturaleza |
|---|---|---|
| `sk_test_` | Tests de Go (`config_test.go`, `auth_test_helper_test.go`, `auth_test.go`) | Fixtures de prueba, no credenciales reales |
| `whsec_` | Tests de webhook Clerk (`clerk_webhook_test.go`, `clerk_webhook.go`) | Fixtures de prueba, no credenciales reales |
| `clerkPublishableKey` | `apps/mobile/app.json` (historial) | Clave pública, no secreta |
| `WOMPI_PRIVATE_KEY` | `apps/api/internal/config/config.go`, tests | Referencia a variable de entorno, no valor hardcodeado |

**Conclusión:** No hay evidencia de que valores de secretos reales hayan sido commiteados al historial Git. Los valores con prefijo `sk_test_` y `whsec_` en archivos de test son fixtures/mocks.

### A.4 Correcciones a la auditoría 3.2

| Variable | Clasificación anterior | Clasificación corregida | Justificación |
|---|---|---|---|
| `SUPABASE_ANON_KEY` | Secreta | **Pública** | Clave anon de Supabase, diseñada para uso de cliente (browser/mobile). No equivale a `SERVICE_ROLE`. |
| `VERCEL_OIDC_TOKEN` | Secreta, rotar | **Posiblemente temporal** | Token OIDC de Vercel para CI/CD. Puede ser de corta duración. Verificar naturaleza antes de rotar manualmente. |
| `S3_ACCESS_KEY` | Secreta, rotar | **Valor de ejemplo** | Aparece en `.env.example` como `minioadmin` (valor por defecto de MinIO). No rotar a menos que se confirme uso real. |
| `S3_SECRET_KEY` | Secreta, rotar | **Valor de ejemplo** | Aparece en `.env.example` como `minioadmin` (valor por defecto de MinIO). No rotar a menos que se confirme uso real. |
| `JWT_SECRET` | Secreta, rotar | **Valor de ejemplo** | Aparece en `.env.example` como `your-256-bit-jwt-secret-change-in-production`. No rotar a menos que se confirme uso real como secreto efectivo. |

### A.5 Credenciales que SÍ requieren rotación (development)

| Proveedor | Variable | Motivo de rotación |
|---|---|---|
| Clerk | `CLERK_SECRET_KEY` | Presente en archivos locales ignorados (`apps/web/.env.local`, `apps/api/config/.env.local`) |
| Clerk | `CLERK_WEBHOOK_SECRET` | Presente en archivo local ignorado (`apps/api/config/.env.local`) |
| Wompi | `WOMPI_PRIVATE_KEY` | Presente en archivo local ignorado; proveedor activo de pagos |
| Wompi | `WOMPI_INTEGRITY_SECRET` | Presente en archivo local ignorado |
| Wompi | `WOMPI_EVENTS_SECRET` | Presente en archivo local ignorado |
| Turso | `TURSO_DATABASE_URL` | Credencial de migración local expuesta en archivo ignorado |
| Turso | `TURSO_AUTH_TOKEN` | Credencial de migración local expuesta en archivo ignorado |
| Turso | `POSTGRES_LOCAL_URL` | Credencial de base de datos local expuesta en archivo ignorado |
| Discord | `ERROR_WEBHOOK_DISCOR` | URL de webhook expuesta en archivo local ignorado |
| Vercel | `BLOB_READ_WRITE_TOKEN` | Token de storage expuesto en archivo local ignorado |

### A.6 Credenciales que NO requieren rotación (por ahora)

| Proveedor | Variable | Motivo |
|---|---|---|
| Clerk | `CLERK_PUBLISHABLE_KEY` | Pública, no secreta |
| Clerk | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Pública, no secreta |
| Supabase | `SUPABASE_ANON_KEY` | Pública (clave anon de cliente) |
| Supabase | `SUPABASE_SERVICE_ROLE` | Pertenece a QA, no a development |
| Vercel | `VERCEL_OIDC_TOKEN` | Puede ser temporal; verificar naturaleza antes de rotar |
| S3 | `S3_ACCESS_KEY` | Valor de ejemplo `minioadmin` en `.env.example` |
| S3 | `S3_SECRET_KEY` | Valor de ejemplo `minioadmin` en `.env.example` |
| JWT | `JWT_SECRET` | Valor de ejemplo en `.env.example` |

---

## Fase B — Matriz de Rotación

El documento detallado se encuentra en `docs/infisical-phase-3.3-rotation-plan.md`. A continuación se presenta la matriz resumida.

| Proveedor | Variable | Entorno | Consumidor | Tipo | Exposición confirmada | Acción requerida | Estado |
|---|---|---|---|---|---|---|---|
| Clerk | `CLERK_SECRET_KEY` | development | Go API, Next.js webhooks | Secreta API | Sí (archivos locales ignorados) | Generar reemplazo en Clerk Dashboard | Pendiente |
| Clerk | `CLERK_WEBHOOK_SECRET` | development | Go API, Next.js webhooks | Secreta webhook | Sí (archivo local ignorado) | Generar reemplazo en Clerk Dashboard | Pendiente |
| Wompi | `WOMPI_PRIVATE_KEY` | development | Go API (pagos) | Secreta API | Sí (archivo local ignorado) | Generar reemplazo en Wompi Dashboard (sandbox) | Pendiente |
| Wompi | `WOMPI_INTEGRITY_SECRET` | development | Go API (pagos) | Secreta firma | Sí (archivo local ignorado) | Generar reemplazo en Wompi Dashboard (sandbox) | Pendiente |
| Wompi | `WOMPI_EVENTS_SECRET` | development | Go API (webhooks pagos) | Secreta webhook | Sí (archivo local ignorado) | Generar reemplazo en Wompi Dashboard (sandbox) | Pendiente |
| Turso | `TURSO_DATABASE_URL` | development | Scripts de migración | Secreta conexión | Sí (archivo local ignorado) | Generar reemplazo en Turso Dashboard | Pendiente |
| Turso | `TURSO_AUTH_TOKEN` | development | Scripts de migración | Secreta token | Sí (archivo local ignorado) | Generar reemplazo en Turso Dashboard | Pendiente |
| Turso | `POSTGRES_LOCAL_URL` | development | Scripts de migración | Secreta conexión | Sí (archivo local ignorado) | Generar reemplazo en PostgreSQL local | Pendiente |
| Discord | `ERROR_WEBHOOK_DISCOR` | development | Go API (error tracking) | Secreta webhook | Sí (archivo local ignorado) | Generar nuevo webhook en Discord | Pendiente |
| Vercel | `BLOB_READ_WRITE_TOKEN` | development | Next.js (@vercel/blob) | Secreta token | Sí (archivo local ignorado) | Generar reemplazo en Vercel Dashboard | Pendiente |
| Vercel | `VERCEL_OIDC_TOKEN` | development | Next.js CI/CD | Posiblemente temporal | No confirmada | Verificar naturaleza antes de decidir | Pendiente |
| S3/MinIO | `S3_ACCESS_KEY` | development | Go API (storage) | Secreta access key | No (valor de ejemplo `minioadmin`) | Rotar solo si se confirma uso real | Pendiente |
| S3/MinIO | `S3_SECRET_KEY` | development | Go API (storage) | Secreta secret key | No (valor de ejemplo `minioadmin`) | Rotar solo si se confirma uso real | Pendiente |
| JWT | `JWT_SECRET` | development | Go API (firma tokens) | Secreta criptográfica | No (valor de ejemplo en `.env.example`) | Rotar solo si se confirma uso real | Pendiente |

---

## Fase C — Orden Recomendado de Rotación

### Orden seguro (una por uno)

1. **Clerk:** `CLERK_SECRET_KEY` → `CLERK_WEBHOOK_SECRET`
2. **Wompi:** `WOMPI_PRIVATE_KEY` → `WOMPI_INTEGRITY_SECRET` → `WOMPI_EVENTS_SECRET`
3. **Turso:** `TURSO_AUTH_TOKEN` → `TURSO_DATABASE_URL` → `POSTGRES_LOCAL_URL`
4. **Discord:** `ERROR_WEBHOOK_DISCOR`
5. **Vercel:** `BLOB_READ_WRITE_TOKEN` → Revisar `VERCEL_OIDC_TOKEN`
6. **S3/MinIO:** Solo si se confirma uso real de credenciales de ejemplo
7. **JWT:** Solo si se confirma que el valor de ejemplo fue usado como secreto real

### Reglas de ejecución

- **Nunca revocar la credencial antigua antes de verificar que el reemplazo funciona.**
- **Rotar una credencial a la vez.** Validar después de cada rotación.
- **No tocar QA ni Producción.**
- **No modificar bases de datos ni ejecutar migraciones.**
- **No alterar código de pagos, autenticación o infraestructura.**

---

## Instrucciones Paso a Paso por Proveedor

### 1. Clerk — `CLERK_SECRET_KEY`

**Generar reemplazo:**
1. Ingresar a Clerk Dashboard (https://dashboard.clerk.com)
2. Seleccionar la instancia de MR Training (entorno de desarrollo/test)
3. Ir a API Keys → Secret Key → "Create new key" o rotar la actual
4. Copiar la nueva `sk_test_*` (no compartir en el chat)

**Sustituir:**
1. Abrir `apps/api/config/.env.local` y `apps/web/.env.local` (locales, ignorados por Git)
2. Reemplazar el valor de `CLERK_SECRET_KEY` con el nuevo
3. Guardar archivos (no commitear)

**Validar:**
```bash
cd apps/api && go build ./...
cd apps/web && pnpm lint
```
El backend debe compilar sin errores de configuración faltante.

---

### 2. Clerk — `CLERK_WEBHOOK_SECRET`

**Generar reemplazo:**
1. Clerk Dashboard → Webhooks → Seleccionar el webhook de MR Training
4. "Regenerate secret" o crear nuevo webhook
5. Copiar el nuevo `whsec_*`

**Sustituir:**
1. Abrir `apps/api/config/.env.local`
2. Reemplazar `CLERK_WEBHOOK_SECRET`

**Validar:**
- Verificar que el endpoint de webhook de Clerk esté configurado con la misma URL
- Probar delivery de un webhook de prueba desde Clerk Dashboard

---

### 3. Wompi — `WOMPI_PRIVATE_KEY`

**Generar reemplazo:**
1. Ingresar a Wompi Dashboard (entorno sandbox)
2. Ir a API Keys / Integración → Secret Key
3. Generar nueva clave `prv_test_*`
4. La clave anterior se invalida tras generar la nueva (según política de Wompi)

**Sustituir:**
1. Abrir `apps/api/config/.env.local`
2. Reemplazar `WOMPI_PRIVATE_KEY`

**Validar:**
- Ejecutar pruebas de pago en sandbox (no usar tarjetas reales)
- Verificar que los webhooks de Wompi se reciben correctamente

---

### 4. Wompi — `WOMPI_INTEGRITY_SECRET`

**Generar reemplazo:**
1. Wompi Dashboard → Configuración de integridad / Firma de webhooks
2. Generar nuevo secreto de integridad

**Sustituir:**
1. Abrir `apps/api/config/.env.local`
2. Reemplazar `WOMPI_INTEGRITY_SECRET`

**Validar:**
- Verificar que las firmas de los webhooks de Wompi se validan correctamente

---

### 5. Wompi — `WOMPI_EVENTS_SECRET`

**Generar reemplazo:**
1. Wompi Dashboard → Eventos / Webhooks
2. Regenerar secreto de eventos

**Sustituir:**
1. Abrir `apps/api/config/.env.local`
2. Reemplazar `WOMPI_EVENTS_SECRET`

**Validar:**
- Verificar recepción de eventos de Wompi

---

### 6. Turso — `TURSO_AUTH_TOKEN`

**Generar reemplazo:**
1. Ingresar a Turso Dashboard (https://app.turso.tech)
2. Ir a la organización de MR Training → Tokens
3. Generar nuevo token de autenticación
4. Revocar el antiguo solo después de validar el nuevo

**Sustituir:**
1. Abrir `.env.migration` (local, ignorado)
2. Reemplazar `TURSO_AUTH_TOKEN`

**Validar:**
- Probar conexión a Turso desde scripts de migración local

---

### 7. Turso — `TURSO_DATABASE_URL`

**Generar reemplazo:**
1. Turso Dashboard → Base de datos de MR Training (development)
2. Obtener URL de conexión (`libsql://...`)

**Sustituir:**
1. Abrir `.env.migration`
2. Reemplazar `TURSO_DATABASE_URL`

**Validar:**
- Probar consulta de lectura a la base de datos Turso

---

### 8. Turso — `POSTGRES_LOCAL_URL`

**Generar reemplazo:**
1. PostgreSQL local en puerto 5435 (según `.env.migration`)
2. Si se rota la contraseña de postgres, actualizar en PostgreSQL local primero

**Sustituir:**
1. Abrir `.env.migration`
2. Reemplazar `POSTGRES_LOCAL_URL`

**Validar:**
- Probar conexión a PostgreSQL local

---

### 9. Discord — `ERROR_WEBHOOK_DISCOR`

**Generar reemplazo:**
1. Ingresar a Discord → Configuración del servidor → Integraciones → Webhooks
2. Seleccionar el webhook de errores de MR Training
3. "Copiar URL de webhook" o regenerar
4. La URL antigua deja de funcionar al regenerar

**Sustituir:**
1. Abrir `apps/api/config/.env.local` y `apps/api/config/.env.qa` (si aplica)
2. Reemplazar `ERROR_WEBHOOK_DISCOR`

**Validar:**
- Enviar un mensaje de prueba al webhook
- Verificar recepción en el canal de Discord

---

### 10. Vercel — `BLOB_READ_WRITE_TOKEN`

**Generar reemplazo:**
1. Ingresar a Vercel Dashboard → MR Training project → Settings → Storage → Blob
3. Generar nuevo token de lectura/escritura
4. El token anterior deja de funcionar

**Sustituir:**
1. Abrir `apps/web/.env.local`
2. Reemplazar `BLOB_READ_WRITE_TOKEN`

**Validar:**
- Probar subida/lectura de un archivo en Vercel Blob desde Next.js

---

### 11. Vercel — `VERCEL_OIDC_TOKEN` (revisar naturaleza)

**Antes de rotar:**
1. Verificar si es un token OIDC de corta duración (generado por CI/CD) o un token de larga duración almacenado
2. Si es temporal, no requiere rotación manual (se regenera automáticamente en cada job de CI)
3. Si es de larga duración, seguir el mismo procedimiento que `BLOB_READ_WRITE_TOKEN`

**Decisión:** Pendiente de verificación por el usuario.

---

### 12. S3/MinIO — `S3_ACCESS_KEY` y `S3_SECRET_KEY`

**Condición:** Rotar **únicamente** si se confirma que las credenciales de ejemplo (`minioadmin`) fueron utilizadas en un entorno real.

**Si se confirma uso real:**
1. Generar nuevas claves en MinIO/S3 console
2. Actualizar `apps/api/config/.env.local`
3. Validar acceso al bucket

**Si no se confirma uso real:** No rotar. Son valores de ejemplo de `.env.example`.

---

### 13. JWT — `JWT_SECRET`

**Condición:** Rotar **únicamente** si se confirma que el valor de ejemplo de `.env.example` fue utilizado como secreto real en desarrollo.

**Si se confirma uso real:**
1. Generar nuevo secreto de 256 bits (ej: `openssl rand -base64 32`)
2. Actualizar `apps/api/config/.env.local`
3. Validar que los tokens de sesión sigan funcionando

**Si no se confirma uso real:** No rotar.

---

## Comandos de Validación (sin exposición de secretos)

```bash
# Backend Go - compilar y probar
cd apps/api && go build ./... && go test ./...

# Web Next.js - lint y pruebas
cd apps/web && pnpm lint && pnpm test

# Mobile - typecheck
cd apps/mobile && npx tsc --noEmit && npm test

# Verificar que no hay archivos .env rastreados por Git
git ls-files | grep -iE '\.env[^x]' || echo "Ningún archivo .env rastreados (correcto)"

# Verificar que app.json no contiene secretos privados (solo públicas y URLs)
git diff --cached apps/mobile/app.json | grep -iE 'sk_|whsec_|prv_|secret|password|token' || echo "No se detectaron secretos privados en app.json"
```

**Nota:** Ninguno de estos comandos imprime valores de secretos.

---

## Dependencias y Orden de Ejecución

```
1. Clerk SECRET_KEY      → Validar backend Go compila
   ↓
2. Clerk WEBHOOK_SECRET  → Validar delivery de webhook
   ↓
3. Wompi PRIVATE_KEY     → Validar pago sandbox
   ↓
4. Wompi INTEGRITY_SECRET → Validar firmas webhook
   ↓
5. Wompi EVENTS_SECRET   → Validar recepción eventos
   ↓
6. Turso AUTH_TOKEN      → Validar conexión Turso
   ↓
7. Turso DATABASE_URL    → Validar consulta lectura
   ↓
8. Turso POSTGRES_LOCAL_URL → Validar conexión Postgres local
   ↓
9. Discord WEBHOOK       → Validar mensaje prueba
   ↓
10. Vercel BLOB_TOKEN    → Validar subida/lectura archivo
   ↓
11. S3/MinIO (condicional) → Validar acceso bucket
   ↓
12. JWT (condicional)    → Validar tokens de sesión
```

---

## Acciones que Requieren Autorización Explícita del Usuario

| Acción | Proveedor | Por qué requiere autorización |
|---|---|---|
| Generar nueva `CLERK_SECRET_KEY` | Clerk | Invalida la clave actual; afecta autenticación |
| Regenerar `CLERK_WEBHOOK_SECRET` | Clerk | Puede interrumpir delivery de webhooks hasta actualizar Clerk Dashboard |
| Generar nueva `WOMPI_PRIVATE_KEY` | Wompi | Invalida clave de pagos sandbox; afecta checkout |
| Generar nuevos secretos Wompi | Wompi | Puede interrumpir validación de webhooks de pagos |
| Generar nuevo `TURSO_AUTH_TOKEN` | Turso | Invalida token de migración; afecta scripts de migración |
| Rotar `POSTGRES_LOCAL_URL` | PostgreSQL local | Cambia credencial de base de datos local |
| Regenerar webhook Discord | Discord | URL antigua deja de funcionar inmediatamente |
| Generar nuevo `BLOB_READ_WRITE_TOKEN` | Vercel | Invalida token de storage; afecta subida de archivos |
| Rotar `S3_ACCESS_KEY`/`S3_SECRET_KEY` | S3/MinIO | Solo si se confirma uso real de credenciales de ejemplo |
| Rotar `JWT_SECRET` | JWT | Invalida todos los tokens de sesión existentes |

---

## Próximo Paso (Etapa 3.4 — Migración de Development)

Una vez el usuario haya:
1. Revisado y aprobado este plan
2. Generado credenciales de reemplazo en los proveedores correspondientes
3. Validado que cada reemplazo funciona

Entonces se procederá a:
- Importar únicamente los secretos de development a Infisical (rutas `/api`, `/web`, `/mobile`, `/integrations`)
- Ejecutar el backend Go con `infisical run --env=development --path=/api -- go run ./cmd/api`
- Validar healthcheck y conexión a base de datos

**Detenerse aquí.** No ejecutar ninguna rotación hasta que el usuario apruebe este plan.
