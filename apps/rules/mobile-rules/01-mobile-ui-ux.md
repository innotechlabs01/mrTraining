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
// shared/theme/tokens.ts
export const tokens = {
  spacing: {
    xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
  },
  radius: {
    sm: 6, md: 12, lg: 16, xl: 24, full: 9999,
  },
  typography: {
    display: { fontSize: 34, lineHeight: 41, weight: '700' },
    title1:  { fontSize: 28, lineHeight: 34, weight: '700' },
    title2:  { fontSize: 22, lineHeight: 28, weight: '600' },
    title3:  { fontSize: 20, lineHeight: 25, weight: '600' },
    body:    { fontSize: 17, lineHeight: 22, weight: '400' },
    callout: { fontSize: 16, lineHeight: 21, weight: '400' },
    subhead: { fontSize: 15, lineHeight: 20, weight: '400' },
    footnote:{ fontSize: 13, lineHeight: 18, weight: '400' },
    caption1:{ fontSize: 12, lineHeight: 16, weight: '400' },
    caption2:{ fontSize: 11, lineHeight: 13, weight: '400' },
  },
};
```

---

## 8. Theme (Dark + Light)

```typescript
// Brand colors from 01-brand-guidelines.md §4 (Volt single-accent system)
// Canonical source: apps/mobile/src/shared/theme/tokens.ts — dark-first.
const darkTheme = {
  background: '#111214',      // Base
  surface: '#191B1E',         // Surface
  surfaceRaised: '#202329',   // Surface Raised
  text: '#F5F5F7',
  textSecondary: '#9CA3AF',
  primary: '#C8FF00',         // Volt — one primary CTA per screen
  primaryPressed: '#A8D900',  // Volt pressed state
  destructive: '#FF5A5F',
  success: '#34D399',
  warning: '#FBBF24',
  border: '#26292E',
};

// Light mode keeps the same accent and semantic roles over inverted neutrals;
// Volt always carries dark text (#111214), never white.
const lightTheme = {
  background: '#FFFFFF',
  surface: '#F5F5F7',
  text: '#111214',
  textSecondary: '#4B5563',
  primary: '#C8FF00',
  primaryPressed: '#A8D900',
  destructive: '#FF5A5F',
  success: '#34D399',
  warning: '#FBBF24',
  border: '#E5E5EA',
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
