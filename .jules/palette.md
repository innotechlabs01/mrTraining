# Palette's Journal

## 2026-11-09 - Accessible Language Selection Controls
**Learning:** In public navigation headers and landing shell components, language selection dropdowns (`<select>`) without visible text labels are unannounced to screen readers unless given explicit bilingual accessible names (`aria-label="Seleccionar idioma / Select language"`), and default browser styling often lacks keyboard focus visibility indicators.
**Action:** When providing locale or language pickers without visible `<label>` elements, always specify an accessible `aria-label` describing both localized purposes and apply `focus-visible:ring-2 focus-visible:ring-brand-primary/40 focus:outline-none cursor-pointer` to guarantee full keyboard discoverability and smooth visual feedback.
