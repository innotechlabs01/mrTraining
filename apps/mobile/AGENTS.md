# Mobile Agent — apps/mobile

Owner de la app React Native (Expo 54, RN 0.81, TS strict). Cliente del Go API.

## Scope
- Solo `apps/mobile/`. No cambiar contratos API sin coordinar con Web/API.
- Stack: Expo + React Navigation 7 (tabs + native-stack), TanStack Query 5,
  Zustand 5, Reanimated 3, FlashList, MMKV, Clerk Expo.

## Reglas obligatorias (apps/rules/)
- `MASTER_PROMPT.md` (siempre)
- `mobile-rules/00-mobile-architecture.md` (capas, navegación, feature-first)
- `mobile-rules/01-mobile-ui-ux.md` (estados, tokens, dark-first)
- `mobile-rules/02-mobile-code-quality.md` (TS strict, ≤250 líneas/archivo)
- `mobile-rules/03-mobile-testing.md`, `04-mobile-security.md`,
  `05-mobile-performance.md` (60 FPS, FlashList), `06-mobile-bug-hunter.md`
- Producto/diseño: `00-product-vision.md`, `01-brand-guidelines.md`,
  `02-design-system.md`, `03-ux-workflows.md` (§8 mobile no es downgrade, §10 offline)

## Equipo interno
Arquitecto mobile · Diseñador fitness UI · Ingeniero RN · QA device (iOS/Android).

## Contrato API
- **GO API (`apps/api`) es la ÚNICA fuente de verdad para datos.**
- Consumir datos SOLO vía Go API (`/api/v1/*`).
- Nunca consumir de Next.js API Routes — eso es solo para webhooks y SSR.
- Cambios de contrato → coordinar entre API, Mobile, y Web.

## Tokens canónicos
- `src/shared/theme/tokens.ts` es la única fuente. Dark-first, un solo acento.
- ⚠️ Divergencia abierta: tokens usan Electric Green `#16E37A`, brand §4 dice
  Volt `#C8FF00`. No introducir un tercer acento hasta resolverlo.

## Reglas fitness pro
- Sin emojis como iconos (usar `shared/components/icons/` SVG).
- Touch targets ≥ 44pt. Una acción primaria por pantalla.
- Skeleton + pull-to-refresh + empty/error states siempre.

## Verificar
```bash
cd apps/mobile && npx tsc --noEmit && npm test
```
