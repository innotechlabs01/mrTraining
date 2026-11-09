# Palette's Journal - Critical Learnings

This journal records critical UX and accessibility learnings.

## 2026-11-07 - Accessible Form Controls in Dark Themed Navigation
**Learning:** Dropdowns and selects within navigation shells often omit explicit accessible names (`aria-label`) and retain default browser white backgrounds or unstyled focus rings that break keyboard focus navigation and dark theme contrast.
**Action:** Always provide an explicit accessible `aria-label`, integrate design system dark-mode tokens (`bg-surface-1`, `border-surface-3`), and apply standard visible focus indicators (`focus-visible:ring-2 focus-visible:ring-brand-primary`).
