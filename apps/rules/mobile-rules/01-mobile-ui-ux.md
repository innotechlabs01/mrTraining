# MR Training — Mobile UI/UX

**Version 1.0 — 2026**

---

## 1. Design Philosophy

Act as a Senior Product Designer from Apple, Linear, Stripe, and Airbnb.

Every screen must follow:

- Apple Human Interface Guidelines
- Material Design 3
- WCAG AA
- Nielsen Heuristics
- UX Laws (Fitts, Hick, Miller, Tesler)
- Gestalt Principles (proximity, similarity, continuity, closure)

---

## 2. Core Principles

| Principle | Rule |
|-----------|------|
| Simplicity | One primary action per screen |
| Clarity | User always knows what to do next |
| Consistency | Same things look and work the same everywhere |
| Feedback | Every action produces a visible response |
| Forgiveness | Undo where possible, confirm destructive actions |
| Accessibility | Touch targets ≥ 44pt, labels for screen readers |

---

## 3. Component States

Every interactive component MUST implement ALL states:

| State | Purpose |
|-------|---------|
| `default` | Normal resting state |
| `pressed` | Touch down feedback (opacity 0.7 or scale 0.97) |
| `focused` | Keyboard/TV focus ring |
| `disabled` | Grayed out, no interaction |
| `loading` | Skeleton or spinner |
| `error` | Red border/message with retry action |
| `selected` | Active/checked indicator |
| `empty` | Illustration + message + CTA |

---

## 4. Loading States

- **Skeleton loaders** for lists and cards (never a full-screen spinner)
- **Pull-to-refresh** on scrollable lists
- **Optimistic updates** for mutations (mark complete before server confirms)
- **Progress indicators** for uploads, downloads, video processing

---

## 5. Error States

- **Inline errors** on form fields (red text + icon next to field)
- **Toast/snackbar** for transient errors (network failure)
- **Full-screen error** with retry button for fatal errors (never a white screen)
- **Offline banner** when connectivity lost (persistent, non-blocking)

---

## 6. Empty States

Every list, feed, and dashboard section needs an empty state:

```
┌─────────────────────────────┐
│                             │
│         🏋️                  │
│   No workouts yet           │
│   Your coach will assign    │
│   workouts soon.            │
│                             │
│      [Explore Exercises]    │
│                             │
└─────────────────────────────┘
```

---

## 7. Design Tokens

```typescript
// shared/theme/tokens.ts — Unified AthletePro system (dark-first)
export const tokens = {
  spacing: {
    xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64,
  },
  radius: {
    sm: 8, md: 12, lg: 16, xl: 24, full: 9999,
  },
  typography: {
    display: { fontSize: 34, lineHeight: 40, weight: '800', family: 'Inter' },
    h1:     { fontSize: 30, lineHeight: 36, weight: '800', family: 'Inter' },
    h2:     { fontSize: 24, lineHeight: 30, weight: '800', family: 'Inter' },
    h3:     { fontSize: 20, lineHeight: 26, weight: '700', family: 'Inter' },
    body:   { fontSize: 16, lineHeight: 22, weight: '400', family: 'Inter' },
    bodySmall: { fontSize: 13, lineHeight: 18, weight: '400', family: 'Inter' },
    caption:{ fontSize: 11, lineHeight: 15, weight: '500', family: 'Inter' },
    overline:{ fontSize: 10, lineHeight: 14, weight: '700', family: 'Inter' },
  },
};
```

---

## 8. Theme (Dark + Light)

```typescript
// Unified AthletePro palette (UX Pilot) — dark-first. Canonical source:
// apps/mobile/src/shared/theme/tokens.ts. Single accent: Electric Green.
const darkTheme = {
  background: '#0B0F0E',      // Base
  surface: '#151B19',         // Surface
  surface2: '#1C2320',        // Surface Raised / elevated rows
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  primary: '#16E37A',         // Electric Green — one primary CTA per screen
  primaryPressed: '#12C66A',  // Pressed state
  success: '#34D399',
  warning: '#FBBF24',
  error: '#FF6B6B',
  border: '#242B28',          // hairline (white/5 over base)
};

// Light mode keeps the same accent and semantic roles over inverted neutrals.
const lightTheme = {
  background: '#FFFFFF',
  surface: '#F5F5F7',
  text: '#0B0F0E',
  textSecondary: '#4B5563',
  primary: '#16E37A',
  primaryPressed: '#12C66A',
  error: '#FF6B6B',
  success: '#34D399',
  warning: '#FBBF24',
  border: '#E5E7EB',
};
```

Dark Mode and Light Mode are **mandatory**. Use `useColorScheme()` from React Native. The app ships **dark-first**: `tokens.ts` defines the dark palette canonically; light mode derives its neutrals from it.

---

## 9. Animation Guidelines

- **Duration:** 200-300ms for micro-interactions, 400-500ms for transitions
- **Easing:** `ease-out` for entering, `ease-in` for exiting
- **Spring:** Use for gestures (pull-to-refresh, swipe actions)
- **Shared element transitions:** Between list → detail screens
- **Layout animations:** `LayoutAnimation.configureNext()` for list reordering
- **60 FPS minimum.** Test on low-end devices.

---

## 10. Responsive Layout

- **Flex-based layouts** that adapt to any screen width
- **`useWindowDimensions()`** for tablet adaptations
- **Min touch target:** 44x44 points (Apple HIG)
- **Safe areas:** Use `SafeAreaView` and `useSafeAreaInsets()`
- **Keyboard avoidance:** `KeyboardAvoidingView` with `behavior="padding"` on iOS
