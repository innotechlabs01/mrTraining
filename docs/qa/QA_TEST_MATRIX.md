# Matriz de Pruebas QA — MR Training

**Estado:** Documento de diseño. No se modificó ningún archivo. No se exponen valores sensibles.

## Leyenda

| Campo | Descripción |
|-------|-------------|
| **ID** | Identificador único de la prueba |
| **Componente** | Web, Mobile, API, CI/CD, Seguridad |
| **Precondiciones** | Lo que debe estar listo antes de ejecutar |
| **Datos necesarios** | Datos de prueba (no sensibles) |
| **Pasos** | Secuencia de ejecución |
| **Resultado esperado** | Qué debe ocurrir para PASS |
| **Automatizada** | Sí / No / Parcial |
| **Criterio PASS/FAIL** | Condición de éxito/fracaso |

---

## Nivel 01 — CI — Pruebas automáticas

| ID | Componente | Precondiciones | Datos necesarios | Pasos | Resultado esperado | Automatizada | PASS / FAIL |
|----|-----------|----------------|------------------|-------|-------------------|--------------|-------------|
| CI-01 | API | Go instalado, dependencias descargadas | Ninguna | `go build ./... && go vet ./... && go test ./internal/... -race -count=1` | Build, vet y tests pasan | Sí | PASS si exit code 0 |
| CI-02 | Web | pnpm instalado, dependencias instaladas | Ninguna | `pnpm lint && pnpm build` | Lint y build pasan | Sí | PASS si exit code 0 |
| CI-03 | Mobile | Node instalado, dependencias instaladas | Ninguna | `npx tsc --noEmit && npm test` | Typecheck y tests pasan | Sí | PASS si exit code 0 |
| CI-04 | API | PostgreSQL de test corriendo | `DATABASE_URL` de test | `go run ./cmd/migrate -dry-run -dir migrations/postgres` | Migraciones aplicables sin error | Sí | PASS si exit code 0 |
| CI-05 | CI/CD | Rama `qa` con push | Ninguna | Push a `qa`, verificar que CI se ejecute | CI inicia automáticamente | Sí | PASS si CI se ejecuta |
| CI-06 | CI/CD | CI fallando intencionalmente | Ninguna | Romper un test, push a `qa` | CD no se ejecuta | Sí | PASS si CD bloqueado |

---

## Nivel 02 — Integración — Servicios

| ID | Componente | Precondiciones | Datos necesarios | Pasos | Resultado esperado | Automatizada | PASS / FAIL |
|----|-----------|----------------|------------------|-------|-------------------|--------------|-------------|
| INT-01 | API | Cloud Run QA desplegado, `DATABASE_URL_QA` en Secret Manager | Ninguna | `curl /ready` en Cloud Run QA | Responde `{"status":"ready"}` | Sí | PASS si status 200 y body ready |
| INT-02 | API | `REDIS_URL_QA` configurada (si habilitado) | Ninguna | Verificar que API arranca con/without Redis | API arranca en ambos casos | Sí | PASS si API responde |
| INT-03 | API | `CLERK_SECRET_KEY_QA` en Secret Manager | Credenciales Clerk QA | Intentar validar token Clerk | Token válido o error claro | Parcial | PASS si respuesta válida |
| INT-04 | API | Credenciales Wompi sandbox en Secret Manager | Datos de pago sandbox | Crear intención de pago | Intención creada, sin cargo real | Parcial | PASS si intención creada |
| INT-05 | API/Secret Manager | Infisical QA autenticado, Secret Manager QA con secretos | Ninguna | Leer secreto de Infisical, verificar en Secret Manager | Secreto sincronizado, máximo 2 versiones | Sí | PASS si secreto existe y ≤2 versiones |
| INT-06 | API | Cloud Run QA desplegado | Ninguna | `curl /health` | Responde 200 | Sí | PASS si status 200 |

---

## Nivel 03 — E2E — Frontend Web

| ID | Componente | Precondiciones | Datos necesarios | Pasos | Resultado esperado | Automatizada | PASS / FAIL |
|----|-----------|----------------|------------------|-------|-------------------|--------------|-------------|
| WEB-01 | Web | Vercel QA desplegado | Ninguna | Abrir URL de Vercel QA | Página carga sin errores | Sí (Playwright) | PASS si carga |
| WEB-02 | Web | Clerk QA configurado | Usuario de prueba QA | Registrar, iniciar sesión | Sesión iniciada, redirección a dashboard | Parcial | PASS si autenticado |
| WEB-03 | Web | Sesión iniciada, API QA accesible | Ninguna | Navegar dashboard, consultar API | Respuestas exitosas de API | Parcial | PASS si API responde |
| WEB-04 | Web | Sesión iniciada | Datos de coach QA | Crear entrenamiento, ver rutinas | Operaciones completadas sin error | Parcial | PASS si operación exitosa |
| WEB-05 | Web | Sesión iniciada | Ninguna | Cerrar sesión | Usuario desautenticado, redirección a login | Parcial | PASS si desautenticado |
| WEB-06 | Web | API QA desplegado | Ninguna | Llamar desde origen no autorizado | Rechazado por CORS | Sí | PASS si rechazado |

---

## Nivel 04 — E2E — Mobile

| ID | Componente | Precondiciones | Datos necesarios | Pasos | Resultado esperado | Automatizada | PASS / FAIL |
|----|-----------|----------------|------------------|-------|-------------------|--------------|-------------|
| MOB-01 | Mobile | EAS preview build generado | Ninguna | Instalar APK/iOS en dispositivo | App instalada y abre | No | PASS si instala |
| MOB-02 | Mobile | App instalada, Clerk QA configurado | Usuario de prueba QA | Iniciar sesión | Sesión iniciada en mobile | Parcial (Maestro) | PASS si autenticado |
| MOB-03 | Mobile | Sesión iniciada, API QA accesible | Ninguna | Consultar endpoints de API QA | Respuestas exitosas | Parcial (Maestro) | PASS si API responde |
| MOB-04 | Mobile | Sesión iniciada | Datos de atleta QA | Ejecutar operación funcional | Operación completada | Parcial (Maestro) | PASS si operación exitosa |
| MOB-05 | Mobile | Sesión iniciada | Ninguna | Simular error de red | App muestra error, no se cierra | Parcial (Maestro) | PASS si maneja error |
| MOB-06 | Mobile | Build generado | Ninguna | Revisar bundle para secretos | No hay `DATABASE_URL`, `CLERK_SECRET_KEY`, etc. | Sí | PASS si ningún secreto |

---

## Nivel 05 — Seguridad y despliegue

| ID | Componente | Precondiciones | Datos necesarios | Pasos | Resultado esperado | Automatizada | PASS / FAIL |
|----|-----------|----------------|------------------|-------|-------------------|--------------|-------------|
| SEC-01 | API | Dos coaches QA creados | Coach A, Coach B | Coach A crea datos, Coach B intenta acceder | Coach B no puede ver/modificar datos de Coach A | Sí | PASS si acceso denegado |
| SEC-02 | API | Cloud Run QA, CORS configurado | Origen no autorizado | Llamada desde origen no permitido | Rechazado por CORS | Sí | PASS si rechazado |
| SEC-03 | Mobile | Build interno generado | Ninguna | Analizar bundle | Ningún secreto privado en el bundle | Sí | PASS si sin secretos |
| SEC-04 | CI/CD | CI fallando | Test intencionalmente roto | Push a `qa` | CD no se ejecuta | Sí | PASS si CD bloqueado |
| SEC-05 | Cloud Run | Despliegue previo existente | Imagen nueva | Desplegar nueva imagen, verificar revisión | Nueva revisión creada y activa | Parcial | PASS si revisión nueva |
| SEC-06 | Cloud Run | Revisión anterior disponible | Versión anterior en Secret Manager | Hacer rollback | Revisión anterior activa, rollback funcional | Parcial | PASS si rollback exitoso |
| SEC-07 | Secret Manager | Secreto con 3 versiones | Valor cambiado dos veces | Ejecutuir retención | Máximo 2 versiones recuperables | Sí | PASS si ≤2 versiones |

---

## Flujos E2E obligatorios

### Flujo Web

1. Abrir Vercel QA → Página carga
2. Autenticarse mediante Clerk QA → Sesión iniciada
3. Consultar API Cloud Run QA → Respuesta exitosa
4. Ejecutar una operación funcional (crear entrenamiento/ver rutina) → Operación completada
5. Verificar errores y cierre de sesión → Error manejado, sesión cerrada

### Flujo Mobile

1. Compilar mediante EAS Preview → Build generado
2. Instalar build interno → App instalada
3. Autenticarse → Sesión iniciada
4. Consultar API QA → Respuesta exitosa
5. Ejecutar una operación funcional → Operación completada

### Flujo API

1. `/health` → 200 OK
2. `/ready` → 200 OK (base de datos conectada)
3. Autenticación → Token Clerk válido
4. Autorización → Coach A no accede a datos de Coach B
5. RLS y aislamiento → Datos aislados por coach
6. Validación de errores → Errores claros, sin stack traces sensibles

### Flujo Pagos (Wompi sandbox)

1. Crear intención de pago → Intención creada (sandbox)
2. Validar webhook → Webhook recibido por API QA
3. Confirmación → Estado actualizado sin cargo real
4. No pagos reales → Ningún cargo en producción

### Flujo CI/CD

1. Push a `qa` → CI inicia
2. CI exitoso → CD se ejecuta
3. CI fallido → CD bloqueado
4. Despliegue → Nueva revisión Cloud Run
5. Rollback → Revisión anterior activa

---

## Criterios de aceptación globales

| # | Criterio | Estado |
|---|----------|--------|
| 1 | Web abre y autentica en Vercel QA | Pendiente |
| 2 | Mobile compila y autentica en Expo QA | Pendiente |
| 3 | Frontend → API requests exitosos | Pendiente |
| 4 | Mobile → API requests exitosos | Pendiente |
| 5 | API → PostgreSQL QA conexión correcta | Pendiente |
| 6 | API → Redis QA conexión correcta (si habilitado) | Pendiente |
| 7 | Clerk sesiones QA válidas | Pendiente |
| 8 | Wompi credenciales y webhooks sandbox QA | Pendiente |
| 9 | Infisical lectura autenticada de secretos QA | Pendiente |
| 10 | Secret Manager versiones sincronizadas sin duplicados | Pendiente |
| 11 | CORS orígenes correctos autorizados | Pendiente |
| 12 | Coach A no accede a datos de Coach B | Pendiente |
| 13 | CI fallido bloquea CD | Pendiente |
| 14 | Nuevo despliegue genera revisión Cloud Run | Pendiente |
| 15 | Rollback funcional | Pendiente |

---

**Fin de la matriz de pruebas. No se incluyeron valores sensibles.**

Siguiente: `QA_TEST_DATA.md` — datos de prueba no sensibles.
