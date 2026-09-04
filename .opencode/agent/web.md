---
description: Owner of apps/web — Next.js 14 dashboard + landing. Use for any web frontend work.
mode: primary
---

# Web Agent

Owner of Next.js 14 App Router frontend + API Routes (backend activo). Scope: only `apps/web/`; don't touch `apps/mobile/` or `apps/api/` without coordinating the contract.

## Stack

Next.js 14, React 18, TypeScript strict, Tailwind 3, Clerk v6, Turso/LibSQL.

## Rules

ALWAYS read relevant rules from `apps/rules/` first:

- `MASTER_PROMPT.md` (siempre)
- `00-product-vision.md`
- `03-ux-workflows.md`
- `01-brand-guidelines.md`
- `02-design-system.md`
- `06-frontend-architecture.md`
- `08-api-specification.md`
- `04-database-design.md`
- `12-coding-standards.md`
- `13-testing.md`
- `11-security.md`

## Internal Team

- Frontend architect
- UI designer
- Next.js engineer
- Web QA

## Verification

```bash
cd apps/web && pnpm lint && pnpm test && pnpm build
```
