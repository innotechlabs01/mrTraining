# Mapa de Implementación de APIs — MR Training

## Principios de Diseño

1. **API-First:** Contrato claro antes de implementación
2. **Versionado:** `/api/v1/` con soporte de extensiones
3. **Tenant-aware:** Todas las APIs verifican pertenencia
4. **Auditable:** Cada endpoint sensible genera auditoría
5. **Rate limited:** 100 req/min por usuario, 10 req/min para admin

---

## 📡 Endpoints por Dominio

### DOMINIO P0: Payment Integration

#### `POST /api/v1/payments/webhook`

**Propósito:** Recibir notificaciones de Mercado Pago

**Headers requeridos:**
```
Content-Type: application/json
X-Signature: ts=<timestamp>,v1=<hmac>
```

**Request body:**
```json
{
  "type": "payment",
  "data": {
    "id": "mp_123456"
  }
}
```

**Response:**
```json
{ "received": true }
```

**Lógica:**
1. Verificar firma HMAC
2. Persistir en `payment_events`
3. Insertar mensaje en `payment_work_queue`
4. Responder 200 OK (siempre)

**Archivos Go:**
- `handlers/payment.go:handleWebhook()`
- `application/payment/service.go:ProcessWebhook()`

---

### DOMINIO P1: Commercial Policy Engine

#### `GET /api/v1/policies`

**Propósito:** Listar políticas activas (solo admin)

**Response:**
```json
{
  "policies": [
    {
      "id": "policy_1",
      "name": "Comisión default",
      "currency": "COP",
      "default_rate_bps": 800,
      "default_fixed_amount_cents": 0,
      "is_active": true,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

#### `GET /api/v1/policies/{id}`

**Propósito:** Obtener política específica con versiones

#### `POST /api/v1/policies`

**Propósito:** Crear nueva política (admin)

**Request body:**
```json
{
  "name": "Política Coach Especial",
  "description": "Comisión reducida para coach VIP",
  "default_rate_bps": 500,
  "default_fixed_amount_cents": 10000,
  "currency": "COP"
}
```

---

### DOMINIO P2: Exemptions & Benefits

#### `GET /api/v1/admin/exemptions`

**Propósito:** Listar exoneraciones (admin con filtros)

**Query params:**
- `status`: pending|approved|rejected|expired
- `reviewer`: user_id
- `type`: discount|waiver|reduced_commission
- `created_after`: date
- `created_before`: date

**Response:**
```json
{
  "exemptions": [
    {
      "id": "exemption_1",
      "relationship_id": "rel_123",
      "athlete_id": "ath_456",
      "exemption_type": "waiver",
      "amount_cents": 50000,
      "status": "approved",
      "created_by": "admin_789",
      "created_at": "2026-11-01T10:00:00Z",
      "approvals": [
        {
          "approver_id": "admin_1",
          "role": "super_admin",
          "approved_at": "2026-11-01T10:05:00Z"
        },
        {
          "approver_id": "admin_2",
          "role": "finance",
          "approved_at": "2026-11-01T10:10:00Z"
        }
      ]
    }
  ]
}
```

#### `POST /api/v1/admin/exemptions`

**Propósito:** Crear exoneración (requiere 2 aprobaciones)

**Request body:**
```json
{
  "relationship_id": "rel_123",
  "exemption_type": "waiver",
  "reason": "Renegociación de contrato",
  "amount_cents": 50000,
  "expires_at": "2026-12-01",
  "approved_by": ["admin_1", "admin_2"]  // 2 aprobadores requeridos
}
```

**Flujo:**
1. Crear exemption con status `pending`
2. Registrar en `exemption_approvals` dos veces
3. Cuando status = `approved`, generar trigger fiscal

#### `DELETE /api/v1/admin/exemptions/{id}`

**Propósito:** Revocar exoneración

**Response:**
```json
{
  "revoked": true,
  "previous_status": "approved",
  "revoked_by": "admin_123",
  "revoked_reason": "Error en aprobación previa"
}
```

---

### DOMINIO P3: Licencias

#### `GET /api/v1/licenses/{relationship_id}`

**Propósito:** Obtener estado de licencia de un coach

**Response:**
```json
{
  "relationship_id": "rel_123",
  "license_state": "active",
  "license_condition": "exempted",
  "grace_period_days": 7,
  "valid_from": "2026-01-01",
  "valid_to": "2026-12-31",
  "reason": "Acuerdo de partners"
}
```

---

### DOMINIO P4: Alliances Integration

#### `GET /api/v1/alianzas/{ally_id}/reporte`

**Propósito:** Generar reporte de operaciones y comisiones

**Response:**
```json
{
  "period": "2026-10",
  "total_operations": 150,
  "total_revenue_cents": 15000000,
  "total_commissions_cents": 1200000,
  "pending_declarations": 2,
  "compliance_status": "up_to_date"
}
```

---

## 🔐 RBAC - Permisos por Endpoint

### Matriz de Permisos

| Endpoint | Recurso | Acción | Rol requerido |
|----------|---------|--------|---------------|
| `/api/v1/policies` | policies | read | super_admin |
| `/api/v1/policies` | policies | write | super_admin |
| `/api/v1/exemptions` | exemptions | read | super_admin, finance |
| `/api/v1/exemptions` | exemptions | write | super_admin |
| `/api/v1/licenses` | licenses | read | super_admin, coach_owner |
| `/api/v1/alianzas/*/reporte` | alliances | read | super_admin, ally_owner |

### Middleware Go

```go
func RequirePermission(resource, action string) fiber.Handler {
    return func(c *fiber.Ctx) error {
        userID := middleware.GetUserID(c)
        role := middleware.GetUserRole(c)
        
        if role != "super_admin" {
            allowed, err := hasPermission(c.Context(), userID, role, resource, action)
            if err != nil || !allowed {
                auditLog(c.Context(), userID, "DENIED", resource, c.Path())
                return appresponse.Error(c, fiber.StatusForbidden, "access denied")
            }
        }
        
        auditLog(c.Context(), userID, "GRANTED", resource, c.Path())
        return c.Next()
    }
}
```

---

## 📊 Transacciones Críticas

### Transacción 1: Procesamiento de Pago

```go
func (s *PaymentService) ProcessPaymentEvent(ctx context.Context, event *PaymentEvent) error {
    tx, err := s.db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }
    
    // 1. Actualizar status del evento
    _, err = tx.ExecContext(ctx,
        "UPDATE payment_events SET status='processing', processed_at=NOW() WHERE id=$1",
        event.ID)
    if err != nil {
        tx.Rollback()
        return err
    }
    
    // 2. Crear payment record
    _, err = tx.ExecContext(ctx,
        "INSERT INTO membership_payments ...")
    if err != nil {
        tx.Rollback()
        return err
    }
    
    // 3. Activar membresía
    err = s.membershipSvc.ActivateAfterPayment(ctx, event.MembershipID, event.ExternalID, event.Amount)
    if err != nil {
        tx.Rollback()
        return err
    }
    
    // 4. Actualizar status del evento
    _, err = tx.ExecContext(ctx,
        "UPDATE payment_events SET status='completed' WHERE id=$1",
        event.ID)
    
    return tx.Commit()
}
```

---

## 🧪 Pruebas de API Requeridas

### Prueba 1: Webhook Idempotency

```go
func TestWebhookIdempotency(t *testing.T) {
    // Enviar mismo webhook 3 veces
    // Verificar que solo se procesa una vez
}
```

### Prueba 2: Aprobación Dual

```go
func TestExemptionDualApproval(t *testing.T) {
    // Crear exoneración con 1 aprobador
    // Verificar que status = pending
    // Agregar segundo aprobador
    // Verificar que status = approved
    // Intentar revertir con 1 aprobador → DENEGADO
}
```

### Prueba 3: RLS Tenant Isolation

```go
func TestRLSIsolation(t *testing.T) {
    // Conectar como Coach A
    // Intentar listar commission_entries de Coach B → DENEGADO
    // Conectar como Super Admin → PERMITIDO
}
```

---

## 📈 Métricas y Monitoreo

### Métricas a exponer

| Métrica | Tipo | Descripción |
|---------|------|-------------|
| `webhook_events_total` | Counter | Total de eventos recibidos |
| `webhook_events_processed` | Counter | Eventos procesados exitosamente |
| `webhook_events_failed` | Counter | Eventos fallidos |
| `worker_queue_length` | Gauge | Mensajes en cola |
| `worker_processing_time` | Histogram | Tiempo de procesamiento |
| `rbac_denials_total` | Counter | Intentos de acceso denegados |

### Alertas

1. `webhook_events_failed` > 5 en 10 min → Critical
2. `worker_queue_length` > 100 → Warning
3. `rbac_denials_total` > 10 → Info