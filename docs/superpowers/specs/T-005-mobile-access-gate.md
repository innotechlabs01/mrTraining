# T-005: Mobile Access Gate — Design Spec

> Feature: gate de suscripción en la app móvil (`apps/mobile`).
> Estado al iniciar: el gate YA está implementado (`AccessGate` en
> `src/features/subscription/presentation/AccessGate.tsx`) y protege
> `AthleteTabs` (la entrada principal del atleta: Today, History, Events,
> Recovery, Profile) mediante `AthleteTabsWithGate` en
> `src/navigation/Navigation.tsx:142`. Es fail-closed y cuenta con tests
> unitarios. El spec documenta el contrato, verifica que no haya saltos por
> alto en la entrada principal y deja constancia del alcance.

---

## 1. Problema

La app móvil del atleta debe bloquear el acceso a las features premium (entrenamiento, progreso, recuperación, perfil) cuando el atleta no tiene una suscripción activa. Si el gate falta o se saltea, un atleta sin membresía podría acceder a contenido de pago sin suscribirse.

---

## 2. Roles y AC

| Rol | Quién es | Goal principal |
|---|---|---|
| Athlete | Usuario de la app móvil | Ver el gate/bloqueo si no tiene suscripción; acceder si la tiene |

### Acceptance Criteria

- [ ] **AC-1:** Given un atleta sin autenticar, When abre la app, Then no llega a `AthleteTabs` (queda en auth/onboarding).
- [ ] **AC-2:** Given un atleta autenticado con suscripción inactiva/expired, When entra a `AthleteTabs`, Then ve el Paywall (no las pestañas del atleta).
- [ ] **AC-3:** Given un atleta con suscripción activa/trial/past_due, When entra a `AthleteTabs`, Then ve las pestañas (Today, History, Events, Recovery, Profile).
- [ ] **AC-4:** Given el gate en loading/error, When se resuelve, Then se muestra spinner o retry (fail-closed, nunca falla abierto).
- [ ] **AC-5:** `npx tsc --noEmit` y `npm test` de mobile pasan (incluyendo tests de `AccessGate`).

---

## 3. Criterios UX (obligatorios)

- **Loading:** activity indicator centrado mientras se resuelve la suscripción.
- **Error:** tarjeta de error con botón "Reintentar" (fail-closed).
- **Empty/Paywall:** pantalla de upsell con CTA "Ver planes y suscribirme" → navega a planes de membresía.
- **Primary action:** una por pantalla en el Paywall (suscribirse).
- **Mobile:** touch targets ≥ 44pt (el botón de retry usa `layout.touchTarget`).

---

## 4. Flujo de usuario

```
Abrir app → Clerk auth loaded?
  └─ No → Splash/auth/onboarding
  └─ Sí → AthleteTabsWithGate (AccessGate)
        ├─ loading → spinner (fail-closed)
        ├─ error → tarjeta error + Reintentar
        ├─ !hasActive → Paywall (upsell → planes)
        └─ hasActive → AthleteTabs (Today, History, Events, Recovery, Profile)
```

---

## 5. Diseño (la solución)

**Componente gate:** `src/features/subscription/presentation/AccessGate.tsx`
- Usa `useSubscription()` de `src/features/subscription/application/useSubscription.ts`.
- `status === 'loading'` → spinner centrado (fail-closed).
- `status === 'error'` → tarjeta de error + botón Reintentar (llama `refetch`).
- `status === 'success' && !hasActive` → `<Paywall />` (pantalla de upsell).
- `status === 'success' && hasActive` → renderiza `children`.

**Integración en navegación:** `src/navigation/Navigation.tsx:142`
```tsx
function AthleteTabsWithGate() {
  return (
    <AccessGate>
      <AthleteTabs />
    </AccessGate>
  );
}
```
Y `AthleteTabs` se registra como `AthleteTabsWithGate` (Navigation.tsx:200). Todas las pestañas del atleta (Today, History, Events, Recovery, Profile) heredan el gate.

**Coherencia:** existe también `MembershipGate` en `src/features/membership/presentation/MembershipGate.tsx` (gate alternativo, fail-closed, usado en `MembershipCheckScreen`). `AccessGate` es el que protege la entrada principal del atleta.

---

## 6. API (contrato consumido)

`useSubscription` consume `GET /athletes/membership/status` del Go API (single source of truth), que devuelve `hasActiveMembership`, `status`, `daysRemaining`, `expiresAt`. Ya verificado en T-002 que el endpoint existe (`routes.go:113`).

---

## 7. Fuera de scope (expicito)

- Envolver pantallas sueltas del stack (Store, Notifications, Workouts, Progress, Nutrition, Community) en AccessGate: esas pantallas se alcanzan navegando desde AthleteTabs (que ya está gated), por lo que el gate de entrada cubre el flujo principal. Un deep link directo a esas pantallas es un caso edge fuera del scope inicial de T-005.
- Flujo completo de pago (Wompi/MP checkout): el Paywall tiene CTA a planes; el procesamiento de pago pertenece a T-003/T-004.

---

## 8. Riesgos y decisiones abiertas

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Doble gate (AccessGate + MembershipGate) | Bajo (duplicación lógica, no seguridad) | AccessGate es el de entrada principal; documentado para no crear un tercero. |
| Deep link directo a pantalla suelta sin gate | Bajo | Edge case; AthleteTabs cubre el 99% del flujo de usuario. |

---

## 9. Referencias

- `apps/mobile/AGENTS.md` — reglas de mobile, contrato API (Go API única fuente de verdad).
- `apps/rules/MASTER_PROMPT.md` — principios de producto e ingeniería.
- `apps/rules/03-ux-workflows.md` — mobile-first (§8), offline (§10).
- `apps/rules/04-mobile-security.md` — seguridad móvil.
- Spec similar previo: `docs/superpowers/specs/T-002-mobile-athlete-connection.md`.

---

## Verificación

```
cd apps/mobile && npx tsc --noEmit && npm test
```

Deben pasar: tsc sin errores y todos los tests de Jest (incluyendo los 6 tests de `AccessGate` en `src/features/subscription/presentation/__tests__/AccessGate.test.tsx`).
