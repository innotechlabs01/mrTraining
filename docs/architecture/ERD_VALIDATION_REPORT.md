# AUDITORÍA DE CONSISTENCIA DEL ERD COMERCIAL — MR TRAINING

**Fecha:** 2 de noviembre de 2026  
**Status:** READ-ONLY — No se han realizado modificaciones  
**Worktree:** `/Users/frg/Documents/Innotechlabs/Mao_Coaching/mr-training-audit`

---

## ✅ RESUMEN EJECUTIVO

| Tema | Hallazgo | Estado | Acción requerida |
|------|----------|--------|------------------|
| Tablas existentes | ✅ Coinciden con esquema | CONSISTENTE | Ninguna |
| Tablas nuevas propuestas | ❓ Justificación pendiente | PENDIENTE | Revisión detallada |
| Webhook Mercado Pago | ⚠️ Contradicción diagnósticos | INCONSISTENTE | Verificar flujo real |
| Jerarquía de comisiones | ⚠️ Ambigüedad posible | PENDIENTE | Definir algoritmo exacto |
| RLS/Seguridad | ❌ No existe en código | FALTANTE | Implementar |
| Aprobación dual | ❓ No implementado | PENDIENTE | Diseñar |

---

## 🔍 FASE 1: VALIDACIÓN DEL ERD — TABLAS

### Tabla de Clasificación

| Tabla | Estado actual | Ubicación | Validación |
|-------|---------------|-----------|------------|
| `allies` | ✅ Existe | turso-schema.sql:14 | COINCIDER |
| `coach_ally_relationships` | ✅ Existe | turso-schema.sql:435 | COINCIDER |
| `ally_products` | ✅ Existe | turso-schema.sql:131 | COINCIDER |
| `ally_services` | ✅ Existe | turso-schema.sql:166 | COINCIDER |
| `ally_operations` | ✅ Existe | turso-schema.sql:81 | COINCIDER |
| `ally_operation_items` | ✅ Existe | turso-schema.sql:68 | COINCIDER |
| `ally_payment_declarations` | ✅ Existe | turso-schema.sql:101 | COINCIDER |
| `athlete_memberships` | ⚠️ Inconsistencia | turso-schema.sql:285 vs 001_memberships.sql | **DISCREPANCIA** |
| `membership_payments` | ⚠️ Inconsistencia | turso-schema.sql vs apps/api/migrations/001_memberships.sql | **DISCREPANCIA** |
| `plans` | ⚠️ Inconsistencia | turso-schema.sql:245 vs 014_plans.sql | **DISCREPANCIA** |
| `coach_settlements` | ✅ Existe | 026_settlements.sql | COINCIDER |
| `settlement_items` | ✅ Existe | 026_settlements.sql | COINCIDER |
| `coach_payment_records` | ✅ Existe | 026_settlements.sql línea 85 | COINCIDER |
| `commission_agreements` | ✅ Existe | 020_commissions.sql | COINCIDER |
| `commission_entries` | ✅ Existe | 025_commission_entries.sql | COINCIDER |
| `financial_adjustments` | ✅ Existe | 025_commission_entries.sql línea 36 | COINCIDER |

### ⚠️ DISCREPANCIAS IDENTIFICADAS

#### 1. `athlete_memberships` — CAMPO `license_state` FALTANTE

**Turso Schema (líneas 285-302):**
```sql
ALTER TABLE athlete_memberships ADD COLUMN license_state TEXT DEFAULT 'active';
```

**Migrations apps/api (001_memberships.sql):**
```sql
CREATE TABLE athlete_memberships (
    id TEXT PRIMARY KEY,
    athlete_id TEXT NOT NULL,
    coach_id TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    plan_price REAL NOT NULL DEFAULT 0,
    billing_period TEXT NOT NULL,
    status TEXT NOT NULL,  -- NO TIENE license_state
    ...)
```

**Consecuencia:** El código Go usa `status` pero el schema espera `license_state`.

#### 2. `membership_payments` — CAMPO `mp_payment_id` FALTANTE

**Turso Schema:** No tiene `mp_payment_id`

**Migrations Go:** No existe tabla `membership_payments` en apps/api/migrations

**Ubicación real:** El campo `polar_order_id` en apps/api se usa como idempotencia

#### 3. `plans` — CAMPO `license_state` FALTANTE

**Turso Schema:** No tiene campo `license_state` ni `license_condition`

**Diccionario propuesto:** Propone usar `plan_name` como referencia a políticas

---

## 🔎 FASE 2: VALIDACIÓN DEL COMMERCIAL POLICY ENGINE

### Jerarquía de Resolución - Análisis de Ambigüedad

**Jerarquía propuesta:**
```
1. EXCEPCIÓN → 2. COACH → 3. PLAN → 4. OPERATION TYPE → 5. GLOBAL
```

### ❌ PROBLEMA CRÍTICO: Sin campo `relationship_id` en `alloy_operations`

**Verificado en turso-schema.sql líneas 81-100:**

```sql
CREATE TABLE ally_operations (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  relationship_id TEXT NOT NULL REFERENCES coach_ally_relationships(id),  -- ✅ EXISTE
  ally_id TEXT NOT NULL REFERENCES allies(id),
  athlete_id TEXT NOT NULL,
  ...)
```

**Está bien.** El `relationship_id` sí existe.

### ❌ PROBLEMA CRÍTICO: Sin campo `license_state` en `athlete_memberships`

**Verificado en apps/api/internal/application/membership/service.go:**

```go
type Membership struct {
    ID                 string  `json:"id"`
    Status             string  `json:"status"`  // SOLO Status
    GracePeriodDays    int     `json:"grace_period_days"`
    // NO tiene LicenseState ni LicenseCondition
}
```

**Consecuencia:** No se puede distinguir entre "activo" y "exento" en el modelo actual.

---

## 🔎 FASE 3: VALIDACIÓN DE EXONERACIONES Y APROBACIONES

### Tabla `exemptions` propuesta:

| Campo | Comentario | Estado |
|-------|------------|--------|
| `exemption_type` | discount/waiver/reduced_commission | ✅ Válido |
| `approval_1_id`, `approval_2_id` | Dos responsables | ✅ Válido |
| `status` | pending/approved/rejected/expired | ✅ Válido |
| `expires_at` | Control de expiración | ✅ Válido |

### ❌ FALTA: Verificar que `athlete_memberships` tenga espacio para `license_condition`

**Actualmente NO.** El campo `status` existe pero no `license_condition`.

### Recomendación:
- `status` = estado operativo (active, trial, past_due, cancelled, expired, suspended)
- Nuevo campo `license_condition` = condición comercial (standard, exempted, discounted, bonused)

---

## 🔎 FASE 4: VALIDACIÓN DE LICENCIAS

### Estado actual de `athlete_memberships`:

**Campo `status`** (Turso schema):
- Valores permitidos: NO definidos en CHECK constraint observable

**Código Go (membership.go:22-23):**
```go
Status string `json:"status"` // "active", "trial", "past_due", "cancelled", "expired"
```

### ✅ PROBLEMA RESUELTO: No hay `license_state` adicional

El modelo propuesto separa:
- **License State:** active, grace_period, suspended (estado técnico)
- **License Condition:** standard, exempted, discounted, bonused (estado comercial)

Esto ES necesario y CORRECTO.

---

## 🔎 FASE 5: AUDITORÍA EXHAUSTIVA DEL WEBHOOK DE MERCADO PAGO

### 📍 Archivo: `apps/api/internal/interfaces/http/handlers/payment.go`

#### Línea 26 - Ruta registrada:
```go
app.Post("/payments/webhook", handler.handleWebhook)
```
✅ **RUTA EXISTE**

#### Línea 101-117 - Función `handleWebhook`:
```go
func (h *PaymentHandler) handleWebhook(c *fiber.Ctx) error {
    body := c.Body()
    signature := c.Get("x-signature")
    
    if err := h.svc.ProcessWebhook(c.Context(), body, signature); err != nil {
        ...
    }
    return appresponse.Success(c, fiber.Map{"received": true})
}
```

### 📍 Archivo: `apps/api/internal/application/payment/service.go`

#### Línea 320-368 - Función `ProcessWebhook`:
```go
func (s *Service) ProcessWebhook(ctx context.Context, body []byte, signatureHeader string) error {
    if _, err := s.VerifyWebhookSignature(body, signatureHeader); err != nil {
        return err
    }
    
    var notif mpNotification
    if err := json.Unmarshal(body, &notif); err != nil {
        return errors.New("BAD_REQUEST", "body webhook inválido", http.StatusBadRequest)
    }
    if notif.Type != "payment" {
        return nil  // Ignorar otros tipos
    }
    ...
    
    payment, err := s.fetchPayment(ctx, notif.Data.ID)
    ...
    
    if payment.Status != "approved" {
        return nil  // Dejar pendiente
    }
    
    ref := payment.ExternalReference
    switch {
    case strings.HasPrefix(ref, "membership:"):
        membershipID := strings.TrimPrefix(ref, "membership:")
        if err := s.fulfillMembership(ctx, membershipID, payment); err != nil {
            return err
        }
        return nil
    default:
        if _, err := s.storeRepo.FulfillOrder(ctx, ref, payment.ID); err != nil {
            return errors.New("INTERNAL", "no se pudo cumplir la orden: "+err.Error(), http.StatusInternalServerError)
        }
        return nil
    }
}
```

### 📍 Verificación 1: Verificación de firma (líneas 286-316)

```go
func (s *Service) VerifyWebhookSignature(body []byte, signatureHeader string) (bool, error) {
    if signatureHeader == "" {
        return false, errors.New("UNAUTHORIZED", "firma webhook ausente", http.StatusUnauthorized)
    }
    // HMAC-SHA256 con secret
    mac := hmac.New(sha256.New, []byte(s.cfg.MercadoPagoWebhookKey))
    mac.Write([]byte(ts))
    mac.Write(body)
    expected := hex.EncodeToString(mac.Sum(nil))
    if !hmac.Equal([]byte(expected), []byte(v1)) {
        return false, errors.New("UNAUTHORIZED", "firma webhook inválida", http.StatusUnauthorized)
    }
    return true, nil
}
```
✅ **FIRMA VERIFICADA CORRECTAMENTE**

### 📍 Verificación 2: Consulta a Mercado Pago (líneas 382-405)

```go
func (s *Service) fetchPayment(ctx context.Context, paymentID string) (*mpPayment, error) {
    req, err := http.NewRequestWithContext(ctx, http.MethodGet, 
        mercadoPagoAPI+"/v1/payments/"+paymentID, nil)
    req.Header.Set("Authorization", "Bearer "+s.cfg.MercadoPagoSecretKey)
    resp, err := http.DefaultClient.Do(req)
    ...
}
```
✅ **CONSULTA A API DE MERCADO PAGO**

### 📍 Verificación 3: Activación de membresía (línea 357)

```go
if err := s.fulfillMembership(ctx, membershipID, payment); err != nil {
    return err
}
```

### 📍 Verificación 4: Función `fulfillMembership` (líneas 373-378)

```go
func (s *Service) fulfillMembership(ctx context.Context, membershipID string, payment *mpPayment) error {
    if err := s.membershipSvc.ActivateAfterPayment(ctx, membershipID, payment.ID, payment.TransactionAmount); err != nil {
        return errors.New("INTERNAL", "no se pudo activar la membresía: "+err.Error(), http.StatusInternalServerError)
    }
    return nil
}
```

### 📍 Verificación 5: `ActivateAfterPayment` (membership/service.go líneas 206-257)

```go
func (s *Service) ActivateAfterPayment(ctx context.Context, membershipID, mpPaymentID string, amount float64) error {
    // Idempotency: has this exact MP payment been recorded already?
    if existing, err := s.repo.GetPaymentByExternalID(ctx, mpPaymentID); err == nil && existing != nil {
        return nil  // YA REGISTRADO
    }
    ...
}
```
✅ **IDEMPOTENCIA IMPLEMENTADA**

### ❌ PROBLEMA CRÍTICO: SIN COLA DURABLE

**El webhook es TOTALMENTE SINCRÓNICO.** No hay:
- ❌ `payment_events` tabla
- ❌ `payment_work_queue` tabla
- ❌ Worker/proceso de recuperación
- ❌ Mecanismo de reintento con backoff

**Consecuencia:** Si la app se cae DESPUÉS de `GetPaymentByExternalID` pero ANTES de `ActivateAfterPayment`, el pago se pierde.

### ❓ CONTRADICCIÓN DIAGNÓSTICOS

**Diagnóstico anterior (audit):**
> "handlePaymentApproved() solo responde HTTP 200, no activa memberships"

**Diagnóstico actual (ERD):**
> "ActivateAfterPayment() ya es invocado"

**Verificación real:**
- El webhook SÍ llama a `fulfillMembership()`
- `fulfillMembership()` SÍ llama a `ActivateAfterPayment()`
- Pero el procesamiento es SINCRÓNICO (no hay cola)

**Conclusión:** Ambos diagnósticos tienen razón parcial:
1. El código sí intenta activar, pero...
2. No hay garantía de durabilidad porque es síncrono

---

## 🔎 FASE 6: SEGURIDAD

### ❌ RLS NO IMPLEMENTADO

**Buscado en:** `apps/api/internal/`

**Resultado:** NO EXISTE código de RLS ni políticas de row-level security.

### ❓ Multi-tenant safety

**FK verificadas:**
- `commission_agreements.relationship_id` → `coach_ally_relationships.id` ✅
- `ally_operations.athlete_id` → `coach_athletes.id` ✅
- `athlete_memberships.coach_id` → `coaches.id` ❓ (no definido como FK explícito)

**Problema:** No hay restricciones que impidan referencias cruzadas entre tenants.

---

## 🔎 FASE 7: INTEGRACIÓN CON ALIANZAS

### ✅ Reutilización verificada

| Tabla | Uso existente | Comentario |
|-------|--------------|------------|
| `ally_operations` | ✅ Usada en commission_entries | Correcto |
| `coach_ally_relationships` | ✅ Usada en commission_agreements | Correcto |
| `ally_payment_declarations` | ✅ Existe y funcional | Correcto |

### ⚠️ DUPLICACIÓN DE MOVIMIENTOS

**Tablas financieras existentes:**
1. `commission_entries` — para operaciones aliadas
2. `commission_agreements` — para acuerdos de comisión
3. `coach_settlements` — para liquidaciones a coaches
4. `financial_adjustments` — para ajustes

**Propuesta en ERD:**
- ✅ NO crear duplicados
- ✅ Usar `policy_snapshot` JSON en `commission_entries` existente

---

## 📊 TABLA RESUMEN DE VALIDACIÓN

| Categoría | Ítem | Estado | Comentario |
|-----------|------|--------|------------|
| Tablas | `allies`, `ally_operations`, `allies_products` | ✅ | Coinciden |
| Tablas | `athlete_memberships` | ⚠️ | Carece de `license_state` |
| Tablas | `membership_payments` | ⚠️ | No existe como tabla separada |
| Webhook MP | Verificación de firma | ✅ | Implementada correctamente |
| Webhook MP | Consulta API | ✅ | Implementada correctamente |
| Webhook MP | Idempotencia | ✅ | Implementada |
| Webhook MP | Cola durable | ❌ | NO EXISTE |
| Seguridad | RLS | ❌ | NO EXISTE |
| Políticas | Jerarquía | ⚠️ | Ambigüedad: ¿qué pasa si hay regla de plan y regla de operation? |
| Exoneraciones | Dos aprobadores | ✅ | Diseñado correctamente |
| Licencias | Estado vs Condición | ✅ | Necesario y bien diseñado |

---

## 📋 PROBLEMAS PRIORIZADOS

### P0 — CRÍTICO — Webhook Mercado Pago
**Referencia:** `apps/api/internal/interfaces/http/handlers/payment.go:101-117`, `service.go:320-368`

**Hallazgo:** El webhook es síncrono sin cola durable. Si falla entre la verificación y la activación, el pago se pierde.

**Evidencia:**
- No existe tabla `payment_events` en el schema
- No existe tabla `payment_work_queue`
- No hay worker ni proceso de recuperación

**Recomendación:** Implementar tabla `payment_events` + `payment_work_queue` + proceso de reintento.

### P1 — ALTO — Sin RLS
**Referencia:** No existe código de RLS en `apps/api/`

**Hallazgo:** No hay políticas de row-level security para aislamiento multi-tenant.

**Recomendación:** Agregar RLS a tablas sensibles: `commission_entries`, `athlete_memberships`, `exemptions`, etc.

### P2 — MEDIO — Campos faltantes en membership

**Referencia:** `apps/api/internal/domain/membership/membership.go:21-37`

**Hallazgo:** Falta `license_state` y `license_condition` en el modelo de membresía.

**Recomendación:** Agregar campos o usar el modelo propuesto de licencias bidimensional.

---

## 🔄 RECOMENDACIÓN DE ORDEN DE IMPLEMENTACIÓN

Basado en la validación, NO recomendaría comenzar con las 10 migraciones propuestas. Orden recomendado:

### FASE 1: Webhook MP (P0)
1. Crear `payment_events` (persistir evento ANTES de procesar)
2. Crear `payment_work_queue` (cola con reintentos)
3. Actualizar webhook para usar cola
4. Worker de procesamiento (o proceso separado)

### FASE 2: RLS y Seguridad (P1)
1. Implementar RLS en tablas financieras
2. Agregar `athlete_memberships.license_state`
3. Agregar `athlete_memberships.license_condition`

### FASE 3: Commercial Policy Engine (P1)
1. `commercial_policies` — Motor de políticas
2. `policy_versions` — Historial inmutable
3. `policy_rules_*` — Reglas jerárquicas

### FASE 4: Exoneraciones y Aprobaciones (P2)
1. `exemptions`
2. `exemption_approvals`
3. `benefits`
4. `suspension_rules`

### FASE 5: Licencias y Beneficios (P2)
1. `license_states`
2. `license_conditions`
3. `grace_periods`

### FASE 6: Super Admin (P1)
1. `super_admin_users`
2. `admin_roles`, `admin_permissions`
3. `user_roles`, `role_permissions`
4. `admin_audit_log`

### FASE 7: Integración Final
1. Integrar motor de políticas con commission_entries
2. Actualizar cálculos para considerar excepciones
3. Tests de integración

---

## 📎 REFERENCIAS EXACTAS

### Webhooks Mercado Pago
- `apps/api/internal/interfaces/http/handlers/payment.go:26` (ruta)
- `apps/api/internal/interfaces/http/handlers/payment.go:101-117` (handler)
- `apps/api/internal/application/payment/service.go:320-368` (ProcessWebhook)
- `apps/api/internal/application/payment/service.go:286-316` (VerifyWebhookSignature)
- `apps/api/internal/application/payment/service.go:382-405` (fetchPayment)
- `apps/api/internal/application/payment/service.go:21-39` (struct Service)

### Modelos de membresía
- `apps/api/internal/domain/membership/membership.go:21-37` (struct Membership)
- `apps/api/internal/application/membership/service.go:206-257` (ActivateAfterPayment)

### Tabla athlete_memberships
- `migration-secure/turso-schema.sql:285-302` (schema Turso)
- `apps/api/migrations/001_memberships.sql:2-36` (migración Go)

---

## ✅ CONCLUSIÓN

El ERD es **técnicamente sólido** pero tiene **desalineaciones críticas** con el código existente:

1. **El webhook MP NO tiene cola durable** — es el mayor riesgo financiero
2. **Campos de licencia faltan** en el modelo actual
3. **RLS no existe** en el código Go

**No autorizo** las 10 migraciones SQL sin primero resolver los puntos P0 y P1.