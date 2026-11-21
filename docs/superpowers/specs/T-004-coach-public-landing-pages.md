# T-004: Coach Public Landing Pages — Design Spec

> Feature: perfiles públicos de coach para vender planes desde `/l/[slug]`.
> Estado al iniciar: `/l/[slug]` ya existe y renderiza los bloques de la landing desde DB (WYSIWYG, T-011), pero **no muestra los planes públicos del coach**, así que un visitante no puede ver ni comprar planes desde la landing publicada. El endpoint `GET /public/coaches/:coachId/plans` ya existe en el Go API (público, sin auth) y devuelve los planes `is_active=true` de un coach.

---

## 1. Problema

Un visitante que llega a `/l/{slug}` ve el contenido de la landing (hero, heading, texto, etc.) pero no ve qué planes ofrece el coach ni puede comprar ninguno. La landing pública no cumple su propósito de negocio (vender planes del coach). Hay que integrar los planes públicos del coach en `/l/[slug]`.

---

## 2. Roles y AC

| Rol | Quién es | Goal principal |
|---|---|---|
| Visitante / Atleta potencial | Usuario anónimo que llega a `/l/{slug}` | Ver los planes del coach y comprarlos |
| Coach | Dueño de la landing | Que su landing pública muestre y venda sus planes |

### Acceptance Criteria

- [ ] **AC-1:** Given un `/l/{slug}` de un coach con planes publicados, When el visitante carga la página, Then se renderizan los planes públicos del coach (nombre, precio, período, descripción).
- [ ] **AC-2:** Given un coach sin planes publicados, When se carga `/l/{slug}`, Then se muestra un estado vacío (sin planes) sin error y la landing sigue renderizándose.
- [ ] **AC-3:** Given que el fetch de planes falla, When se carga `/l/{slug}`, Then la landing sigue renderizándose (los planes son opcionales, no bloquean).
- [ ] **AC-4:** Given un plan con CTA de compra, When el visitante hace clic, Then se navega al flujo de compra (checkout/membresía).
- [ ] **AC-5:** `pnpm build` de `apps/web` verde (exit 0) con `/l/[slug]` presente.

---

## 3. Criterios UX (obligatorios)

- **Loading:** spinner/esqueleto mientras se cargan los planes.
- **Empty:** copy clara ("Este coach no tiene planes disponibles aún") cuando no hay planes.
- **Error:** no mostrar stack trace; los planes fallan silenciosamente y la landing sigue visible.
- **Primary action:** un CTA de compra por plan.
- **Mobile:** touch targets ≥ 44pt, safe areas respetadas.

---

## 4. Flujo de usuario

```
Visitante llega a /l/{slug}
  → renderiza bloques de la landing (hero, heading, texto)
  → renderiza sección "Planos" con los planes públicos del coach
  → clic en "Suscribirse" de un plan → flujo de compra (checkout/membresía)
```

---

## 5. Diseño (la solución)

**Contrato API (verificado en código):**

| Método | Path | Auth | Estado |
|---|---|---|---|
| GET | `/public/coaches/:coachId/plans` | No (público) | ✅ Existe (plan.go:73, routes.go:567) |
| GET | `/l/:slug` | No (público) | ✅ Existe (coach_landing.go:117, routes.go:792) |

La respuesta de `/public/coaches/:coachId/plans` es `dto.ListResponse[*dto.PlanResponse]` con `Data` = array de planes (`id`, `name`, `description`, `price`, `currency`, `billing_period`, `is_active`, `coach_id`, ...).

**Diseño web:**

`apps/web/src/app/l/[slug]/page.tsx` (Server Component, ya existente):
1. Obtener el documento de la landing vía `getPublicLanding(slug)` (ya existe, `cache()` + mapper).
2. Extraer `document.coachId`.
3. Hacer un `fetch` cacheado (`cache()` de React) a `${baseUrl}/public/coaches/${coachId}/plans` para obtener los planes públicos.
4. Renderizar `CoachLandingDocumentView` (bloques) seguido de una sección `PublicPlansSection` con los planes.
5. Cada plan: tarjeta con nombre, precio (ej. "$19.99/mes"), descripción, y botón "Suscribirse" que navega al flujo de compra.

**Flujo de compra (CTA):** El botón de cada plan navega a una página de checkout o al flujo de membresía. Para mantener el scope acotado, el CTA apunta a `/checkout?planId={id}` o similar; el flujo completo de pago (Wompi/MP, claim de checkout) queda como fuera de scope de este spec (se documenta, no se implementa aquí).

**Manejo de errores:** El fetch de planes se envuelve en try/catch; si falla, `plans = []` y la landing sigue renderizándose (fail-open para planes, no bloquea la landing).

**Componentes:**
- `PublicPlansSection` (nuevo o integrado en page.tsx): renderiza la lista de planes.

---

## 6. API (endpoints consumidos)

| Método | Path | Purpose | Estado |
|---|---|---|---|
| GET | `/l/:slug` | Obtener landing publicada por slug | Activo (ya usado) |
| GET | `/public/coaches/:coachId/plans` | Planes activos publicados de un coach | Activo (ya existe, sin auth) |

Contrato detalle: `apps/rules/08-api-specification.md`.

---

## 7. Fuera de scope (explícito)

- Flujo completo de pago (Wompi/MP, creación de preferencia, webhooks, claim de checkout): el CTA navega al flujo, pero el procesamiento de pago no se implementa en este spec.
- Crear/editar planes desde la landing pública: solo lectura para el visitante.
- Autenticación del visitante para comprar: queda para el flujo de checkout existente.

---

## 8. Riesgos y decisiones abiertas

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El coachId de la landing es inválido o vacío | Medio | Si no hay coachId, no se fetch planes y se muestra estado vacío. |
| El endpoint de planes devuelve error | Bajo | try/catch, plans = [], landing sigue visible. |
| Prefijo del router público (`/public`) cambia | Bajo | Se documenta el path actual; si cambia, se actualiza el fetch. |

---

## 9. Referencias

- `apps/rules/MASTER_PROMPT.md` — principios de ingeniería y producto.
- `apps/rules/00-product-vision.md` — módulo Payments (Sección 4.6) y negocio (Sección 5).
- `apps/rules/03-ux-workflows.md` — flujos de atleta y coach.
- `apps/rules/05-backend-architecture.md` — Clean Architecture, handler pattern.
- `apps/rules/06-frontend-architecture.md` — Server Components, fetch, cache().
- `apps/rules/08-api-specification.md` — contrato de API.
- `apps/rules/11-security.md` — endpoints públicos sin auth, validación de entrada.
- Spec similar previo: `docs/superpowers/specs/T-011-coach-landing-canvas.md`.

---

## Verificación

```
cd apps/web && pnpm build
```

Debe terminar con exit 0 y `/l/[slug]` presente. Los tests de web (`pnpm test`) deben seguir pasando.
