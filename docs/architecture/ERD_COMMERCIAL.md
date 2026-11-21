# ERD Comercial MR Training — Motor de Políticas Parametrizables

**Versión:** 1.0  
**Fecha:** 2026-11-01  
**Estado:** Análisis y Diseño (READ-ONLY)

---

## FASE A: Inventario de Tablas Comerciales Existentes

### Tablas Comerciales Reutilizables

| Tabla | Ubicación | Uso actual | Comentario |
|-------|-----------|------------|------------|
| `coach_ally_relationships` | Turso schema | ✅ Existe | Relación M:N coach ↔ aliado |
| `allies` | Turso schema | ✅ Existe | Aliados comerciales |
| `ally_products` | Turso schema | ✅ Existe | Catálogo de productos de aliados |
| `ally_services` | Turso schema | ✅ Existe | Catálogo de servicios de aliados |
| `ally_operations` | Turso schema | ✅ Existe | Operaciones (pedidos/reservas) |
| `ally_operation_items` | Turso schema | ✅ Existe | Items dentro de operaciones |
| `ally_payment_declarations` | Turso schema | ✅ Existe | Declaraciones de pagos aliados |
| `ally_redemptions` | Turso schema | ✅ Existe | Canje de puntos/bonos |
| `ally_members` | Turso schema | ✅ Existe | Miembros del aliado |
| `ally_locations` | Turso schema | ✅ Existe | Ubicaciones de aliados |
| `ally_invitations` | Turso schema | ✅ Existe | Invitaciones a aliados |
| `athlete_memberships` | apps/api/migrations | ✅ Existe | Membresías de atletas |
| `membership_payments` | apps/api/migrations | ✅ Existe | Pagos de membresías |
| `plans` | apps/api/migrations | ✅ Existe | Planes de precios de coaches |
| `coach_payment_records` | apps/api/migrations | ✅ Existe | Registros de pagos a coaches |
| `coach_settlements` | apps/api/migrations | ✅ Existe | Liquidaciones de coaches |
| `settlement_items` | apps/api/migrations | ✅ Existe | Items en liquidaciones |
| `settlement_documents` | apps/api/migrations | ✅ Existe | Documentos de liquidación |
| `commission_agreements` | apps/api/migrations | ✅ Existe | Acuerdos de comisión (versión 1.0) |
| `commission_entries` | apps/api/migrations | ✅ Existe | Entradas de comisiones |
| `financial_adjustments` | apps/api/migrations | ✅ Existe | Ajustes financieros | |

### Tablas COMERCIALES CON PROBLEMAS IDENTIFICADOS

1. **`coach_payment_records`** (Línea 85-102 de turso-schema.sql)
   - **Problema:** El webhook de Mercado Pago no actualiza esto
   - **Requerimiento:** Debe ser actualizado por webhook con idempotencia

### Gap de Tablas Necesarias (Fase B-G)

| Tabla | Fase | Justificación |
|-------|------|---------------|
| `commercial_policies` | B | Motor de políticas parametrizables |
| `policy_versions` | B | Historial de versiones de políticas |
| `policy_rules_operation_type` | B | Reglas por tipo de operación |
| `exemptions` | C | Exoneraciones auditables con dos aprobadores |
| `exemption_approvals` | C | Registro de aprobaciones dobles |
| `benefits` | C | Beneficios especiales con auditoría |
| `license_states` | D | Estados de licencia (active, grace_period, suspended) |
| `license_conditions` | D | Condiciones comerciales (standard, exempted, etc.) |
| `grace_periods` | D | Períodos de gracia configurables |
| `payment_events` | H | Eventos de Mercado Pago con idempotencia |
| `payment_work_queue` | H | Cola de trabajo para procesamiento webhook |
| `super_admin_users` | G | Usuarios Super Admin |
| `admin_roles` | G | Roles de administración |
| `admin_permissions` | G | Permisos granulares |
| `admin_audit_log` | G | Log de auditoría de admin |

---

## FASE B: Motor Comercial (Commercial Policy Engine)

### Diagrama Mermaid del Domain Model

```mermaid
erDiagram
    %% Commercial Policy Engine
    COMMERCIAL_POLicies {
        TEXT id PK
        TEXT name
        TEXT description
        TEXT default_commission_type
        INTEGER default_rate_bps
        INTEGER default_fixed_amount_cents
        TEXT eligible_base_rule
        TEXT rounding
        TEXT currency
        BOOLEAN is_active
        TEXT created_at
        TEXT updated_at
    }

    POLICY_VERSIONS {
        TEXT id PK
        TEXT policy_id FK
        INTEGER version
        INTEGER rate_bps
        INTEGER fixed_amount_cents
        TEXT eligible_base_rule
        TEXT rounding
        TEXT valid_from
        TEXT valid_to
        TEXT status
        TEXT created_at
        UNIQUE: (policy_id, version)
    }

    POLICY_RULES_OPERATION_TYPE {
        TEXT id PK
        TEXT policy_id FK
        TEXT operation_type
        INTEGER rate_bps
        INTEGER fixed_amount_cents
        TEXT effective_from
        TEXT effective_to
        TEXT created_at
        UNIQUE: (policy_id, operation_type, effective_from)
    }

    POLICY_RULES_PLAN {
        TEXT id PK
        TEXT policy_id FK
        TEXT plan_name
        INTEGER rate_bps
        INTEGER fixed_amount_cents
        TEXT effective_from
        TEXT effective_to
        TEXT created_at
        UNIQUE: (policy_id, plan_name, effective_from)
    }

    POLICY_RULES_COACH {
        TEXT id PK
        TEXT policy_id FK
        TEXT coach_id
        INTEGER rate_bps
        INTEGER fixed_amount_cents
        TEXT effective_from
        TEXT effective_to
        TEXT created_at
        UNIQUE: (policy_id, coach_id, effective_from)
    }

    POLICY_EXCEPTIONS {
        TEXT id PK
        TEXT policy_id FK
        TEXT exception_key
        TEXT coach_id
        TEXT plan_name
        INTEGER rate_bps
        INTEGER fixed_amount_cents
        TEXT reason
        TEXT expires_at
        TEXT created_at
        TEXT created_by
        TEXT status
        UNIQUE: (exception_key)
    }

    %% Relationships
    COMMERCIAL_POLicies ||--o{ POLICY_VERSIONS : "has"
    COMMERCIAL_POLicies ||--o{ POLICY_RULES_OPERATION_TYPE : "defines"
    COMMERCIAL_POLicies ||--o{ POLICY_RULES_PLAN : "defines"
    COMMERCIAL_POLicies ||--o{ POLICY_RULES_COACH : "defines"
    COMMERCIAL_POLicies ||--o{ POLICY_EXCEPTIONS : "has"
```

### Jerarquía de Resolución de Comisiones

```
┌─────────────────────────────────────────────────────────────────┐
│                    JERARQUÍA DE RESOLUCIÓN                      │
├─────────────────────────────────────────────────────────────────┤
│  1. EXCEPCIÓN (exception_key) → rate_bps / fixed_amount_cents   │
│     • Más específica, vence en expires_at                        │
│                                                                   │
│  2. COACH → rate_bps / fixed_amount_cents                        │
│     • Por coach específico, siempre activa                       │
│                                                                   │
│  3. PLAN → rate_bps / fixed_amount_cents                         │
│     • Por plan de membresía                                      │
│                                                                   │
│  4. OPERATION TYPE → rate_bps / fixed_amount_cents               │
│     • Por tipo: order, reservation, service, product               │
│                                                                   │
│  5. GLOBAL → valores por defecto                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## FASE C: Exoneraciones y Beneficios (Exemptions & Benefits)

### Diagrama Mermaid

```mermaid
erDiagram
    %% Exemptions & Benefits
    EXEMPTIONS {
        TEXT id PK
        TEXT relationship_id FK
        TEXT coach_id
        TEXT athlete_id
        TEXT operation_id FK
        TEXT exemption_type
        TEXT reason
        INTEGER amount_cents
        TEXT currency
        TEXT status
        TEXT applied_at
        TEXT expires_at
        TEXT created_at
        TEXT created_by
        TEXT approval_1_id FK
        TEXT approval_1_type
        TEXT approval_1_at
        TEXT approval_1_note
        TEXT approval_2_id FK
        TEXT approval_2_type
        TEXT approval_2_at
        TEXT approval_2_note
        UNIQUE: (relationship_id, operation_id, exemption_type)
        CHECK: (status IN ('pending','approved','rejected','expired'))
    }

    EXEMPTION_APPROVALS {
        TEXT id PK
        TEXT exemption_id FK
        TEXT approver_id
        TEXT approver_type
        TEXT role
        TEXT action
        TEXT note
        TEXT approved_at
        TEXT created_at
        CHECK: (role IN ('super_admin','coach_owner','coach_staff'))
        CHECK: (action IN ('approve','reject'))
    }

    BENEFITS {
        TEXT id PK
        TEXT relationship_id FK
        TEXT benefit_type
        TEXT reason
        INTEGER value_cents
        INTEGER quantity
        TEXT currency
        TEXT status
        TEXT started_at
        TEXT expires_at
        TEXT created_at
        TEXT created_by
        TEXT approval_1_id FK
        TEXT approval_1_at
        TEXT approval_2_id FK
        TEXT approval_2_at
        UNIQUE: (relationship_id, benefit_type, started_at)
        CHECK: (status IN ('pending','active','expired','cancelled'))
        CHECK: (benefit_type IN ('discount','bonus','waiver','reduced_commission'))
    }

    %% Restricciones separadas
    SUSPENSION_RULES {
        TEXT id PK
        TEXT relationship_id FK
        TEXT suspension_type
        TEXT reason
        TEXT effective_from
        TEXT effective_to
        TEXT created_at
        TEXT created_by
        CHECK: (suspension_type IN ('payment_late','dispute','compliance'))
    }

    %% Relationships
    COACH_ALLY_RELATIONSHIPS ||--o{ EXEMPTIONS : "generates"
    ALLY_OPERATIONS ||--o{ EXEMPTIONS : "applies to"
    EXEMPTIONS ||--o{ EXEMPTION_APPROVALS : "requires"
    COACH_ALLY_RELATIONSHIPS ||--o{ BENEFITS : "receives"
    COACH_ALLY_RELATIONSHIPS ||--o{ SUSPENSION_RULES : "may have"
```

---

## FASE D: Licencias y Membresías (Coach Membership & Licensing)

### Diagrama Mermaid

```mermaid
erermanmaid
erDiagram
    %% License States
    LICENSE_STATES {
        TEXT id PK
        TEXT membership_id FK
        TEXT state
        TEXT reason
        TEXT entered_at
        TEXT exited_at
        TEXT created_at
        CHECK: (state IN ('active','grace_period','suspended','cancelled','expired'))
    }

    LICENSE_CONDITIONS {
        TEXT id PK
        TEXT membership_id FK
        TEXT condition_type
        TEXT status
        TEXT applied_at
        TEXT expires_at
        TEXT reason
        TEXT created_at
        CHECK: (condition_type IN ('standard','exempted','discounted','bonused'))
        CHECK: (status IN ('active','pending','revoked'))
    }

    GRACE_PERIODS {
        TEXT id PK
        TEXT membership_id FK
        INTEGER days
        TEXT started_at
        TEXT ends_at
        TEXT reason
        TEXT created_at
        TEXT created_by
        CHECK: (days >= 0 AND days <= 60)
    }

    %% Relationships
    ATHLETE_MEMBERSHIPS ||--o{ LICENSE_STATES : "has"
    ATHLETE_MEMBERSHIPS ||--o{ LICENSE_CONDITIONS : "has"
    ATHLETE_MEMBERSHIPS ||--o{ GRACE_PERIODS : "has"
```

### Máquina de Estados de Licencia

```
┌─────────────┐
│   ACTIVE    │ ◄──────────────────┐
└──────┬──────┘                    │
       │ start_payment_overdue     │
       ▼                           │
┌─────────────┐  days_passed       │
│ GRACE_PERIOD│ ────────────────► │
└──────┬──────┘                    │
       │ expires                   │
       ▼                           │
┌─────────────┐                    │
│ SUSPENDED   │ ──────────────────┘ (manual admin action)
└─────────────┘
```

---

## FASE E: Comisiones y Finanzas (Commission Management & Financial Ledger)

### Diagrama Mermaid Actualizado

```mermaid
erDiagram
    %% Existing Commission Tables (Reutilizar)
    COMMISSION_AGREEMENTS {
        TEXT id PK
        TEXT relationship_id FK
        INTEGER version
        INTEGER rate_bps
        INTEGER fixed_amount_cents
        TEXT eligible_base_rule
        TEXT rounding
        TEXT currency
        TEXT valid_from
        TEXT valid_to
        TEXT status
        TEXT accepted_by
        TEXT accepted_at
        TEXT created_at
        CHECK: (status IN ('proposed','accepted','superseded','ended'))
    }

    COMMISSION_ENTRIES {
        TEXT id PK
        TEXT operation_id FK
        TEXT relationship_id FK
        TEXT coach_id
        TEXT agreement_id FK
        INTEGER agreement_version
        INTEGER base_cents
        INTEGER rate_bps
        INTEGER fixed_amount_cents
        INTEGER amount_cents
        TEXT currency
        TEXT status
        TEXT computed_at
        TEXT created_at
        CHECK: (status IN ('accrued','reversed'))
    }

    FINANCIAL_ADJUSTMENTS {
        TEXT id PK
        TEXT entry_id FK
        TEXT settlement_id FK
        TEXT kind
        INTEGER amount_cents
        TEXT reason
        TEXT created_by
        TEXT created_at
        CHECK: (kind IN ('refund','chargeback','correction'))
    }

    COACH_SETTLEMENTS {
        TEXT id PK
        TEXT coach_id
        TEXT ally_id FK
        TEXT period_start
        TEXT period_end
        TEXT period_key
        TEXT currency
        TEXT status
        INTEGER operations_count
        INTEGER base_total_cents
        INTEGER commission_gross_cents
        INTEGER adjustments_cents
        INTEGER commission_net_cents
        TEXT calculated_at
        TEXT approved_at
        TEXT closed_at
        TEXT created_at
        TEXT updated_at
        CHECK: (status IN ('draft','calculated','under_review','approved','document_issued','paid_external','disputed','void'))
    }

    SETTLEMENT_ITEMS {
        TEXT id PK
        TEXT settlement_id FK
        TEXT entry_id FK
        INTEGER base_cents
        INTEGER rate_bps
        INTEGER amount_cents
        TEXT released_at
        TEXT created_at
    }

    %% Relationships
    ALLY_OPERATIONS ||--o{ COMMISSION_ENTRIES : "generates"
    COMMISSION_AGREEMENTS ||--o{ COMMISSION_ENTRIES : "defines"
    COMMISSION_ENTRIES ||--o{ FINANCIAL_ADJUSTMENTS : "has"
    COMMISSION_ENTRIES ||--o{ SETTLEMENT_ITEMS : "included in"
    COACH_SETTLEMENTS ||--o{ SETTLEMENT_ITEMS : "contains"
    COACH_SETTLEMENTS ||--o{ coach_payment_records : "generates"
```

---

## FASE F: Alianzas (Alliances)

### Diagrama Mermaid Actualizado

```mermaid
erDiagram
    %% Existing Alliance Tables (Reutilizar)
    ALLIES {
        TEXT id PK
        TEXT owner_user_id
        TEXT legal_name
        TEXT commercial_name
        TEXT category
        TEXT contact_email
        TEXT contact_phone
        TEXT tax_id
        TEXT status
        TEXT created_at
        TEXT updated_at
        CHECK: (status IN ('pending','active','suspended'))
    }

    COACH_ALLY_RELATIONSHIPS {
        TEXT id PK
        TEXT coach_id
        TEXT ally_id FK
        TEXT status
        TEXT attributed_by
        TEXT invited_at
        TEXT activated_at
        TEXT ended_at
        TEXT created_at
        TEXT updated_at
        UNIQUE: (coach_id, ally_id)
        CHECK: (status IN ('invited','active','declined','suspended'))
    }

    ALLY_OPERATIONS {
        TEXT id PK
        TEXT kind
        TEXT relationship_id FK
        TEXT ally_id FK
        TEXT athlete_id
        TEXT status
        TEXT scheduled_at
        TEXT confirmed_at
        TEXT completed_at
        TEXT cancelled_at
        TEXT created_at
        TEXT updated_at
        CHECK: (kind IN ('order','reservation'))
        CHECK: (status IN ('created','confirmed','fulfilled','attended','no_show','cancelled'))
    }

    ALLY_PRODUCTS {
        TEXT id PK
        TEXT ally_id FK
        TEXT name
        TEXT description
        INTEGER price_cents
        TEXT currency
        INTEGER stock
        INTEGER active
        TEXT created_at
        TEXT updated_at
    }

    ALLY_SERVICES {
        TEXT id PK
        TEXT ally_id FK
        TEXT name
        TEXT description
        INTEGER price_cents
        TEXT currency
        INTEGER duration_min
        INTEGER capacity
        INTEGER active
        TEXT created_at
        TEXT updated_at
    }

    ALLY_PAYMENT_DECLARATIONS {
        TEXT id PK
        TEXT operation_id FK
        INTEGER version
        TEXT supersedes_id FK
        INTEGER amount_cents
        TEXT currency
        TEXT method
        TEXT declared_at
        TEXT reference
        TEXT evidence_ref
        TEXT status
        TEXT reviewed_by
        TEXT reviewed_at
        TEXT review_note
        TEXT created_at
        UNIQUE: (operation_id, version)
        CHECK: (status IN ('declared','under_review','confirmed','rejected','reversed'))
    }

    %% New Integration Points (Add FK references)
    ALLY_OPERATIONS ||--o{ COMMISSION_ENTRIES : "triggers"
    ALLY_OPERATIONS ||--o{ ALLY_PAYMENT_DECLARATIONS : "has"
    COACH_ALLY_RELATIONSHIPS ||--o{ COMMISSION_AGREEMENTS : "governs"
```

---

## FASE G: Super Admin & RBAC (Super Admin & Role-Based Access)

### Diagrama Mermaid

```mermaid
erDiagram
    %% Super Admin
    SUPER_ADMIN_USERS {
        TEXT id PK
        TEXT email
        TEXT full_name
        TEXT role ENUM
        TEXT status
        TEXT last_login_at
        TEXT created_at
        TEXT updated_at
        CHECK: (role IN ('super_admin','coach_owner','coach_staff'))
        CHECK: (status IN ('active','suspended'))
    }

    ADMIN_ROLES {
        TEXT id PK
        TEXT name
        TEXT description
        TEXT permission_level
        TEXT created_at
        TEXT updated_at
        CHECK: (permission_level IN ('read','write','admin','super'))
    }

    ADMIN_PERMISSIONS {
        TEXT id PK
        TEXT resource
        TEXT action
        TEXT description
        TEXT created_at
    }

    ROLE_PERMISSIONS {
        TEXT id PK
        TEXT role_id FK
        TEXT permission_id FK
        TEXT granted_by
        TEXT granted_at
        UNIQUE: (role_id, permission_id)
    }

    USER_ROLES {
        TEXT id PK
        TEXT user_id
        TEXT role_id FK
        TEXT scope
        TEXT granted_by
        TEXT granted_at
        UNIQUE: (user_id, role_id)
        CHECK: (scope IN ('global','organization','team'))
    }

    ADMIN_AUDIT_LOG {
        TEXT id PK
        TEXT user_id
        TEXT action
        TEXT resource_type
        TEXT resource_id
        TEXT details
        TEXT ip_address
        TEXT user_agent
        TEXT created_at
        INDEX: idx_admin_audit_created_at
        INDEX: idx_admin_audit_user
        INDEX: idx_admin_audit_resource
    }

    EXEMPTION_APPROVALS ||--o{ ADMIN_AUDIT_LOG : "logged"
    BENEFITS ||--o{ ADMIN_AUDIT_LOG : "logged"
```

---

## FASE H: Integración Mercado Pago (Payment Integration)

### Diagrama Mermaid

```mermaid
erDiagram
    %% Payment Events
    PAYMENT_EVENTS {
        TEXT id PK
        TEXT external_id
        TEXT event_type
        TEXT resource
        TEXT status
        TEXT raw_payload
        TEXT processed_at
        TEXT error_count
        TEXT last_error
        TEXT created_at
        INDEX: idx_payment_events_external_id
        INDEX: idx_payment_events_status
        INDEX: idx_payment_events_type
    }

    PAYMENT_WORK_QUEUE {
        TEXT id PK
        TEXT event_id FK
        TEXT task_type
        TEXT payload
        TEXT status
        INTEGER attempts
        TEXT last_attempt_at
        TEXT next_attempt_at
        TEXT error_message
        TEXT created_at
        TEXT updated_at
        CHECK: (status IN ('pending','processing','completed','failed'))
        CHECK: (task_type IN ('fulfill_membership','fulfill_order','activate_subscription'))
    }

    MEMBERSHIP_PAYMENTS {
        TEXT id PK
        TEXT membership_id FK
        REAL amount
        TEXT currency
        TEXT status
        TEXT polar_order_id
        TEXT period_start
        TEXT period_end
        TEXT paid_at
        TEXT mp_payment_id
        TEXT created_at
        CHECK: (status IN ('pending','completed','failed','refunded'))
    }

    STORE_ORDERS {
        TEXT id PK
        TEXT athlete_id
        TEXT status
        REAL total
        TEXT currency
        TEXT mp_preference_id
        TEXT mp_payment_id
        TEXT created_at
        TEXT updated_at
        CHECK: (status IN ('pending','confirmed','paid','fulfilled','cancelled'))
    }

    %% Relationships
    PAYMENT_EVENTS ||--o{ PAYMENT_WORK_QUEUE : "queues"
    MEMBERSHIP_PAYMENTS ||--o{ PAYMENT_EVENTS : "creates"
    STORE_ORDERS ||--o{ PAYMENT_EVENTS : "creates"
    PAYMENT_EVENTS ||--o{ MEMBERSHIP_PAYMENTS : "fulfills"
    PAYMENT_EVENTS ||--o{ STORE_ORDERS : "fulfills"
```

---

## REGLAS DE MULTI-TENANT Y RLS

### Políticas de Seguridad

```sql
-- RLS Policy Template (PostgreSQL)
-- Cada tenant (ally) debe ver solo sus propios datos

-- Ally isolation
CREATE POLICY "allies_read_own" ON ally_operations
  FOR SELECT USING (ally_id = current_setting('app.current_ally_id'));

-- Coach isolation  
CREATE POLICY "coaches_read_own" ON athlete_memberships
  FOR SELECT USING (coach_id = current_setting('app.current_coach_id'));

-- Admin global (Super Admin)
CREATE POLICY "super_admin_all" ON commercial_policies
  FOR ALL USING (current_setting('app.user_role') = 'super_admin');
```

### Restricciones de Integridad

1. **Nunca referencias cruzadas entre organizaciones**
2. **Todos los IDs son TEXT (UUID strings) para consistent hashing**
3. **Timestamps en UTC**
4. **Moneda COP (COP) - extensible a más monedas futuro**

---

## ESTRATEGIA DE MIGRACIÓN

### Orden de Migraciones Recomendado

```
031_commercial_policies.sql        → Fase B (Políticas)
032_policy_versions.sql            → Fase B (Versiones)
033_policy_rules.sql               → Fase B (Reglas jerárquicas)
034_exemptions.sql                 → Fase C (Exoneraciones)
035_benefits.sql                   → Fase C (Beneficios)
036_license_states.sql             → Fase D (Estados licencia)
037_grace_periods.sql              → Fase D (Períodos gracia)
038_payment_events.sql             → Fase H (Eventos MP)
039_payment_work_queue.sql         → Fase H (Cola trabajo)
040_super_admin_rbac.sql           → Fase G (Super Admin)
```

---

## TABLAS EXISTENTS vs NUEVAS

### Tabla de Resumen

| Tabla | Estado | Ubicación | Uso |
|-------|--------|-----------|-----|
| `allies` | ✅ Existe | Turso | Base para Alianzas |
| `coach_ally_relationships` | ✅ Existe | Turso | Relación coach-aliado |
| `ally_operations` | ✅ Existe | Turso | Operaciones comerciales |
| `ally_operation_items` | ✅ Existe | Turso | Items de operaciones |
| `ally_payment_declarations` | ✅ Existe | Turso | Declaraciones de pagos |
| `ally_products` | ✅ Existe | Turso | Catálogo de productos |
| `ally_services` | ✅ Existe | Turso | Catálogo de servicios |
| `allies_members` | ✅ Existe | Turso | Miembros aliados |
| `ally_invitations` | ✅ Existe | Turso | Invitaciones |
| `ally_locations` | ✅ Existe | Turso | Ubicaciones |
| `athlete_memberships` | ✅ Existe | apps/api | Membresías |
| `membership_payments` | ✅ Existe | apps/api | Pagos membresías |
| `plans` | ✅ Existe | apps/api | Planes de precios |
| `coach_settlements` | ✅ Existe | apps/api | Liquidaciones |
| `settlement_items` | ✅ Existe | apps/api | Items liquidación |
| `settlement_documents` | ✅ Existe | apps/api | Documentos |
| `coach_payment_records` | ⚠️ Parcial | apps/api | **REQUERIR webhook MP** |
| `commission_agreements` | ✅ Existe | apps/api | Acuerdos comisión |
| `commission_entries` | ✅ Existe | apps/api | Entradas comisión |
| `financial_adjustments` | ✅ Existe | apps/api | Ajustes financieros |
| `commercial_policies` | ❌ Nueva | Nueva | Motor de políticas |
| `policy_versions` | ❌ Nueva | Nueva | Versiones de políticas |
| `exemptions` | ❌ Nueva | Nueva | Exoneraciones |
| `exemption_approvals` | ❌ Nueva | Nueva | Aprobaciones dobles |
| `benefits` | ❌ Nueva | Nueva | Beneficios |
| `license_states` | ❌ Nueva | Nueva | Estados de licencia |
| `license_conditions` | ❌ Nueva | Nueva | Condiciones comerciales |
| `grace_periods` | ❌ Nueva | Nueva | Períodos de gracia |
| `payment_events` | ❌ Nueva | Nueva | Eventos MP idempotentes |
| `payment_work_queue` | ❌ Nueva | Nueva | Cola de trabajo |
| `super_admin_users` | ❌ Nueva | Nueva | Usuarios Super Admin |
| `admin_roles` | ❌ Nueva | Nueva | Roles de admin |
| `admin_permissions` | ❌ Nueva | Nueva | Permisos |
| `admin_audit_log` | ❌ Nueva | Nueva | Log de auditoría |

---

## REGLAS DE INMUTABILIDAD

### Finanzas

1. **Nunca DELETE** registros financieros
2. **Nunca UPDATE** campos monetarios
3. **SIEMPRE** crear registro nuevo con tipo `correction` en `financial_adjustments`
4. `closed_at` en `coach_settlements` marca punto de no retorno

### Comisiones

1. `commission_entries` es snapshot inmutable (agreement_version, base_cents, rate_bps, amount_cents)
2. Nunca modificar una entrada existente
3. Para correcciones: crear entrada nueva o `financial_adjustment`

### Webhooks MP

1. Persistir evento en `payment_events` ANTES de procesar
2. Usar `payment_work_queue` con idempotencia
3. `attempts` max 3, luego alerta manual
4. `external_id` como clave única para detección duplicados

---

## NEXT STEPS

1. ✅ Inventorio completado
2. ✅ Identificado gap de tablas
3. ⏳ Crear migraciones Fase B-F
4. ⏳ Actualizar webhook MP para procesar durablemente
5. ⏳ Crear servicios Go para motor de políticas
6. ⏳ Definir contratos API
7. ⏳ Implementar tests de integración

---

## NOTAS TÉCNICAS

### Decisiones Arquitectónicas

1. **Separación de conceptos:** Exoneración ≠ Descuento ≠ Bonificación ≠ Suspensión
2. **Licencia bidimensional:** Estado + Condición comercial
3. **Período de gracia configurable:** por plan, default 7 días
4. **Aprobación dual:** dos responsables para cambios sensibles
5. **Snapshot de política:** cada operación guarda la política aplicada
6. **RLS multi-tenant:** aislamiento verificable desde el diseño