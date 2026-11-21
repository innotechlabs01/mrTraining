# Plan de Implementación de Seguridad — MR Training

## 🎯 Objetivos de Seguridad

1. **Aislamiento multi-tenant verificable** — RLS en PostgreSQL
2. **Protección de operaciones financieras** — Auditoría inmutable
3. **Control de acceso por roles** — RBAC granular
4. **Aprobación dual para cambios sensibles** — Doble check
5. **Rate limiting y protección de webhooks** — Prevención de abuso

---

## 1. Row-Level Security (RLS)

### 1.1 Configuración Base

```sql
-- Habilitar RLS en conexiones
-- En connection pool:
SET SESSION application_name = 'api';

-- Por tabla sensible
ALTER TABLE commission_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE athlete_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE exemptions ENABLE ROW LEVEL SECURITY;
```

### 1.2 Políticas por Entidad

#### 1.2.1 Commission Entries

```sql
-- Coach ve sus propias comisiones
CREATE POLICY "coach_commission_entries"
ON commission_entries
FOR ALL
USING (
    coach_id = current_setting('app.current_user_id')::TEXT
);

-- Super Admin ve todo
CREATE POLICY "super_admin_commission_entries"
ON commission_entries
FOR ALL
USING (current_setting('app.user_role') = 'super_admin');

-- Eligible ve solo de sus aliados
CREATE POLICY "eligible_commission_entries"
ON commission_entries
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM coach_ally_relationships car
        WHERE car.id = commission_entries.relationship_id
        AND car.ally_id IN (
            SELECT ally_id FROM coach_ally_relationships
            WHERE coach_id = current_setting('app.current_user_id')::TEXT
        )
    )
);
```

#### 1.2.2 Athlete Memberships

```sql
-- Coach ve membresías de sus atletas
CREATE POLICY "coach_athlete_memberships"
ON athlete_memberships
FOR ALL
USING (coach_id = current_setting('app.current_user_id')::TEXT);
```

#### 1.2.3 Exemptions

```sql
-- Solo Super Admin puede crear/modificar exemptions
CREATE POLICY "super_admin_exemptions"
ON exemptions
FOR ALL
USING (current_setting('app.user_role') = 'super_admin');

-- Audit trail sempre activo
CREATE POLICY "select_all_exemptions"
ON exemptions
FOR SELECT
USING (true);  -- SELECT siempre permitido (solo visualización)
```

### 1.3 Tests de Aislamiento RLS

#### Test 1: Coach ve solo sus datos

```sql
-- Conectar como Coach A
SET LOCAL app.current_user_id = 'coach_a_123';
SET LOCAL app.user_role = 'coach_owner';

-- Debería funcionar
SELECT COUNT(*) FROM athlete_memberships;  -- 5 atletas

-- Debería fallar
SELECT COUNT(*) FROM athlete_memberships WHERE coach_id = 'coach_b_456';  -- 0 filas
-- No se puede filtrar, pero RLS lo filtra automáticamente

-- Debería fallar
SELECT COUNT(*) FROM commission_entries WHERE coach_id = 'coach_b_456';  -- 0 filas
```

#### Test 2: Cross-Tenant Access

```sql
-- Coach A intenta acceder a relación de Coach B
SELECT * FROM coach_ally_relationships WHERE coach_id = 'coach_b_456';
-- Resultado: 0 filas (RLS filtra)

-- Intentar acceder directamente por ID
SELECT * FROM coach_ally_relationships WHERE id = 'rel_b_123';
-- Resultado: 0 filas si rel_b_123 pertenece a coach_b_456
```

---

## 2. Audit Trail

### 2.1 Tabla de Auditoría

```sql
CREATE TABLE admin_audit_log (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,               -- GRANT, REVOKE, MODIFY, DELETE, EXECUTE
    resource_type TEXT NOT NULL,        -- exemption, policy, commission, etc.
    resource_id TEXT NOT NULL,          -- ID del recurso afectado
    details TEXT,                       -- JSON con detalles del cambio
    ip_address TEXT,
    user_agent TEXT,
    before_state TEXT,                  -- JSON del estado anterior
    after_state TEXT,                   -- JSON del estado después
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_audit_user ON admin_audit_log(user_id);
CREATE INDEX idx_audit_resource ON admin_audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_created ON admin_audit_log(created_at);
```

### 2.2 Triggers de Auditoría Automáticos

```sql
-- Trigger para exemptions
CREATE TRIGGER audit_exemption_changes
AFTER UPDATE ON exemptions
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status 
    OR OLD.reason IS DISTINCT FROM NEW.reason
    OR OLD.amount_cents IS DISTINCT FROM NEW.amount_cents)
BEGIN
    INSERT INTO admin_audit_log (
        user_id, action, resource_type, resource_id,
        details, before_state, after_state
    ) VALUES (
        current_setting('app.current_user_id'),
        CASE WHEN OLD.status IS NULL THEN 'CREATE' ELSE 'UPDATE' END,
        'exemption', OLD.id,
        json_object('expires_at', OLD.expires_at),
        json_object('status', OLD.status, 'reason', OLD.reason, 'amount_cents', OLD.amount_cents),
        json_object('status', NEW.status, 'reason', NEW.reason, 'amount_cents', NEW.amount_cents)
    );
END;
```

### 2.3 Audit de Webhook MP

```sql
-- Cada webhook genera un registro auditable
CREATE TRIGGER audit_payment_events
AFTER INSERT ON payment_events
FOR EACH ROW
BEGIN
    INSERT INTO admin_audit_log (
        user_id, action, resource_type, resource_id, details
    ) VALUES (
        'system', 'PAYMENT_WEBHOOK_RECEIVED', 'payment_event', NEW.id,
        json_object('external_id', NEW.external_id, 'event_type', NEW.event_type)
    );
END;
```

---

## 3. RBAC (Role-Based Access Control)

### 3.1 Definición de Roles

| Rol | Descripción | Nivel |
|-----|-------------|-------|
| `super_admin` | Dueño global del sistema | 4 |
| `coach_owner` | Dueño de coach | 3 |
| `coach_staff` | Staff del coach | 2 |
| `athlete` | Atleta | 1 |
| `system` | Proceso automatizado | 0 |

### 3.2 Permisos Granulares

```sql
CREATE TABLE rbac_permissions (
    id TEXT PRIMARY KEY,
    resource TEXT NOT NULL,       -- exemptions, policies, commissions, memberships
    action TEXT NOT NULL,         -- read, write, delete, admin
    description TEXT
);

INSERT INTO rbac_permissions VALUES
('perm_exemptions_read', 'exemptions', 'read', 'Ver exoneraciones'),
('perm_exemptions_write', 'exemptions', 'write', 'Crear/editar exoneraciones'),
('perm_exemptions_approve', 'exemptions', 'admin', 'Aprobar exoneraciones'),
('perm_policies_read', 'policies', 'read', 'Ver políticas'),
('perm_policies_write', 'policies', 'write', 'Modificar políticas'),
('perm_payments_read', 'payments', 'read', 'Ver pagos'),
('perm_financial_read', 'finances', 'read', 'Ver reportes financieros');
```

### 3.3 Asignación de Roles

```go
// Middleware para verificar permiso
func RequirePermission(resource, action string, requireApproval bool) fiber.Handler {
    return func(c *fiber.Ctx) error {
        userID := middleware.GetUserID(c)
        if userID == "" {
            return appresponse.Error(c, fiber.StatusUnauthorized, "authentication required")
        }

        hasAccess, role, err := checkPermission(c.Context(), userID, resource, action)
        if err != nil {
            return appresponse.Error(c, fiber.StatusInternalServerError, "permission check failed")
        }

        if !hasAccess {
            // Log security event
            logSecurityEvent(c.Context(), &SecurityEvent{
                UserID:      userID,
                Action:      "DENIED",
                Resource:    resource,
                Path:        c.Path(),
                IP:          c.IP(),
                UserAgent:   c.Get("User-Agent"),
            })
            return appresponse.Error(c, fiber.StatusForbidden, "insufficient permissions")
        }

        // Para acciones sensibles, verificar aprobación dual
        if requireApproval && !hasDualApproval(c.Context(), userID) {
            return appresponse.Error(c, fiber.StatusForbidden, "dual approval required")
        }

        return c.Next()
    }
}
```

---

## 4. Aprobación Dual

### 4.1 Reglas de Negocio

1. **Cambios financieros > $100.000 COP** → Requiere 2 aprobadores distintos
2. **Exoneraciones totales** → Requiere 2 aprobadores
3. **Suspensiones de cobros** → Requiere 2 aprobadores
4. **Reversión de pagos** → Requiere 2 aprobadores

### 4.2 Implementación

```go
type ExemptionRequest struct {
    RelationshipID string   `json:"relationship_id"`
    ExemptionType  string   `json:"exemption_type"`
    AmountCents    int64    `json:"amount_cents"`
    Reason         string   `json:"reason"`
    ExpiresAt      *string  `json:"expires_at"`
    Approvers      []string `json:"approvers"`  // EXACTAMENTE 2 IDs
}

func (s *ExemptionService) Create(req ExemptionRequest) error {
    // Validar 2 aprobadores distintos
    if len(req.Approvers) != 2 {
        return errors.BadRequest("exactly 2 approvers required")
    }
    if req.Approvers[0] == req.Approvers[1] {
        return errors.BadRequest("approvers must be different")
    }
    
    // Verificar que ambos tengan permiso
    for _, approver := range req.Approvers {
        if !s.rbac.HasPermission(approver, "exemptions", "approve") {
            return errors.BadRequest("approver lacks permission")
        }
    }
    
    // Crear con status "pending_approval"
    // Cuando ambos aprueban → status = "approved"
    // Genera trigger de auditoría para cada approval
}
```

---

## 5. Rate Limiting

### 5.1 Webhook Protection

```go
// Middleware para webhook MP
func RateLimitWebhook() fiber.Handler {
    return func(c *fiber.Ctx) error {
        clientIP := c.IP()
        
        // Redis-based rate limiting
        key := fmt.Sprintf("webhook_limit:%s", clientIP)
        count, err := redisClient.Incr(key).Result()
        if err != nil {
            // Fail open for availability
            return c.Next()
        }
        
        if count == 1 {
            redisClient.Expire(key, time.Minute)
        }
        
        if count > 100 {  // 100 requests per minute max
            log.Printf("[SECURITY] Webhook rate limit exceeded: %s", clientIP)
            return appresponse.Error(c, fiber.StatusTooManyRequests, "rate limit exceeded")
        }
        
        return c.Next()
    }
}
```

### 5.2 Admin Endpoints

```go
// 10 requests/min para admin, 100 para usuarios normales
func RateLimitAdmin() fiber.Handler {
    return func(c *fiber.Ctx) error {
        userID := middleware.GetUserID(c)
        role := middleware.GetUserRole(c)
        
        key := fmt.Sprintf("admin_rate_limit:%s:%s", userID, role)
        limit := 100
        if role == "super_admin" || role == "coach_owner" {
            limit = 10
        }
        
        // ... implementación similar
    }
}
```

---

## 6. Tests de Seguridad Obligatorios

### Test 6.1: Cross-Tenant Isolation

```go
func TestCrossTenantIsolation(t *testing.T) {
    coachA := "coach_a_123"
    coachB := "coach_b_456"
    
    // Crear datos para ambos coaches
    createTestData(t, coachA, "athletes_a")
    createTestData(t, coachB, "athletes_b")
    
    // Conectar como Coach A
    db.SetSessionUser(coachA, "coach_owner")
    
    // Intentar acceder a datos de Coach B
    var count int
    err := db.QueryRow("SELECT COUNT(*) FROM athlete_memberships WHERE coach_id = $1", coachB).Scan(&count)
    
    // Debe fallar o retornar 0 (RLS filtra)
    if err != nil && !isRowLevelSecurityError(err) {
        t.Errorf("RLS no está protegiendo correctamente: %v", err)
    }
}
```

### Test 6.2: Dual Approval Enforcement

```go
func TestDualApprovalRequired(t *testing.T) {
    admin1 := "admin_1"
    admin2 := "admin_2"
    athlete := "athlete_123"
    
    // Crear exoneración con 1 aprobador → debe estar en "pending"
    exemption, err := service.CreateExemption(ExemptionRequest{
        RelationshipID: "rel_123",
        AmountCents:    100000,
        Approvers:      []string{admin1},  // Solo 1
    })
    
    if err == nil || exemption.Status != "pending" {
        t.Error("Debe requerirse dual approval")
    }
    
    // Agregar segundo aprobador
    err = service.ApproveExemption(exemption.ID, admin2)
    
    // Ahora debe estar "approved"
    updated, _ := service.GetExemption(exemption.ID)
    if updated.Status != "approved" {
        t.Error("Debe estar approved con 2 aprobadores")
    }
}
```

### Test 6.3: Admin Audit Trail

```go
func TestAdminAuditTrail(t *testing.T) {
    admin := "admin_123"
    exemption := createExemption()
    
    // Realizar cambio
    service.UpdateExemptionStatus(exemption.ID, "approved", admin)
    
    // Verificar auditoría
    var log AdminAuditLog
    err := db.QueryRow(`
        SELECT user_id, action, resource_type, resource_id, details 
        FROM admin_audit_log 
        WHERE resource_id = $1 
        ORDER BY created_at DESC LIMIT 1
    `, exemption.ID).Scan(&log.UserID, &log.Action, &log.ResourceType, &log.ResourceID, &log.Details)
    
    if err != nil || log.UserID != admin || log.Action != "UPDATE" {
        t.Error("Audit trail no registrado correctamente")
    }
}
```

---

## 7. Checklist de Implementación de Seguridad

| Item | Estado | Comentario |
|------|--------|------------|
| RLS habilitado | ⬜ | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` |
| Políticas RLS creadas | ⬜ | Policies por tabla |
| Middleware `RequirePermission` | ⬜ | Verificación de acceso |
| Sistema de roles | ⬜ | `rbac_roles`, `rbac_user_roles` |
| Permisos definidos | ⬜ | `rbac_permissions` |
| Audit trail implementado | ⬜ | `admin_audit_log` + triggers |
| Rate limiting webhook | ⬜ | Middleware con Redis |
| Dual approval logic | ⬜ | Validación 2 aprobadores |
| Tests de aislamiento | ⬜ | Test cross-tenant |
| Tests de RBAC | ⬜ | Test permisos por rol |
| Tests de auditoría | ⬜ | Verificar logs creados |

---

## 8. Estrategia de Rol Back de Seguridad

1. **Antes de habilitar RLS:** Hacer backup completo
2. **RLS en tabla testing primero:** `test_comision_entries` antes de `commission_entries`
3. **Rollback RLS por tabla:**
```sql
ALTER TABLE commission_entries DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coach_commission_entries" ON commission_entries;
DROP POLICY IF EXISTS "super_admin_commission_entries" ON commission_entries;
```
4. **Verificar datos:** Comparar resultados antes y después RLS
5. **Solo producir RLS cuando todos los tests pasen**