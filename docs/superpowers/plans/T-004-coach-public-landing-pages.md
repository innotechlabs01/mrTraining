# Plan: T-004 Coach Public Landing Pages

**Target:** `apps/web` (Next.js 14 App Router)
**Task ID:** task_5354db78a9f4
**Dispatch ID:** ctx_76f827e726fc
**Status:** Planning complete — ready for implementation
**Goal:** Build dynamic public coach profiles at `/coach/[username]` so coaches can sell their plans. Public (no auth), fetch coach + plan data from the Go API, allow users to start the subscription process. SEO friendly and highly performant.

---

## 1. Context / Current State

### What already exists (backend — `apps/api`)
- `CoachLandingHandler` in `apps/api/internal/interfaces/http/handlers/coach_landing.go`:
  - `GetCoachLanding` → `GET /coach/{slug}` returns `CoachLandingResponse`:
    `{ slug, coach_name, coach_photo, biography, specialities[], services[], plan_catalog[], cta_text }`
  - `GetCoachPlans` → `GET /coach/{slug}/plans` returns plans only.
- `PlanHandler.ListPublicPlans` → `GET /public/coaches/:coachId/plans` (REGISTERED in routes.go) — plans only, no coach profile.
- `GetTRM` → `GET /public/trm` (registered).
- **CRITICAL GAP:** The `CoachLandingHandler` routes (`GET /coach/{slug}`, `GET /coach/{slug}/plans`) are NOT registered in `apps/api/internal/interfaces/http/routes/routes.go`. No public endpoint currently returns coach profile + plans together by slug/username.

### What already exists (web — `apps/web`)
- `apps/web/src/app/(marketing)/coach/[id]/planes/page.tsx` — client component (`useParams`), fetches plans via `coachingApi.getPublicPlans(coachId)` → `/public/coaches/${coachId}/plans`, renders plan cards + "Elegir plan" link to `/sign-up`.
- Hooks: `usePublicPlans(coachId)`, `usePlans()`, `useTRM()`.
- `PlanModal` component (create/edit plans, discounts, TRM, publish toggle).
- `coachingApi.getPublicPlans`, `getTRM`, `goFetch` (auth flag supports `auth: false`).
- Types: `Plan`, `PlanDiscount`, `PlanCurrency`, `TrainingMode` in `apps/web/src/features/coach/types/index.ts`.
- Plan pricing utils: `formatPlanPrice`, `periodLabel`, `convertUsdToCop`, `formatConversionPreview`, `validateForPublish`.
- Marketing layout `apps/web/src/app/(marketing)/layout.tsx` is bare (`<>children</>`).
- Middleware `apps/web/src/middleware.ts` protects non-public routes; public list = `/`, `/pricing`, `/features`, `/blog(.*)`, `/privacy`, `/terms`, `/api/webhooks(.*)`.
- Brand: dark-first (`#111214` base), single blue accent `#15AAF2` (pressed `#0E93D4`), Montserrat (display) / Inter (body), WCAG AA.

### Rule compliance (from `apps/rules/`)
- `06-frontend-architecture.md`: Server Components by default, feature-first under `src/features/`, data fetched server-side, `page.tsx` ≤ 80 lines, dynamic routes validated server-side → 404.
- `01-brand-guidelines.md`: dark theme, blue accent (one CTA per screen), Montserrat/Inter type scale, WCAG AA contrast.
- `08-api-specification.md`: REST conventions, error shape, `/api/v1` versioning.
- `MASTER_PROMPT.md`: architecture before code, features before pages, one primary action per screen.

---

## 2. Decomposition

| # | Task | Description | Layer |
|---|------|-------------|-------|
| 1 | Define web types | Add `CoachLandingResponse` + `PlanCatalogItem` TS types mirroring Go DTO (`apps/web/src/features/coach/types/` or a new public-page types file). | Web |
| 2 | API client fn | Add `getPublicCoachPage(username)` → `GET /coach/{username}` with `auth: false` (Go API). Falls back to `/public/coaches/:id/plans` + a coach-profile call if the slug route isn't registered yet. | Web |
| 3 | Server Component page | `apps/web/src/app/(marketing)/coach/[username]/page.tsx` — async Server Component, fetches coach+plans server-side, `generateMetadata` for SEO, renders profile + plan catalog + CTA. | Web |
| 4 | UI components | CoachHero (photo, name, specialty, city, bio), Specialities/Services badges, PlanCard grid (price, period, features, discount, CTA), EmptyState (no plans), NotFound handling. Follow brand + shadcn/ui. | Web |
| 5 | Subscription start CTA | "Comenzar práctica" / "Elegir plan" button → `/sign-up?plan=<slug>&coach=<username>` (or checkout) passing coach + plan context. One primary CTA per screen. | Web |
| 6 | Middleware | Add `/coach/[username]` to public route list so unauthenticated visitors can access (no Clerk redirect). | Web |
| 7 | Error/empty states | 404 for coach not found or inactive; skeleton during SSR stream; human error messages + retry; empty state with suggested action. | Web |
| 8 | Tests + verification | Vitest unit tests for types/utils, `pnpm lint`, `pnpm build`, Playwright E2E for `/coach/[username]` render + CTA navigation. | Web |
| 9 | (Backend dep) Register route | API team registers `GET /coach/{username}` (and `/coach/{username}/plans`) in `routes.go` + mounts `CoachLandingHandler`. | API (coord.) |

---

## 3. Team

- **Arquitecto frontend** — route design, Server vs Client boundary, data-fetching pattern, middleware public-route exemption.
- **Ingeniero Next.js** — page implementation, `generateMetadata`, SSR data fetching, error/loading states.
- **Diseñador UI** — brand compliance (dark theme, blue accent, Montserrat/Inter), PlanCard, CoachHero, empty/404 states, WCAG AA.
- **QA web** — Vitest unit tests, Playwright E2E, accessibility check, LCP/performance check.
- **API team (coordination)** — register `GET /coach/{username}` public route in Go `routes.go` (blocking dependency for full coach+profile in one call).

---

## 4. Acceptance Criteria (Given / When / Then)

- [ ] **AC-1:** Given a valid, active coach username, When a visitor opens `/coach/[username]`, Then the server-rendered HTML contains the coach's name, photo, biography, specialities, services, and list of active plans (no client-side loading waterfall).
- [ ] **AC-2:** Given a username that doesn't exist or an inactive coach, When visiting `/coach/[username]`, Then a 404 page is rendered (server-side `notFound()`).
- [ ] **AC-3:** Given active plans exist, When the page renders, Then each plan card shows name, description, price with currency, billing period, discount (if active), features list, and one primary CTA.
- [ ] **AC-4:** Given a visitor clicks a plan's CTA, When clicked, Then navigation starts the subscription process with coach + plan context (e.g., `/sign-up?plan=<slug>&coach=<username>`).
- [ ] **AC-5:** Given the page loads, Then it has dynamic SEO metadata: `<title>` with coach name, `<meta name="description">`, Open Graph tags; no `any` types; TypeScript strict passes.
- [ ] **AC-6:** Given performance is measured, Then LCP < 2.5s, data is fetched server-side (no `useEffect`/`useState` for initial data in the page), and brand colors/fonts match `01-brand-guidelines.md`.
- [ ] **AC-7:** Given WCAG AA, Then all text meets 4.5:1 contrast on dark surfaces, focus rings visible, touch targets ≥ 44px, and the single primary CTA uses blue `#15AAF2` with base `#111214` text.

---

## 5. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Go API route `GET /coach/{username}` not registered (handler exists but unwired) | High — page cannot fetch coach profile + plans in one call | Coordinate with API team to register route (Task #9). Fallback: use existing registered `/public/coaches/:id/plans` for plans + a lightweight coach-profile endpoint if available. |
| Subscription start flow (sign-up/checkout) not fully defined | Medium — CTA destination ambiguous | Clarify with product whether CTA → `/sign-up?plan=&coach=` or a checkout page; keep CTA as a link with coach+plan query params as MVP. |
| Route conflict with existing `/coach/[id]/planes` | Low — different segment count (`/coach/x` vs `/coach/x/planes`) | Verify Next.js doesn't conflict; `[username]` is a single dynamic segment, `[id]/planes` is two segments. |
| SEO metadata mismatching SSR content | Medium | Use `generateMetadata` async function reading the same fetched data passed to the page. |
| Auth middleware blocking public `/coach/*` | High — unauthenticated visitors redirected to login | Add `/coach/[username]` to `isPublicRoute` matcher in `middleware.ts`. |

---

## 6. Out of Scope (explicit)

- Coach authentication/session on the public page (it's public by design).
- Payment processing / Stripe checkout on the public page (CTA only starts the flow).
- Coach profile editing (that's the authenticated dashboard, separate feature).
- The `[id]/planes` existing route — left as-is unless refactored later.
- Mobile app changes (out of `apps/web` scope).

---

## 7. References

- `apps/rules/06-frontend-architecture.md` — frontend architecture (Server Components, feature-first).
- `apps/rules/01-brand-guidelines.md` — brand colors, typography, contrast.
- `apps/rules/08-api-specification.md` — REST conventions, error shape.
- `apps/rules/MASTER_PROMPT.md` — product & engineering principles.
- `apps/rules/03-ux-workflows.md` — UX principles (one primary action, progressive disclosure, empty/error states).
- `apps/web/src/app/(marketing)/coach/[id]/planes/page.tsx` — existing reference implementation to align with.
- `apps/web/src/features/coach/types/index.ts` — `Plan`, `PlanDiscount` types to extend.
- `apps/api/internal/interfaces/http/dto/plan.go` — `CoachLandingResponse` / `PlanCatalogItem` Go DTOs (source of truth for types).
- `docs/superpowers/specs/TEMPLATE-coach-feature.md` — spec template convention.
