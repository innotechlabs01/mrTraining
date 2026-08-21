# Mobile Redesign — Phase B Restyle + Glass Dock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the drawer and every hardcoded color in `apps/mobile`: swap `AthleteDrawer` for a floating `GlassDock` bottom tab bar (Hoy/Plan/Eventos/Perfil), migrate every existing screen to the Volt `tokens` + the Phase A UI kit, restructure the entry flow per spec §3.4 (Splash as a real session gate, Welcome chooser, Onboarding hero images + Skip, and the `/athlete/onboard` data-loss fix), add a `react-native-svg` icon set, and hide (not delete) Nutrition/Recovery.

**Architecture:** Single source of truth remains `src/shared/theme/tokens.ts`. Every screen imports `colors/typography/spacing/radius/shadows/layout/fontFamilies` from it (never `darkTheme`, never inline hex). The legacy `shared/theme/designTokens.ts` shim is already referenced by **0 files** and is deleted. `shared/theme/index.ts` stays ONLY because `Navigation.tsx` consumes its `darkTheme` as the `NavigationContainer` theme and the auth-loading spinner color — screens no longer import from it. `react-native-svg` (already installed) provides a small icon set in `src/shared/components/icons/`. The tab navigator is the signed-in surface; Membership/Store become pushed stack screens reachable from Perfil cards.

**Tech Stack:** Expo SDK 54 (managed, `expo-dev-client`), React Native 0.81, TypeScript strict, React 19.1, `@react-navigation/bottom-tabs` v7 (already installed), `react-native-svg` 15.12.1, Jest 29 + `jest-expo` + `@testing-library/react-native` v13. Package manager for `apps/mobile` is **npm**. **Important:** `expo-blur` is NOT installed, and the native `BlurView` module can be unavailable in Expo Go — the GlassDock therefore uses a translucent-rgba `View` (the spec's Android/Expo-Go fallback) with `backgroundColor` derived from `colors.base` + alpha and a luminous `colors.primary` border; no new native dependency is added in Phase B. `jest.config.js` keeps its current `jest-expo` preset with **no** `transformIgnorePatterns` override (react-native-svg already transforms fine — see `svg.test.tsx`).

**Source spec:** `docs/superpowers/specs/2026-08-21-mobile-redesign-design.md` §3.3, §3.4, §4, §5.5, §9, §10. Work on branch `feature/mobile-redesign-phase-a` in `apps/mobile`.

**Key decisions:**

1. **GlassDock blur strategy** — pure translucent `View` glass (rgba from `colors.base` + alpha, luminous `colors.primary` hairline). Rationale: `expo-blur` native module is unavailable in Expo Go, it is not a dependency, and adding it risks breaking the managed Expo Go demo. The bar is detached (`position: 'absolute'`, `bottom: 22`, horizontal inset 16), `borderRadius: 24`, translucent `rgba(17,18,20,0.92)`, subtle dark shadow. `expo-blur` can be layered in later on a native build without changing the component API.
2. **AuthFlowScreen dissolution** — the inline `phase` state machine (splash→welcome) is removed. The root stack renders `Splash` as the auth-initial route; `SplashScreen` is reworked into a `useAuth()`-driven gate (signed-in → `replace('AthleteTabs')`, else after a ~1.2s brand moment → `replace('Welcome')`). Signed-in users still land on tabs because `RootNavigator` keys the navigator on `isSignedIn`. `Welcome` becomes a standalone route; `Auth` grows an `onboardingData` param; the `AuthFlow` route + exports are deleted.
3. **Onboarding data-loss fix (spec §5.5)** — `OnboardingScreen` already collects `OnboardingData` but the wrapper only writes it to a dead context. The real fix is thread it through the `Auth` route and have `SignInScreen`'s sign-up branch POST the **full** dataset to `/athlete/onboard` right after `setActive` (the bearer token is only available then). The route param type is extended; the orphaned `OnboardingContext` is removed. Hero-image placeholders and a Skip action are added to Onboarding; `CoachScheduleModal` keeps working and its `onScheduled` passes the snapshot through. Full `/api/athlete/appointments` + web coach view changes from §5.5 are Phase C (backend/web); Phase B only fixes the mobile payload.
4. **Icon approach** — replace all hand-built `View`-composed geometric icons with `react-native-svg` primitives tinted by a `color` prop (defaulting to `colors.primary`), consumed by a shared `src/shared/components/icons/` module. Used by the GlassDock tabs and by the Perfil Membership/Store cards.
5. **Nutrition/Recovery** — removed from navigation (code untouched) per spec §9; no longer imported by `AthleteTabs` (the only remaining importer once `AthleteDrawer` is deleted).

**Blocker note:** none. All required navigation packages (`@react-navigation/bottom-tabs` v7) are installed. `@react-navigation/drawer` stays installed but is no longer imported by `src` (harmless), so no `package.json` change is needed for it. `PendingApprovalScreen` is currently orphaned (exported but referenced by 0 navigators); it gets a token migration for consistency but is not wired into a route in Phase B.

---

## Task 0 — GlassDock component + tests (TDD)

**Files:**
- Create: `apps/mobile/src/shared/components/ui/GlassDock.tsx`
- Create: `apps/mobile/src/shared/components/ui/__tests__/GlassDock.test.tsx`

- [ ] Create the failing test `apps/mobile/src/shared/components/ui/__tests__/GlassDock.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { GlassDock, GlassDockIndicatorProto } from '../GlassDock';

function makeProps(active: string): BottomTabBarProps {
  const routes = [
    { key: 'Today', name: 'Today' },
    { key: 'Plan', name: 'Plan' },
    { key: 'Events', name: 'Events' },
    { key: 'Profile', name: 'Profile' },
  ];
  return {
    state: { index: routes.findIndex((r) => r.name === active), routes, key: 'tab', routeNames: ['Today', 'Plan', 'Events', 'Profile'], stale: false, type: 'tab' },
    descriptors: Object.fromEntries(
      routes.map((r) => [r.key, { options: { tabBarLabel: { Today: 'Hoy', Plan: 'Plan', Events: 'Eventos', Profile: 'Perfil' }[r.name] } }]),
    ) as BottomTabBarProps['descriptors'],
    navigation: { emit: jest.fn(() => ({ defaultPrevented: false }) as any), navigate: jest.fn() } as unknown as BottomTabBarProps['navigation'],
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  };
}

describe('GlassDock', () => {
  it('renders the four tab labels and marks the active tab', () => {
    const { getByRole } = render(<GlassDock {...makeProps('Today')} />);
    expect(getByRole('tab', { name: 'Hoy' })).toBeTruthy();
    expect(getByRole('tab', { name: 'Plan' })).toBeTruthy();
    expect(getByRole('tab', { name: 'Eventos' })).toBeTruthy();
    expect(getByRole('tab', { name: 'Perfil' })).toBeTruthy();
    expect(getByRole('tab', { name: 'Hoy' }).props.accessibilityState.selected).toBe(true);
  });

  it('navigates to a non-active tab on press', () => {
    const { getByRole } = render(<GlassDock {...makeProps('Today')} />);
    fireEvent.press(getByRole('tab', { name: 'Plan' }));
    expect(getByRole('tab', { name: 'Plan' })).toBeTruthy();
  });

  it('shows exactly one active dot indicator under the focused tab', () => {
    const { UNSAFE_getAllByType } = render(<GlassDock {...makeProps('Events')} />);
    expect(UNSAFE_getAllByType(GlassDockIndicatorProto).length).toBe(1);
  });
});
```

- [ ] Run: `cd apps/mobile && npx jest src/shared/components/ui/__tests__/GlassDock.test.tsx` — EXPECT FAIL: `Cannot find module '../GlassDock'`
- [ ] Create `apps/mobile/src/shared/components/ui/GlassDock.tsx`:

```tsx
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, fontFamilies, radius, spacing } from '../../theme/tokens';
import { BarbellIcon, CalendarIcon, HomeIcon, UserIcon } from '../icons';

const TAB_META: Record<string, { label: string; Icon: (p: { size: number; color: string }) => React.ReactElement }> = {
  Today: { label: 'Hoy', Icon: HomeIcon },
  Plan: { label: 'Plan', Icon: BarbellIcon },
  Events: { label: 'Eventos', Icon: CalendarIcon },
  Profile: { label: 'Perfil', Icon: UserIcon },
};

/** Animated active-tab dot; exported so tests can assert exactly one is rendered. */
export function GlassDockIndicatorProto({ focused }: { focused: boolean }) {
  const opacity = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: focused ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [focused, opacity]);
  return <Animated.View testID="glass-dock-active-dot" style={[styles.dot, { opacity }]} />;
}

export function GlassDock({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View testID="glass-dock" style={styles.dock}>
        {state.routes.map((route, idx) => {
          const meta = TAB_META[route.name] ?? { label: route.name, Icon: HomeIcon };
          const isFocused = idx === state.index;
          const label = descriptors[route.key]?.options?.tabBarLabel ?? meta.label;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name as never);
          };
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={String(label)}
            >
              <meta.Icon size={24} color={isFocused ? colors.primary : colors.textSecondary} />
              <Text style={[styles.label, isFocused && styles.labelFocused]}>{String(label)}</Text>
              <GlassDockIndicatorProto focused={isFocused} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, bottom: 22, zIndex: 10 },
  dock: {
    flexDirection: 'row',
    backgroundColor: 'rgba(17,18,20,0.92)',
    borderColor: `${colors.primary}40`,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
    height: 64,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 12,
  },
  tab: { flex: 1, height: 64, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontFamily: fontFamilies.bodySemiBold, fontSize: 10, letterSpacing: 0.5, color: colors.textSecondary },
  labelFocused: { color: colors.primary },
  dot: { marginTop: 3, width: 5, height: 5, borderRadius: radius.full, backgroundColor: colors.primary },
});
```

- [ ] Run: `cd apps/mobile && npx jest src/shared/components/ui/__tests__/GlassDock.test.tsx` — EXPECT PASS (imports `../icons`, created next)
- [ ] Run: `cd apps/mobile && npx tsc --noEmit` — EXPECT PASS after Task 1
- [ ] Commit: `feat(mobile): add translucent GlassDock bottom tab bar with active dot`

## Task 1 — react-native-svg icon set

**Files:**
- Create: `apps/mobile/src/shared/components/icons/index.tsx`

- [ ] Create `apps/mobile/src/shared/components/icons/index.tsx` (four tab icons + two Perfil card icons, all tintable):

```tsx
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../../theme/tokens';

export type IconProps = { size?: number; color?: string };
const S = 24;

export function HomeIcon({ size = S, color = colors.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 11 12 3l9 8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 10v10h14V10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 20v-6h6v6" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  );
}

export function BarbellIcon({ size = S, color = colors.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="1" y="9" width="22" height="6" rx="2" stroke={color} strokeWidth={2} />
      <Rect x="5" y="6" width="2.5" height="12" rx="1" fill={color} />
      <Rect x="16.5" y="6" width="2.5" height="12" rx="1" fill={color} />
      <Rect x="9.5" y="16.5" width="5" height="3" rx="1" fill={color} />
    </Svg>
  );
}

export function CalendarIcon({ size = S, color = colors.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="5" width="18" height="16" rx="2" stroke={color} strokeWidth={2} />
      <Path d="M3 9h18" stroke={color} strokeWidth={2} />
      <Circle cx="8" cy="14" r="1.2" fill={color} />
      <Circle cx="12" cy="14" r="1.2" fill={color} />
      <Circle cx="16" cy="14" r="1.2" fill={color} />
      <Path d="M8 3v4M16 3v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function UserIcon({ size = S, color = colors.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={2} />
      <Path d="M4 20c1.5-4 5-5.5 8-5.5s6.5 1.5 8 5.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function StoreIcon({ size = S, color = colors.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 7h16l-1.5 13h-13L4 7z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M8 7a4 4 0 0 1 8 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function MembershipIcon({ size = S, color = colors.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="6" width="20" height="13" rx="2" stroke={color} strokeWidth={2} />
      <Path d="M2 10h20" stroke={color} strokeWidth={2} />
      <Path d="M6 15h6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
```

- [ ] Run: `cd apps/mobile && npx jest src/shared/components/ui/__tests__/GlassDock.test.tsx` — EXPECT PASS
- [ ] Run: `cd apps/mobile && npx jest src/shared/components/ui/__tests__/svg.test.tsx` — EXPECT PASS (no transformIgnorePatterns change needed)
- [ ] Run: `cd apps/mobile && npx tsc --noEmit` — EXPECT PASS
- [ ] Commit: `feat(mobile): add tintable react-native-svg icon set`

## Task 2 — Navigation wire-up: 4-tab AthleteTabs + GlassDock, delete AthleteDrawer

**Files:**
- Rewrite: `apps/mobile/src/navigation/AthleteTabs.tsx`
- Delete: `apps/mobile/src/navigation/AthleteDrawer.tsx`
- Modify: `apps/mobile/src/navigation/Navigation.tsx` (swap `AthleteDrawer` → `AthleteTabs`, add `Membership`/`Store` to the signed-in stack)

- [ ] Rewrite `apps/mobile/src/navigation/AthleteTabs.tsx` as the GlassDock 4-tab bar:

```tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TodayScreen } from '../features/training/presentation/screens/TodayScreen';
import { HistoryScreen } from '../features/training/presentation/screens/HistoryScreen';
import { EventsScreen } from '../features/events/presentation/screens/EventsScreen';
import { ProfileScreen } from '../features/auth/presentation/screens/ProfileScreen';
import { GlassDock } from '../shared/components/ui/GlassDock';

export type AthleteTabParamList = {
  Today: undefined;
  Plan: undefined;
  Events: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AthleteTabParamList>();

export function AthleteTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <GlassDock {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Today" component={TodayScreen} options={{ tabBarLabel: 'Hoy' }} />
      <Tab.Screen name="Plan" component={HistoryScreen} options={{ tabBarLabel: 'Plan' }} />
      <Tab.Screen name="Events" component={EventsScreen} options={{ tabBarLabel: 'Eventos' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Perfil' }} />
    </Tab.Navigator>
  );
}
```

- [ ] Delete `apps/mobile/src/navigation/AthleteDrawer.tsx`: `rm apps/mobile/src/navigation/AthleteDrawer.tsx`
- [ ] Edit `apps/mobile/src/navigation/Navigation.tsx`:
  - Replace `import { AthleteDrawer } from './AthleteDrawer';` → `import { AthleteTabs } from './AthleteTabs';`
  - Change the gate wrapper: `<MembershipGate athleteId={user?.id ?? null}><AthleteTabs /></MembershipGate>` (was `<AthleteDrawer />`)
  - Add `Membership` and `Store` to the signed-in branch, importing the screens:

```tsx
import { MembershipScreen } from '../features/membership/presentation/screens/MembershipScreen';
import { StoreScreen } from '../features/store/presentation/screens/StoreScreen';
```

and inside the signed-in `<>`:

```tsx
<Stack.Screen name="AthleteTabs" component={AthleteTabsWithGate} />
<Stack.Screen name="InviteAccept" component={InviteAcceptScreen} />
<Stack.Screen name="Membership" component={MembershipScreen} />
<Stack.Screen name="Store" component={StoreScreen} />
```

- [ ] Run: `cd apps/mobile && npx tsc --noEmit` — EXPECT PASS (AthleteDrawer imports removed from Navigation.tsx; Events/Membership/Store/HamburgerButton still render until their own tasks clean them; they compile with the drawer type import still present)
- [ ] Commit: `refactor(mobile): replace drawer with GlassDock 4-tab navigation`

## Task 3 — Entry flow restructure (dissolve AuthFlow, Splash gate, onboarding data fix)

**Files:**
- Modify: `apps/mobile/src/navigation/Navigation.tsx`
- Modify: `apps/mobile/src/features/auth/presentation/screens/SplashScreen.tsx`
- Modify: `apps/mobile/src/features/auth/presentation/screens/SignInScreen.tsx`
- Modify: `apps/mobile/src/features/auth/presentation/screens/OnboardingScreen.tsx` (+ hero image placeholders, Skip)
- Delete: `apps/mobile/src/features/auth/presentation/screens/AuthFlowScreen.tsx`

Step A — `Navigation.tsx` root stack + linking + removed context.

- [ ] In `Navigation.tsx`, remove the `OnboardingContext` block (lines 15–28) and the `useOnboardingData`/`AppNavigator` provider wiring. Remove `import { OnboardingScreen, OnboardingData }`; import `SplashScreen` and `WelcomeScreen`.
- [ ] Update `RootStackParamList`:

```ts
export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Auth: { code?: string; mode?: 'signin' | 'signup'; onboardingData?: OnboardingData } | undefined;
  Onboarding: undefined;
  InviteAccept: { code: string } | undefined;
  AthleteTabs: undefined;
  Membership: undefined;
  Store: undefined;
};
```

(import `OnboardingData` from `./../features/auth/presentation/screens/OnboardingScreen`.)

- [ ] Update `linking.config.screens`:

```ts
screens: {
  Splash: '',
  Welcome: 'welcome',
  Auth: 'auth',
  Onboarding: 'onboarding',
  InviteAccept: 'invite',
  AthleteTabs: 'home',
  Membership: 'membership',
  Store: 'store',
},
```

- [ ] In the not-signed-in branch, replace `AuthFlow` with `Splash` and `Welcome`:

```tsx
<Stack.Screen name="Splash" component={SplashScreen} />
<Stack.Screen name="Welcome" component={WelcomeScreen} />
<Stack.Screen name="Auth" component={SignInScreen} />
<Stack.Screen name="Onboarding" component={OnboardingScreenWrapper} />
<Stack.Screen name="InviteAccept" component={InviteAcceptScreen} />
```

- [ ] Rewrite `OnboardingScreenWrapper` to pass onboarding data through the Auth route and drop the context:

```tsx
function OnboardingScreenWrapper({ navigation }: any) {
  const handleComplete = useCallback(
    (data: OnboardingData) => navigation.navigate('Auth', { mode: 'signup', onboardingData: data }),
    [navigation],
  );
  return <OnboardingScreen onComplete={handleComplete} />;
}
```

- [ ] Delete `apps/mobile/src/features/auth/presentation/screens/AuthFlowScreen.tsx`: `rm apps/mobile/src/features/auth/presentation/screens/AuthFlowScreen.tsx`

Step B — `SplashScreen.tsx` becomes a session gate.

- [ ] Replace `type Props = { onFinish: () => void }` with a `NativeStackScreenProps<RootStackParamList, 'Splash'>` signature and gate on `useAuth`. In the `useEffect`, drop the 3.8s timer; keep only the fade/pulse visual, then after a ~1.2s brand moment navigate. Add a `navigation`-driven redirect: signed-in → `replace('AthleteTabs')`; not signed-in → `replace('Welcome')`.

```tsx
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../../navigation/Navigation';
import { useAuth } from '@clerk/clerk-expo';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export function SplashScreen({ navigation }: Props) {
  const { isSignedIn } = useAuth();
  // ... existing animated values (fadeAnim, pulseAnim, taglineOpacity, skipOpacity) ...
  useEffect(() => {
    // brand moment (fade keeps the wordmark; progress bar removed — it clocked 3.5s before)
    Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    Animated.timing(taglineOpacity, { toValue: 1, duration: 500, delay: 400, useNativeDriver: true }).start();
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
    ]));
    pulse.start();
    const timer = setTimeout(() => {
      navigation.replace(isSignedIn ? 'AthleteTabs' : 'Welcome');
    }, 1200);
    return () => { clearTimeout(timer); pulse.stop(); };
  }, [fadeAnim, pulseAnim, taglineOpacity, isSignedIn, navigation]);
  // Remove the Skip press and the progressWidth/progressFill/progressLeave styles from the render.
}
```

Also remove the now-unused `progressWidth`/`progressLabel`/`progressFill`/`progressTrack` elements & styles, and the `skipWrap`/`skipText`/`skipHit` + `onFinish`/`skipOpacity` references.

Step C — `OnboardingScreen.tsx`: add hero-image placeholders, a Skip action, and keep the data payload. (Its selection logic/steps stay; only visuals + Skip + a per-step hero block and `onComplete` surface change.)

- [ ] Add a `Skip` control in the bottom bar that jumps to the last step:

```tsx
<Pressable onPress={() => setStep(STEP_COUNT - 1)} style={styles.skipBtn}>
  <Text style={styles.skipText}>Skip</Text>
</Pressable>
```

Only show it when `0 < step < STEP_COUNT - 1`. Place it in the `bottom` container above the Next button.

- [ ] Add a per-step hero image placeholder block rendered above `STEP_TITLES[step]`:

```tsx
const HERO_ART: Record<number, string> = {
  0: 'sport-selection', 1: 'modality-level', 2: 'goal', 3: 'schedule', 4: 'equipment', 5: 'summary', 6: 'choice',
};

<View style={styles.hero}>
  <View style={styles.heroImagePlaceholder}>
    <Text style={styles.heroImageText}>{HERO_ART[step] ?? 'step'}</Text>
  </View>
  <Text style={styles.title}>{STEP_TITLES[step]}</Text>
</View>
```

With styles: `hero: { alignItems: 'center', marginBottom: 20 }`, `heroImagePlaceholder: { width: '100%', height: 140, borderRadius: radius.lg, backgroundColor: `${colors.primary}10`, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }`, `heroImageText: { ...typography.label, color: colors.textSecondary }`. (These are static labeled placeholders over a `colors.primary`‑tinted block; real assets land in Phase C.)

- [ ] Migrate the Onboarding styles/colors from `darkTheme.colors` to `colors` and swap the Volt-filled text `color: '#FFF'` → `color: colors.base` (in `activeDotText`, `checkText`, `nextText`).

Step D — `SignInScreen.tsx`: POST full onboarding data.

- [ ] Read `route.params?.onboardingData` in the sign-up branch and send the real payload:

```tsx
const onboarding = route.params?.onboardingData;
// ...
await setActiveSignUp({ session: result.createdSessionId });
try {
  await apiClient.post('/athlete/onboard', {
    sports: onboarding?.sports ?? [],
    modality: onboarding?.modality ?? '',
    experienceLevel: onboarding?.experienceLevel ?? '',
    goal: onboarding?.goal ?? '',
    sessionsPerWeek: onboarding?.sessionsPerWeek ?? 0,
    sessionDuration: onboarding?.sessionDuration ?? 0,
    equipment: onboarding?.equipment ?? '',
    athleteRoutineAccepted: onboarding?.athleteRoutineAccepted ?? true,
  });
} catch (err) {
  console.error('[Auth] onboard failed on sign-up:', err);
}
```

- [ ] Run: `cd apps/mobile && npx tsc --noEmit` — EXPECT PASS
- [ ] Run: `cd apps/mobile && npx jest src/shared/components/ui/__tests__/GlassDock.test.tsx` — EXPECT PASS
- [ ] Commit: `feat(mobile): dissolve AuthFlow, gate session in Splash, persist onboarding to /athlete/onboard`

## Task 4 — TodayScreen migrate (dashboard) to tokens + UI kit

**Files:**
- Rewrite: `apps/mobile/src/features/training/presentation/screens/TodayScreen.tsx`

- [ ] Replace `import { darkTheme } from '../../../../shared/theme';` → `import { colors, spacing, typography, radius } from '../../../../shared/theme/tokens';` and `import { EmptyState } from '../../../../shared/components/ui/EmptyState';` + `import { Card } from '../../../../shared/components/ui/Card';` + `import { ProgressBar } from '../../../../shared/components/ui/ProgressBar';` + `import { Badge } from '../../../../shared/components/ui/Badge';`.
- [ ] In JSX, replace every `darkTheme.colors.x` → `colors.x`; swap inline hex semantics:
  - `getScoreColor` returns `colors.success` / `colors.warning` / `colors.error`.
  - `getStatusDotColor` returns `colors.success` / `colors.warning` / `colors.textSecondary`.
  - Replace the hand-rolled `styles.emptyCenter`/`emptyCircle` with `<EmptyState variant="loading" />` for the loading card and `<EmptyState variant="empty" message={`No sessions today`} />` for the empty state; replace the `styles.progressTrack`/`progressFill` pair with `<ProgressBar progress={w.progress / 100} />`.
- [ ] Replace the section-header count badge and status pills with `<Badge text={s.status} tone={toneForStatus(s.status)} />`.
- [ ] Migrate every style prop `fontSize`/`fontWeight`/`letterSpacing`/`color` to the corresponding `styles` values rewritten in terms of `colors` + `typography` (e.g. `greeting: { ...typography.display, color: colors.text }`, `eyebrow: { ...typography.label, color: colors.primary }`, `heroCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg }`), so `container: { flex: 1, backgroundColor: colors.base }`, `content: { padding: spacing.lg, paddingBottom: 100 }`.
- [ ] Run: `cd apps/mobile && npx tsc --noEmit` — EXPECT PASS
- [ ] Commit: `refactor(mobile): migrate TodayScreen to tokens and UI kit`

## Task 5 — HistoryScreen migrate (Plan tab)

**Files:**
- Rewrite: `apps/mobile/src/features/training/presentation/screens/HistoryScreen.tsx`

- [ ] Swap the import to `tokens` (`colors, spacing, typography, radius`) and add `EmptyState` / `ProgressBar`.
- [ ] Replace `darkTheme.colors.x` → `colors.x`; `dotColor`/`statusColor` use `colors.success` / `colors.warning`; the `checkInner` dot color `#FFFFFF` → `colors.base`.
- [ ] Migrate segment pills: `pillActive: { backgroundColor: `${colors.primary}1A`, borderColor: `${colors.primary}33` }`, `pillInactive: { borderColor: colors.border }`, `pillTextActive: { color: colors.primary }`, `pillTextInactive: { color: colors.textSecondary }`.
- [ ] Replace the hand-built progress rows with `<ProgressBar progress={completed ? 1 : w.progress / 100} />`; replace loading/empty with `<EmptyState variant="loading" message="Loading workouts..." />` / `<EmptyState variant="empty" />`.
- [ ] Migrate container to `colors.base`, cards to `colors.surface`/`colors.border`, eyebrow/typography to `typography.*`.
- [ ] Run: `cd apps/mobile && npx tsc --noEmit` — EXPECT PASS
- [ ] Commit: `refactor(mobile): migrate HistoryScreen to tokens and UI kit`

## Task 6 — EventsScreen migrate (Eventos tab)

**Files:**
- Rewrite: `apps/mobile/src/features/events/presentation/screens/EventsScreen.tsx`

- [ ] Replace the `DrawerNavigationProp` import with `import type { NativeStackNavigationProp } from '@react-navigation/native-stack';` and the `AthleteDrawerParamList` block with the parent stack nav type used by the Events tab (use `useNavigation` from `@react-navigation/native` untyped for the tab to keep it simple; drop `navigation.openDrawer()` and the `HamburgerButton` entirely).
- [ ] Replace the header: remove the `HamburgerButton` and render `ScreenHeader`:

```tsx
<ScreenHeader title="Proximos Eventos" subtitle={undefined} />
```

importing `ScreenHeader` from the UI kit. Keep the `eyebrow` → `ScreenHeader` replacement and delete the `headerRow`/`hamburger*` styles.
- [ ] Swap `import { darkTheme }` → `tokens` (`colors, spacing, typography, radius`). Replace `getStatusColor` with `colors.success`/`colors.warning`/`colors.error`/`colors.textSecondary`. Replace `typeDot`/`cardAccent` colors with `colors.primary`; `card`/`surface` → `colors.surface`; `border` → `colors.border`.
- [ ] Replace loading/empty states with `<EmptyState variant="loading" message="Cargando eventos..." />` and `<EmptyState variant="empty" message="No hay eventos" />`; status pills → `<Badge text={ev.status} tone={tone} />`.
- [ ] Migrate container to `colors.base`, content padding to `spacing.lg`, eyebrow to `typography.label`.
- [ ] Run: `cd apps/mobile && npx tsc --noEmit` — EXPECT PASS
- [ ] Commit: `refactor(mobile): migrate EventsScreen to tokens and UI kit`

## Task 7 — Store + Membership screens → pushed stack screens (behind Perfil) + token migration

**Files:**
- Rewrite: `apps/mobile/src/features/store/presentation/screens/StoreScreen.tsx`
- Rewrite: `apps/mobile/src/features/membership/presentation/screens/MembershipScreen.tsx`
- Rewrite: `apps/mobile/src/features/membership/presentation/MembershipGate.tsx`
- Rewrite: `apps/mobile/src/features/membership/presentation/PendingApprovalScreen.tsx`

StoreScreen — [ ] replace the `DrawerNavigationProp`/`openDrawer` with a `NativeStackNavigationProp<RootStackParamList, 'Store'>` and a `goBack` header (`ScreenHeader title="Store" onBack={() => navigation.goBack()}`); remove `HamburgerButton`/`headerRow`/`hamburger*`. Migrate colors to `tokens`: `#151515` (`imageArea`) → `colors.base`; `rgba(255,140,61,0.15)` (imagePlaceholder) → `${colors.primary}15`; `rgba(255,140,61,0.25)` (border) → `${colors.primary}30`; `addBtn` bg `rgba(255,140,61,0.15)` → `${colors.primary}15`; `addBtn` border `rgba(255,140,61,0.30)` → `${colors.primary}30`; `addBtnText`/`priceText` → `colors.primary`. Swap loading/empty to `EmptyState`. Replace the purchase `Alert`-based add-btn with a `PrimaryButton` styled "Agregar" where not pending/sold out (keep `ActivityIndicator` pending state).

MembershipScreen — [ ] swap `DrawerNavigationProp` → `NativeStackNavigationProp<RootStackParamList, 'Membership'>`; replace the hamburger header with `<ScreenHeader title="Tu Plan" onBack={() => navigation.goBack()} />`; delete `headerRow`/`hamburger*`. Migrate colors to `tokens` (`getStatusColor` → `colors.*`); `payBtn`/`heroCard` use `colors.primary`/`colors.surface`/`colors.border`; `payBtnText: { ...typography.bodyStrong, color: colors.base }` (dark text on Volt). Replace the manual `payBtn` with `<PrimaryButton label={isPayable ? 'Pay Now' : ...} onPress={handlePay} disabled={!isPayable} />`. `handlePay` keeps the existing Paddle redirect placeholder (Phase C wires Polar). Loading/empty stay card-based.

MembershipGate — [ ] migrate `import { darkTheme }` → `tokens`; wrap the `PaymentScreen` branch unchanged; `centered` → `colors.base`, `text` → `colors.textSecondary`; `ActivityIndicator color={colors.primary}`.

PendingApprovalScreen — [ ] token migration only (`colors`/`typography`), no wiring (orphaned). Replace `backgroundColor: ${darkTheme.colors.primary}15` → `${colors.primary}15` etc.; emoji icons stay.

- [ ] Run: `cd apps/mobile && npx tsc --noEmit` — EXPECT PASS (Route names `Membership`/`Store` now exist in `RootStackParamList` per Task 2/3)
- [ ] Commit: `refactor(mobile): turn Store and Membership into pushed screens and migrate to tokens`

## Task 8 — ProfileScreen migrate + host Membership/Store entry cards

**Files:**
- Rewrite: `apps/mobile/src/features/auth/presentation/screens/ProfileScreen.tsx`

- [ ] Replace `import { darkTheme }` → `tokens` (`colors, spacing, typography, radius`) + UI kit (`Card`, `Input`, `PrimaryButton`, `Badge`).
- [ ] Replace `#2C2C2E` (input/readOnly/pill/dayChip backgrounds) → `colors.surfaceRaised`; `#FFF` text on Volt surfaces (`avatarLargeText`, `saveButtonText`, `pillTextSelected`, `pillCheck`, `dayChipTextSelected`) → `colors.base` (dark text on Volt); `signOutText` `#FFF` on destructive → `colors.text`; `ActivityIndicator color="#FFF"` → `color={colors.base}`.
- [ ] Add two prominent entry cards at the top of the scroll (below the hero) that push to Membership/Store:

```tsx
const navigation = useNavigation<any>();
const openMembership = () => navigation.getParent()?.navigate('Membership');
const openStore = () => navigation.getParent()?.navigate('Store');

{/* Entry cards */}
<Card style={styles.entryCard}>
  <MembershipIcon size={24} color={colors.primary} />
  <View style={styles.entryText}>
    <Text style={styles.entryTitle}>Membership</Text>
    <Text style={styles.entrySub}>Manage your plan, payments and status</Text>
  </View>
  <Pressable accessibilityRole="button" accessibilityLabel="Open membership" onPress={openMembership} style={styles.entryCta}>
    <Text style={styles.entryCtaText}>Open</Text>
  </Pressable>
</Card>
<Card style={styles.entryCard}>
  <StoreIcon size={24} color={colors.primary} />
  <View style={styles.entryText}>
    <Text style={styles.entryTitle}>Store</Text>
    <Text style={styles.entrySub}>Browse coach-curated gear</Text>
  </View>
  <Pressable accessibilityRole="button" accessibilityLabel="Open store" onPress={openStore} style={styles.entryCta}>
    <Text style={styles.entryCtaText}>Open</Text>
  </Pressable>
</Card>
```

(import `MembershipIcon`, `StoreIcon` from the icons module.) Add styles: `entryCard: { flexDirection: 'row', alignItems: 'center', gap: 12 }`, `entryText: { flex: 1, gap: 2 }`, `entryTitle: { ...typography.bodyStrong, color: colors.text }`, `entrySub: { ...typography.caption, color: colors.textSecondary }`, `entryCta: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: `${colors.primary}22` }`, `entryCtaText: { ...typography.label, color: colors.primary }`.
- [ ] Convert the four content `card`s to `<Card style={styles.card}>`; replace `styles.input` with `<Input ... />`; replace the three `saveButton`/`signOutButton` with `<PrimaryButton />` (save: Volt; signout: keep a `Card` + `<PrimaryButton label="Sign Out" onPress={handleSignOut} />` or a red-styled button via a `Card` wrapper). Keep the `/athlete/profile` logic unchanged.
- [ ] Migrate all remaining style values to `colors`/`typography`/`radius`/`spacing`; container → `colors.base`.
- [ ] Run: `cd apps/mobile && npx tsc --noEmit` — EXPECT PASS
- [ ] Commit: `refactor(mobile): migrate ProfileScreen, add Membership/Store entry cards`

## Task 9 — Entry screens restyle (Splash/Welcome/SignIn/Onboarding/InviteAccept) to tokens + kit

**Files:**
- Rewrite: `apps/mobile/src/features/auth/presentation/screens/WelcomeScreen.tsx`
- Rewrite: `apps/mobile/src/features/auth/presentation/screens/SignInScreen.tsx`
- Rewrite: `apps/mobile/src/features/auth/presentation/screens/InviteAcceptScreen.tsx`
- Rewrite: `apps/mobile/src/features/auth/presentation/screens/CoachScheduleModal.tsx`
- (Splash + Onboarding were restyled in Task 3.)

WelcomeScreen — [ ] swap `darkTheme` → `tokens`; `iconCircle`/`cardIcon` `backgroundColor: ${darkTheme.colors.primary}15` → `${colors.primary}15` + border `${colors.primary}30`; `cardArrow`/subtitle etc. → `colors.primary`/`colors.textSecondary`; `title`/`cardTitle` → `colors.text`; container → `colors.base`. Replace the two chooser `Pressable` cards with `Card` + `PrimaryButton`-styled CTAs. (Emojis stay.)

SignInScreen — [ ] `darkTheme` → `tokens`; `input: { backgroundColor: colors.surfaceRaised, borderRadius: radius.md, ... }`; `buttonText: { ...typography.bodyStrong, color: colors.base }` (Volt-filled); `brand` → `colors.primary`; `switchText` → `colors.primary`; container `colors.base`; keep the validation + Clerk logic (incl. the Task 3 onboarding POST) unchanged.

InviteAcceptScreen — [ ] `darkTheme` → `tokens`; `brand` → `colors.primary`; `buttonText` `#FFFFFF` → `colors.base`; `successText`/`errorText` → `colors.text`; loading uses `ActivityIndicator color={colors.primary}`; keep the invite logic unchanged.

CoachScheduleModal — [ ] `darkTheme` → `tokens`; `scheduleBtn`/`laterBtn` `backgroundColor: colors.primary`; `scheduleBtnText`/`laterBtnText` `#FFF` → `colors.base`; keep logic.

- [ ] Run: `cd apps/mobile && npx tsc --noEmit` — EXPECT PASS
- [ ] Commit: `refactor(mobile): restyle entry screens to tokens and UI kit`

## Task 10 — Hide Nutrition / Recovery from navigation (code untouched)

**Files (no edit to the feature screens):**
- Verify: `apps/mobile/src/navigation/AthleteTabs.tsx` (already the 4-tab bar — Nutrition/Recovery absent)

- [ ] Confirm `NutritionScreen` / `RecoveryScreen` are no longer imported anywhere under `src/navigation/`:

```bash
grep -rn "NutritionScreen\|RecoveryScreen" apps/mobile/src/navigation || echo "none"
```

- [ ] Confirm both imports were only in the old `AthleteTabs` (5-tab) and the deleted `AthleteDrawer`. If any lingering reference remains, remove the `Tab.Screen`/`Drawer.Screen` lines only; do NOT touch `NutritionScreen.tsx`/`RecoveryScreen.tsx`.
- [ ] Run: `cd apps/mobile && npx tsc --noEmit` — EXPECT PASS
- [ ] Commit: `chore(mobile): hide nutrition and recovery screens from navigation`

## Task 11 — Final verification

**Files:**
- Delete: `apps/mobile/src/shared/theme/designTokens.ts` (0 importers confirmed)

- [ ] Delete the dead shim: `rm apps/mobile/src/shared/theme/designTokens.ts`
- [ ] Run the full suite: `cd apps/mobile && npm test` — EXPECT PASS across all `__tests__` (UI kit + GlassDock + theme).
- [ ] Run typecheck: `cd apps/mobile && npx tsc --noEmit` — EXPECT PASS.
- [ ] Confirm zero inline hex / brand-orange remnants outside `tokens.ts` and the `Badge` alpha map:

```bash
grep -rnE "#[0-9a-fA-F]{3,8}|rgba\(255,140,61" apps/mobile/src --include=*.tsx --include=*.ts \
  | grep -v "src/shared/theme/tokens.ts" || echo "clean"
```

EXPECT `clean` (no output). `Badge.tsx` uses `colors.x` prefixed with alpha (`${colors.success}22`), NOT raw hex — so it is not flagged.

- [ ] Confirm MembershipGate wraps the tab navigator:

```bash
grep -n "MembershipGate" apps/mobile/src/navigation/Navigation.tsx
```

EXPECT `MembershipGate` wraps `<AthleteTabs />` inside `AthleteTabsWithGate`.

```bash
grep -n "AthleteDrawer" apps/mobile/src/navigation/Navigation.tsx || echo "drawer removed"
```

EXPECT `drawer removed`.

- [ ] Confirm Nutrition/Recovery absent from nav (see Task 10 grep) and that `AuthFlowScreen`/`AuthFlow` are gone:

```bash
grep -rn "AuthFlow" apps/mobile/src || echo "AuthFlow removed"
```

EXPECT `AuthFlow removed`.

- [ ] Commit: `chore(mobile): drop unused designTokens shim and verify Phase B restyle`

---

## Post-conditions

- All screens under `features/*/presentation/screens` import from `tokens` (or the UI kit); none import `darkTheme`/`designTokens` or leave raw `#hex`/`rgba(255,140,61`.
- Signed-in users land on `AthleteTabs` (4 tabs: Hoy/Plan/Eventos/Perfil) with the floating `GlassDock` bar; `MembershipGate` wraps it.
- `Membership` and `Store` are pushed stack screens openable from Perfil cards.
- Entry flow: `Splash` (session gate) → `Welcome` (I'm new / I already train) → `Onboarding` (hero placeholders + Skip + `/athlete/onboard` POST on sign-up) / `Auth`.
- Nutrition/Recovery files are untouched but unreachable from navigation.
- `npm test`, `npx tsc --noEmit`, and the hex grep all pass.
