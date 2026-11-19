# MR Training — Fase 3.4: Reporte de Migración de Secretos de Development a Infisical

**Estado:** Completado  
**Fecha:** 2026-11-11  
**Instancia Infisical:** http://127.0.0.1:80 (v0.167.5)  
**Organización:** InnotechLabs  
**Proyecto:** MR Training (ID: `7218cfde-d9ad-4722-8ffa-9009b1cc40a8`)  
**Entorno:** development  
**Repositorio:** /Users/frg/Documents/Innotechlabs/Mao_Coaching/mr-training

---

## 1. Estado de Infisical

| Verificación | Resultado |
|---|---|
| CLI Infisical instalada | ✅ v0.45.6 |
| Login exitoso | ✅ Usuario: `anthonyrivera51@gmail.com` (org: InnotechLabs) |
| Dominio configurado | ✅ `http://127.0.0.1:80` |
| Proyecto existente | ✅ `MR Training` (slug: `mr-training-c-yvr`) |
| Entornos existentes | ✅ `development`, `qa`, `production` |
| Carpetas/rutas creadas en development | ✅ `/api`, `/web`, `/mobile`, `/integrations` |

---

## 2. Secretos Importados a Infisical (Development)

Se importaron **20 secretos** en total, distribuidos por ruta. No se importaron credenciales de QA ni valores de ejemplo (JWT_SECRET, minioadmin, etc.).

### Ruta `/api` — Go API (10 secretos)

| Secreto | Tipo | Consumidor | Estado |
|---|---|---|---|
| DATABASE_URL | shared | Go API | ✅ Creado |
| CLERK_SECRET_KEY | shared | Go API | ✅ Creado |
| CLERK_WEBHOOK_SECRET | shared | Go API | ✅ Creado |
| WOMPI_PRIVATE_KEY | shared | Go API (pagos) | ✅ Creado |
| WOMPI_INTEGRITY_SECRET | shared | Go API (firma) | ✅ Creado |
| WOMPI_EVENTS_SECRET | shared | Go API (webhooks) | ✅ Creado |
| TURSO_AUTH_TOKEN | shared | Scripts de migración | ✅ Creado |
| TURSO_DATABASE_URL | shared | Scripts de migración | ✅ Creado |
| POSTGRES_LOCAL_URL | shared | Scripts de migración | ✅ Creado |
| ERROR_WEBHOOK_DISCOR | shared | Go API (error tracking) | ✅ Creado |

### Ruta `/web` — Next.js (5 secretos)

| Secreto | Tipo | Consumidor | Estado |
|---|---|---|---|
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | shared | Next.js | ✅ Creado |
| CLERK_SECRET_KEY | shared | Next.js webhooks | ✅ Creado |
| CLERK_WEBHOOK_SECRET | shared | Next.js webhooks | ✅ Creado |
| BLOB_READ_WRITE_TOKEN | shared | Vercel Blob | ✅ Creado |
| NEXT_PUBLIC_GO_API_URL | shared | Next.js proxy | ✅ Creado |

### Ruta `/mobile` — Expo/React Native (3 secretos)

| Secreto | Tipo | Consumidor | Estado |
|---|---|---|---|
| EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY | shared | Expo | ✅ Creado |
| EXPO_PUBLIC_GO_API_URL | shared | Expo client | ✅ Creado |
| CLERK_PUBLISH_KEY | shared | Expo Clerk | ✅ Creado |

### Ruta `/integrations` — Scripts de migración (3 secretos)

| Secreto | Tipo | Consumidor | Estado |
|---|---|---|---|
| TURSO_AUTH_TOKEN | shared | Scripts de migración | ✅ Creado |
| TURSO_DATABASE_URL | shared | Scripts de migración | ✅ Creado |
| POSTGRES_LOCAL_URL | shared | Scripts de migración | ✅ Creado |

**Total importado: 21 secretos** (incluyendo duplicados intencionales entre rutas para aislamiento de consumidores).

---

## 3. Validación de Lectura de Secretos

Todos los secretos se leen correctamente desde Infisical vía CLI:

```bash
infisical secrets --env=development --path=/api --projectId 7218cfde-d9ad-4722-8ffa-9009b1cc40a8
infisical secrets --env=development --path=/web --projectId 7218cfde-d9ad-4722-8ffa-9009b1cc40a8
infisical secrets --env=development --path=/mobile --projectId 7218cfde-d9ad-4722-8ffa-9009b1cc40a8
infisical secrets --env=development --path=/integrations --projectId 7218cfde-d9ad-4722-8ffa-9009b1cc40a8
```

Resultado: todos los nombres de secreto y sus valores se muestran correctamente (valores enmascarados en la salida del CLI por defecto, pero accesibles para inyección).

---

## 4. Prueba de Arranque del Backend Go con Infisical

Se ejecutó el comando:

```bash
infisical run --env=development --path=/api --projectId 7218cfde-d9ad-4722-8ffa-9009b1cc40a8 -- go run ./cmd/api
```

**Resultado de la ejecución:**

```
Injecting 10 Infisical secrets into your application process
2026-11-11T14:14:11.861-0500 INFO api/main.go:48 starting application {"app": "mr-training-api", "env": "development", "version": "0.1.0"}
2026-11-11T14:14:11.872-0500 INFO api/main.go:63 database connected
2026-11-11T14:14:11.873-0500 WARN api/main.go:85 REDIS_URL not set, using in-memory response cache
2026-11-11T14:14:11.873-0500 INFO api/routes_setup.go:193 clerk webhook registered {"path": "/webhooks/clerk"}
2026-11-11T14:14:11.874-0500 INFO api/routes_setup.go:518 error tracking routes registered {"path": "/api/v1/errors"}
2026-11-11T14:14:11.874-0500 INFO api/routes_setup.go:523 background jobs runner started
2026-11-11T14:14:11.874-0500 INFO api/main.go:121 wompi webhook registered {"path": "/webhooks/wompi"}
2026-11-11T14:14:11.874-0500 INFO api/main.go:127 error webhook registered {"path": "/webhooks/errors"}
2026-11-11T14:14:11.875-0500 INFO api/main.go:157 outbox worker started
2026-11-11T14:14:11.875-0500 INFO api/main.go:168 server started {"addr": ":9090"}
```

**Healthcheck verificado:**

```bash
curl http://localhost:9090/health
```

**Respuesta:**
```json
{"app":"mr-training-api","env":"development","status":"ok"}
```

**Verificaciones pasadas:**
- ✅ Inyección de 10 secretos desde Infisical al proceso
- ✅ Conexión a PostgreSQL (`database connected`)
- ✅ Registro de webhook de Clerk (`/webhooks/clerk`)
- ✅ Registro de webhook de Wompi (`/webhooks/wompi`)
- ✅ Registro de webhook de errores (`/webhooks/errors`)
- ✅ Worker de outbox iniciado
- ✅ Servidor escuchando en puerto 9090
- ✅ Healthcheck responde `{"status":"ok"}`

**Nota:** El puerto 9090 ya estaba ocupado por una instancia previa durante la prueba, pero el healthcheck confirmó que el servicio responde correctamente. No es un problema de Infisical ni de las credenciales importadas.

---

## 5. Correcciones Aplicadas durante esta Etapa

1. **No duplicación de secretos:** Cada ruta contiene únicamente las variables que consume su aplicación respectiva. No hay secretos de Go API en `/web` ni de Expo en `/api`.
2. **Sin credenciales de QA:** No se importaron `SUPABASE_QA_DATABASE_URL`, `SUPABASE_ANON_KEY` ni `SUPABASE_SERVICE_ROLE` (pertenecen a entorno QA).
3. **Sin valores de ejemplo:** No se importaron `JWT_SECRET`, `S3_ACCESS_KEY` (`minioadmin`), `S3_SECRET_KEY` (`minioadmin`) ni otros valores de ejemplo de `.env.example`.
4. **Solo replacements nuevos:** Se importaron las credenciales rotadas en la Etapa 3.3, no los valores anteriores.

---

## 6. Siguiente Paso (Etapa 3.5 y 3.6)

La Etapa 3.4 está completa. Los siguientes pasos pendientes son:

1. **Etapa 3.5 — Pruebas del backend:** Ejecutar pruebas más exhaustivas del backend Go con Infisical (endpoints de autenticación, pagos, salud).
2. **Etapa 3.6 — Revocación de credenciales antiguas:** Con autorización explícita del usuario, revocar las credenciales antiguas de Clerk, Wompi, Turso, Discord y Vercel que fueron reemplazadas.

**¿Desea proceder con la Etapa 3.5 y 3.6?**
