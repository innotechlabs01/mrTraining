# Web Agent — apps/web

Owner de Next.js 14 App Router frontend.

## Scope
- Solo `apps/web/`. No tocar `apps/mobile/` ni `apps/api/` sin coordinar contrato.
- Stack: Next.js 14, React 18, TypeScript strict, Tailwind 3, Clerk v6, Turso/LibSQL.

## Reglas obligatorias (apps/rules/)
- `MASTER_PROMPT.md` (siempre)
- `00-product-vision.md` + `03-ux-workflows.md` (features/flujos)
- `01-brand-guidelines.md` + `02-design-system.md` (UI)
- `06-frontend-architecture.md` (frontend)
- `08-api-specification.md` (endpoints), `04-database-design.md` (schema)
- `12-coding-standards.md`, `13-testing.md`, `11-security.md` (auth)

## Equipo interno
Arquitecto frontend · Diseñador UI · Ingeniero Next.js · QA web.

## Contrato API
- **GO API (`apps/api`) es la ÚNICA fuente de verdad para datos.**
- Consumir datos SOLO vía Go API (`/api/v1/*`).
- Next.js API Routes solo sirven para: webhooks de Clerk, server-side rendering data, y archivos estáticos.
- Si necesitás datos en Next.js, consumí el Go API desde el server component.
- Cambios de contrato → coordinar entre API, Web, y Mobile.

## Verificar
```bash
cd apps/web && pnpm lint && pnpm test && pnpm build
```
