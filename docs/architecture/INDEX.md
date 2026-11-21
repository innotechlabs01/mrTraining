# Índice de Documentación Comercial MR Training

## Documentos Disponibles

| Documento | Descripción | Estado |
|-----------|-------------|--------|
| [ERD_COMMERCIAL.md](./ERD_COMMERCIAL.md) | ERD definitivo con 8 dominios | ✅ Completo |
| [diagram-mermaid.mmd](./diagram-mermaid.mmd) | Diagrama Mermaid completo | ✅ Completo |
| [dictionary.md](./dictionary.md) | Diccionario de datos detallado | ✅ Completo |

---

## Arquitectura Comercial — 8 Dominios

### 1. Commercial Policy Engine
**Tablas:**
- `commercial_policies` (NUEVA) - Motor de políticas parametrizables
- `policy_versions` (NUEVA) - Historial de versiones
- `policy_rules_operation` (NUEVA) - Reglas por tipo de operación
- `policy_rules_plan` (NUEVA) - Reglas por plan
- `policy_rules_coach` (NUEVA) - Reglas por coach

### 2. Exemptions & Benefits
**Tablas:**
- `exemptions` (NUEVA) - Exoneraciones con aprobación dual
- `exemption_approvals` (NUEVA) - Registro de aprobaciones
- `benefits` (NUEVA) - Beneficios especiales
- `suspension_rules` (NUEVA) - Reglas de suspensión

### 3. Coach Membership & Licensing
**Tablas:**
- `athlete_memberships` (EXISTENTE) - Membresías
- `license_states` (NUEVA) - Estados de licencia
- `license_conditions` (NUEVA) - Condiciones comerciales
- `grace_periods` (NUEVA) - Períodos de gracia

### 4. Commission Management
**Tablas:**
- `commission_agreements` (EXISTENTE) - Acuerdos de comisión
- `commission_entries` (EXISTENTE) - Entradas de comisión
- `financial_adjustments` (EXISTENTE) - Ajustes compensatorios

### 5. Financial Ledger & Settlements
**Tablas:**
- `coach_settlements` (EXISTENTE) - Liquidaciones
- `settlement_items` (EXISTENTE) - Items de liquidación
- `settlement_documents` (EXISTENTE) - Documentos
- `coach_payment_records` (EXISTENTE) - Registros de pagos

### 6. Alliances
**Tablas:**
- `allies` (EXISTENTE) - Aliados comerciales
- `coach_ally_relationships` (EXISTENTE) - Relaciones
- `ally_operations` (EXISTENTE) - Operaciones
- `ally_operation_items` (EXISTENTE) - Items de operación
- `ally_payment_declarations` (EXISTENTE) - Declaraciones
- `ally_products` (EXISTENTE) - Productos
- `ally_services` (EXISTENTE) - Servicios

### 7. Super Admin & RBAC
**Tablas:**
- `super_admin_users` (NUEVA) - Usuarios Super Admin
- `admin_roles` (NUEVA) - Roles
- `admin_permissions` (NUEVA) - Permisos
- `role_permissions` (NUEVA) - Asignación de permisos
- `user_roles` (NUEVA) - Asignación de roles a usuarios
- `admin_audit_log` (NUEVA) - Log de auditoría

### 8. Payment Integration
**Tablas:**
- `payment_events` (NUEVA) - Eventos de Mercado Pago
- `payment_work_queue` (NUEVA) - Cola de trabajo

---

## Jerarquía de Comisiones

```
EXCEPCIÓN (ej: 0% + $0)
    ↓
COACH (ej: 7% + $10.000 COP)
    ↓
PLAN (ej: 10% + $0)
    ↓
OPERATION TYPE (ej: 5% + $5.000 COP)
    ↓
GLOBAL (ej: 8% + $0) ← Default
```

---

## Migraciones Recomendadas

```
031_commercial_policies.sql       → Motor de políticas
032_policy_versions.sql            → Versiones
033_policy_rules.sql               → Reglas jerárquicas
034_exemptions.sql                 → Exoneraciones
035_benefits.sql                   → Beneficios
036_license_states.sql             → Estados licencia
037_grace_periods.sql              → Períodos gracia
038_payment_events.sql             → Eventos MP
039_payment_work_queue.sql         → Cola trabajo
040_super_admin_rbac.sql           → RBAC
```

---

## 📋 Documentos Técnicos Creados

| Documento | Propósito | Archivo |
|-----------|-----------|---------|
| **IMPLEMENTATION_PLAN.md** | Plan técnico completo con dependencias | ✅ Creado |
| **MIGRATION_DEPENDENCY_MAP.md** | Mapa de dependencias y orden de migraciones | ✅ Creado |
| **API_IMPLEMENTATION_MAP.md** | Mapa de endpoints y RBAC por API | ✅ Creado |
| **SECURITY_IMPLEMENTATION_PLAN.md** | Implementación de RLS, auditoría, rate limiting | ✅ Creado |

### Acceso a documentos

```bash
# Leer plan de implementación
cat docs/architecture/IMPLEMENTATION_PLAN.md

# Ver mapa de migraciones
cat docs/architecture/MIGRATION_DEPENDENCY_MAP.md

# Ver endpoints API
cat docs/architecture/API_IMPLEMENTATION_MAP.md

# Ver plan de seguridad
cat docs/architecture/SECURITY_IMPLEMENTATION_PLAN.md
```

---

## Próximos Pasos

**VERIFICADO:** El webhook de Mercado Pago está implementado correctamente:

- `POST /payments/webhook` → `ProcessWebhook()` 
- Verifica firma (`x-signature`)
- Verifica idempotencia (MP payment ID como clave)
- Llama a `ActivateAfterPayment()` 
- `ActivateAfterPayment()` verifica duplicados y actualiza membresía

**El código SÍ funciona.** El problema mencionado en auditoría podría ser:
- Configuración de webhook URL
- Problemas de red
- Errores de firma sin registrar

---

## Referencias

- [Auditoría Comercial Completa](../audits/mr-training-commercial-audit.md)
- [Schema PostgreSQL](../../migration-secure/turso-schema.sql)