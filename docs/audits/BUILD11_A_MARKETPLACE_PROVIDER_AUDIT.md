# BUILD11-A — Auditoría del proveedor y del flujo económico marketplace

Fecha de auditoría: 2026-11-06
Alcance: auditoría de arquitectura y código existente; no se modificó código, migraciones, datos, QA ni producción.

## 1. Decisión ejecutiva

**Resultado:** `BUILD11-A INCOMPLETE / BLOCKED para el flujo marketplace real`.

Se confirma que el proveedor identificado es **Mercado Pago Checkout Pro**, usando Checkout Preferences y webhook con verificación `x-signature` HMAC-SHA256. El proveedor documenta marketplace y split de pagos, incluyendo Colombia entre los países disponibles. La implementación actual **no demuestra** split automático, onboarding de cuenta conectada ni compensación donde el neto vaya directamente al coach. El código actual crea preferencias con el access token global de MR Training y no usa OAuth/seller access token ni comisión de marketplace en las preferencias.

Por lo tanto:
- Capacidad documentada por el proveedor: **SÍ**, para Checkout Pro y marketplace.
- Capacidad disponible para Colombia según documentación: **sí, según la documentación pública cargada**.
- Capacidad implementada en MR Training: **NO** para split automático de membresías.
- Capacidad comprobada por transacción real: **NO**.
- QA para flujo económico: **NO autorizada**.

## 2. Flujo actual observado

```text
Coach configura plan en MR Trainning
-> Athlete selecciona membresía / plan coach
-> client calls MR Training API
-> API creates Checkout Pro preference with MR Training platform token
-> Athlete pays Mercado Pago checkout
-> Mercado Pago sends webhook
-> MR Training verifies signature
-> MR Training fetches payment
-> if approved:
   - activates/renews membership
   - membership payment record may be created indirectly
   - outbox/commission not observed in membership path
```

### Componentes existentes

- `apps/api/internal/application/payment.Service`
  - `CreateCartPreference` (tienda)
  - `CreateMembershipPreference` (membresía)
  - `ProcessWebhook` ( webhook de pago)
- `apps/api/internal/interfaces/http/handlers/payment.go`
  - rutas de cart/membership preference
  - webhook `/payments/webhook`
- `apps/api/internal/application/subscription.Service`
  - `Subscribe`, `Cancel`, `GetByAthlete`, `ListByCoach`, `FulfillWebhook`
- `apps/api/internal/infrastructure/subscription/mercadopago/adapter.go`
  - `CreateCheckout`, `VerifySignature`, `FetchPayment`, `Refund`
- `apps/api/internal/application/membership.Service`
  - `GetMembership`, `CreateMembership`, `StartTrial`, `CancelMembership`, `RenewMembership`, `ActivateAfterPayment`
- `apps/api/internal/application/commission_entry.Service`
  - lógica de comisión para operaciones/ally.
- `apps/api/internal/application/coach_settlement.Service`
  - liquidaciones coach/ally y documentos.
- Base de datos: `plans`, `plan_versions`, `athlete_memberships`, `membership_payments`, `plans`/`plan_versions`, `payment_methods`, `commission_*`, `coach_settlement*`, `coach_payment_records`.

## 3. Lo que está implementado (según código)

### Checkout
- Se crea preferencia de Mercado Pago con:
  - `external_reference: membership:<id>` o `membership:<id>` para el flujo de membresía.
  - `items` con precio del plan.
  - `notification_url`.
  - token global `MERCADO_PAGO_SECRET_KEY`.
- No se usa `payer.email` ni datos de cobro adicionales.

### Webhook
- Endpoint público: `POST /payments/webhook`.
- Verifica `x-signature` con `MERCADO_PAGO_WEBHOOK_KEY`.
- Fetch payment server-to-server desde Mercado Pago.
- Idempotencia parcial:
  - `membership_payments.mpPaymentID` / `PolarOrderID`.
  - `sub_repo.GetPaymentByProviderID`.
- Membership: `ActivateAfterPayment` registra payment y renueva period.
- Suscripción: `FulfillWebhook` registra payment y activa.

### Commission
- Existe lógica de comisiones para operaciones/ally con agreement, rate, base, amount, reversal.
- Existen asientos financieros por refund/chargeback/correction.
- Existen liquidaciones coaches con items.
- No se observa vinculación directa de comisión para membership payment.

### Settlement
- Coach settlement calcula totales desde comisiones elegibles, items, estatus.
- Soporta documentos.
- Destinos de pago son mayormente `CoachPaymentRecord` con ally.
- No hay transacción real de transfer o marketplace split vinculada a membership.

### Cuenta receptora
- `payment_methods` almacena bank/holder/account info.
- No hay evidencia de OAuth, connected account, onboarding ni sync del proveedor.
- No hay uso de `collector_id`, marketplace OAuth token o `marketplace_fee`.

## 4. Capacidad de Mercado Pago (evidencia de documentation)

Fuente oficial cargada:
`MercadoPago Colombia — sección “Cómo integrar el checkout en marketplace”` para Checkout Pro / Preferences.

Evidencia relevante:
- Marketplace es una plataforma de comercio electrónico que conecta vendedores y compradores.
- Checkout Pro y Checkout API pueden repartir automáticamente los importes entre el vendedor y el marketplace mediante split del pago.
- `Ambos checkouts reparten automáticamente los importes entre el vendedor y el marketplace a través del split del pago sin necesidad de ninguna acción por parte del vendedor.`
- La comisión de Mercado Pago se descuenta de los fondos recibidos por el vendedor; luego la comisión del marketplace se descuenta del saldo restante.
- Para integrar marketplace, debe usarse OAuth y obtener `access_token` y `public_key` para cada vendedor.
- Uso de las credenciales del vendedor en backend o headers.
- En Checkout Pro, completar `marketplace_fee` con el monto cobrado por preferencia.
- En Checkout API, completar `application_fee`.
- Hay soporte reportado para Colombia en sección de disponibilidad por país para Checkout Pro y Checkout API.

Interpretación:
- Mercado Pago documenta capacidad de split automático en marketplace.
- Requiere OAuth y token por vendedor.
- Requiere configurar `marketplace_fee` o `application_fee`.
- Nuestra implementación actual no usa estas capacidades; sigue con credencial de plataforma global y no neto directo al coach.

## 5. Brechas funcionales y de seguridad

### Brecha 1 — Split no implementado
- Integración actual usa un access token global MR Training.
- No se observa `marketplace_fee` ni `application_fee`.
- La comisión se podría calcular internamente, pero no acreditar automáticamente.
Clasificación: **bloqueada para modelo marketplace real**.

### Brecha 2 — Onboarding de cuenta coach no evidenciado
- `payment_methods` guarda datos bancarios, pero no evidencia OAuth MP.
- No se observa callback de autorización.
- No se observa estado de cuenta activa o suspensión.
Clasificación: **pendiente**.

### Brecha 3 — Activación de membresía no conserva plan completo
- `athlete_memberships.plan_price`, `plan_name`, `billing_period` se copian.
- No se observa `plan_id` en `athlete_memberships` para conservar contrato inmutable si plan cambia.
Clasificación: **pendiente funcional** (puede degradar integridad de contrato).

### Brecha 4 — Conciliación y liquidación
- Mercado Pago informes / transacciones existen.
- No hay flujo real en MR Training para verificar fondos, rollback, settlements.
- Coach Settlement es interno para ally/commission, no integración MP.
Clasificación: **pendiente**.

### Brecha 5 — Webhooks e idempotencia
- Verificación HMAC correcta.
- Membership idempotency por `PolarOrderID` (mp payment id).
- Subscription idempotency por `GetPaymentByProviderID`.
- No hay evidencia de escenarios retry de webhook, reenvío, race o estados pendiente/rechazado/reembolso posterior.
Clasificación: **parcialmente implementado**.

### Brecha 6 — Seguridad
- Amount is fetched from MP, good.
- No marketplace_fee.
- No authenticated account context.
- membership activation amount not obviously cross-checked against plan price before UoW.
- No split, so monies could remain platform and only internally distributed records.
Clasificación: **riesgo alto para el modelo propuesto**.

## 6. Matriz de capacidades

- Codebase: identificado como Mercado Pago Checkout Pro/API, COP currency.
- Provider docs marketplace for CO: visible as marketplace flow for Checkout Pro/API.
- Account: unknown (no secret values displayed).
- Implemented in codebase: checkout preference, webhook, payment fetch, activation.
- Real transaction: NOT CONFIRMED.

## 7. Provider recommendation

**Provider viable en principio para el modelo marketplace en Colombia**, según documentación regional cargada de Mercado Pago.

MR Training **no está todavía integrado como marketplace split**. Falta:
- OAuth por coach.
- Creación de preferencias con credencial del vendedor o marketplace.
- Configurar `marketplace_fee` / `application_fee`.
- Reconciliación con pagos reales.
- Certificación de webhook/retry/refunds.

No cambiar proveedor sin una razón documentada y sin cost-controls.
No asumir que cuentas están habilitadas antes de crear una app/lista de requisitos.

## 8. Dependencies / deliverable for next phase

Build11-B can only start after:
1. account commercial readiness,
2. OAuth + seller credentials model,
3. `marketplace_fee` contract,
4. webhook reconciliation and idempotency tests,
5. audit of benefits and preserving original prices.

## Decision
`BUILD11-A BLOCKED/INCOMPLETE for full marketplace capability; provider viable in principle, implementation incomplete.`

MR TRAINING remains NOT READY FOR QA.
