# BUILD11-B0 — Gate de habilitación Wompi y auditoría de economía marketplace

Fecha de auditoría: 2026-11-06
Alcance exclusivo: auditoría. No se modificó código, migraciones, datos, QA ni producción.

## 1. Decisión ejecutiva

**BUILD11-B0 PARTIAL / BLOCKED** para certificación del flujo completo.

Clasificación:
- Pagos en línea Wompi: **INCOMPLETO / NO VERIFICADO**
- Pagos a terceros Wompi: **BLOQUEADO / NO VERIFICADO**
- Integración Wompi en MR Training: **NO IMPLEMENTADA**
- Split/dispersión real de fondos: **NO DEMOSTRADO**
- Flujo económico actual: **Mercado Pago cobros con credencial global + registros internos de comisión/liquidación**

## 2. Proveedor realmente integrado

Proveedor activo en código:
- Mercado Pago / Checkout Pro / Payments API / Webhooks HMAC `x-signature`.

Configuración local encontrada (solo nombres de variables; no se exponen valores):
- MERCADO_PAGO_SECRET_KEY
- MERCADO_PAGO_PUBLIC_KEY
- MERCADO_PAGO_WEBHOOK_URL
- MERCADO_PAG_SECRET_WEBHOOK

No se encontró en código, rutas ni configuración:
- credenciales Wompi,
- adaptador Wompi,
- flujos `third_party_payments`,
- onboarding OAuth de proveedor,
- comando de dispersión Wompi.


## 3. Inventario del flujo económico actual

Componentes existentes:
- Membership: `plans`, `plan_versions`, `athlete_memberships`, `membership_payments`.
- Coach settlement: `coach_settlements`, `settlement_items`, `settlement_documents`, `coach_payment_records`, `commission_entries`, `commission_agreements`, `financial_adjustments`.
- Integración MP real parcial: checkout preference y webhook en `apps/api/internal/application/payment/service.go`.
- Adaptador MP: `apps/api/internal/infrastructure/subscription/mercadopago/adapter.go`.

No se observa OAuth por coach ni split automático por transaction. Los webhooks activan membresías y registran pagos, pero la comisión MR Training y el neto del coach se calculan registrativamente, no se comprueba distribución directa por el proveedor.

## 4. Clasificación de capacidades

Legenda: D = documentada, C = disponible Colombia, H = habilitada en cuenta MR Training, I = implementada en código, T = probada con transacción real.

Mercado Pago actual:
- Cobros Checkout Pro/API: D sí, C sí, H por confirmar, I sí, T parcial/manual.
- Webhook signature: D sí, C sí, H por confirmar, I sí, T parcial/manual.
- Fetch payment server-to-server: D sí, C sí, H por confirmar, I sí, T parcial/manual.
- Split marketplace: D sí según documentación marketplace, C sí, H NO verificado, I NO, T NO.
- OAuth por vendedor: D sí, C/H/I/T NO verificados o NO implementados.
- marketplace_fee/application_fee: D sí, I NO.
- Onboarding/vinculación de coaches: D parcial, I NO/T NO.
- Reembolsos: D sí (API reportada), I PARCIAL (adapter Refund existe), T NO.
- Conciliación directa: I NO.

Wompi como proveedor único propuesto:
- Pagos en línea: D sí, C sí, H NO verificado, I NO, T NO.
- Pagos a terceros: D sí, C por verificar, H NO verificado, I NO, T NO.
- Eventos idempotencia, estado y webhooks: documentation-wise sí, I NO.

Conclusión: el cambio de proveedor aun no puede certificarse porque no hay una única cuenta Wompi en el repositorio ni configuraciones, y el modulo actual sigue dependiendo de Mercado Pago.

## 5. Hallazgos principales
1. No existe adaptador Wompi en el código.
2. No existen credenciales Wompi en configuración local observable.
3. El cobro actual usa credencial global de Mercado Pago, no una cuenta de vendedor por coach.
4. No se configura `marketplace_fee` o `application_fee`.
5. `payment_methods` almacena datos de bank/holder, pero no OAuth de proveedor.
6. Commission Entry y Coach Settlement calculan comisión/liquidación, pero no ejecutan transferencia real.
7. Membership activates from webhook (good practice), pero el neto del coach y comisión MR no se demuestran como movimiento real del proveedor.
8. Hay documentación oficial pública que indica que Mercado Pago marketplace soporta split para Checkout Pro/API, incluyendo Colombia, mediante OAuth y `marketplace_fee` / `application_fee`, sujeto a requisitos del proveedor. Esta verificación no reemplaza confirmar la habilitación de la cuenta.

## 6. Recomendación
No implementar Wompi todavía si el primer paso no se puede probar contra sandbox. Si se arriesga, se puede avanzar únicamente en:
- adaptador abstracto de provider,
- onboarding de cuenta de coach,
- comisión versionada y ledger,
- idempotencia de webhook,
- seguridad por coach,
- conciliación.
Pero checkout/split y dispersión deben quedar bloqueadas hasta confirmar Pagos a terceros activo y credenciales de sandbox.

## 7. Entregable y decisión
Documento: docs/audits/BUILD11_B0_WOMPI_GATE_AND_IMPLEMENTATION.md

BUILD11-B0 PARTIAL/BLOCKED para certificación económica real. Cobros actuales permanecen Mercado Pago, sin marketplace real.

MR TRAINING — NOT READY FOR QA.
