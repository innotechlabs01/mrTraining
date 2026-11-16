# Auth + Checkout Entry UX — Design Spec

**Version 1.0 — 2026**
**Rama:** `dev` (sin worktrees)
**Scope:** `apps/web` only. No cambios en `apps/api` ni `apps/mobile`.

---

## 1. Problema

Hacer clic en "Empezar gratis" (y en cualquier CTA de plan) siempre lleva al usuario a la pantalla de crear cuenta (`/sign-up?plan=...`), incluso cuando el usuario ya tiene cuenta o ya tiene sesión activa. Los dos flujos (checkout y sign-in normal) sangran entre sí, el contexto del plan se pierde al ir de sign-up a sign-in, y no hay guardia de sesión ya iniciada en `/sign-up`.

Síntomas verificados en el código:
- `/sign-up` no tiene guardia de already-signed-in; `/sign-in` sí la tiene y redirige a home por rol.
- Landing nav + CTA hard-link a `/sign-up?plan=plan-seed-starter`.
- `sign-in` `destinationFor()` maneja `redirect_url` y `role`, pero NO el `plan` traído desde el redirect de sign-up.
- `SignUpForm` redirige `form_identifier_exists` → `/sign-in?email=...&plan=...`, pero el plan se pierde en el destino.

---

## 2. Roles y AC

| Rol | Quién es | Goal principal |
|---|---|---|
| Coach nuevo | Usuario sin cuenta | Registrarse, elegir plan, pagar, onboardear, llegar al dashboard |
| Coach existente | Ya tiene cuenta | Entrar, sin ruido de activación/pago, ir directo a su dashboard |
| Coach con pago pendiente | Tiene cuenta, suscripción no confirmada | Reanudar el pago/interstitial sin perder el plan |
| Super admin | Acceso total | Ir a `/admin/dashboard` |

### Acceptance Criteria (Given / When / Then)

- [ ] **AC-1:** Given un usuario sin sesión en la landing, When hace clic en "Empezar gratis" o en un plan, Then llega a `/sign-up?plan=<plan>` y puede crear cuenta sin perder el plan.
- [ ] **AC-2:** Given un usuario ya firmado (coach activado + pagado), When entra a la landing o hace clic en "Empezar gratis", Then va directo a su dashboard de coach (no a `/sign-up`).
- [ ] **AC-3:** Given un usuario ya firmado con pago pendiente, When entra a la landing o hace clic en "Empezar gratis", Then va a `/payment/interstitial?plan=<plan>` (reanuda pago), no a `/sign-up`.
- [ ] **AC-4:** Given un usuario con cuenta pero sin sesión, When se registra con email existente en checkout, Then va a `/sign-in?email=...&plan=...` y tras sign-in reanuda el checkout con el plan intacto.
- [ ] **AC-5:** Given un atleta o usuario sin rol, When entra a la landing, Then ve la landing pública (no es redirigido a `/sign-in` ni a `/coach`).
- [ ] **AC-6:** Given un super admin, When entra a la landing, Then va a `/admin/dashboard`.
- [ ] **AC-7:** Given cualquier flujo, When hay error de red o de activación, Then se muestra mensaje humano con retry (nunca pantalla vacía ni stack trace).

---

## 3. Criterios UX (obligatorios)

- **Loading:** skeleton o spinner contextual (nunca pantalla vacía).
- **Empty:** ilustración + copy + acción sugerida.
- **Error:** mensaje humano + retry. Nunca stack trace ni error crudo.
- **Primary action:** una por pantalla.
- **Mobile:** 60 FPS, touch targets ≥ 44pt, safe areas respetadas.

---

## 4. Flujo de usuario

### Flujo A — CHECKOUT (usuario nuevo, paga primero)

```
/landing → /checkout?plan=X (correo + pagar) → Wompi →
/payment/success?checkout=<id> → (sin cuenta) /sign-up?plan=X →
/payment/interstitial?plan=X (activar) → /onboarding/coach?plan=X → /coach/plan
```

### Flujo B — CHECKOUT (usuario existente con pago pendiente)

```
/landing (sesión activa, pago pendiente) → /payment/interstitial?plan=X →
Pagar → /payment/success → /onboarding/coach?plan=X → /coach/plan
```

### Flujo C — NORMAL SIGN-IN (ya tiene cuenta, activado + pagado)

```
/landing (sesión activa) → /coach/plan
/sign-in → /coach/plan (sin activación ni pago)
```

### Flujo D — SIGN-IN normal (no tiene sesión, tiene cuenta)

```
/sign-in → /coach/plan (con redirect_url preservado si venía del checkout)
```

---

## 5. Diseño (la solución)

### Estructura de rutas (no hay rutas nuevas, solo cambio de comportamiento)

```
apps/web/src/
├── app/
│   ├── (marketing)/page.tsx            # landing: CTA condicional por sesión
│   ├── (auth)/
│   │   ├── sign-up/page.tsx            # guardia de sesión + conserva plan
│   │   └── sign-in/page.tsx            # destinationFor lee `plan`
│   ├── payment/
│   │   ├── interstitial/page.tsx       # reanuda si ya hay sesión
│   │   └── success/page.tsx            # claim + onboarding, sin duplicar registro
│   └── middleware.ts                   # guardia de sesión en auth routes
├── features/auth/
│   ├── components/SignUpForm.tsx       # form_identifier_exists → sign-in con plan
│   └── components/SignInForm.tsx       # (sin cambios estructurales)
```

### Componentes (uno por responsabilidad)

| Componente | Responsabilidad |
|---|---|
| `MarketingLandingPage` | CTA "Empezar gratis" condicional: si hay sesión, ruta por rol/pago; si no, `/sign-up?plan=` |
| `SignUpPage` | Guardia de sesión: si ya está firmado, redirige a home por rol/pago |
| `SignInPage` | `destinationFor()` lee `plan` y lo preserva en el redirect post-sign-in |
| `SignUpForm` | `form_identifier_exists` lleva `plan` al sign-in (ya lo hace, pero se verifica que no se pierda) |
| `PaymentInterstitialPage` | Si ya hay sesión activa y pago confirmado, salta a `/onboarding/coach?plan=`; si pago pendiente, muestra pagar |
| `PaymentSuccessPage` | `/onboarding/coach?plan=` tras claim o suscripción confirmada |

### Types

No hay tipos nuevos; se reutilizan `SelectedPlan` de `useSelectedPlan` y los tipos de sesión de Clerk.

---

## 6. API (si aplica)

**Regla:** endpoints nuevos se definen en `apps/api` (Go) primero. Este cambio es solo de `apps/web`; no se crean endpoints nuevos. Se consumen los existentes:

| Método | Path | Purpose |
|---|---|---|
| POST | `/api/coach/activate` | Activar coach tras registro (proxy a Go) |
| GET | `/api/coach/subscription/status` | Estado de suscripción (polling) |
| GET | `/api/marketing/plans` | Lista de planes públicos |
| POST | `/api/checkout` | Checkout híbrido (antes de cuenta) |
| POST | `/api/checkout/[id]/claim` | Claim del pago tras registro |

Contrato detalle: `apps/rules/08-api-specification.md`.

---

## 7. Fuera de scope (explícito)

- No se toca `apps/api` (Go) ni `apps/mobile` (React Native).
- No se crean nuevas rutas, endpoints ni tablas de base de datos.
- No se cambia el contrato de roles (Clerk public metadata, escrito solo por Go API).
- No se modifica el flujo de atleta móvil.

---

## 8. Riesgos y decisiones abiertas

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Pérdida del contexto `plan` al ir de sign-up a sign-in | Alto | `destinationFor()` lee `plan` y lo incluye en el redirect post-sign-in |
| Sesión activa en `/sign-up` mostrando "Crea tu cuenta" | Medio | Guardia de sesión en `SignUpPage` que redirige por rol/pago |
| Usuario con pago pendiente enviado a `/sign-up` en lugar de `/payment/interstitial` | Medio | Middleware/landing resuelve `payment_pending` antes de decidir destino |
| Doble activación (claim idempotente) | Bajo | El claim ya es idempotente en el backend (estado `claimed`) |
| Usuario sin rol (atleta) enviado a `/coach` | Bajo | Middleware falla cerrado: sin rol → landing pública, nunca `/coach` |

---

## 9. Descomposición (subtareas ordenadas)

Cada subtarea tiene límites claros; ninguna toca `apps/api` ni `apps/mobile`.

1. **Guardia de sesión en `/sign-up`** (`apps/web/src/app/(auth)/sign-up/page.tsx`)
   - Si `isSignedIn` y rol = coach + activado+pagado → `/coach/plan`.
   - Si `isSignedIn` y pago pendiente → `/payment/interstitial?plan=<plan>`.
   - Si `isSignedIn` y sin rol → `/` (landing pública).
   - Si no hay sesión → render actual (sin cambios en el formulario).

2. **Conservar `plan` en el destino post-sign-in** (`apps/web/src/app/(auth)/sign-in/page.tsx`, `destinationFor`)
   - Leer `searchParams.get('plan')`.
   - Si hay `plan` y no hay `redirect_url`, destino = `/payment/interstitial?plan=<plan>` (reanuda checkout).
   - Si hay `redirect_url`, gana `redirect_url` (comportamiento actual).
   - Verificar que `SignUpForm` ya envía `&plan=` en el `form_identifier_exists` redirect (no tocar si ya lo hace).

3. **CTA condicional en la landing** (`apps/web/src/app/(marketing)/page.tsx`, nav + CTA + sección contacto)
   - Leer sesión de Clerk (server component o `useAuth`).
   - Si sesión activa + activado+pagado → CTA apunta a `/coach/plan`.
   - Si sesión activa + pago pendiente → CTA apunta a `/payment/interstitial?plan=<plan>`.
   - Si no hay sesión → CTA actual `/sign-up?plan=plan-seed-starter` (o plan del CTA clickeado).

4. **Interstitial consciente de sesión** (`apps/web/src/app/payment/interstitial/page.tsx`)
   - Si ya hay sesión activa y suscripción confirmada → saltar a `/onboarding/coach?plan=<plan>`.
   - Si sesión activa y pago pendiente → mostrar "Pagar y activar plan" (flujo actual).
   - Si no hay sesión → flujo actual (activar cuenta primero).

5. **Success → onboarding sin duplicar registro** (`apps/web/src/app/payment/success/page.tsx`)
   - `CheckoutClaim`: si ya está firmado, hacer claim directo (no mostrar `SignUpForm`).
   - `SubscriptionPaymentSuccess`: tras `approved`, ir a `/onboarding/coach?plan=<plan>`.

6. **Tests** (`apps/web/tests/`)
   - Unit/Vitest: `destinationFor` con `plan`, guardia de sesión en sign-up.
   - E2E/Playwright: los 6 AC (sesión activa, pago pendiente, pagado, nuevo, sin rol, super admin).

## 10. Equipo y orden

Todas las tareas son en `apps/web` (Next.js). No se necesita `dev-backend` ni `dev-react-native` (scope solo web, sin contratos nuevos).

| Orden | Rol | Tareas | Paralelismo |
|---|---|---|---|
| 1 | `ux-ui-designer` | Revisar que no se introduzcan nuevos patrones visuales; confirmar reuso de `AuthShell`, `ErrorState`, `PlanSummaryCard` | Solo |
| 2 | `dev-front` | Subtareas 1–5 (código) | Secuencial (1→2→3→4→5) |
| 3 | `qa` | Subtarea 6 (tests + AC empíricos) | Después de 2 |
| 4 | `code-reviewer` | Diff: corrección, patrones, mantenibilidad | Después de QA PASS |
| 5 | `security-hacker` | OWASP, auth, no forjado de roles, redirect_url open-redirect check | Después de code-reviewer PASS |

Nota: `dev-front` ejecuta todo; `ux-ui-designer` solo revisa (no hay pantallas nuevas). `qa`, `code-reviewer`, `security-hacker` son gates del stage machine (14-team-workflow.md §2).

## 11. Referencias

- Spec similar previo: `docs/superpowers/specs/2026-07-07-authentication-experience-design.md`
- Spec similar previo: `docs/superpowers/specs/T-007-checkout-hibrido.md`
- Rules relevantes: `apps/rules/MASTER_PROMPT.md`, `00-product-vision.md`, `03-ux-workflows.md`, `01-brand-guidelines.md`, `02-design-system.md`, `06-frontend-architecture.md`, `08-api-specification.md`, `11-security.md`, `12-coding-standards.md`, `13-testing.md`, `14-team-workflow.md`