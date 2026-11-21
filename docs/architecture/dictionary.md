# Diccionario de Datos Comercial MR Training

**Versión:** 1.0  
**Fecha:** 2026-11-01  
**Estado:** Especificación

---

## DOMINIO 1: Commercial Policy Engine

### commercial_policies
Motor de políticas parametrizables para el sistema comercial.

| Campo | Tipo | Nulo | Default | Descripción |
|-------|------|------|---------|-------------|
| `id` | TEXT | NO | - | UUID único (PK) |
| `name` | TEXT | NO | - | Nombre legible de la política |
| `description` | TEXT | NO | '' | Descripción detallada |
| `default_commission_type` | TEXT | NO | 'percentage' | Tipo por defecto: percentage/fixed/hybrid |
| `default_rate_bps` | INTEGER | NO | 0 | Tasa base en basis points (1000 = 10%) |
| `default_fixed_amount_cents` | INTEGER | NO | 0 | Monto fijo base en centavos |
| `eligible_base_rule` | TEXT | NO | 'subtotal_after_discounts_before_tax' | Base de cálculo |
| `rounding` | TEXT | NO | 'half_up' | Regla de redondeo |
| `currency` | TEXT | NO | 'COP' | Moneda ( extensible a USD, EUR ) |
| `is_active` | BOOLEAN | NO | true | Política activa/inactiva |
| `created_at` | TEXT | NO | datetime('now') | Timestamp creación UTC |
| `updated_at` | TEXT | NO | datetime('now') | Timestamp actualización UTC |

**Índices:**
- `idx_commercial_policies_active` en (is_active)

---

### policy_versions
Historial de versiones de políticas para auditoría y rollback.

| Campo | Tipo | Nulo | Default | Descripción |
|-------|------|--------|-----------|-------------|
| `id` | TEXT | NO | - | UUID único (PK) |
| `policy_id` | TEXT | NO | - | FK a commercial_policies.id |
| `version` | INTEGER | NO | - | Número de versión (incremental) |
| `rate_bps` | INTEGER | NO | 0 | Tasa en basis points |
| `fixed_amount_cents` | INTEGER | NO | 0 | Monto fijo en centavos |
| `eligible_base_rule` | TEXT | NO | - | Regla de base de cálculo |
| `rounding` | TEXT | NO | - | Regla de redondeo |
| `valid_from` | TEXT | NO | - | Fecha inicio vigencia YYYY-MM-DD |
| `valid_to` | TEXT | SÍ | NULL | Fecha fin vigencia |
| `status` | TEXT | NO | 'active' | Status: proposed/active/ended |
| `created_at` | TEXT | NO | datetime('now') | Timestamp |

**Restricciones:**
- UNIQUE (policy_id, version)
- CHECK (rate_bps >= 0 AND rate_bps <= 100000)
- CHECK (valid_to IS NULL OR valid_to >= valid_from)
- CHECK (status IN ('proposed','active','ended'))

---

### policy_rules_operation_type
Reglas por tipo de operación (order, reservation, service, product).

| Campo | Tipo | Nulo | Default | Descripción |
|-------|------|------|---------|-------------|
| `id` | TEXT | NO | - | UUID único (PK) |
| `policy_id` | TEXT | NO | - | FK a commercial_policies.id |
| `operation_type` | TEXT | NO | - | Tipo: order/reservation/service/product |
| `rate_bps` | INTEGER | NO | 0 | Tasa en basis points |
| `fixed_amount_cents` | INTEGER | NO | 0 | Monto fijo en centavos |
| `effective_from` | TEXT | NO | - | Fecha inicio vigencia |
| `effective_to` | TEXT | SÍ | NULL | Fecha fin vigencia |
| `created_at` | TEXT | NO | datetime('now') | Timestamp |

**Restricciones:**
- UNIQUE (policy_id, operation_type, effective_from)
- CHECK (rate_bps >= 0 AND rate_bps <= 100000)

---

## DOMINIO 2: Exemptions & Benefits

### exemptions
Exoneraciones de comisiones con aprobación dual.

| Campo | Tipo | Nulo | Default | Descripción |
|-------|------|------|---------|-------------|
| `id` | TEXT | NO | - | UUID único (PK) |
| `relationship_id` | TEXT | NO | - | FK a coach_ally_relationships.id |
| `coach_id` | TEXT | NO | - | Coach que aprueba (para lookup) |
| `athlete_id` | TEXT | SÍ | NULL | Athlete afectado (si aplica) |
| `operation_id` | TEXT | SÍ | NULL | Operación afectada (si aplica) |
| `exemption_type` | TEXT | NO | - | discount/waiver/reduced_commission |
| `reason` | TEXT | NO | - | Razón de la exoneración |
| `amount_cents` | INTEGER | NO | 0 | Monto en centavos |
| `currency` | TEXT | NO | 'COP' | Moneda |
| `status` | TEXT | NO | 'pending' | Status: pending/approved/rejected/expired |
| `applied_at` | TEXT | SÍ | NULL | Fecha aplicación |
| `expires_at` | TEXT | SÍ | NULL | Fecha expiración |
| `permission_required` | TEXT | NO | 'dual_approval' | Tipo de aprobación requerida |
| `created_at` | TEXT | NO | datetime('now') | Timestamp |
| `created_by` | TEXT | NO | - | User ID que crea |

**Restricciones:**
- UNIQUE (relationship_id, operation_id, exemption_type)
- CHECK (status IN ('pending','approved','rejected','expired'))
- CHECK (exemption_type IN ('discount','waiver','reduced_commission'))

---

### exemption_approvals
Registro de aprobaciones dobles para exoneraciones.

| Campo | Tipo | Nulo | Default | Descripción |
|-------|------|------|---------|-------------|
| `id` | TEXT | NO | - | UUID único (PK) |
| `exemption_id` | TEXT | NO | - | FK a exemptions.id |
| `approver_id` | TEXT | NO | - | User ID del aprobador |
| `approver_type` | TEXT | NO | - | user|system |
| `role` | TEXT | NO | - | super_admin|coach_owner|coach_staff |
| `action` | TEXT | NO | - | approve|reject |
| `note` | TEXT | SÍ | NULL | Nota del aprobador |
| `approved_at` | TEXT | NO | - | Timestamp aprobación |
| `created_at` | TEXT | NO | datetime('now') | Timestamp |

**Restricciones:**
- CHECK (role IN ('super_admin','coach_owner','coach_staff'))
- CHECK (action IN ('approve','reject'))

---

### benefits
Beneficios especiales para relaciones coach-aliado.

| Campo | Tipo | Nulo | Default | Descripción |
|-------|------|------|---------|-------------|
| `id` | TEXT | NO | - | UUID único (PK) |
| `relationship_id` | TEXT | NO | - | FK a coach_ally_relationships.id |
| `benefit_type` | TEXT | NO | - | discount/bonus/waiver/reduced_commission |
| `reason` | TEXT | NO | - | Motivo del beneficio |
| `value_cents` | INTEGER | NO | 0 | Valor en centavos |
| `quantity` | INTEGER | NO | 1 | Cantidad |
| `currency` | TEXT | NO | 'COP' | Moneda |
| `status` | TEXT | NO | 'pending' | pending/active/expired/cancelled |
| `started_at` | TEXT | NO | - | Fecha inicio |
| `expires_at` | TEXT | SÍ | NULL | Fecha expiración |
| `permission_required` | TEXT | NO | 'dual_approval' | Aprobación requerida |
| `created_at` | TEXT | NO | datetime('now') | Timestamp |
| `created_by` | TEXT | NO | - | User ID |

**Restricciones:**
- UNIQUE (relationship_id, benefit_type, started_at)
- CHECK (status IN ('pending','active','expired','cancelled'))

---

## DOMINIO 4: Commission Management

### commission_entries (EXISTENTE - NO MODIFICAR)
Entrada de comisión calculada para cada operación.

| Campo | Tipo | Nulo | Default | Descripción |
|-------|------|------|---------|-------------|
| `id` | TEXT | NO | - | UUID único (PK) |
| `operation_id` | TEXT | NO | - | FK a ally_operations.id |
| `relationship_id` | TEXT | NO | - | FK a coach_ally_relationships.id |
| `coach_id` | TEXT | NO | - | ID del coach beneficiario |
| `agreement_id` | TEXT | NO | - | FK a commission_agreements.id |
| `agreement_version` | INTEGER | NO | - | Versión acuerdo usada |
| `base_cents` | INTEGER | NO | - | Base de cálculo en centavos |
| `rate_bps` | INTEGER | NO | - | Tasa calculada en basis points |
| `fixed_amount_cents` | INTEGER | NO | - | Monto fijo calculado |
| `amount_cents` | INTEGER | NO | - | Comisión calculada |
| `currency` | TEXT | NO | 'COP' | Moneda |
| `status` | TEXT | NO | 'accrued' | accrued|reversed |
| `computed_at` | TEXT | NO | - | Timestamp cálculo |
| `policy_snapshot` | TEXT | SÍ | NULL | JSON de política aplicada |
| `created_at` | TEXT | NO | datetime('now') | Timestamp |

---

## DOMINIO 5: Financial Ledger

### coach_settlements (EXISTENTE - NO MODIFICAR)
Liquidación mensual de comisiones a coaches.

| Campo | Tipo | Nulo | Default | Descripción |
|-------|------|------|---------|-------------|
| `id` | TEXT | NO | - | UUID único (PK) |
| `coach_id` | TEXT | NO | - | ID del coach beneficiario |
| `ally_id` | TEXT | NO | - | FK a allies.id (pagador) |
| `period_start` | TEXT | NO | - | YYYY-MM-DD |
| `period_end` | TEXT | NO | - | YYYY-MM-DD |
| `period_key` | TEXT | NO | - | YYYY-MM (clave única) |
| `currency` | TEXT | NO | 'COP' | Moneda |
| `status` | TEXT | NO | 'draft' | draft|calculated|under_review|approved|document_issued|paid_external|disputed|void |
| `operations_count` | INTEGER | NO | 0 | Cantidad operaciones |
| `base_total_cents` | INTEGER | NO | 0 | Total base en centavos |
| `commission_gross_cents` | INTEGER | NO | 0 | Comisión bruta |
| `adjustments_cents` | INTEGER | NO | 0 | Ajustes (positivos/negativos) |
| `commission_net_cents` | INTEGER | NO | 0 | Comisión neta |
| `calculated_at` | TEXT | SÍ | NULL | Timestamp cálculo |
| `approved_at` | TEXT | SÍ | NULL | Timestamp aprobación |
| `closed_at` | TEXT | SÍ | NULL | Timestamp cierre (immutable) |

**Máquina de Estados:**
```
draft → calculated → under_review → approved → document_issued → paid_external
  ↓         ↓              ↓            ↓              ↓              ↓
void      void           void         void           void           disputed
```

---

## DOMINIO 8: Payment Integration

### payment_events (NUEVA)
Eventos de Mercado Pago con idempotencia garantizada.

| Campo | Tipo | Nulo | Default | Descripción |
|-------|------|------|---------|-------------|
| `id` | TEXT | NO | - | UUID único (PK) |
| `external_id` | TEXT | NO | - | ID de Mercado Pago |
| `event_type` | TEXT | NO | - | payment|merchant.mp|merchant.order |
| `resource` | TEXT | NO | - | payment/order/etc |
| `status` | TEXT | NO | 'received' | received|processed|failed |
| `raw_payload` | TEXT | NO | - | Payload JSON completo |
| `processed_at` | TEXT | SÍ | NULL | Timestamp procesamiento |
| `error_count` | INTEGER | NO | 0 | Intentos fallidos |
| `last_error` | TEXT | SÍ | NULL | Último error |
| `created_at` | TEXT | NO | datetime('now') | Timestamp recepción |

**Índices:**
- `idx_payment_events_external_id` en (external_id) - idempotencia
- `idx_payment_events_status` en (status) - reprocesamiento
- `idx_payment_events_type` en (event_type) - filtrado

---

### payment_work_queue (NUEVA)
Cola de trabajo para procesamiento durable.

| Campo | Tipo | Nulo | Default | Descripción |
|-------|------|------|---------|-------------|
| `id` | TEXT | NO | - | UUID único (PK) |
| `event_id` | TEXT | NO | - | FK a payment_events.id |
| `task_type` | TEXT | NO | - | fulfill_membership|fulfill_order|activate_subscription |
| `payload` | TEXT | NO | - | JSON con datos necesarios |
| `status` | TEXT | NO | 'pending' | pending|processing|completed|failed |
| `attempts` | INTEGER | NO | 0 | Intentos realizados |
| `last_attempt_at` | TEXT | SÍ | NULL | Último intento |
| `next_attempt_at` | TEXT | SÍ | NULL | Próximo intento (retry) |
| `error_message` | TEXT | SÍ | NULL | Último error |
| `created_at` | TEXT | NO | datetime('now') | Timestamp creación |
| `updated_at` | TEXT | NO | datetime('now') | Timestamp actualización |

**Restricciones:**
- CHECK (status IN ('pending','processing','completed','failed'))
- CHECK (task_type IN ('fulfill_membership','fulfill_order','activate_subscription'))
- Max attempts: 3, luego alerta manual

---

## REGLAS DE NEGOCIO

### Cálculo de Comisión (jerarquía)

1. **EXCEPCIÓN:** Si existe excepción activa → usar rate/fixed de excepción
2. **COACH:** Si coach tiene regla personalizada → usar rate/fixed del coach
3. **PLAN:** Si plan tiene regla → usar rate/fixed del plan
4. **OPERATION TYPE:** Si tipo de operación tiene regla → usar rate/fixed del tipo
5. **GLOBAL:** Usar valores por defecto de la política

### Base de Cálculo

```
Subtotal después de descuentos, antes de impuestos

Eligible Base = subtotal - discounts ± manual_adjustments
```

### Periodo de Gracia

```
Grace Period Days = plan.grace_period_days OR 7 (default)

Membership Status Rules:
- active: within period
- grace_period: expired + grace_days remaining
- suspended: past grace period or manual suspension
```

### Aprobación Dual

```
Para cambios sensibles (exenciones > $100.000 COP, suspensiones, reversos):
- Requerido: 2 aprobaciones distintas
- Roles permitidos: super_admin, coach_owner, coach_staff
- Tiempo límite: 48 horas entre aprobaciones
```

---

## SEGURIDAD MULTI-TENANT

### RLS Policies (PostgreSQL)

```sql
-- Ally isolation
CREATE POLICY "ally_operations_rls" ON ally_operations
  FOR ALL USING (ally_id = current_setting('app.current_ally_id'));

-- Coach isolation  
CREATE POLICY "athlete_memberships_rls" ON athlete_memberships
  FOR ALL USING (coach_id = current_setting('app.current_coach_id'));

-- Super Admin override
CREATE POLICY "super_admin_override" ON ALL TABLES
  FOR ALL USING (current_setting('app.user_role') = 'super_admin');
```

### Integridad Referencial

- Todas las relaciones tenant-safe usan FK explícitos
- Nunca se permite referencia cruzada entre organizaciones
- `athlete_id` y `coach_id` son TEXT (UUID) para consistent hashing

---

## AUDIT LOG REQUIREMENTS

Todas las tablas sensibles deben incluir:

| Campo | Propósito |
|-------|-----------|
| `created_at` | Timestamp UTC (no modificable) |
| `updated_at` | Timestamp UTC actualización |
| `created_by` | User ID que crea el registro |
| `policy_snapshot` | JSON de política aplicada (cuando aplique) |

Los logs de auditoría se graban en `admin_audit_log`:

```sql
INSERT INTO admin_audit_log (
  user_id, action, resource_type, resource_id,
  details, ip_address, user_agent, created_at
) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'));
```