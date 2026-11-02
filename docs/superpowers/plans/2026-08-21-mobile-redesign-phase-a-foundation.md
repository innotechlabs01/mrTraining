# Mobile Redesign — Phase A Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the redesign foundation for `apps/mobile`: unified design tokens (Volt system), Archivo/Inter fonts, `react-native-svg`, a token-consuming UI kit, legacy theme shims so all 22 importing files keep compiling, and rewritten rules docs (`01-brand-guidelines.md`, `02-design-system.md`).

**Architecture:** Single source of truth at `src/shared/theme/tokens.ts`. UI kit components under `src/shared/components/ui/` consume tokens only — no inline hex anywhere. Legacy `shared/theme/index.ts` and `designTokens.ts` remain as temporary re-export shims (they are imported by 21 feature/navigation files that Phase B will migrate); unreferenced `primitives.ts` is deleted.

**Tech Stack:** Expo SDK 54 (managed workflow with prebuilt ios/android via `expo-dev-client`), React Native 0.81, TypeScript strict, React 19.1, Jest 29 + `jest-expo` preset + `@testing-library/react-native` v13 (React 19 compatible, bundles its own renderer). Package manager for `apps/mobile` is **npm** (it has `package-lock.json` and is NOT listed in `pnpm-workspace.yaml`).

**Source spec:** `docs/superpowers/specs/2026-08-21-mobile-redesign-design.md` §3.1, §3.2, §4, §10.

---

## Task 0 — Testing infrastructure

Jest is referenced by `"test": "jest --passWithNoTests"` but jest/jest-expo/@testing-library are NOT installed. Install them before any TDD work.

**Files:**
- Modify: `apps/mobile/package.json` (devDeps)
- Create: `apps/mobile/jest.config.js`
- Create: `apps/mobile/src/shared/theme/__tests__/smoke.test.ts`

- [ ] Run: `cd apps/mobile && npm install --save-dev jest@~29.7.0 jest-expo@~54.0.12 @types/jest@^29.5.0 @testing-library/react-native@^13.2.0 react-test-renderer@19.1.0`
- [ ] Create `apps/mobile/jest.config.js`:

```js
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx)'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg)/)',
  ],
};
```

- [ ] Create failing smoke test `apps/mobile/src/shared/theme/__tests__/smoke.test.ts`:

```ts
describe('test infrastructure', () => {
  it('runs jest with the jest-expo preset', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] Run: `cd apps/mobile && npx jest src/shared/theme/__tests__/smoke.test.ts` — EXPECT PASS (this validates infra; subsequent tasks follow red-green)
- [ ] Commit: `chore(mobile): add jest-expo and testing-library test infrastructure`

## Task 1 — Unified tokens file

**Files:**
- Create: `apps/mobile/src/shared/theme/tokens.ts`
- Create: `apps/mobile/src/shared/theme/__tests__/tokens.test.ts`

- [ ] Create failing test `apps/mobile/src/shared/theme/__tests__/tokens.test.ts`:

```ts
import { colors, typography, spacing, radius, shadows, fontFamilies } from '../tokens';

describe('tokens', () => {
  it('exposes the Volt color system', () => {
    expect(colors.base).toBe('#111214');
    expect(colors.surface).toBe('#191B1E');
    expect(colors.surfaceRaised).toBe('#202329');
    expect(colors.border).toBe('#26292E');
    expect(colors.primary).toBe('#C8FF00');
    expect(colors.primaryPressed).toBe('#A8D900');
    expect(colors.text).toBe('#F5F5F7');
    expect(colors.textSecondary).toBe('#9CA3AF');
    expect(colors.success).toBe('#34D399');
    expect(colors.warning).toBe('#FBBF24');
    expect(colors.error).toBe('#FF5A5F');
  });

  it('exposes the typography scale', () => {
    expect(typography.display.fontSize).toBeGreaterThanOrEqual(40);
    expect(typography.display.fontSize).toBeLessThanOrEqual(48);
    expect(typography.title.fontSize).toBe(20);
    expect(typography.body.fontSize).toBe(15);
    expect(typography.label.fontSize).toBe(11);
    expect(typography.label.letterSpacing).toBe(2);
  });

  it('references only fonts loaded by fonts.ts', () => {
    const usedFamilies = Object.values(typography).map((t) => t.fontFamily);
    for (const family of usedFamilies) {
      expect(Object.values(fontFamilies)).toContain(family);
    }
  });

  it('exposes spacing and radius scales matching existing conventions', () => {
    expect(spacing).toMatchObject({ xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64 });
    expect(radius).toMatchObject({ sm: 8, md: 12, lg: 16, xl: 24, full: 9999 });
  });
});
```

- [ ] Run: `cd apps/mobile && npx jest src/shared/theme/__tests__/tokens.test.ts` — EXPECT FAIL: `Cannot find module '../tokens'`
- [ ] Create `apps/mobile/src/shared/theme/tokens.ts`:

```ts
/**
 * Single source of truth for the MR Training redesign (spec 2026-08-21 §3).
 * Dark-first. One accent: Volt. Surfaces layer by tonal difference, not borders.
 */

export const colors = {
  base: '#111214', // app background, deepest layer
  surface: '#191B1E', // cards, main surfaces
  surfaceRaised: '#202329', // elevated elements, inputs, chips
  border: '#26292E', // hairlines, separators
  primary: '#C8FF00', // Volt — single accent, one primary CTA per screen
  primaryPressed: '#A8D900', // Volt pressed state
  text: '#F5F5F7', // primary text (WCAG AA on base/surface/surfaceRaised)
  textSecondary: '#9CA3AF', // secondary text, captions
  success: '#34D399',
  warning: '#FBBF24',
  error: '#FF5A5F',
} as const;

export const fontFamilies = {
  displayBlack: 'Archivo_900Black',
  display: 'Archivo_800ExtraBold',
  displayBold: 'Archivo_700Bold',
  heading: 'Archivo_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  bodyExtraBold: 'Inter_800ExtraBold',
} as const;

export const typography = {
  displayXL: { fontFamily: fontFamilies.display, fontSize: 48, lineHeight: 52 }, // hero numerals
  display: { fontFamily: fontFamilies.displayBold, fontSize: 40, lineHeight: 44 },
  title: { fontFamily: fontFamilies.heading, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: fontFamilies.body, fontSize: 15, lineHeight: 20 },
  bodyStrong: { fontFamily: fontFamilies.bodySemiBold, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: fontFamilies.bodyMedium, fontSize: 13, lineHeight: 17 },
  label: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const shadows = {
  sm: { shadowColor: '#000000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  md: { shadowColor: '#000000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
} as const;

export const layout = {
  pagePadding: spacing.lg,
  cardPadding: spacing.md,
  touchTarget: 48,
  headerHeight: 56,
} as const;

export const tokens = { colors, typography, spacing, radius, shadows, layout, fontFamilies };
export default tokens;
```

Note: `shadowColor` uses a literal because RN shadow color participates in native elevation, not the semantic palette; this is the only allowed literal outside `colors`.

- [ ] Run: `cd apps/mobile && npx jest src/shared/theme/__tests__/tokens.test.ts` — EXPECT PASS (4/4)
- [ ] Commit: `feat(mobile): add unified Volt design tokens`

## Task 2 — Fonts (Archivo + Inter)

The app boots through Expo (`index.ts` → `App.tsx` → `src/navigation/App.tsx`; `app.json` has `expo` config, `expo-dev-client` installed). Font strategy: `@expo-google-fonts/*` packages + `expo-font`'s `useFonts` hook. `expo-app-loading` is deprecated — do not use it; gate rendering on the hook result instead.

**Files:**
- Modify: `apps/mobile/package.json` (deps)
- Create: `apps/mobile/src/shared/theme/fonts.ts`
- Create: `apps/mobile/src/shared/theme/__tests__/fonts.test.ts`
- Modify: `apps/mobile/src/navigation/App.tsx`

- [ ] Run: `cd apps/mobile && npm install @expo-google-fonts/archivo @expo-google-fonts/inter expo-font`
- [ ] Create failing test `apps/mobile/src/shared/theme/__tests__/fonts.test.ts`:

```ts
import { FONT_FAMILIES_TO_LOAD, useAppFonts } from '../fonts';
import { fontFamilies, typography } from '../tokens';

describe('fonts', () => {
  it('declares every family referenced by tokens', () => {
    for (const family of Object.values(fontFamilies)) {
      expect(FONT_FAMILIES_TO_LOAD).toHaveProperty(family);
    }
  });

  it('returns false while fonts load', () => {
    expect(useAppFonts()).toBe(false);
  });
});
```

(The second case exercises the mocked-hook contract below; it fails while `fonts.ts` does not exist.)

- [ ] Create `apps/mobile/src/shared/theme/fonts.ts`:

```ts
import {
  useFonts,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  Archivo_900Black,
} from '@expo-google-fonts/archivo';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';

/** Maps every PostScript family name (as used in tokens.fontFamilies) to its font resource. */
export const FONT_FAMILIES_TO_LOAD = {
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  Archivo_900Black,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} as const;

/**
 * Returns true once every brand font is ready. Render nothing (or a splash)
 * until this resolves — see FontGate in src/navigation/App.tsx.
 */
export function useAppFonts(): boolean {
  const [loaded] = useFonts(FONT_FAMILIES_TO_LOAD);
  return loaded === true;
}
```

- [ ] Run: `cd apps/mobile && npx jest src/shared/theme/__tests__/fonts.test.ts` — EXPECT PASS for case 1; case 2 fails (`useFonts` is undefined in node). Fix the test to mock the hook:

Replace the second `it(...)` block with:

```ts
  it('returns false while fonts load', () => {
    jest.mock('expo-font', () => ({ useFonts: () => [false] }));
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useAppFonts: freshHook } = require('../fonts');
    expect(freshHook()).toBe(false);
  });
```

- [ ] Run again — EXPECT PASS (2/2)
- [ ] Modify `apps/mobile/src/navigation/App.tsx` — add the font gate. Insert after the existing imports (line 10):

```tsx
import { useAppFonts } from '../shared/theme/fonts';
```

Then wrap the provider tree. Replace the body of `export default function App()` (lines 60–77) with:

```tsx
function FontGate({ children }: { children: React.ReactNode }) {
  const fontsReady = useAppFonts();
  if (!fontsReady) {
    // expo-splash-screen keeps the native splash visible until fonts resolve (Phase B adds the branded moment).
    return null;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <FontGate>
        <ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
          <QueryClientProvider client={queryClient}>
            <SafeAreaProvider>
              <ClerkInstanceSetter />
              <AppStateRefresh />
              <AppNavigator />
            </SafeAreaProvider>
          </QueryClientProvider>
        </ClerkProvider>
      </FontGate>
    </GestureHandlerRootView>
  );
}
```

- [ ] Run: `cd apps/mobile && npm run typecheck` — EXPECT PASS (no output)
- [ ] Commit: `feat(mobile): load Archivo and Inter brand fonts via expo-font`

## Task 3 — react-native-svg dependency

Icons themselves arrive in Phase B; this phase only adds and verifies the dependency (spec §4).

**Files:**
- Modify: `apps/mobile/package.json` (deps)
- Create: `apps/mobile/src/shared/components/ui/__tests__/svg.test.tsx`

- [ ] Run: `cd apps/mobile && npm install react-native-svg`
- [ ] Create failing test `apps/mobile/src/shared/components/ui/__tests__/svg.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import Svg, { Circle } from 'react-native-svg';

describe('react-native-svg', () => {
  it('renders an svg tree without crashing', () => {
    const { UNSAFE_getByType } = render(
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={10} fill="#C8FF00" />
      </Svg>,
    );
    expect(UNSAFE_getByType(Circle)).toBeTruthy();
  });
});
```

- [ ] Run: `cd apps/mobile && npx jest svg` — EXPECT FAIL: `Cannot find module 'react-native-svg'`
- [ ] Dependency already installed in step 1; run again — EXPECT PASS
- [ ] Commit: `chore(mobile): add react-native-svg dependency`

## Task 4 — UI kit: PrimaryButton

All kit components consume `../theme/tokens` (path from `src/shared/components/ui/` is `../../theme/tokens`). No hex literals in components.

**Files:**
- Create: `apps/mobile/src/shared/components/ui/PrimaryButton.tsx`
- Create: `apps/mobile/src/shared/components/ui/__tests__/PrimaryButton.test.tsx`

- [ ] Create failing test `apps/mobile/src/shared/components/ui/__tests__/PrimaryButton.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PrimaryButton } from '../PrimaryButton';

describe('PrimaryButton', () => {
  it('renders its label and fires onPress', () => {
    const onPress = jest.fn();
    const { getByText, getByRole } = render(
      <PrimaryButton label="START WORKOUT" onPress={onPress} />,
    );
    expect(getByText('START WORKOUT')).toBeTruthy();
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<PrimaryButton label="GO" onPress={onPress} disabled />);
    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

- [ ] Run: `cd apps/mobile && npx jest PrimaryButton` — EXPECT FAIL: `Cannot find module '../PrimaryButton'`
- [ ] Create `apps/mobile/src/shared/components/ui/PrimaryButton.tsx`:

```tsx
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme/tokens';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

/** The single Volt CTA per screen (spec §3.1 rule). Dark text on Volt passes WCAG AA. */
export function PrimaryButton({ label, onPress, disabled = false }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        !disabled && pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: spacing.lg * 2,
    paddingHorizontal: spacing.lg,
  },
  pressed: { backgroundColor: colors.primaryPressed },
  disabled: { backgroundColor: colors.surfaceRaised },
  label: { ...typography.bodyStrong, color: colors.base, textTransform: 'uppercase' },
  labelDisabled: { color: colors.textSecondary },
});
```

- [ ] Run: `cd apps/mobile && npx jest PrimaryButton` — EXPECT PASS (2/2)
- [ ] Commit: `feat(mobile): add PrimaryButton to UI kit`

## Task 5 — UI kit: Card + Badge

**Files:**
- Create: `apps/mobile/src/shared/components/ui/Card.tsx`
- Create: `apps/mobile/src/shared/components/ui/Badge.tsx`
- Create: `apps/mobile/src/shared/components/ui/__tests__/Card.test.tsx`
- Create: `apps/mobile/src/shared/components/ui/__tests__/Badge.test.tsx`

- [ ] Create failing tests:

`Card.test.tsx`:

```tsx
import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { Card } from '../Card';

describe('Card', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Card>
        <Text>Today session</Text>
      </Card>,
    );
    expect(getByText('Today session')).toBeTruthy();
  });
});
```

`Badge.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { Badge } from '../Badge';

describe('Badge', () => {
  it.each(['neutral', 'success', 'warning', 'error', 'primary'] as const)(
    'renders tone %s',
    (tone) => {
      const { getByText } = render(<Badge text="ACTIVE" tone={tone} />);
      expect(getByText('ACTIVE')).toBeTruthy();
    },
  );
});
```

- [ ] Run: `cd apps/mobile && npx jest Card Badge` — EXPECT FAIL: module not found (both)
- [ ] Create `apps/mobile/src/shared/components/ui/Card.tsx`:

```tsx
import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, layout, radius, shadows } from '../../theme/tokens';

/** Surface container. Depth comes from tonal layering over Base, plus a hairline. */
export function Card({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: layout.cardPadding,
    ...shadows.sm,
  },
});
```

- [ ] Create `apps/mobile/src/shared/components/ui/Badge.tsx`:

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme/tokens';

type Tone = 'neutral' | 'success' | 'warning' | 'error' | 'primary';

const TONE_STYLES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.surfaceRaised, fg: colors.textSecondary },
  success: { bg: `${colors.success}22`, fg: colors.success },
  warning: { bg: `${colors.warning}22`, fg: colors.warning },
  error: { bg: `${colors.error}22`, fg: colors.error },
  primary: { bg: `${colors.primary}22`, fg: colors.primary },
};

type Props = { text: string; tone?: Tone };

export function Badge({ text, tone = 'neutral' }: Props) {
  const { bg, fg } = TONE_STYLES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.xs,
  },
  text: { ...typography.label, color: colors.textSecondary },
});
```

(Tone backgrounds append alpha to token hexes rather than introducing new literals.)

- [ ] Run: `cd apps/mobile && npx jest Card Badge` — EXPECT PASS (1 + 5)
- [ ] Commit: `feat(mobile): add Card and Badge to UI kit`

## Task 6 — UI kit: ScreenHeader + ProgressBar

**Files:**
- Create: `apps/mobile/src/shared/components/ui/ScreenHeader.tsx`
- Create: `apps/mobile/src/shared/components/ui/ProgressBar.tsx`
- Create: `apps/mobile/src/shared/components/ui/__tests__/ScreenHeader.test.tsx`
- Create: `apps/mobile/src/shared/components/ui/__tests__/ProgressBar.test.tsx`

- [ ] Create failing tests:

`ScreenHeader.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ScreenHeader } from '../ScreenHeader';

describe('ScreenHeader', () => {
  it('renders title and optional subtitle', () => {
    const { getByText } = render(<ScreenHeader title="Events" subtitle="This month" />);
    expect(getByText('Events')).toBeTruthy();
    expect(getByText('This month')).toBeTruthy();
  });

  it('calls onBack when back control is pressed', () => {
    const onBack = jest.fn();
    const { getByLabelText } = render(<ScreenHeader title="Detail" onBack={onBack} />);
    fireEvent.press(getByLabelText('Go back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
```

`ProgressBar.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { ProgressBar } from '../ProgressBar';

describe('ProgressBar', () => {
  it('renders with an accessible progress value', () => {
    const { getByRole } = render(<ProgressBar progress={0.4} />);
    expect(getByRole('progressbar').props.accessibilityValue).toMatchObject({ now: 40 });
  });
});
```

- [ ] Run: `cd apps/mobile && npx jest ScreenHeader ProgressBar` — EXPECT FAIL: modules not found
- [ ] Create `apps/mobile/src/shared/components/ui/ScreenHeader.tsx`:

```tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, layout, typography } from '../../theme/tokens';

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: React.ReactNode;
};

export function ScreenHeader({ title, subtitle, onBack, action }: Props) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
      ) : null}
      <View style={styles.titles}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action ?? null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: layout.headerHeight,
    gap: 8,
  },
  titles: { flex: 1 },
  back: { color: colors.primary, fontSize: 32, lineHeight: 36 },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
```

- [ ] Create `apps/mobile/src/shared/components/ui/ProgressBar.tsx`:

```tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../../theme/tokens';

type Props = {
  /** 0..1 */
  progress: number;
};

export function ProgressBar({ progress }: Props) {
  const clamped = Math.min(Math.max(progress, 0), 1);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={styles.track}
    >
      <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.full,
    height: 8,
    overflow: 'hidden',
  },
  fill: { backgroundColor: colors.primary, borderRadius: radius.full, height: '100%' },
});
```

- [ ] Run: `cd apps/mobile && npx jest ScreenHeader ProgressBar` — EXPECT PASS (2 + 1)
- [ ] Commit: `feat(mobile): add ScreenHeader and ProgressBar to UI kit`

## Task 7 — UI kit: Input + EmptyState (loading/error/empty)

**Files:**
- Create: `apps/mobile/src/shared/components/ui/Input.tsx`
- Create: `apps/mobile/src/shared/components/ui/EmptyState.tsx`
- Create: `apps/mobile/src/shared/components/ui/__tests__/Input.test.tsx`
- Create: `apps/mobile/src/shared/components/ui/__tests__/EmptyState.test.tsx`

- [ ] Create failing tests:

`Input.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Input } from '../Input';

describe('Input', () => {
  it('forwards typed text to onChangeText', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <Input placeholder="Email" value="" onChangeText={onChangeText} />,
    );
    fireEvent.changeText(getByPlaceholderText('Email'), 'a@b.com');
    expect(onChangeText).toHaveBeenCalledWith('a@b.com');
  });

  it('shows an error message when provided', () => {
    const { getByText } = render(
      <Input placeholder="Email" value="" onChangeText={jest.fn()} error="Invalid email" />,
    );
    expect(getByText('Invalid email')).toBeTruthy();
  });
});
```

`EmptyState.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('loading variant shows activity indicator and no retry', () => {
    const { queryByRole, getByTestId } = render(<EmptyState variant="loading" />);
    expect(getByTestId('empty-state-loading')).toBeTruthy();
    expect(queryByRole('button')).toBeNull();
  });

  it('error variant shows retry button and fires onRetry', () => {
    const onRetry = jest.fn();
    const { getByRole, getByText } = render(
      <EmptyState variant="error" message="Could not load" onRetry={onRetry} />,
    );
    expect(getByText('Could not load')).toBeTruthy();
    fireEvent.press(getByRole('button'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('empty variant shows default message', () => {
    const { getByText } = render(<EmptyState variant="empty" />);
    expect(getByText('Nothing here yet')).toBeTruthy();
  });
});
```

- [ ] Run: `cd apps/mobile && npx jest Input EmptyState` — EXPECT FAIL: modules not found
- [ ] Create `apps/mobile/src/shared/components/ui/Input.tsx`:

```tsx
import React from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme/tokens';

type Props = TextInputProps & { error?: string };

export function Input({ error, style, ...rest }: Props) {
  return (
    <View>
      <TextInput
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    minHeight: spacing.lg * 2,
    paddingHorizontal: spacing.md,
    ...typography.body,
  },
  inputError: { borderColor: colors.error },
  error: { ...typography.caption, color: colors.error, marginTop: spacing.xs },
});
```

- [ ] Create `apps/mobile/src/shared/components/ui/EmptyState.tsx`:

```tsx
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme/tokens';

type Variant = 'loading' | 'error' | 'empty';

type Props = {
  variant: Variant;
  message?: string;
  onRetry?: () => void;
};

const DEFAULT_MESSAGES: Record<Variant, string> = {
  loading: 'Loading…',
  empty: 'Nothing here yet',
  error: 'Something went wrong',
};

export function EmptyState({ variant, message, onRetry }: Props) {
  const text = message ?? DEFAULT_MESSAGES[variant];
  return (
    <View style={styles.container}>
      {variant === 'loading' ? (
        <ActivityIndicator
          testID="empty-state-loading"
          color={colors.primary}
          size="large"
          accessibilityLabel={text}
        />
      ) : null}
      <Text style={styles.message}>{text}</Text>
      {variant === 'error' && onRetry ? (
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}>
          <Text style={styles.retryLabel}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  message: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  retry: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: spacing.lg * 2,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryLabel: { ...typography.bodyStrong, color: colors.primary, textTransform: 'uppercase' },
});
```

(Skeleton shimmer styling for the loading variant is deferred to Phase B screen work — the variant contract lands here.)

- [ ] Run: `cd apps/mobile && npx jest Input EmptyState` — EXPECT PASS (2 + 3)
- [ ] Commit: `feat(mobile): add Input and EmptyState to UI kit`

## Task 8 — Legacy theme shims + dead-code removal

**Decision (verified with grep):** 21 files import `darkTheme` from `shared/theme` and `TodayScreen.tsx` additionally imports `Colors/Typography/…` from `designTokens`. Both files MUST stay as re-export shims until Phase B migrates those screens — deleting them now breaks the build, contradicting spec §3.1 ("deleted") which applies at Phase B end. `primitives.ts` has ZERO importers (verified) → deleted now.

**Files:**
- Modify: `apps/mobile/src/shared/theme/designTokens.ts` (rewrite as shim)
- Modify: `apps/mobile/src/shared/theme/index.ts` (rewrite as shim)
- Delete: `apps/mobile/src/shared/theme/primitives.ts`

- [ ] Rewrite `apps/mobile/src/shared/theme/designTokens.ts` as a shim. Legacy keys map onto Volt tokens; legacy font names point only at families actually loaded by `fonts.ts`:

```ts
/**
 * TEMPORARY compatibility shim — re-exports legacy designTokens names backed by
 * the unified tokens.ts (Volt system). Every consumer migrates in Phase B, then
 * this file is deleted. Do not add new usages.
 */
import { colors, fontFamilies, radius, shadows, spacing, typography } from './tokens';

export const Colors = {
  background: colors.base,
  surface0: colors.base,
  surface1: colors.surface,
  surface3: colors.surface,
  surface5: colors.surfaceRaised,
  surface6: colors.border,
  primary: colors.primary,
  primaryHover: colors.primaryPressed,
  primaryPressed: colors.primaryPressed,
  secondary: colors.primary, // Performance Blue retired; single-accent system
  textPrimary: colors.text,
  textSecondary: colors.textSecondary,
  textTertiary: colors.textSecondary,
  success: colors.success,
  error: colors.error,
  warning: colors.warning,
  border: colors.border,
} as const;

export const Typography = {
  display: { fontFamily: fontFamilies.displayBold, fontSize: typography.display.fontSize, lineHeight: typography.display.lineHeight },
  title1: { fontFamily: fontFamilies.displayBold, fontSize: typography.title.fontSize, lineHeight: typography.title.lineHeight },
  title2: { fontFamily: fontFamilies.heading, fontSize: typography.title.fontSize, lineHeight: typography.title.lineHeight },
  title3: { fontFamily: fontFamilies.heading, fontSize: typography.title.fontSize, lineHeight: typography.title.lineHeight },
  body: { fontFamily: fontFamilies.body, fontSize: typography.body.fontSize, lineHeight: typography.body.lineHeight },
  callout: { fontFamily: fontFamilies.body, fontSize: typography.body.fontSize, lineHeight: typography.body.lineHeight },
  subhead: { fontFamily: fontFamilies.body, fontSize: typography.body.fontSize, lineHeight: typography.body.lineHeight },
  footnote: { fontFamily: fontFamilies.bodyMedium, fontSize: typography.caption.fontSize, lineHeight: typography.caption.lineHeight },
  caption: { fontFamily: fontFamilies.bodyMedium, fontSize: typography.caption.fontSize, lineHeight: typography.caption.lineHeight },
  overline: { ...typography.label, fontFamily: fontFamilies.bodySemiBold },
  mono: { fontFamily: fontFamilies.body, fontSize: 14, lineHeight: 18 }, // JetBrains Mono not loaded
} as const;

export const Spacing = spacing;
export const Radius = radius;
export const Shadows = shadows;
export const Layout = {
  pagePadding: spacing.lg,
  cardPadding: spacing.md,
  cardGap: spacing.md,
  touchTarget: 48,
  headerHeight: 56,
  tabBarHeight: 84,
} as const;

export const DesignTokens = { Colors, Typography, Spacing, Radius, Shadows, Layout };
```

- [ ] Rewrite `apps/mobile/src/shared/theme/index.ts` as a shim. Navigation themes get Volt values immediately (free visual upgrade for existing screens):

```ts
/**
 * TEMPORARY compatibility shim — keeps `darkTheme` imports compiling during
 * Phase A. All values derive from tokens.ts. Consumers migrate to tokens +
 * UI kit in Phase B, then this file is deleted. Do not add new usages.
 */
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { colors, spacing, radius, typography } from './tokens';

export { colors, typography, spacing, radius };
export { tokens };

export const darkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.base,
    card: colors.surface,
    surface: colors.surface,
    text: colors.text,
    textSecondary: colors.textSecondary,
    primary: colors.primary,
    primaryLight: colors.primary,
    destructive: colors.error,
    success: colors.success,
    warning: colors.warning,
    border: colors.border,
  },
};

export const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FFFFFF',
    surface: colors.base,
    text: colors.text,
    textSecondary: colors.textSecondary,
    primary: colors.primary,
    primaryLight: colors.primaryPressed,
    destructive: colors.error,
    success: colors.success,
    warning: colors.warning,
    border: colors.border,
  },
};
```

(`lightTheme` is kept only because it is exported today; the app is dark-only per `userInterfaceStyle`.)

- [ ] Delete dead code: `rm apps/mobile/src/shared/theme/primitives.ts`
- [ ] Verify no remaining references: `grep -rn "primitives" apps/mobile/src` — EXPECT no matches
- [ ] Run: `cd apps/mobile && npm run typecheck && npm test` — EXPECT both pass (all 22 legacy imports still compile against the shims)
- [ ] Commit: `refactor(mobile): back legacy theme exports with Volt tokens, drop unused primitives`

## Task 9 — Rules docs update

Preserve each doc's structure; replace only the color/token sections.

**Files:**
- Modify: `apps/rules/01-brand-guidelines.md` (§4 Color Palette, lines 183–259)
- Modify: `apps/rules/02-design-system.md` (§1.1 Colors brand/semantic/text subsections)

- [ ] In `01-brand-guidelines.md`, replace the entire body of `## 4. Color Palette` (everything between line 183 and line 261 `---`) with:

```markdown
## 4. Color Palette

The interface is dark-first with a single brand accent: **Volt**. Surfaces ascend
by tonal difference, never by borders alone. Volt is reserved for exactly one
primary CTA per screen. The former Electric Orange (#FF6B00) / Performance Blue
(#0066FF) dual-accent system is retired as of the 2026 mobile redesign.

### Core Palette (Mobile — canonical, `apps/mobile/src/shared/theme/tokens.ts`)

| Role | Hex | Usage |
|---|---|---|
| Base | `#111214` | App background, deepest layer |
| Surface | `#191B1E` | Cards, main content surfaces |
| Surface Raised | `#202329` | Elevated elements, inputs, chips |
| Border | `#26292E` | Hairlines, separators |
| Primary (Volt) | `#C8FF00` | The single accent. One primary CTA per screen. Progress fills, active indicators. |
| Primary Pressed | `#A8D900` | Pressed state of Volt elements |
| Text | `#F5F5F7` | Primary text (WCAG AA on all surfaces) |
| Text Secondary | `#9CA3AF` | Secondary text, captions, placeholders |
| Success | `#34D399` | Completed actions, positive trends |
| Warning | `#FBBF24` | Caution states, pending membership |
| Error | `#FF5A5F` | Errors, destructive actions |

### Usage Ratios

| Category | Ratio |
|---|---|
| Neutral surfaces and text (Base → Border, Text roles) | ≥ 90% |
| Volt accent (CTAs, active states, key brand moments) | ≤ 10% |

### Color Rules

- Volt is the ONLY accent. Never introduce a second hue for decoration. Semantic
  colors (Success/Warning/Error) appear only for state communication.
- Exactly one Volt CTA per screen. Secondary actions are ghost/outline treatments.
- Functional colors always pair with an icon or label — color is reinforcement,
  never the sole communication channel.
- All text must meet WCAG AA contrast against its background. Body text on Volt
  must be Base (`#111214`), never white.
- Gradients: permitted only between adjacent tonal steps of the same neutral ramp.
  Never gradient into or out of Volt.
```

- [ ] In `02-design-system.md` §1.1, make three replacements:
  1. Replace the "**Brand Accents**" table + following two paragraphs (lines 60–69) with:

```markdown
**Brand Accent**

| Token | Hex | Usage |
|---|---|---|
| `--color-brand-primary` | `#C8FF00` | Volt. The single accent. One primary CTA per screen, active states, progress fills. |
| `--color-brand-primary-pressed` | `#A8D900` | Pressed state for Volt elements. |

Volt is the only brand accent. The 90/10 rule governs distribution: ≥ 90% of a
screen comes from neutrals, ≤ 10% from Volt. The former Electric Orange /
Performance Blue dual-accent system is retired (see 01-brand-guidelines.md §4).
```

  2. Replace the "**Semantic Colors**" table (lines 71–78) with:

```markdown
**Semantic Colors**

| Token | Hex | Usage |
|---|---|---|
| `--color-success` | `#34D399` | Success states, completed actions, positive trends |
| `--color-warning` | `#FBBF24` | Warnings, caution states, in-progress indicators |
| `--color-error` | `#FF5A5F` | Errors, destructive actions, critical alerts |
```

(drop the `--color-info` row — informational states use Text Secondary)

  3. Replace the "**Text Colors (Dark Mode)**" table (lines 82–89) with:

```markdown
**Text Colors (Dark Mode — Default)**

| Token | Hex | Role |
|---|---|---|
| `--color-text-primary` | `#F5F5F7` | Primary body text, headlines |
| `--color-text-secondary` | `#9CA3AF` | Secondary text, metadata, captions, placeholders |
| `--color-text-inverse` | `#111214` | Text on Volt accent backgrounds (always Base, never white) |
```

- [ ] Verify docs render sanely: read both edited sections back
- [ ] Commit: `docs(rules): rewrite color system to Volt tokens (orange/blue retired)`

## Task 10 — Final verification

- [ ] Run full suite: `cd apps/mobile && npm test` — EXPECT all green (smoke, tokens ×4, fonts ×2, svg ×1, PrimaryButton ×2, Card ×1, Badge ×5, ScreenHeader ×2, ProgressBar ×1, Input ×2, EmptyState ×3 = 23 tests)
- [ ] Run types: `cd apps/mobile && npm run typecheck` — EXPECT exit 0
- [ ] Run lint: `cd apps/mobile && npm run lint` — EXPECT no errors (warnings acceptable)
- [ ] Confirm no inline hex in the new kit except documented exceptions: `grep -rn "#[0-9A-Fa-f]\{6\}" apps/mobile/src/shared/components/ui apps/mobile/src/shared/theme/tokens.ts` — EXPECT matches only in `tokens.ts` (palette) and the alpha-suffixed tone map in `Badge.tsx`
- [ ] Confirm legacy compile path intact: `grep -c "from.*shared/theme" -r apps/mobile/src | wc -l` still ≥ 21 and typecheck passed in Task 8
