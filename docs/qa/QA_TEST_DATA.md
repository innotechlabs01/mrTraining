# Datos de Prueba QA — MR Training

**Estado:** Documento de diseño. No se crearon cuentas ni datos reales. No se incluyeron valores sensibles.

## 1. Principio

Todos los datos de prueba son **no sensibles** y se definen únicamente como esquemas. Durante la auditoría **no se crearon cuentas reales, ni usuarios, ni datos de pago**. La implementación de datos reales se hará en una fase posterior con aprobación explícita.

---

## 2. Perfiles de prueba QA

### Coach QA 1 (entrenador principal)

| Campo | Valor (no sensible) |
|-------|---------------------|
| Rol | Coach |
| Entorno | QA |
| Propósito | Operaciones principales de coach en Web |
| Datos asociados | Entrenamientos, rutinas, atletas, membresías |

### Atleta QA 1 (pertenece a Coach QA 1)

| Campo | Valor (no sensible) |
|-------|---------------------|
| Rol | Atleta |
| Entorno | QA |
| Coach asignado | Coach QA 1 |
| Propósito | Operaciones principales de atleta en Mobile |
| Datos asociados | Rutinas asignadas, progreso, entrenamientos |

### Coach QA 2 (segundo entrenador)

| Campo | Valor (no sensible) |
|-------|---------------------|
| Rol | Coach |
| Entorno | QA |
| Propósito | Pruebas de aislamiento multi-tenant |
| Datos asociados | Entrenamientos, rutinas, atletas, membresías (propios, distintos a Coach QA 1) |

### Atleta QA 2 (pertenece a Coach QA 2)

| Campo | Valor (no sensible) |
|-------|---------------------|
| Rol | Atleta |
| Entorno | QA |
| Coach asignado | Coach QA 2 |
| Propósito | Pruebas de aislamiento multi-tenant |
| Datos asociados | Rutinas asignadas, progreso, entrenamientos (propios, distintos a Atleta QA 1) |

---

## 3. Membresías de prueba

| Membresía | Coach | Atleta | Estado | Propósito |
|-----------|-------|--------|--------|-----------|
| Membresía 1 | Coach QA 1 | Atleta QA 1 | Activa | Flujo normal de coach-atleta |
| Membresía 2 | Coach QA 2 | Atleta QA 2 | Activa | Flujo normal de segundo coach |
| Membresía 3 | Coach QA 1 | (ninguno) | Expirada | Prueba de membresía expirada |
| Membresía 4 | Coach QA 2 | (ninguno) | Cancelada | Prueba de membresía cancelada |

---

## 4. Estados de pago Wompi sandbox

| Estado | Propósito | Uso en pruebas |
|--------|-----------|----------------|
| `pending` | Pago pendiente | Validar creación de intención |
| `approved` | Pago aprobado (sandbox) | Validar webhook y confirmación |
| `declined` | Pago rechazado (sandbox) | Validar manejo de error de pago |
| `error` | Error en procesamiento | Validar manejo de error crítico |

**Restricción:** Nunca usar credenciales de producción. Solo entorno sandbox de Wompi.

---

## 5. Datos de API para pruebas

| Endpoint | Método | Datos de entrada (esquema) | Resultado esperado |
|----------|--------|---------------------------|-------------------|
| `/health` | GET | Ninguno | `{"status":"ok"}` |
| `/ready` | GET | Ninguno | `{"status":"ready"}` |
| `/api/v1/training` | GET | Autenticación Clerk requerida | Lista de entrenamientos del coach autenticado |
| `/api/v1/membership` | GET | Autenticación Clerk requerida | Membresías del atleta autenticado |

---

## 6. Reglas de uso de datos de prueba

| Regla | Descripción |
|-------|-------------|
| No cuentas reales | No crear usuarios reales en Clerk ni en la base de datos QA |
| No pagos reales | Usar exclusivamente Wompi sandbox |
| No datos de producción | No copiar datos de entorno producción a QA |
| No secretos en datos | Los datos de prueba no incluyen claves, tokens ni contraseñas |
| Aislamiento | Los datos de Coach QA 1 no deben ser accesibles por Coach QA 2 |

---

**Fin del documento de datos de prueba. No se crearon cuentas ni datos reales.**

---

## Resumen de todos los documentos creados en `docs/qa/`

| Archivo | Contenido |
|---------|-----------|
| `ENVIRONMENT_AUDIT.md` | Inventario de variables reales por componente |
| `ENVIRONMENT_MATRIX.md` | Matriz central de variables con clasificación |
| `QA_INTEGRATION_ARCHITECTURE.md` | Contratos de integración entre 3 consumidores |
| `QA_MISSING_CONFIGURATION.md` | Bloqueos y configuración faltante |
| `QA_TEST_STRATEGY.md` | Estrategia de 5 niveles de prueba |
| `QA_TEST_MATRIX.md` | Matriz detallada con ID, pasos, criterios PASS/FAIL |
| `QA_TEST_DATA.md` | Esquemas de datos de prueba no sensibles |

**No se modificó ningún archivo de código, configuración ni secreto.** Todo es exclusivamente documentación de auditoría y diseño.

Solicito aprobación antes de proceder a la implementación del pipeline y el plan de pruebas ejecutables.
