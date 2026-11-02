# MR TRAINING — Auditoría Comercial SAAS

**Fecha:** 1 de noviembre de 2026  
**Estado:** READ-ONLY  
**Ejecutor:** OpenCode Agent (Laguna XS 2.1)

---

## A. Resumen Ejecutivo

### Estado Actual

MR Training posee una arquitectura de código sólida basada en **Go/Fiber** con **Clean Architecture** y **Hexagonal Architecture**. Existe una base de funcionalidades comerciales con planes, comisiones y liquidaciones, pero **falta un motor de políticas comerciales centralizado y parametrizable**.

### Hallazgos Críticos

| Prioridad | Hallazgo | Estado | Impacto |
|-----------|----------|--------|---------|
| P0 | **Falta de motor de políticas parametrizables** - Las comisiones y precios están codificados o en configuración de aplicación | NO IMPLEMENTADO | Alto riesgo financiero |
| P0 | **Seguridad: No hay RLS en tablas de comisiones** | IMPUMENTADO PARCIALMENTE | Riesgo de acceso a datos financieros |
| P1 | **Comisiones deben ser configurables por coach** | NO IMPLEMENTADO | Limite de crecimiento |
| P2 | **Falta de excepciones comerciales con historial** | NO IMPLEMENTADO | Imposible administrar casos especiales |
| P3 | **Landing comercial necesita actualización** | IMPLEMENTADO CON DEFECTOS | Experiencia reducida |

### Oportunidad de Negocio

El modelo actual permite que MR Training ofrezca planes, pero:
- No puede negociar precios individualizados
- No puede exonerar mensualidades o comisiones
- No puede ofrecer periodos gratuitos personalizados
- Las comisiones son globales (configuración estática)

---

## B. Arquitectura Real

### Stack Tecnológico

```
Frontend (apps/web)
├── Next.js 14 (App Router)
├── React 18
├── TypeScript strict
├── Tailwind CSS 3
└── Clerk v6 (Autenticación)

API (apps/api)
├── Go 1.25
├── Fiber v2
├── Clean Architecture
├── PostgreSQL (via libsql para Turso)
├── Redis 7 (Cache)
└── NATS JetStream (Eventos)

Mobile (apps/mobile)
└── React Native CLI + TypeScript
```

### Organización de Paquetes (apps/api/internal)

**Dominio (Domain Layer)**
- `domain/commercial_plan/` - Planes comerciales del coach
- `domain/commercial_plan_version/` - Versiones inmutables de planes
- `domain/commercial_commission/` - Registros de comisión por operación
- `domain/coach_membership/` - Suscripciones de coaches
- `domain/commission/` - Comisiones de Alianzas
- `domain/commission_agreement/` - Acuerdos de comisión por relación

**Aplicación (Application Layer)**
- `application/commercial_plan/` - CRUD planes
- `application/commercial_plan_version/` - Gestión versiones
- `application/commercial_commission/` - Cálculo y liquidación
- `application/coach_membership/` - Membresías coach
- `application/commission/` - Comisiones aliados

**Infraestructura (Infrastructure Layer)**
- `infrastructure/plan/` - Repositorios planes
- `infrastructure/plan_version/` - Repositorios versiones
- `infrastructure/commercial_commission/` - Repositorios comisiones
- `infrastructure/coach_membership/` - Repositorios membresías

---

## C. Inventario de Módulos

### Módulos Comerciales (existentes)

| Módulo | Ubicación | Estado |
|--------|-----------|--------|
| Plans | `/internal/domain/commercial_plan/` | ✅ Implementado |
| Plan Versions | `/internal/domain/commercial_plan_version/` | ✅ Implementado |
| Commercial Commissions | `/internal/domain/commercial_commission/` | ✅ Implementado |
| Coach Memberships | `/internal/domain/coach_membership/` | ✅ Implementado |
| Commission Entries | `/internal/domain/commission_entry/` | ✅ Implementado |
| Coach Settlements | `/internal/domain/coach_settlement/` | ✅ Implementado |
| Payment Records | `/internal/domain/coach_payment_records/` | ✅ Implementado |

### Módulos Faltantes (requeridos para motor de políticas)

| Módulo | Necesario | Prioridad |
|--------|-----------|-----------|
| Commercial Policy Engine | Sí | P1 |
| Price Exceptions | Sí | P1 |
| Commission Overrides | Sí | P1 |
| Subscription Exemptions | Sí | P0 |
| Discount System | Sí | P2 |
| Benefit Tracking | Sí | P2 |

---

## D. Inventario de Endpoints

### Endpoints Comerciales Existentes (apps/api)

**Planes Comerciales (`coach_commercial.go`)**
```
GET  /coaches/commercial/plans
GET  /coaches/commercial/plans/active
GET  /coaches/commercial/plans/:id
GET  /coaches/commercial/plans/:id/versions
GET  /coaches/commercial/plans/:id/versions/active
POST /coaches/commercial/plans
POST /coaches/commercial/plans/:id/versions
PUT  /coaches/commercial/plans/:id
DELETE /coaches/commercial/plans/:id
```

**Comisiones**
```
GET /coaches/commissions
```

**Suscripciones Pilot
GET /coach/memberships/current
POST /coach/memberships/trial
POST /coach/memberships/plan
POST /coach/memberships/cancel
POST /coach/memberships/renew
```

### Endpoints Faltantes (Super Admin)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/admin/commission-rates` | GET, POST, PUT | Configuración de comisiones MR Training |
| `/admin/commission-rates/:coachId` | GET, PUT | Comisión individual por coach |
| `/admin/price-catalog` | GET, POST | Catálogo de precios estándar |
| `/admin/exemptions` | GET, POST | Excepciones comerciales |
| `/admin/exemptions/:coachId` | GET, PUT, DELETE | Excepciones por coach |
| `/admin/coaches/:id/suspension` | POST, DELETE | Suspensión de cobros |
| `/admin/financial-summary` | GET | Resumen financiero diario |
| `/admin/audit-trail` | GET | Historial de cambios |

---

## E. Inventario de Tablas y Relaciones

### Tablas Comerciales Principales

```sql
-- Planes comerciales del coach
coach_commercial_plans (
    id, coach_id, slug, name, description, is_active,
    specialties, certifications, services_offered, contact_info,
    created_at, updated_at
)

-- Versiones de planes (inmutables)
coach_commercial_plan_versions (
    id, plan_id, version_number, price_cents, currency,
    duration_value, duration_unit, benefits, terms, renewal_policy,
    is_active, starts_at, created_at
)

-- Comisiones por operación
coach_commission_records (
    id, purchase_id, coach_id, athlete_id,
    commission_rate_pct, gross_amount_cents, commission_cents, net_amount_cents,
    currency, settlement_status, mp_payment_id, mp_processing_fee_cents,
    settled_at, created_at, updated_at
)

-- Acuerdos de comisión (para Alianzas)
commission_agreements (
    id, relationship_id, version, rate_bps, fixed_amount_cents,
    eligible_base_rule, rounding, currency, valid_from, valid_to,
    status, accepted_by, accepted_at, created_at
)

-- Entradas de comisión detalladas
commission_entries (
    id, operation_id, relationship_id, coach_id, agreement_id,
    agreement_version, base_cents, rate_bps, fixed_amount_cents,
    amount_cents, currency, status, computed_at, created_at
)

-- Liquidaciones
coach_settlements (
    id, coach_id, ally_id, period_start, period_end, period_key,
    currency, status, operations_count,
    base_total_cents, commission_gross_cents, adjustments_cents, commission_net_cents,
    calculated_at, approved_at, closed_at, created_at, updated_at
)
```

### Tabla Faltante: Excepciones Comerciales

**NO EXISTE** - Necesaria para exoneraciones, descuentos, bonificaciones:

```sql
-- PROPUESTA (a crear):
commercial_exemptions (
    id, coach_id, admin_id,
    exemption_type, -- 'license_fee', 'commission', 'both'
    reason, -- motivo de la exoneración
    scope_type, -- 'one_time', 'recurring', 'permanent'
    value_override -- valor específico si aplica
    amount_cents, -- para descuentos
    discount_pct, -- para descuentos porcentuales
    start_at, end_at,
    revoked_at, revoked_by, revoked_reason,
    created_at, updated_at
)
```

---

## F. Auditoría de Landing Comercial

### Estado Actual

**Landing Comercial (MR Training)**
- Ruta: `GET /public/landing`
- Estado: ✅ Básicamente funcional
- Problemas:
  - Los planes no se obtienen dinámicamente del backend
  - No hay integración con el motor comercial

**Landing de Coaches**
- Ruta: `GET /coach/:slug`
- Estado: ✅ Implementado (archivo `coach_landing.go`)
- Código: `apps/api/internal/interfaces/http/handlers/coach_landing.go`
- Limitaciones:
  - Solo muestra planes, no maneja precios dinámicos
  - No considera excepciones comerciales
  - No filtra por estado de membresía

### Recomendaciones

1. **Landing debe consultar**:
   - Estado de membresía del coach
   - Excepciones activas
   - Comisiones aplicables
   - Historial de precios

2. **Separar vista pública vs. ventas**:
   - Pública: solo información del coach
   - Venta: mostrar precios según excepciones del visitante

---

## G. Auditoría del Super Admin

### Estado Actual

**NO EXISTE** - No hay dashboard de Super Admin ni endpoints de administración global.

### Requerimientos por Definir

| Facultad | Descripción | Estado |
|----------|-------------|--------|
| Exonerar mensualidad | Coach no paga licencia | ❌ NO IMPLEMENTADO |
| Exonerar comisión | Coach no paga comisión | ❌ NO IMPLEMENTADO |
| Exoneración total | Sin licencia ni comisiones | ❌ NO IMPLEMENTADO |
| Comisión personalizada | Porcentaje específico | ❌ NO IMPLEMENTADO |
| Precio personalizado | Tarifa negociada | ❌ NO IMPLEMENTADO |
| Periodo gratuito | Días configurables | ❌ NO IMPLEMENTADO |
| Excepción temporal | Con fecha inicio/fin | ❌ NO IMPLEMENTADO |
| Excepción permanente | Sin vencimiento | ❌ NO IMPLEMENTADO |
| Suspender cobros | Sin borrar obligaciones | ❌ NO IMPLEMENTADO |
| Cambiar de plan | Con historial | ❌ NO IMPLEMENTADO |
| Revocar beneficios | Con auditoría | ❌ NO IMPLEMENTADO |

### Endpoints Necesarios

```
POST   /admin/coaches/:id/exemptions
GET    /admin/coaches/:id/exemptions
PUT    /admin/coaches/:id/exemptions/:exemptionId
DELETE /admin/coaches/:id/exemptions/:exemptionId
POST   /admin/coaches/:id/suspend
DELETE /admin/coaches/:id/suspend
GET    /admin/financial/audit
GET    /admin/financial/summary
PUT    /admin/commission-rates/global
PUT    /admin/commission-rates/:coachId
```

---

## H. Auditoría de Pagos y Mercado Pago

### Estado Actual

**Integración Mercado Pago**
- Ruta: `POST /webhook/mercadopago`
- Estado: ✅ Implementado parcialmente
- Archivo: `apps/api/internal/interfaces/http/handlers/mercadopago_webhook.go`

### Problemas Detectados

1. **Webhook no procesa compras reales**:
   - El handler `handlePaymentApproved` solo devuelve respuesta, no activa memberships
   - No hay integración con `coach_membership_service`

2. **Falta idempotency robusto**:
   - Se usa `external_reference` como ID, pero no se valida contra `payment_transactions`

3. **Split de pagos no implementado**:
   - La comisión se calcula pero no se envía el neto al coach
   - No hay integración con cuenta de cobro del coach

### Restricciones Reales de Mercado Pago

| Característica | Disponible | Comentario |
|----------------|------------|------------|
| Split de pagos | ✅ Sí | Necesita cuenta propietaria |
| Webhook de comisiones | ✅ Sí | Notifica retenciones |
| Reembolsos parciales | ✅ Sí | Afecta comisiones |
| Multimetodo | ❌ No | Solo tarjeta y MP Wallet |

### Modelo Financiero Actual

```
Valor bruto (athlete) = Precio membresía
↓ MP transaction fee (~3.5%)
Valor neto MP = Bruto - Fee
↓ MR Training commission (5-8% configurable)
Valor al coach = Neto MP - Commission
```

---

## I. Auditoría de Licencias y Suscripciones

### Estado Actual

**Coach Membership**
- Archivo: `apps/api/internal/application/coach_membership/service.go`
- Estado: ✅ Básico implementado

### Estados Soportados

| Estado | Descripción |
|--------|-------------|
| trial | Prueba gratuita de 7 días |
| active | Membresía activa |
| expired | Expirada (no renovada) |
| cancelled | Cancelada por el coach |

### Estados Faltantes

| Estado | Necesario | Motivo |
|--------|-----------|--------|
| suspended | ✅ SÍ | Para exoneraciones temporales |
| exonerated | ✅ SÍ | Para exoneración de mensualidad |
| grace_period | ✅ SÍ | Período de gracia después de vencimiento |
| pending_review | ✅ SÍ | Para auditoría de excepciones |

### Flujo de Suscripción Actual

```
1. Coach selecciona plan → /coach/memberships/plan
2. Se crea preferencia MP → Mercado Pago
3. Webhook recibido → /webhook/mercadopago
4. Pago aprobado → ??? (NUNCA HA ACTIVADO MEMBRESÍA)
```

**CRÍTICO**: El webhook NO activa membresías. El código está incompleto.

---

## J. Auditoría del Motor Comercial

### Estado Actual

**Motor de Comisiones**
- Ubicación: `internal/application/commercial_commission/`
- Estado: ✅ Comisiones se calculan pero no son parametrizables por coach
- Problema: `CommissionConfig` es global, no hay override por coach

### Código Actual

```go
// service.go line 26
type Service struct {
    repo  commercialcommission.Repository
    cfg   CommissionConfig  // SOLO CONFIGURACIÓN GLOBAL
}

type CommissionConfig struct {
    CommissionRatePct float64
}
```

### Limitaciones

1. **Comisiones globales**: Solo un porcentaje para todos los coaches
2. **Sin excepciones**: No se puede exonerar a coaches específicos
3. **Sin historial**: No se guarda quién modificó la comisión y cuándo
4. **Sin audit trail**: Faltan registros de cambios

---

## K. Auditoría de Exoneraciones y Excepciones

### Estado Actual

**NO EXISTE SISTEMA DE EXONERACIONES**

### Conceptos Diferenciados ( Requeridos)

| Concepto | Definición | DB Field |
|----------|------------|----------|
| Exoneración | No se genera cobro | `is_exempt BOOLEAN` |
| Descuento | Cobro con valor reducido | `discount_amount_cents` |
| Bonificación | Beneficio temporal | `benefit_start_at`, `benefit_end_at` |
| Suspensión | Se detiene temporalmente | `suspended_until` |
| Comisión personalizada | Porcentaje acordado | `override_commission_pct` |

### Reglas de Negocio

1. **Jerarquía de aplicación**:
   ```
   1. Excepción individual (más alta prioridad)
   2. Configuración comercial coach
   3. Configuración del plan
   4. Política general MR Training (más baja prioridad)
   ```

2. **No retroactividad**: Los cambios no afectan transacciones pasadas

3. **Auditoría obligatoria**: Cada excepción necesita:
   - Motivo
   - Admin responsable
   - Fecha de creación
   - Historial de cambios
   - Posibilidad de revocación

---

## L. Auditoría de Seguridad

### Hallazgos de Seguridad

| Hallazgo | Severidad | Estado | Recomendación |
|----------|-----------|--------|---------------|
| Sin RLS en commission_records | ALTA | ❌ NO IMPLEMENTADO | Crear políticas RLS |
| Sin RLS en coach_commercial_plans | MEDIA | ✅ Parcial | Verificar implementación |
| Admin endpoints no existen | ALTA | ❌ NO EXISTE | Crear con middleware RequireAdmin |
| Webhook sin rate limiting | MEDIA | ❌ NO IMPLEMENTADO | Agregar RateLimit middleware |
| Sin audit trail de cambios | ALTA | ❌ NO EXISTE | Implementar triggers/audit |

### Endpoints Protegidos

**Faltan protecciones** en:
- Configuración de comisiones
- Modificación de precios
- Cancelación de suscripciones
- Revocación de excepciones

---

## M. Auditoría de Pruebas

### Estado Actual

**Cobertura de Tests Comerciales**
- `apps/api/internal/application/commercial_commission/service_test.go` - ✅ Existe
- `apps/api/internal/application/membership_service_test.go` - ✅ Existe
- `apps/api/internal/application/coach_membership/` - ❌ No hay tests

### Escenarios de Prueba Necesarios

```
1. Coach Starter sin comisión exonerada
2. Coach Pro con comisión estándar
3. Coach Business con comisión estándar
4. Coach completamente exonerado
5. Coach exonerado solo de mensualidad
6. Coach exonerado solo de comisiones
7. Coach con comisión personalizada (2%)
8. Coach con precio personalizado ($50,000 COP)
9. Coach con beneficio temporal vencido
10. Coach cuyo beneficio fue revocado
11. Coach que cambia de plan
12. Coach con pago fallido
13. Coach cancelado con atletas activos
14. Webhook de Mercado Pago duplicado
15. Race condition en activación de membresía
```

---

## N. Arquitectura Objetivo Recomendada

### Modelo de Datos Propuesto

```sql
-- Catálogo de planes estándar (MR Training)
price_plans (
    id, name, slug, description, is_active_for_new,
    monthly_price_cents, yearly_price_cents, currency,
    max_athletes, features_json, created_at, updated_at
)

-- Superset de políticas comerciales
commercial_policies (
    id, coach_id, admin_id, policy_type,
    scope_type, -- 'global', 'coach', 'transaction'
    value_json, -- políticas específicas
    priority,
    valid_from, valid_to,
    reason,
    created_at, updated_at
)

-- Excepciones de precio
price_exceptions (
    id, coach_id, plan_id, price_cents, currency,
    reason, admin_id,
    start_at, end_at,
    revoked_at, revoked_by,
    created_at, updated_at
)

-- Excepciones de comisión
commission_exceptions (
    id, coach_id, operation_type, -- 'sale', 'membership', 'product'
    rate_pct, fixed_amount_cents,
    reason, admin_id,
    start_at, end_at,
    revoked_at,
    created_at, updated_at
)

-- Historial de precios aplicados
applied_prices (
    id, coach_id, operation_id,
    price_cents, currency, policy_version,
    applied_at, created_at
)
```

### Contratos API Recomendados

```
Super Admin APIs:
├── /admin/commission-rates
│   ├── GET - Listar tasas globales
│   └── PUT - Actualizar tasa global
├── /admin/commission-rates/:coachId
│   ├── GET - Tasa del coach
│   └── PUT - Tasa individual
├── /admin/price-catalog
│   ├── GET - Catálogo planes
│   └── POST - Crear plan
├── /admin/exemptions
│   ├── GET - Listar excepciones (filtrables)
│   └── POST - Crear excepción
├── /admin/exemptions/:coachId
│   ├── GET - Excepciones coach
│   └── DELETE - Revocar excepción
└── /admin/financial-summary
    └── GET ?from=&to= - Resumen financiero
```

### Arquitectura en Código

```
internal/
├── domain/
│   ├── commercial_policy/
│   │   └── commercial_policy.go
│   ├── price_exception/
│   │   └── price_exception.go
│   ├── commission_override/
│   │   └── commission_override.go
│   └── exemption/
│       └── exemption.go
├── application/
│   ├── commercial_policy/
│   │   └── service.go
│   ├── price_exception/
│   │   └── service.go
│   └── exemption/
│       └── service.go
└── infrastructure/
    ├── commercial_policy/
    │   └── repository.go
    ├── price_exception/
    │   └── repository.go
    └── exemption/
        └── repository.go
```

---

## O. Matriz de Permisos Administrativos

| Acción | Coach | Ally | Admin | Motivo |
|--------|-------|------|-------|--------|
| Ver precios | ✅ | ✅ | ✅ | Necesario para ventas |
| Ver comisiones | ✅ | ✅ | ✅ | Transparencia |
| Cambiar plan | ✅ (propio) | ❌ | ✅ | Control |
| Exonerar mensualidad | ❌ | ❌ | ✅ SOLO ADMIN | Seguridad financiera |
| Exonerar comisión | ❌ | ❌ | ✅ SOLO ADMIN | Seguridad financiera |
| Ver historial financiero | ✅ (propio) | ✅ | ✅ | Cumplimiento |
| Modificar políticas | ❌ | ❌ | ✅ SOLO ADMIN | Seguridad |
| Revocar excepciones | ❌ | ❌ | ✅ SOLO ADMIN | Integridad |
| Cancelar suscripción | ✅ (propia) | ❌ | ✅ | Control |
| Suspender cobros | ❌ | ❌ | ✅ SOLO ADMIN | Seguridad |

---

## P. Plan de Implementación Ordenado

### Fase 1: Motor de Políticas (4-6 semanas)

1. **Crear tablas de excepciones** (2 días)
   - `commercial_exemptions`
   - `price_exceptions`
   - `commission_overrides`
   - Triggers de audit

2. **Crear dominio de políticas** (3 días)
   - Entidades y valores
   - Lógica de resolución de política
   - Jerarquía de prioridades

3. **Crear servicios de aplicación** (4 días)
   - PolicyService
   - PriceService
   - CommissionOverrideService

4. **Crear repositorios** (3 días)
   - PostgreSQL implementations

### Fase 2: Super Admin (3-4 semanas)

1. **Crear endpoints de administración** (4 días)
   - CRUD de excepciones
   - Configuración de comisiones
   - Dashboard financiero

2. **Crear middleware de admin** (1 día)
   - `RequireAdmin()`
   - Rate limiting
   - Audit logging

3. **Crear UI de administración** (1-2 semanas)
   - Dashboard financiero
   - Gestión de excepciones
   - Resumen de comisiones

### Fase 3: Integración Comercial (2-3 semanas)

1. **Actualizar cálculo de comisiones** (3 días)
   - Considerar excepciones
   - Cache de políticas

2. **Actualizar landing pages** (4 días)
   - Consultar excepciones
   - Mostrar precios dinámicos

3. **Actualizar webhook de pagos** (2 días)
   - Activar membresías
   - Registrar comisiones

### Fase 4: Monitoreo y QA (1-2 semanas)

1. **Tests de integración** (3 días)
2. **Tests E2E** (2 días)
3. **Documentación** (1 día)

---

## Q. Decisiones Pendientes de Aprobación

### Decisión 1: Modelo de Exoneración

**Opcionión A**: Exoneración binaria (sí/no)
- Ventaja: Simple
- Desventaja: No flexible para descuentos parciales

**Opción B**: Exoneración con niveles
- Ventaja: Flexible
- Desventaja: Más complejo

**Recomendación**: Opción B con estados claros

### Decisión 2: Almacenamiento de Precios

**Opción A**: Guardar snapshot en compra
- Ventaja: Historial inmutable
- Desventaja: Duplicación de datos

**Opción B**: Referenciar versión del plan
- Ventaja: Normalizado
- Desventaja: Precio puede cambiar

**Recomendación**: Opción A con snapshot

### Decisión 3: UI de Super Admin

**Requerimiento**: Debe ser accesible solo para admins verificados

**Decisión**: Implementar con Clerk Organization + rol "super_admin"

---

## R. Ruta del Informe

**Archivo:** `docs/audits/mr-training-commercial-audit.md`  
**Versión:** 1.0 (borrador)  
**Próxima revisión:** Tras aprobación del owner del producto

---

## S. Créditos

Documento generado mediante auditoría READ-ONLY del código fuente.  
No se realizaron modificaciones, migraciones ni cambios en la base de datos.

---

## T. Checklist de Auditoría

- [x] Inspección de código fuente (READ-ONLY)
- [x] Revisión de esquemas de base de datos
- [x] Análisis de endpoints API
- [x] Identificación de módulos comerciales
- [x] Evaluación de seguridad
- [x] Revisión de pruebas existentes
- [x] Identificación de gaps funcionales
- [x] Propuesta de arquitectura objetivo
- [ ] **ESPERAR APROBACIÓN DEL OWNER DEL PRODUCTO**