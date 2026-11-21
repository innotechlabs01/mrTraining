# Estrategia de Pruebas Integral QA — MR Training

**Estado:** Documento de diseño. No se modificó ningún archivo. No se exponen valores sensibles.

## 1. Niveles de prueba

| Nivel | Nombre | Objetivo | Automatizado |
|-------|--------|----------|--------------|
| 01 | CI — Pruebas automáticas | Validar código antes de cualquier despliegue | Sí |
| 02 | Integración — Servicios | Verificar conectividad API ↔ servicios QA | Sí |
| 03 | E2E — Frontend Web | Flujo real de usuario en Vercel QA | Parcial (Playwright) |
| 04 | E2E — Mobile | Build interno y flujo real en dispositivo | Parcial (Maestro/E2E) |
| 05 | Seguridad y despliegue | Aislamiento, CORS, CI bloquea CD, rollback | Parcial |

---

## 2. Nivel 01 — CI — Pruebas automáticas

### 01.01 — Build y tests de Go (API)

| Elemento | Especificación |
|----------|---------------|
| Comando | `cd apps/api && go build ./... && go vet ./... && go test -p 1 ./internal/... -race -count=1` |
| Precondiciones | PostgreSQL local en Docker para tests de integración |
| Resultado esperado | Build exitoso, vet sin errores, todos los tests pasan |
| Bloquea CD | Sí |

### 01.02 — Lint, typecheck y build de Next.js (Web)

| Elemento | Especificación |
|----------|---------------|
| Comando | `cd apps/web && pnpm lint && pnpm build` |
| Precondiciones | Variables de entorno QA definidas |
| Resultado esperado | Lint sin errores, build exitoso |
| Bloquea CD | Sí |

### 01.03 — Typecheck y tests de Expo (Mobile)

| Elemento | Especificación |
|----------|---------------|
| Comando | `cd apps/mobile && npx tsc --noEmit && npm test` |
| Precondiciones | Dependencias instaladas |
| Resultado esperado | Typecheck sin errores, tests pasan |
| Bloquea CD | Sí |

### 01.04 — Validación de migraciones

| Elemento | Especificación |
|----------|---------------|
| Comando | `cd apps/api && go run ./cmd/migrate -dry-run -dir migrations/postgres` |
| Precondiciones | `DATABASE_URL` de test configurada |
| Resultado esperado | Migraciones aplicables sin errores |
| Bloquea CD | Sí |

---

## 3. Nivel 02 — Integración — Servicios

### 02.01 — API conectada a PostgreSQL QA

| Elemento | Especificación |
|----------|---------------|
| Precondiciones | Cloud Run QA desplegado, `DATABASE_URL_QA` en Secret Manager |
| Paso | Llamar `/ready` en Cloud Run QA |
| Resultado esperado | Responde `{"status":"ready"}` |
| Automatizado | Sí (curl en smoke test) |

### 02.02 — Redis QA (si habilitado)

| Elemento | Especificación |
|----------|---------------|
| Precondiciones | `REDIS_URL_QA` configurada |
| Paso | Verificar que API puede conectar a Redis (no bloqueante, fail-open) |
| Resultado esperado | API arranca incluso sin Redis (in-memory fallback) |
| Automatizado | Sí |

### 02.03 — Clerk QA

| Elemento | Especificación |
|----------|---------------|
| Precondiciones | `CLERK_SECRET_KEY_QA` en Secret Manager, `CLERK_PUBLISHABLE_KEY_QA` en Vercel/Expo |
| Paso | Intento de login con credenciales de prueba QA |
| Resultado esperado | Sesión Clerk válida, token JWT emitido |
| Automatizado | Parcial |

### 02.04 — Wompi sandbox QA

| Elemento | Especificación |
|----------|---------------|
| Precondiciones | Credenciales Wompi sandbox en Secret Manager |
| Paso | Crear intención de pago en modo sandbox |
| Resultado esperado | Intención creada sin cargo real |
| Automatizado | Parcial |

### 02.05 — Infisical y Secret Manager QA

| Elemento | Especificación |
|----------|---------------|
| Precondiciones | Universal Auth configurado, Secret Manager QA con secretos |
| Paso | Autenticar contra Infisical QA, leer secreto, verificar versión en Secret Manager |
| Resultado esperado | Autenticación exitosa, secreto sincronizado, máximo 2 versiones |
| Automatizado | Sí |

---

## 4. Nivel 03 — E2E — Frontend Web

### 03.01 — Abrir Vercel QA

| Elemento | Especificación |
|----------|---------------|
| Paso | Navegar a URL de Vercel QA |
| Resultado esperado | Página carga sin errores |
| Automatizado | Sí (Playwright) |

### 03.02 — Registro e inicio de sesión Clerk QA

| Elemento | Especificación |
|----------|---------------|
| Paso | Registrar usuario de prueba, iniciar sesión |
| Resultado esperado | Usuario autenticado, redirección a dashboard |
| Automatizado | Parcial |

### 03.03 — Navegación y consumo de API

| Elemento | Especificación |
|----------|---------------|
| Paso | Navegar por dashboard, consultar endpoints de API |
| Resultado esperado | Respuestas exitosas de API QA |
| Automatizado | Parcial |

### 03.04 — Operaciones principales coach y atleta

| Elemento | Especificación |
|----------|---------------|
| Paso | Crear entrenamiento, ver rutinas, gestionar membresía |
| Resultado esperado | Operaciones completadas sin errores |
| Automatizado | Parcial |

### 03.05 — Cierre de sesión

| Elemento | Especificación |
|----------|---------------|
| Paso | Cerrar sesión, verificar que token ya no es válido |
| Resultado esperado | Usuario desautenticado, redirección a login |
| Automatizado | Parcial |

---

## 5. Nivel 04 — E2E — Mobile

### 04.01 — Generar build interno Expo QA

| Elemento | Especificación |
|----------|---------------|
| Comando | `eas build --profile preview --platform all` (canal preview) |
| Precondiciones | CI exitoso, variables `EXPO_PUBLIC_*` configuradas |
| Resultado esperado | APK/iOS generados sin errores |
| Automatizado | No (manual después de CI) |

### 04.02 — Instalar build interno en dispositivo

| Elemento | Especificación |
|----------|---------------|
| Paso | Instalar APK/iOS en dispositivo de prueba |
| Resultado esperado | App instalada y abre correctamente |
| Automatizado | No |

### 04.03 — Inicio de sesión

| Elemento | Especificación |
|----------|---------------|
| Paso | Iniciar sesión con credenciales de prueba QA |
| Resultado esperado | Sesión iniciada, token almacenado de forma segura |
| Automatizado | Parcial (Maestro) |

### 04.04 — Consumo de API y navegación

| Elemento | Especificación |
|----------|---------------|
| Paso | Consultar endpoints de API QA desde mobile |
| Resultado esperado | Respuestas exitosas |
| Automatizado | Parcial (Maestro) |

### 04.05 — Validación de sesión y errores de conexión

| Elemento | Especificación |
|----------|---------------|
| Paso | Simular error de red, verificar manejo de error |
| Resultado esperado | App muestra error amigable, no se cae |
| Automatizado | Parcial (Maestro) |

---

## 6. Nivel 05 — Seguridad y despliegue

### 05.01 — Aislamiento de datos entre coaches

| Elemento | Especificación |
|----------|---------------|
| Paso | Coach A crea datos, Coach B intenta acceder a ellos |
| Resultado esperado | Coach B no puede consultar ni modificar datos de Coach A |
| Automatizado | Sí (test de API) |

### 05.02 — CORS y autenticación

| Elemento | Especificación |
|----------|---------------|
| Paso | Intentar llamada desde origen no autorizado |
| Resultado esperado | Rechazado por CORS |
| Automatizado | Sí |

### 05.03 — Secretos no expuestos

| Elemento | Especificación |
|----------|---------------|
| Paso | Verificar que bundle móvil no contiene `DATABASE_URL`, `CLERK_SECRET_KEY`, etc. |
| Resultado esperado | Ningún secreto privado en el bundle |
| Automatizado | Sí (análisis estático) |

### 05.04 — CI fallido bloquea CD

| Elemento | Especificación |
|----------|---------------|
| Paso | Romper intencionalmente un test de CI, intentar despliegue |
| Resultado esperado | CD no se ejecuta |
| Automatizado | Sí |

### 05.05 — Nueva revisión Cloud Run y rollback

| Elemento | Especificación |
|----------|---------------|
| Paso | Desplegar nueva imagen, verificar nueva revisión; hacer rollback a revisión anterior |
| Resultado esperado | Nueva revisión activa, rollback funcional con versión anterior de Secret Manager |
| Automatizado | Parcial |

---

## 7. Matriz de cobertura por componente

| Prueba | Web | Mobile | API | Automatizada |
|--------|-----|--------|-----|--------------|
| Disponibilidad | ✓ | ✓ | ✓ | Sí |
| Autenticación Clerk | ✓ | ✓ | ✓ | Parcial |
| Consumo de endpoints | ✓ | ✓ | — | Parcial |
| Gestión de sesión | ✓ | ✓ | ✓ | Parcial |
| Datos multi-tenant | ✓ | ✓ | ✓ | Sí |
| Membresías | ✓ | ✓ | ✓ | Parcial |
| Pagos Wompi sandbox | ✓ | ✓ | ✓ | Parcial |
| Errores de red | ✓ | ✓ | ✓ | Parcial |

---

**Fin de la estrategia de pruebas. No se incluyeron valores sensibles.**

Siguiente: `QA_TEST_MATRIX.md`. Continuaré.
