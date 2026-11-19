# T-007 — Checkout híbrido: pagar y registrarse en el mismo paso

**Estado:** Implementación
**Rama:** `dev` (checkout compartido, sin worktrees)
**Diseño base:** `docs/designs/T-006-coach-activation-flow.md`

---

## 1. Objetivo

Hoy el coach se registra **antes** de pagar. El pedido es que al elegir un plan
en la landing se abra el checkout de Wompi y que el registro se pida **en el
mismo paso** (correo + pago), con el *claim* del pago al confirmar.

```
/planes → "Elegir plan"
   → /checkout?plan=X          (nuevo, público)
        plan + email  ─┐
        "Pagar y activar" ─→ POST /api/v1/checkouts  → Wompi
   → Wompi
   → /payment/success?checkout=<token>&email=<email>
        "¿Ya pagaste? Crea tu cuenta para activar tu plan"
        (Clerk sign-up con el email precargado)
   → POST /api/v1/checkouts/:id/claim
        → suscripción + coach + metadata {role, coachCode, plan, planName, planStatus}
   → /onboarding/coach?plan=X  →  /coach/plan
```

## 2. Decisiones de contrato

| Decisión | Elección | Por qué |
|---|---|---|
| ¿Dónde vive el checkout pendiente? | Tabla `pending_checkouts` | El webhook necesita registrar el pago cobrado **antes** de que exista la suscripción (`subscription_payments.subscription_id` tiene FK a `subscriptions`). |
| ¿Cómo se referencia en Wompi? | `sku = checkout:<id>` | El webhook distingue una compra invitada (`subscription:<id>`) de una todavía sin dueño (`checkout:<id>`). |
| ¿Qué pasa si el webhook llega antes del registro? | Marca el checkout `paid` y no falla | El claim posterior es quien crea la suscripción y engancha el pago. |
| ¿Cómo se recupera un pago cobrado sin cuenta? | El checkout se busca por email | Al volver a `/checkout?plan=X` con el mismo email se recupera el checkout pagado. Sin servicio de email. |
| ¿Quién escribe el metadata? | El claim, en el backend | `role`, `coachCode`, `plan` se escriben juntos, cuando ya existe el usuario. |
| Idempotencia | `claim` idempotente + `status=claimed` | El botón se puede tocar dos veces. |

## 3. Superficie de API

| Endpoint | Auth | Request | Response |
|---|---|---|---|
| `POST /api/v1/checkouts` | pública | `{plan_id, email}` | `{checkout_id, checkout_url}` |
| `POST /api/v1/checkouts/:id/claim` | Clerk | — | `{coach_id, coach_code, plan, plan_name}` |
| `POST /webhooks/wompi` | firma | evento Wompi | 200 |

`POST /api/v1/checkouts` crea la fila pendiente + el link de Wompi con
`redirect_url = WEB_APP_URL + /payment/success?checkout=<id>`.

## 4. Cambios

- `apps/api/migrations/postgres/422_pending_checkouts.sql` — tabla + RLS por
  política (el rol de la app opera sobre ella; el claim se valida por token).
- `apps/api/internal/domain/checkout/` — entidad + puerto de repositorio.
- `apps/api/internal/infrastructure/checkout/repository.go` — persistencia.
- `apps/api/internal/application/checkout/service.go` — `Start` y `Claim`.
- `apps/api/internal/application/subscription/service.go` — `AttachPaidCheckout`
  (crea la suscripción sin nuevo checkout, engancha el pago y activa).
- `apps/api/internal/application/subscription/service.go` — rama del webhook para
  `checkout:<id>`.
- `apps/api/internal/interfaces/http/handlers/checkout.go` — handlers.
- `apps/web/src/app/checkout/page.tsx` — pantalla de correo + pago.
- `apps/web/src/app/api/checkout/**` — proxies finos.
- `apps/web/src/app/payment/success/page.tsx` — claim + registro.
- `apps/web/src/components/landing/Sections.tsx` y
  `apps/web/src/app/(marketing)/components/PlansSection.tsx` — la landing apunta
  a `/checkout`.

## 5. Criterios de aceptación

1. Al elegir un plan en la landing se llega a `/checkout?plan=<id>` con el plan
   visible y un campo de correo.
2. `POST /api/v1/checkouts` devuelve una URL de Wompi y el `sku` es
   `checkout:<id>`.
3. El webhook de Wompi con esa referencia responde 200 y marca el checkout como
   `paid` (antes fallaba con `invalid external_reference`).
4. Tras registrarse, `POST /api/v1/checkouts/:id/claim` crea la suscripción,
   provisiona el coach y deja
   `public_metadata = {role: coach, coachCode, plan, planName, planStatus: active}`.
5. El claim es idempotente: llamarlo dos veces devuelve el mismo coach code.
6. Un checkout no pagado no se puede reclamar (409).
7. El flujo termina en `/coach/plan`.
8. El flujo por registro previo (`/sign-up?plan=` → interstitial) sigue
   funcionando.

## 6. Riesgos

- **Pago cobrado sin cuenta**: mitigado con la recuperación por email; si el
  usuario nunca vuelve, el pago queda en `pending_checkouts` con estado `paid`.
- **Doble cobro**: el claim es idempotente y la suscripción se crea una sola
  vez (el claim marca `claimed`).
- **La metadata se escribe después del pago**: el frontend debe tolerar que
  `planStatus` aún no exista durante el checkout.
