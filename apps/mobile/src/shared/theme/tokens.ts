/**
 * MR Training Design System — mobile tokens.
 * Unified AthletePro / Volt-style single-accent system.
 * Dark-first. Accent: Volt (#C8FF00). Inter throughout.
 * Canonical source: apps/mobile/src/shared/theme/tokens.ts — dark-first.
 * Style reference: uxpilot-export AthletePro (UX Pilot) — 13 screens.
 */

import type { FontVariant } from 'react-native';

export const colors = {
  base: '#0B0F0E', // App background, deepest layer
  surface: '#151B19', // Cards, lists, main content surfaces
  surfaceRaised: '#1C2320', // Elevated rows, inputs, chips, surface2
  border: '#242B28', // Hairlines, separators (white/5 over base)
  primary: '#C8FF00', // Volt — the single accent
  primaryPressed: '#A8D900', // Pressed state of Volt
  secondary: '#3B9EFF', // Data-viz / macro secondary (carbs), sparingly
  text: '#FFFFFF', // Primary text (WCAG AA on all surfaces)
  textSecondary: '#9CA3AF', // Secondary text, captions, placeholders (gray-400)
  success: '#34D399', // emerald-500
  warning: '#FBBF24',
  error: '#FF6B6B', // destructive / errors / logout
  errorContainer: '#3A1010',
  info: '#3B9EFF', // alias of secondary — info toasts/banners, sparingly
  skeletonBase: '#1C2320', // resting skeleton block fill (= surfaceRaised)
  skeletonHighlight: '#2A3330', // shimmer sweep (≈8% lighter than base)
  // Light-on-dark semantics (dark-first system)
  background: '#0B0F0E', // alias for base — root canvas
  onPrimary: '#0B0F0E', // text/icon on primary accent
  onPrimaryVariant: '#68D391', // muted accent text
  onSurface: '#FFFFFF', // text on cards/surfaces
  onSurfaceVariant: '#9CA3AF', // secondary text on surfaces
  outline: '#242B28', // borders/separators
  onError: '#FFFFFF', // text on error states
} as const;

export const fontFamilies = {
  displayBlack: 'Inter_800ExtraBold',
  display: 'Inter_800ExtraBold',
  displayBold: 'Inter_800ExtraBold',
  heading: 'Inter_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  bodyExtraBold: 'Inter_800ExtraBold',
} as const;

export const typography = {
  // Unified type scale (Inter, tracking-tight for display)
  display: { fontFamily: fontFamilies.display, fontSize: 34, lineHeight: 40, letterSpacing: -0.02, textTransform: 'uppercase' as const },
  h1: { fontFamily: fontFamilies.displayBold, fontSize: 30, lineHeight: 36, letterSpacing: -0.01, textTransform: 'uppercase' as const },
  h2: { fontFamily: fontFamilies.displayBold, fontSize: 24, lineHeight: 30, letterSpacing: -0.01, textTransform: 'uppercase' as const },
  h3: { fontFamily: fontFamilies.heading, fontSize: 20, lineHeight: 26, letterSpacing: 0 },
  h4: { fontFamily: fontFamilies.heading, fontSize: 17, lineHeight: 22, letterSpacing: 0 },
  bodyLG: { fontFamily: fontFamilies.body, fontSize: 16, lineHeight: 26, letterSpacing: 0 },
  body: { fontFamily: fontFamilies.body, fontSize: 16, lineHeight: 22, letterSpacing: 0 },
  bodySmall: { fontFamily: fontFamilies.body, fontSize: 13, lineHeight: 18, letterSpacing: 0.01 },
  caption: { fontFamily: fontFamilies.bodyMedium, fontSize: 11, lineHeight: 15, letterSpacing: 0.02 },
  overline: { fontFamily: fontFamilies.heading, fontSize: 10, lineHeight: 14, letterSpacing: 0.1, textTransform: 'uppercase' as const },
  // Component-specific aliases
  title: { fontFamily: fontFamilies.heading, fontSize: 20, lineHeight: 26, letterSpacing: 0 },
  bodyStrong: { fontFamily: fontFamilies.bodySemiBold, fontSize: 14, lineHeight: 22, letterSpacing: 0 },
  bodyBold: { fontFamily: fontFamilies.bodyBold, fontSize: 14, lineHeight: 22, letterSpacing: 0 },
  label: {
    fontFamily: fontFamilies.heading,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.08,
    textTransform: 'uppercase' as const,
  },
  statsNumber: { fontFamily: fontFamilies.displayBlack, fontSize: 36, lineHeight: 36, letterSpacing: -0.02 },
  // v2 metric display scale (big scoreboard numerals, tabular-nums)
  metricXL: { fontFamily: fontFamilies.displayBlack, fontSize: 56, lineHeight: 56, letterSpacing: -0.03, fontVariant: ['tabular-nums'] as FontVariant[] },
  metricLG: { fontFamily: fontFamilies.displayBlack, fontSize: 44, lineHeight: 44, letterSpacing: -0.025, fontVariant: ['tabular-nums'] as FontVariant[] },
  metricMD: { fontFamily: fontFamilies.displayBlack, fontSize: 32, lineHeight: 32, letterSpacing: -0.02, fontVariant: ['tabular-nums'] as FontVariant[] },
  metricSM: { fontFamily: fontFamilies.displayBlack, fontSize: 24, lineHeight: 28, letterSpacing: -0.015, fontVariant: ['tabular-nums'] as FontVariant[] },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radius = {
  sm: 8, // rounded-lg — chips, small containers
  md: 12, // rounded-xl — buttons, inputs
  lg: 16, // rounded-2xl — default cards, lists
  xl: 24, // rounded-3xl — large media cards
  full: 9999,
} as const;

export const shadows = {
  sm: { shadowColor: '#000000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 2 },
  md: { shadowColor: '#000000', shadowOpacity: 0.25, shadowRadius: 16, elevation: 6 },
  glow: { shadowColor: '#C8FF00', shadowOpacity: 0.3, shadowRadius: 20, elevation: 8 },
} as const;

export const layout = {
  pagePadding: spacing.lg,
  cardPadding: spacing.md,
  touchTarget: 48,
  headerHeight: 56,
  navDockRaise: 20, // FAB center raise (-mt)
} as const;

/** Skeleton shimmer system — millisecond cycle + default block corner. */
export const skeleton = {
  duration: 1400, // ms per shimmer cycle
  radius: radius.sm,
} as const;

export const tokens = { colors, typography, spacing, radius, shadows, layout, fontFamilies, skeleton };
export default tokens;