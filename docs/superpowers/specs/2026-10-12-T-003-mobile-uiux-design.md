# T-003: Mobile UI/UX Hygiene — Design Spec

> Rule: Spec → BOARD.md → implement → REVIEW → USER GATE → DONE
> (`apps/rules/14-team-workflow.md` §2).

---

## 1. Problema

App funciona pero estilos con drift: hex hardcodeado fuera tokens, 2 `FlatList` vs 12 `FlashList`, tab `Plan` renderiza `HistoryScreen`, headers/paddings sin auditar en 52 screens. Riesgo: UI inconsistente, deuda visual, 60 FPS irregular.

## 2. Roles y AC

| Rol | Quién | Goal |
|---|---|---|
| dev-react-native | Ingeniero RN | Higiene UI sin rediseño, cero regresión visual |

### Acceptance Criteria

- [ ] **AC-S1:** Given 6 files con hex hardcodeado, When se reemplazan por tokens, Then `grep #[0-9A-Fa-f]{6}` en `apps/mobile/src` solo matchea `shared/theme/*` y `shadows` usan `tokens.shadows`.
- [ ] **AC-S2:** Given 2 screens con `<FlatList`, When migran a `FlashList`, Then cero `<FlatList` en `src` (excl `__tests__`) y scroll sin jank.
- [ ] **AC-S3:** Given tab `Plan` muestra `HistoryScreen`, When se renombra tab o componente, Then nombre tab = propósito screen y navegación intacta.
- [ ] **AC-S4:** Given 52 screens, When se auditan headers/paddings/acción primaria, Then cada screen usa `ScreenHeader` (o variante justificada), `layout.pagePadding`, 1 acción primaria.
- [ ] **AC-S5:** Given auth/membership con paleta propia, When se restylea a tokens, Then cero hex propio y fidelidad visual en screenshots.

## 3. Criterios UX

- Loading: skeleton existente, no pantallas vacías.
- Empty/error: `EmptyState` + retry, copy humano.
- Sin cambios de flujo ni navegación nueva. Solo higiene.

## 4. Fases

```
S1 tokens → S2 FlashList → S3 tab naming → S4 headers audit → S5 auth restyle
```

Cada fase: commit atómico + `tsc --noEmit` + `jest`. S4 antes de S5 (headers primero, luego cluster auth).

## 5. Diseño

### S1 — archivos (evidencia auditoría)
- `features/auth/.../MembershipPlansListScreen.tsx:91,112,117,162` (`#0a0a0f/#1a1a24/#2a2a3a` → `base/surfaceRaised/border`)
- `MembershipPurchaseScreen.tsx`, `MembershipCheckScreen.tsx` (mismo cluster)
- `ai/.../FramingOverlay.tsx`, `shared/components/ui/GlassDock.tsx:67` (shadow → `tokens.shadows`), `shared/components/fitness/ActivityRings.tsx:12-14` (consts → importar `tokens`)

### S2 — `MyTicketsScreen.tsx`, `TicketChatScreen.tsx` → `FlashList` (patrón de los otros 12).

### S3 — `navigation/AthleteTabs.tsx:27`: renombrar tab `Plan`→`History` o componente según producto. Default: rename tab (menor blast radius).

### S4 — recorrer 52 `*Screen.tsx`: header, `layout.pagePadding`, 1 acción primaria. Desviaciones justificadas en commit msg.

### S5 — restyle pantallas auth/membership a tokens tras S4.

## 6. API

Ningún cambio. Solo cliente mobile.

## 7. Fuera de scope

- Rediseño visual, nuevos flujos, navegación nueva, cambios Go API, SDK upgrades.

## 8. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Regresión visual sutil | Medium | screenshots antes/después pantallas tocadas |
| S4 52 screens muy amplio | Medium | fases + commits atómicos, review por fase |
| `ActivityRings` colores semánticos | Low | importar tokens, mismos valores hex |

## 9. Referencias

- Tokens: `apps/mobile/src/shared/theme/tokens.ts`
- Rules: `mobile-rules/01-mobile-ui-ux.md`, `02-mobile-code-quality.md`, `03-mobile-testing.md`
