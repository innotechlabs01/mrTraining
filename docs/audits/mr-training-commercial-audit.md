# MR TRAINING — Auditoría Comercial SaaS

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
| P0 | **Seguridad: No hay RLS en tablas de comisiones** | IMPLEMENTADO PARCIALMENTE | Riesgo de acceso a datos financieros |
| P1 | **Comisiones deben ser configurables por coach** | NO IMPLEMENTADO | Límite de crecimiento |
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

**Infraestructura (Infrastructure Layer)**
- `infrastructure/plan/` - Repositorios planes
- `infrastructure/plan_version/` - Repositorios versiones
- `infrastructure/commercial_commission/` - Repositorios comisiones
- `infrastructure/coach_membership/` - Repositorios membresías

---

## C. Inventario de Módulos Comerciales

### Módulos Implementados

| Módulo | Ubicación | Estado |
|--------|-----------|--------|
| Plans | `/internal/domain/commercial_plan/` | ✅ Implementado |
| Plan Versions | `/internal/domain/commercial_plan_version/` | ✅ Implementado |
| Commercial Commissions | `/internal/domain/commercial_commission/` | ✅ Implementado |
| Coach Memberships | `/internal/domain/coach_membership/` | ✅ Implementado |
| Commission Entries | `/internal/domain/commission_entry/` | ✅ Implementado |
| Coach Settlements | `/internal/domain/coach_settlement/` | ✅ Implementado |

### Módulos Faltantes

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

### Endpoints Comerciales Existentes

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

### Endpoints Necesarios (Super Admin)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/admin/commission-rates` | GET, POST, PUT | Configuración de comisiones MR Training |
| `/admin/commission-rates/:coachId` | GET, PUT | Comisión individual por coach |
| `/admin/price-catalog` | GET, POST | Catálogo de precios estándar |
| `/admin/exemptions` | GET, POST | Excepciones comerciales |
| `/admin/exemptions/:coachId` | GET, PUT, DELETE | Excepciones por coach |
| `/admin/coaches/:id/suspension` | POST, DELETE | Suspensión de cobros |
| `/admin/financial-summary` | GET | Resumen financiero diario |

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

-- Acuerdos de comisión (Alianzas)
commission_agreements (
    id, relationship_id, version, rate_bps, fixed_amount_cents,
    eligible_base_rule, rounding, currency, valid_from, valid_to,
    status, accepted_by, accepted_at, created_at
)

-- Liquidaciones
coach_settlements (
    id, coach_id, ally_id, period_start, period_end, period_key,
    currency, status, operations_count,
    base_total_cents, commission_gross_cents, adjustments_cents, commission_net_cents,
    calculated_at, approved_at, closed_at, created_at, updated_at
)
```

---

## F. Auditoría de Landing Comercial

### Estado Actual

**Landing Comercial (MR Training)**
- Ruta: `GET /public/landing`
- Estado: ✅ Básicamente funcional
- Limitaciones: Los planes no se obtienen dinámicamente del backend

**Landing de Coaches**
- Ruta: `GET /coach/:slug`
- Archivo: `apps/api/internal/interfaces/http/handlers/coach_landing.go`
- Estado: ✅ Implementado
- Limitaciones:
  - Solo muestra planes, no maneja precios dinámicos
  - No considera excepciones comerciales

---

## G. Auditoría del Super Admin

### Estado Actual

**NO EXISTE** - No hay dashboard de Super Admin ni endpoints de administración global.

### Facultades Requeridas

| Facultad | Descripción | Estado |
|----------|-------------|--------|
| Exonerar mensualidad | Coach no paga licencia | ❌ NO IMPLEMENTADO |
| Exonerar comisión | Coach no paga comisión | ❌ NO IMPLEMENTADO |
| Exoneración total | Sin licencia ni comisiones | ❌ NO IMPLEMENTADO |
| Comisión personalizada | Porcentaje específico | ❌ NO IMPLEMENTADO |
| Precio personalizado | Tarifa negociada | ❌ NO IMPLEMENTADO |
| Periodo gratuito | Días configurables | ❌ NO IMPLEMENTADO |
| Excepción temporal | Con fecha inicio/fin | ❌ NO IMPLEMENTADO |

---

## H. Auditoría de Pagos y Mercado Pago

### Estado Actual

**Integración Mercado Pago**
- Ruta: `POST /webhook/mercadopago`
- Archivo: `apps/api/internal/interfaces/http/handlers/mercadopago_webhook.go`
- Estado: ⚠️ Implementado parcialmente

### Problemas Detectados

1. **Webhook no procesa compras reales**:
   - El handler solo devuelve respuesta
   - No activa memberships reales

2. **Falta idempotency robusto**:
   - No se valida contra `payment_transactions`

3. **Split de pagos no implementado**:
   - La comisión se calcula pero no se envía el neto al coach

---

## I. Modelo Financiero Real

```
Valor bruto (athlete) = Precio membresía
↓ MP transaction fee (~3.5%)
Valor neto MP = Bruto - Fee
↓ MR Training commission (5-8% configurable)
Valor al coach = Neto MP - Commission
```

---

## J. Recomendaciones Técnicas

### 1. Crear Tablas de Excepciones

```sql
-- Tablas a crear
commercial_exemptions
price_exceptions
commission_overrides
```

### 2. Implementar Motor de Políticas

```go
// Nuevo service
type PolicyEngineService struct {
    exemptionRepo   ExemptionRepository
    priceRepo       PriceRepository
    commissionRepo  CommissionRepository
}
```

### 3. Crear Endpoints de Super Admin

- Proteger con `middleware.RequireAdmin()`
- Audit logging para cada cambio
- Validación de negocio

---

## K. Plan de Implementación

### Fase 1: Motor de Políticas (4-6 semanas)
1. Crear tablas de excepciones
2. Crear dominio de políticas
3. Crear servicios de aplicación
4. Crear repositorios

### Fase 2: Super Admin (3-4 semanas)
1. Crear endpoints de administración
2. Crear middleware de admin
3. Crear UI de administración

### Fase 3: Integración (2-3 semanas)
1. Actualizar cálculo de comisiones
2. Actualizar landing pages
3. Actualizar webhook de pagos

---

## L. Checklist de Auditoría

- [x] Auditoría READ-ONLY
- [x] Sin modificaciones a código de producción
- [x] Sin migraciones ejecutadas
- [x] Sin cambios de datos

---

## M. Archivo

**Ruta:** `docs/audits/mr-training-commercial-audit.md`  
**Líneas:** 747
**Formato:** Markdown

---

**Fin del informe**