# Mapa de Dependencias de Migraciones — MR Training

## Leyenda

| Símbolo | Significado |
|---------|-------------|
| ✅ | Tablas existentes (no migrar) |
| ⚠️ | Tablas con discrepancias (análisis previo) |
| 🆕 | Nuevas tablas (migrar) |
| 🔗 | Foreign Key |
| ⏳ | Bloqueado por otra migración |

---

## Mapa de Dependencias — Tablas por Fase

### FASE 1: MERCADO PAGO (P0)

```
┌─────────────────────────────────────────┐
│  payment_events                         │
│  id TEXT PK                            │
│  external_id TEXT UNIQUE               │
│  status TEXT                           │
│  created_at TEXT                       │
└─────────────────────────────────────────┘
              ↓ (depende de)
┌─────────────────────────────────────────┐
│  payment_work_queue                     │
│  id TEXT PK                            │
│  event_id TEXT 🔗 payment_events.id    │
│  status TEXT                           │
│  task_type TEXT                        │
└─────────────────────────────────────────┘
```

**Dependencias:**
- `payment_events`: Ninguna (tabla raíz)
- `payment_work_queue`: Depende de `payment_events`

**Archivos Go asociados:**
- `handlers/payment.go` (modificar)
- `application/payment/service.go` (modificar)

**Migración sugerida:** `041_payment_events.sql`

---

### FASE 2: RLS Y SEGURIDAD (P1)

```
┌─────────────────────────────────────────┐
│  commercial_policies                    │
│  id TEXT PK                            │
│  is_active BOOLEAN                     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  policy_versions                        │
│  policy_id TEXT 🔗 commercial_policies.id │
│  valid_from TEXT                       │
│  valid_to TEXT                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  exemptions                             │
│  id TEXT PK                            │
│  relationship_id TEXT 🔗 coach_ally_relationships.id │
│  operation_id TEXT 🔗 ally_operations.id (opcional) │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  coach_licenses                         │
│  id TEXT PK                            │
│  relationship_id TEXT 🔗 coach_ally_relationships.id │
└─────────────────────────────────────────┘
```

**Dependencias cruzadas:**
- `commercial_policies` → Ninguna
- `policy_versions` → `commercial_policies`
- `exemptions` → `coach_ally_relationships`, `ally_operations` (ambas existentes ✅)
- `coach_licenses` → `coach_ally_relationships` (existente ✅)

**Archivos Go asociados:**
- Nuevos módulos: `domain/commercial_policy/`, `domain/license/`
- Nuevos servicios: `application/commercial_policy/`, `application/license/`

**Migraciones sugeridas:**
- `042_commercial_policies.sql`
- `043_policy_versions.sql`
- `044_policy_rules.sql`
- `045_exemptions.sql`
- `046_coach_licenses.sql`

---

### FASE 3: RBAC (P1)

```
┌─────────────────────────────────────────┐
│  rbac_roles                             │
│  id TEXT PK                            │
│  name TEXT UNIQUE                      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  rbac_permissions                       │
│  id TEXT PK                            │
│  resource TEXT                         │
│  action TEXT                           │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  rbac_user_roles                        │
│  user_id TEXT                          │
│  role_id TEXT 🔗 rbac_roles.id       │
│  PRIMARY KEY (user_id, role_id)        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  rbac_role_permissions                  │
│  role_id TEXT 🔗 rbac_roles.id       │
│  permission_id TEXT 🔗 rbac_permissions.id │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  admin_audit_log                        │
│  id TEXT PK                            │
│  user_id TEXT                          │
│  action TEXT                           │
│  created_at TEXT                       │
└─────────────────────────────────────────┘
```

**Dependencias:**
- Todas deben estar creadas antes de que el Super Admin funcione
- `admin_audit_log` usado por: `exemptions`, `benefits`, cualquier operación sensible

**Migraciones sugeridas:**
- `047_rbac_roles.sql`
- `048_rbac_permissions.sql`
- `049_rbac_user_roles.sql`
- `050_rbac_role_permissions.sql`
- `051_admin_audit_log.sql`

---

## Diagrama de Dependencias Completo

```
mermaid
graph TD
    subgraph "TABLAS EXISTENTES"
        A1[allies]
        A2[coach_ally_relationships]
        A3[ally_operations]
        A4[ally_operation_items]
        A5[ally_payment_declarations]
        A6[commission_agreements]
        A7[commission_entries]
        A8[financial_adjustments]
        A9[coach_settlements]
        A10[settlement_items]
        A11[athlete_memberships ⚠️]
    end

    subgraph "FASE 1: P0"
        B1[payment_events]
        B2[payment_work_queue]
    end

    subgraph "FASE 2: Seguridad"
        C1[commercial_policies]
        C2[policy_versions]
        C3[policy_rules]
        C4[exemptions]
        C5[coach_licenses]
    end

    subgraph "FASE 3: RBAC"
        D1[rbac_roles]
        D2[rbac_permissions]
        D3[rbac_user_roles]
        D4[rbac_role_permissions]
        D5[admin_audit_log]
    end

    subgraph "FASE 4: Beneficios"
        E1[benefits]
        E2[suspension_rules]
    end

    subgraph "FASE 5: Integración"
        F1[policy_snapshot en commission_entries]
    end

    B1 --> B2
    C1 --> C2
    C1 --> C3
    C1 --> C4
    A2 --> C4
    A3 --> C4
    A2 --> C5
    A2 --> E1
    
    D1 --> D3
    D2 --> D4
    D5 --> F1
    
    C4 --> D5
    E1 --> D5
    
    C3 --> F1
    C4 --> F1
```

---

## Tabla de Orden de Ejecución

| # | Archivo | Fase | Dependencias | Tiempo estimado |
|---|---------|------|--------------|-----------------|
| 1 | `041_payment_events.sql` | P0 | Ninguna | 15 min |
| 2 | `042_commercial_policies.sql` | 2 | Ninguna | 30 min |
| 3 | `043_policy_versions.sql` | 2 | `commercial_policies` | 15 min |
| 4 | `044_policy_rules.sql` | 2 | `commercial_policies` | 20 min |
| 5 | `045_exemptions.sql` | 2 | `coach_ally_relationships`, `ally_operations` (existentes) | 30 min |
| 6 | `046_coach_licenses.sql` | 2 | `coach_ally_relationships` (existente) | 20 min |
| 7 | `047_rbac_roles.sql` | 3 | Ninguna | 20 min |
| 8 | `048_rbac_permissions.sql` | 3 | Ninguna | 20 min |
| 9 | `049_rbac_user_roles.sql` | 3 | `rbac_roles` | 15 min |
| 10 | `050_rbac_role_permissions.sql` | 3 | `rbac_roles`, `rbac_permissions` | 15 min |
| 11 | `051_admin_audit_log.sql` | 3 | Ninguna | 10 min |

---

## Cambios en Código Go Requeridos

### App Changes Map

| Componente | Archivo | Cambio | Fase |
|------------|---------|--------|------|
| Webhook | `handlers/payment.go` | Persistir evento primero | P0 |
| Service | `application/payment/service.go` | `EnqueueFulfillment()` | P0 |
| Worker | Nuevo | `PaymentWorker.ProcessNext()` | P0 |
| Middleware | Nuevo | `RequireRBAC(action, resource)` | P1 |
| Domain | Nuevo | `CommercialPolicy`, `License`, `Exemption` | P2 |
| Application | Nuevo | `CommercialPolicyService`, `LicenseService` | P2 |
| Infrastructure | Nuevo | `CommercialPolicyRepository`, `LicenseRepository` | P2 |

---

## Rollback Strategy

### Paso 1: Verificar estado de cola
```sql
-- Verificar que no hay trabajos pendientes
SELECT COUNT(*) FROM payment_work_queue WHERE status IN ('pending', 'processing');
-- Debe ser 0 o migración debe esperar
```

### Paso 2: Order de rollback
```
admin_audit_log → rbac_user_roles → rbac_permissions → rbac_roles
→ coach_licenses → exemptions → policy_rules → policy_versions 
→ commercial_policies → payment_work_queue → payment_events
```

### Paso 3: Backup crítico
Antes de cualquier migración:
```bash
pg_dump --schema-only --no-owner --no-acl $DATABASE_URL > schema_backup.sql
```

---

## Pruebas de Integridad

### Prueba 1: FK Integrity
```sql
-- Verificar que todas las FK apuntan a registros válidos
SELECT COUNT(*) FROM exemptions WHERE relationship_id NOT IN (
    SELECT id FROM coach_ally_relationships
);
-- Debe retornar 0
```

### Prueba 2: RLS Bypass
```sql
-- Conectar como usuario normal
SET app.current_user_id = 'coach_123';
SET app.user_role = 'coach_owner';

-- Intentar consultar tabla prohibida
SELECT * FROM rbac_roles LIMIT 1;
-- Debe fallar con "permission denied"
```

### Prueba 3: Idempotencia Payment Events
```sql
-- Insertar evento duplicado
INSERT INTO payment_events (id, external_id, event_type, status, raw_payload, created_at)
VALUES ('test_1', 'mp_123', 'payment', 'received', '{}', datetime('now'))
ON CONFLICT (external_id) DO NOTHING;

-- Verificar que no se duplicó
SELECT COUNT(*) FROM payment_events WHERE external_id = 'mp_123';
-- Debe ser 1
```