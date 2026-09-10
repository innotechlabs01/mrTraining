# MR Training Mobile Fitness Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign MR Training mobile app with Sleek Stride reference — bento dashboard, activity rings, AI form analysis, video analytics, gamification.

**Architecture:** Feature-first Clean Architecture. New components in `shared/components/`. New features in `src/features/`. API contracts defined upfront, frontend-first with mock data.

**Tech Stack:** Expo 54, RN 0.81, TypeScript strict, React Navigation 7, TanStack Query 5, Zustand 5, Reanimated 3, FlashList, Clerk Expo, react-native-svg, react-native-vision-camera.

**Spec:** `docs/superpowers/specs/2026-09-09-mobile-fitness-redesign-design.md`

## Global Constraints

- TypeScript strict mode. No `any`.
- Dark-first. Single accent: Volt `#C8FF00`. 90/10 rule.
- Touch targets ≥ 44pt.
- One primary action per screen.
- Skeleton + pull-to-refresh + empty/error states always.
- No emojis as icons (use `shared/components/icons/` SVG).
- ≤ 250 lines per file.
- `src/shared/theme/tokens.ts` is canonical source.

---

## Phase 1: UI Foundation (Tasks 1-8)

### Task 1: Update Design Tokens to Volt

**Files:**
- Modify: `src/shared/theme/tokens.ts`

**Interfaces:**
- Consumes: Brand §4 color spec
- Produces: Updated `colors` object with Volt primary

- [ ] **Step 1: Read current tokens**

```bash
cat src/shared/theme/tokens.ts | head -35
```

- [ ] **Step 2: Update colors object**

Replace primary colors:
```typescript
export const colors = {
  base: '#0A0B0D',
  surface: '#0F0F0F',
  surfaceRaised: '#141416',
  border: '#1A1A1C',
  primary: '#C8FF00',        // Volt — was #16E37A
  primaryPressed: '#A8D900', // was #12C66A
  // ... rest unchanged
};
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/shared/theme/tokens.ts
git commit -m "feat: update primary color to Volt #C8FF00"
```

---

### Task 2: Create BentoGrid Component

**Files:**
- Create: `src/shared/components/ui/BentoGrid.tsx`
- Create: `src/shared/components/ui/__tests__/BentoGrid.test.tsx`

**Interfaces:**
- Consumes: `tokens.ts` (spacing, radius, colors)
- Produces: `<BentoGrid columns={2} gap={12}>{tiles}</BentoGrid>`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/BentoGrid.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { BentoGrid } from '../BentoGrid';

test('renders children in grid layout', () => {
  const { getByTestId } = render(
    <BentoGrid columns={2} gap={12}>
      <View testID="tile-1" />
      <View testID="tile-2" />
    </BentoGrid>
  );
  expect(getByTestId('tile-1')).toBeTruthy();
  expect(getByTestId('tile-2')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npm test -- BentoGrid`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write minimal implementation**

```typescript
// BentoGrid.tsx
import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';

type Props = {
  columns?: number;
  gap?: number;
  children: React.ReactNode;
  style?: ViewStyle;
};

export function BentoGrid({ columns = 2, gap = 12, children, style }: Props) {
  return (
    <View style={[styles.container, { gap }, style]}>
      {React.Children.map(children, (child) => (
        <View style={[styles.tile, { flex: 1 / columns }]}>
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tile: {
    minWidth: 0,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npm test -- BentoGrid`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/ui/BentoGrid.tsx src/shared/components/ui/__tests__/BentoGrid.test.tsx
git commit -m "feat: add BentoGrid component for dashboard layout"
```

---

### Task 3: Create ActivityRings Component

**Files:**
- Create: `src/shared/components/fitness/ActivityRings.tsx`
- Create: `src/shared/components/fitness/__tests__/ActivityRings.test.tsx`

**Interfaces:**
- Consumes: `tokens.ts` (colors)
- Produces: `<ActivityRings move={0.7} exercise={0.5} recovery={0.9} size={200} />`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/ActivityRings.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { ActivityRings } from '../ActivityRings';

test('renders three rings', () => {
  const { getByTestId } = render(
    <ActivityRings move={0.7} exercise={0.5} recovery={0.9} size={200} />
  );
  expect(getByTestId('activity-rings')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npm test -- ActivityRings`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// ActivityRings.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, withTiming } from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  move: number;      // 0-1
  exercise: number;  // 0-1
  recovery: number;  // 0-1
  size?: number;
};

const MOVE_COLOR = '#C8FF00';    // Volt
const EXERCISE_COLOR = '#34D399'; // Success
const RECOVERY_COLOR = '#3B9EFF'; // Info

export function ActivityRings({ move, exercise, recovery, size = 200 }: Props) {
  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth * 2) / 2;

  const rings = [
    { progress: move, color: MOVE_COLOR, r: radius },
    { progress: exercise, color: EXERCISE_COLOR, r: radius - strokeWidth * 2.5 },
    { progress: recovery, color: RECOVERY_COLOR, r: radius - strokeWidth * 5 },
  ];

  return (
    <View testID="activity-rings" style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {rings.map(({ progress, color, r }, i) => (
          <React.Fragment key={i}>
            {/* Background circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={`${color}20`}
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress circle */}
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={2 * Math.PI * r}
              strokeDashoffset={2 * Math.PI * r * (1 - progress)}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npm test -- ActivityRings`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/fitness/ActivityRings.tsx src/shared/components/fitness/__tests__/ActivityRings.test.tsx
git commit -m "feat: add ActivityRings SVG component"
```

---

### Task 4: Create RestTimer Component

**Files:**
- Create: `src/shared/components/fitness/RestTimer.tsx`
- Create: `src/shared/components/fitness/__tests__/RestTimer.test.tsx`

**Interfaces:**
- Consumes: `tokens.ts`, `react-native-reanimated`
- Produces: `<RestTimer duration={90} onComplete={fn} />`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/RestTimer.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { RestTimer } from '../RestTimer';

test('renders countdown display', () => {
  const { getByText } = render(
    <RestTimer duration={90} onComplete={() => {}} />
  );
  expect(getByText('1:30')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npm test -- RestTimer`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// RestTimer.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, withTiming } from 'react-native-reanimated';
import { colors, fontFamilies } from '../../theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  duration: number; // seconds
  onComplete: () => void;
  size?: number;
};

export function RestTimer({ duration, onComplete, size = 160 }: Props) {
  const [remaining, setRemaining] = useState(duration);
  const progress = remaining / duration;

  useEffect(() => {
    if (remaining <= 0) {
      onComplete();
      return;
    }
    const timer = setTimeout(() => setRemaining(remaining - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, onComplete]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth * 2) / 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`${colors.primary}20`}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={2 * Math.PI * radius}
          strokeDashoffset={2 * Math.PI * radius * (1 - progress)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={styles.time}>{display}</Text>
      <Text style={styles.label}>REST</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: {
    position: 'absolute',
    fontFamily: fontFamilies.displayBlack,
    fontSize: 44,
    color: colors.text,
  },
  label: {
    position: 'absolute',
    bottom: '30%',
    fontFamily: fontFamilies.overline,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 2,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npm test -- RestTimer`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/fitness/RestTimer.tsx src/shared/components/fitness/__tests__/RestTimer.test.tsx
git commit -m "feat: add RestTimer circular countdown component"
```

---

### Task 5: Create StatCard Component

**Files:**
- Create: `src/shared/components/ui/StatCard.tsx`
- Create: `src/shared/components/ui/__tests__/StatCard.test.tsx`

**Interfaces:**
- Consumes: `tokens.ts`
- Produces: `<StatCard value="72" label="BPM" icon={<HeartIcon />} />`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/StatCard.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { StatCard } from '../StatCard';

test('renders value and label', () => {
  const { getByText } = render(
    <StatCard value="72" label="BPM" />
  );
  expect(getByText('72')).toBeTruthy();
  expect(getByText('BPM')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npm test -- StatCard`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// StatCard.tsx
import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { colors, fontFamilies, radius, spacing } from '../../theme/tokens';

type Props = {
  value: string;
  label: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
};

export function StatCard({ value, label, icon, style }: Props) {
  return (
    <View style={[styles.card, style]}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  icon: {
    marginBottom: spacing.xs,
  },
  value: {
    fontFamily: fontFamilies.displayBlack,
    fontSize: 32,
    color: colors.text,
  },
  label: {
    fontFamily: fontFamilies.overline,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npm test -- StatCard`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/ui/StatCard.tsx src/shared/components/ui/__tests__/StatCard.test.tsx
git commit -m "feat: add StatCard component for dashboard tiles"
```

---

### Task 6: Create WorkoutCard Component

**Files:**
- Create: `src/shared/components/fitness/WorkoutCard.tsx`
- Create: `src/shared/components/fitness/__tests__/WorkoutCard.test.tsx`

**Interfaces:**
- Consumes: `tokens.ts`
- Produces: `<WorkoutCard title="Upper Body" duration="45 min" difficulty="Intermediate" onPress={fn} />`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/WorkoutCard.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { WorkoutCard } from '../WorkoutCard';

test('renders title and metadata', () => {
  const { getByText } = render(
    <WorkoutCard title="Upper Body" duration="45 min" difficulty="Intermediate" onPress={() => {}} />
  );
  expect(getByText('Upper Body')).toBeTruthy();
  expect(getByText('45 min')).toBeTruthy();
  expect(getByText('Intermediate')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npm test -- WorkoutCard`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// WorkoutCard.tsx
import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { colors, fontFamilies, radius, spacing } from '../../theme/tokens';

type Props = {
  title: string;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  onPress: () => void;
};

const DIFFICULTY_COLOR: Record<string, string> = {
  Beginner: colors.success,
  Intermediate: colors.warning,
  Advanced: colors.error,
};

export function WorkoutCard({ title, duration, difficulty, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={[styles.badge, { backgroundColor: DIFFICULTY_COLOR[difficulty] }]}>
          <Text style={styles.badgeText}>{difficulty}</Text>
        </View>
      </View>
      <Text style={styles.duration}>{duration}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  badgeText: {
    fontFamily: fontFamilies.overline,
    fontSize: 10,
    color: colors.base,
  },
  duration: {
    fontFamily: fontFamilies.bodySmall,
    color: colors.textSecondary,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npm test -- WorkoutCard`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/fitness/WorkoutCard.tsx src/shared/components/fitness/__tests__/WorkoutCard.test.tsx
git commit -m "feat: add WorkoutCard component with difficulty badge"
```

---

### Task 7: Create StreakBadge Component

**Files:**
- Create: `src/shared/components/gamification/StreakBadge.tsx`
- Create: `src/shared/components/gamification/__tests__/StreakBadge.test.tsx`

**Interfaces:**
- Consumes: `tokens.ts`
- Produces: `<StreakBadge count={7} />`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/StreakBadge.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { StreakBadge } from '../StreakBadge';

test('renders streak count', () => {
  const { getByText } = render(<StreakBadge count={7} />);
  expect(getByText('7')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npm test -- StreakBadge`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// StreakBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontFamilies, radius, spacing } from '../../theme/tokens';

type Props = {
  count: number;
};

export function StreakBadge({ count }: Props) {
  return (
    <View style={styles.badge}>
      <Text style={styles.fire}>🔥</Text>
      <Text style={styles.count}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  fire: {
    fontSize: 14,
  },
  count: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 14,
    color: colors.primary,
  },
});
```

**Note:** Fire emoji used as icon content per gamification requirement. Alternative: SVG flame icon in `shared/components/icons/`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npm test -- StreakBadge`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/gamification/StreakBadge.tsx src/shared/components/gamification/__tests__/StreakBadge.test.tsx
git commit -m "feat: add StreakBadge component"
```

---

### Task 8: Create AchievementBadge Component

**Files:**
- Create: `src/shared/components/gamification/AchievementBadge.tsx`
- Create: `src/shared/components/gamification/__tests__/AchievementBadge.test.tsx`

**Interfaces:**
- Consumes: `tokens.ts`
- Produces: `<AchievementBadge icon="🏋️" title="First Workout" unlocked={true} />`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/AchievementBadge.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { AchievementBadge } from '../AchievementBadge';

test('renders title when unlocked', () => {
  const { getByText } = render(
    <AchievementBadge icon="🏋️" title="First Workout" unlocked={true} />
  );
  expect(getByText('First Workout')).toBeTruthy();
});

test('renders locked state', () => {
  const { getByText } = render(
    <AchievementBadge icon="🏋️" title="First Workout" unlocked={false} />
  );
  expect(getByText('???')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npm test -- AchievementBadge`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// AchievementBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontFamilies, radius, spacing } from '../../theme/tokens';

type Props = {
  icon: string;
  title: string;
  unlocked: boolean;
};

export function AchievementBadge({ icon, title, unlocked }: Props) {
  return (
    <View style={[styles.badge, !unlocked && styles.locked]}>
      <Text style={styles.icon}>{unlocked ? icon : '🔒'}</Text>
      <Text style={[styles.title, !unlocked && styles.titleLocked]}>
        {unlocked ? title : '???'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    padding: spacing.md,
    width: 100,
    gap: spacing.xs,
  },
  locked: {
    opacity: 0.5,
  },
  icon: {
    fontSize: 24,
  },
  title: {
    fontFamily: fontFamilies.bodySmall,
    fontSize: 11,
    color: colors.text,
    textAlign: 'center',
  },
  titleLocked: {
    color: colors.textSecondary,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npm test -- AchievementBadge`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/gamification/AchievementBadge.tsx src/shared/components/gamification/__tests__/AchievementBadge.test.tsx
git commit -m "feat: add AchievementBadge component"
```

---

## Phase 2: Dashboard Redesign (Tasks 9-12)

### Task 9: Redesign TodayScreen with Bento Layout

**Files:**
- Modify: `src/features/training/presentation/screens/TodayScreen.tsx`

**Interfaces:**
- Consumes: BentoGrid, ActivityRings, StatCard (Tasks 2-5)
- Produces: Redesigned dashboard

- [ ] **Step 1: Import new components**

```typescript
import { BentoGrid } from '../../../../shared/components/ui/BentoGrid';
import { ActivityRings } from '../../../../shared/components/fitness/ActivityRings';
import { StatCard } from '../../../../shared/components/ui/StatCard';
```

- [ ] **Step 2: Replace content section with bento layout**

Replace existing `ScrollView` content with:
```tsx
<BentoGrid columns={2} gap={12}>
  <ActivityRings
    move={readiness.move ?? 0}
    exercise={readiness.exercise ?? 0}
    recovery={readiness.score ?? 0}
    size={180}
  />
  <StatCard value={steps.toString()} label="STEPS" icon={<StepIcon />} />
  <StatCard value={heartRate.toString()} label="BPM" icon={<HeartIcon />} />
  <StatCard value={calories.toString()} label="CALORIES" icon={<FireIcon />} />
</BentoGrid>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/training/presentation/screens/TodayScreen.tsx
git commit -m "feat: redesign TodayScreen with bento grid layout"
```

---

### Task 10: Add HealthKit/HealthConnect Integration

**Files:**
- Create: `src/infrastructure/health/index.ts`
- Modify: `src/features/training/presentation/screens/TodayScreen.tsx`

**Interfaces:**
- Consumes: `expo-health`, `react-native-health`
- Produces: `useHealthData()` hook returning steps, heartRate, calories

- [ ] **Step 1: Install dependencies**

Run: `cd apps/mobile && expo install expo-health`
Expected: Success

- [ ] **Step 2: Create health service**

```typescript
// src/infrastructure/health/index.ts
import * as Health from 'expo-health';

export async function getTodayHealthData() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [steps, heartRate, calories] = await Promise.all([
    Health.getStepCount(startOfDay, now),
    Health.getLatestHeartRate(),
    Health.getCaloriesBurned(startOfDay, now),
  ]);

  return { steps, heartRate, calories };
}
```

- [ ] **Step 3: Create useHealthData hook**

```typescript
// src/features/training/hooks/useHealthData.ts
import { useQuery } from '@tanstack/react-query';
import { getTodayHealthData } from '../../../infrastructure/health';

export function useHealthData() {
  return useQuery({
    queryKey: ['health-data'],
    queryFn: getTodayHealthData,
    staleTime: 60_000,
  });
}
```

- [ ] **Step 4: Integrate into TodayScreen**

Add `useHealthData()` call and pass to StatCard components.

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/health/index.ts src/features/training/hooks/useHealthData.ts
git commit -m "feat: add HealthKit integration for dashboard metrics"
```

---

### Task 11: Update GlassDock Styling

**Files:**
- Modify: `src/shared/components/ui/GlassDock.tsx`

**Interfaces:**
- Consumes: `tokens.ts` (updated Volt colors)
- Produces: Updated tab bar with Volt active state

- [ ] **Step 1: Update tab bar styles**

```typescript
const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10,11,13,0.94)', // Updated base
    borderTopColor: 'rgba(200,255,0,0.06)', // Volt tint
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  // ... rest unchanged
});
```

- [ ] **Step 2: Verify visual change**

Run app, check tab bar background has subtle Volt tint.

- [ ] **Step 3: Commit**

```bash
git add src/shared/components/ui/GlassDock.tsx
git commit -m "style: update GlassDock with Volt accent tint"
```

---

### Task 12: Add Pull-to-Refresh to Dashboard

**Files:**
- Modify: `src/features/training/presentation/screens/TodayScreen.tsx`

**Interfaces:**
- Consumes: Existing `refetch` from React Query
- Produces: Pull-to-refresh on all dashboard sections

- [ ] **Step 1: Verify RefreshControl exists**

Check if `RefreshControl` already implemented. If yes, skip.

- [ ] **Step 2: If missing, add RefreshControl**

```tsx
<ScrollView
  contentContainerStyle={styles.content}
  refreshControl={
    <RefreshControl
      refreshing={isRefetching}
      onRefresh={refetch}
      tintColor={colors.primary}
    />
  }
>
```

- [ ] **Step 3: Commit (if changed)**

```bash
git add src/features/training/presentation/screens/TodayScreen.tsx
git commit -m "feat: add pull-to-refresh to dashboard"
```

---

## Phase 3: Workout Experience (Tasks 13-18)

### Task 13: Create FormAnalyzer Component

**Files:**
- Create: `src/shared/components/fitness/FormAnalyzer.tsx`
- Create: `src/shared/components/fitness/__tests__/FormAnalyzer.test.tsx`

**Interfaces:**
- Consumes: `react-native-vision-camera`, `react-native-worklets`
- Produces: `<FormAnalyzer exerciseId="bench-press" onRepCount={fn} />`

- [ ] **Step 1: Install dependencies**

Run: `cd apps/mobile && expo install react-native-vision-camera react-native-worklets`
Expected: Success

- [ ] **Step 2: Write the failing test**

```typescript
// __tests__/FormAnalyzer.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { FormAnalyzer } from '../FormAnalyzer';

test('renders camera view', () => {
  const { getByTestId } = render(
    <FormAnalyzer exerciseId="bench-press" onRepCount={() => {}} />
  );
  expect(getByTestId('form-analyzer')).toBeTruthy();
});
```

- [ ] **Step 3: Write minimal implementation**

```typescript
// FormAnalyzer.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { colors, radius, spacing } from '../../theme/tokens';

type Props = {
  exerciseId: string;
  onRepCount: (valid: boolean, score: number) => void;
};

export function FormAnalyzer({ exerciseId, onRepCount }: Props) {
  const devices = useCameraDevices();
  const device = devices.back;

  if (!device) return null;

  return (
    <View testID="form-analyzer" style={styles.container}>
      <Camera
        style={styles.camera}
        device={device}
        isActive={true}
        audio={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    height: 200,
  },
  camera: {
    flex: 1,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npm test -- FormAnalyzer`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/fitness/FormAnalyzer.tsx src/shared/components/fitness/__tests__/FormAnalyzer.test.tsx
git commit -m "feat: add FormAnalyzer camera component skeleton"
```

---

### Task 14: Redesign WorkoutExecutionScreen

**Files:**
- Modify: `src/features/training/presentation/screens/WorkoutExecutionScreen.tsx`

**Interfaces:**
- Consumes: RestTimer, FormAnalyzer (Tasks 4, 13)
- Produces: Timer-centric workout execution UI

- [ ] **Step 1: Import new components**

```typescript
import { RestTimer } from '../../../../shared/components/fitness/RestTimer';
import { FormAnalyzer } from '../../../../shared/components/fitness/FormAnalyzer';
```

- [ ] **Step 2: Restructure layout**

Replace existing layout with timer-centric design:
```tsx
<View style={styles.container}>
  {/* Exercise Header */}
  <Text style={styles.exerciseName}>{currentExercise.name}</Text>
  <Text style={styles.setInfo}>Set {currentSet}/{totalSets}</Text>

  {/* Camera Feed */}
  <FormAnalyzer
    exerciseId={currentExercise.id}
    onRepCount={handleRepCount}
  />

  {/* Rest Timer */}
  {isResting && (
    <RestTimer
      duration={currentExercise.restSeconds ?? 90}
      onComplete={handleRestComplete}
    />
  )}

  {/* Weight Input */}
  <WeightInput
    value={currentWeight}
    onChange={setCurrentWeight}
  />

  {/* Up Next */}
  <UpNextPreview exercise={nextExercise} />

  {/* Actions */}
  <View style={styles.actions}>
    <Button title="Pause" onPress={handlePause} />
    <Button title="Complete" onPress={handleComplete} />
  </View>
</View>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/training/presentation/screens/WorkoutExecutionScreen.tsx
git commit -m "feat: redesign WorkoutExecutionScreen timer-centric"
```

---

### Task 15: Add Video Analytics Tracking

**Files:**
- Create: `src/infrastructure/api/videoAnalytics.ts`
- Create: `src/shared/components/media/TrackedVideoPlayer.tsx`

**Interfaces:**
- Consumes: `apiClient`, video player
- Produces: Video play/pause tracking

- [ ] **Step 1: Create video analytics service**

```typescript
// src/infrastructure/api/videoAnalytics.ts
import { apiClient } from './client';

export type VideoEvent = {
  videoId: string;
  eventType: 'play' | 'pause' | 'complete' | 'seek';
  position: number;
  duration: number;
};

export async function logVideoEvent(event: VideoEvent) {
  await apiClient.post('/coaching/video-events', event);
}
```

- [ ] **Step 2: Create TrackedVideoPlayer**

```typescript
// src/shared/components/media/TrackedVideoPlayer.tsx
import React, { useRef } from 'react';
import { Video, type AVPlaybackStatus } from 'expo-av';
import { logVideoEvent } from '../../../infrastructure/api/videoAnalytics';

type Props = {
  videoId: string;
  uri: string;
};

export function TrackedVideoPlayer({ videoId, uri }: Props) {
  const videoRef = useRef<Video>(null);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    if (status.didJustFinish) {
      logVideoEvent({
        videoId,
        eventType: 'complete',
        position: status.positionMillis / 1000,
        duration: status.durationMillis / 1000,
      });
    }
  };

  return (
    <Video
      ref={videoRef}
      source={{ uri }}
      style={{ width: '100%', height: 200 }}
      onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/infrastructure/api/videoAnalytics.ts src/shared/components/media/TrackedVideoPlayer.tsx
git commit -m "feat: add video analytics tracking"
```

---

### Task 16: Add Rep Counter with Form Validation

**Files:**
- Modify: `src/features/training/presentation/screens/WorkoutExecutionScreen.tsx`

**Interfaces:**
- Consumes: FormAnalyzer (Task 13)
- Produces: Rep counting with form validation

- [ ] **Step 1: Add rep tracking state**

```typescript
const [repCount, setRepCount] = useState(0);
const [validRepCount, setValidRepCount] = useState(0);
const [formScore, setFormScore] = useState(0);
```

- [ ] **Step 2: Handle form analysis callback**

```typescript
const handleRepCount = (valid: boolean, score: number) => {
  setRepCount(prev => prev + 1);
  if (valid) {
    setValidRepCount(prev => prev + 1);
  }
  setFormScore(score);
};
```

- [ ] **Step 3: Display rep count with form indicator**

```tsx
<View style={styles.repDisplay}>
  <Text style={styles.repCount}>{validRepCount}/{targetReps}</Text>
  <Text style={styles.formLabel}>
    Form: {formScore >= 80 ? '✓ Good' : '✗ Needs Work'}
  </Text>
</View>
```

- [ ] **Step 4: Commit**

```bash
git add src/features/training/presentation/screens/WorkoutExecutionScreen.tsx
git commit -m "feat: add rep counter with form validation"
```

---

### Task 17: Add Weight Input Component

**Files:**
- Create: `src/shared/components/fitness/WeightInput.tsx`
- Create: `src/shared/components/fitness/__tests__/WeightInput.test.tsx`

**Interfaces:**
- Consumes: `tokens.ts`, `expo-haptics`
- Produces: `<WeightInput value={80} onChange={fn} unit="kg" />`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/WeightInput.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WeightInput } from '../WeightInput';

test('renders weight value', () => {
  const { getByText } = render(
    <WeightInput value={80} onChange={() => {}} unit="kg" />
  );
  expect(getByText('80')).toBeTruthy();
  expect(getByText('kg')).toBeTruthy();
});

test('increments on plus press', () => {
  const onChange = jest.fn();
  const { getByText } = render(
    <WeightInput value={80} onChange={onChange} unit="kg" />
  );
  fireEvent.press(getByText('+'));
  expect(onChange).toHaveBeenCalledWith(82.5);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npm test -- WeightInput`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// WeightInput.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fontFamilies, radius, spacing } from '../../theme/tokens';

type Props = {
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  step?: number;
};

export function WeightInput({ value, onChange, unit = 'kg', step = 2.5 }: Props) {
  const handleIncrement = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(value + step);
  };

  const handleDecrement = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(Math.max(0, value - step));
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.button} onPress={handleDecrement}>
        <Text style={styles.buttonText}>-</Text>
      </Pressable>
      <View style={styles.display}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>
      <Pressable style={styles.button} onPress={handleIncrement}>
        <Text style={styles.buttonText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 24,
    color: colors.primary,
  },
  display: {
    alignItems: 'center',
  },
  value: {
    fontFamily: fontFamilies.displayBlack,
    fontSize: 44,
    color: colors.text,
  },
  unit: {
    fontFamily: fontFamilies.overline,
    fontSize: 12,
    color: colors.textSecondary,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npm test -- WeightInput`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/fitness/WeightInput.tsx src/shared/components/fitness/__tests__/WeightInput.test.tsx
git commit -m "feat: add WeightInput component with haptic feedback"
```

---

### Task 18: Add Up-Next Preview

**Files:**
- Modify: `src/features/training/presentation/screens/WorkoutExecutionScreen.tsx`

**Interfaces:**
- Consumes: Exercise list from workout
- Produces: Up-next exercise preview section

- [ ] **Step 1: Get next exercise**

```typescript
const nextExercise = exercises[currentIndex + 1];
```

- [ ] **Step 2: Add preview section**

```tsx
{nextExercise && (
  <View style={styles.upNext}>
    <Text style={styles.upNextLabel}>UP NEXT</Text>
    <Text style={styles.upNextName}>{nextExercise.name}</Text>
    <Text style={styles.upNextInfo}>
      {nextExercise.sets} x {nextExercise.reps}
      {nextExercise.weightKg ? ` @ ${nextExercise.weightKg}kg` : ''}
    </Text>
  </View>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/training/presentation/screens/WorkoutExecutionScreen.tsx
git commit -m "feat: add up-next exercise preview"
```

---

## Phase 4: Social + Gamification (Tasks 19-24)

### Task 19: Create Streak Tracking Service

**Files:**
- Create: `src/features/gamification/streakService.ts`
- Create: `src/features/gamification/hooks/useStreak.ts`

**Interfaces:**
- Consumes: `apiClient`, `MMKV`
- Produces: `useStreak()` returning current streak count

- [ ] **Step 1: Create streak service**

```typescript
// src/features/gamification/streakService.ts
import { apiClient } from '../../infrastructure/api/client';
import { storage } from '../../infrastructure/storage';

const STREAK_KEY = 'mr_training.streak.v1';

export async function getStreak(): Promise<number> {
  try {
    const { data } = await apiClient.get('/coaching/streaks');
    storage.set(STREAK_KEY, data.streak);
    return data.streak;
  } catch {
    return storage.getNumber(STREAK_KEY) ?? 0;
  }
}

export async function incrementStreak(): Promise<number> {
  const { data } = await apiClient.post('/coaching/streaks/increment');
  storage.set(STREAK_KEY, data.streak);
  return data.streak;
}
```

- [ ] **Step 2: Create useStreak hook**

```typescript
// src/features/gamification/hooks/useStreak.ts
import { useQuery } from '@tanstack/react-query';
import { getStreak } from '../streakService';

export function useStreak() {
  return useQuery({
    queryKey: ['streak'],
    queryFn: getStreak,
    staleTime: 300_000,
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/gamification/streakService.ts src/features/gamification/hooks/useStreak.ts
git commit -m "feat: add streak tracking service and hook"
```

---

### Task 20: Create Badge System

**Files:**
- Create: `src/features/gamification/badgeService.ts`
- Create: `src/features/gamification/badges.ts` (badge definitions)

**Interfaces:**
- Consumes: `apiClient`
- Produces: Badge list with unlock status

- [ ] **Step 1: Define badges**

```typescript
// src/features/gamification/badges.ts
export type Badge = {
  id: string;
  icon: string;
  title: string;
  condition: string;
};

export const BADGES: Badge[] = [
  { id: 'first-workout', icon: '🏋️', title: 'First Workout', condition: 'Complete first session' },
  { id: '7-day-streak', icon: '🔥', title: '7-Day Streak', condition: '7 consecutive days' },
  { id: '30-day-streak', icon: '💪', title: '30-Day Streak', condition: '30 consecutive days' },
  { id: '100-sessions', icon: '💯', title: '100 Sessions', condition: 'Complete 100 sessions' },
  { id: 'pr-crusher', icon: '🏆', title: 'PR Crusher', condition: 'Set 5+ personal records' },
  { id: 'form-master', icon: '⭐', title: 'Form Master', condition: '90%+ avg form score' },
  { id: 'early-bird', icon: '🌅', title: 'Early Bird', condition: '5 workouts before 7am' },
  { id: 'weekend-warrior', icon: '⚔️', title: 'Weekend Warrior', condition: '10 weekend workouts' },
];
```

- [ ] **Step 2: Create badge service**

```typescript
// src/features/gamification/badgeService.ts
import { apiClient } from '../../infrastructure/api/client';
import { BADGES } from './badges';

export async function getUnlockedBadges(): Promise<string[]> {
  try {
    const { data } = await apiClient.get('/coaching/badges');
    return data.badgeIds;
  } catch {
    return [];
  }
}

export async function unlockBadge(badgeId: string): Promise<void> {
  await apiClient.post('/coaching/badges', { badgeId });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/gamification/badgeService.ts src/features/gamification/badges.ts
git commit -m "feat: add badge system with definitions and service"
```

---

### Task 21: Create PR Tracking Service

**Files:**
- Create: `src/features/gamification/prService.ts`
- Create: `src/features/gamification/hooks/usePersonalRecords.ts`

**Interfaces:**
- Consumes: `apiClient`
- Produces: PR list and celebration trigger

- [ ] **Step 1: Create PR service**

```typescript
// src/features/gamification/prService.ts
import { apiClient } from '../../infrastructure/api/client';

export type PersonalRecord = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  type: 'max_weight' | 'best_form' | 'max_volume' | 'fastest_time';
  value: number;
  achievedAt: string;
};

export async function getPersonalRecords(): Promise<PersonalRecord[]> {
  const { data } = await apiClient.get('/coaching/personal-records');
  return data.records;
}

export async function checkForNewPR(
  exerciseId: string,
  type: string,
  value: number
): Promise<boolean> {
  const { data } = await apiClient.post('/coaching/personal-records/check', {
    exerciseId,
    type,
    value,
  });
  return data.isNewPR;
}
```

- [ ] **Step 2: Create usePersonalRecords hook**

```typescript
// src/features/gamification/hooks/usePersonalRecords.ts
import { useQuery } from '@tanstack/react-query';
import { getPersonalRecords } from '../prService';

export function usePersonalRecords() {
  return useQuery({
    queryKey: ['personal-records'],
    queryFn: getPersonalRecords,
    staleTime: 300_000,
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/gamification/prService.ts src/features/gamification/hooks/usePersonalRecords.ts
git commit -m "feat: add personal records tracking service"
```

---

### Task 22: Create Leaderboard Component

**Files:**
- Create: `src/shared/components/social/LeaderboardRow.tsx`
- Create: `src/features/gamification/leaderboardService.ts`

**Interfaces:**
- Consumes: `tokens.ts`, `apiClient`
- Produces: `<LeaderboardRow rank={1} name="Alex" score={1250} />`

- [ ] **Step 1: Create LeaderboardRow component**

```typescript
// src/shared/components/social/LeaderboardRow.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontFamilies, radius, spacing } from '../../theme/tokens';

type Props = {
  rank: number;
  name: string;
  score: number;
  isCurrentUser?: boolean;
};

export function LeaderboardRow({ rank, name, score, isCurrentUser }: Props) {
  return (
    <View style={[styles.row, isCurrentUser && styles.currentUser]}>
      <Text style={styles.rank}>{rank}</Text>
      <Text style={styles.name} numberOfLines={1}>{name}</Text>
      <Text style={styles.score}>{score}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  currentUser: {
    backgroundColor: `${colors.primary}10`,
  },
  rank: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 18,
    color: colors.primary,
    width: 40,
  },
  name: {
    flex: 1,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 16,
    color: colors.text,
  },
  score: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 16,
    color: colors.textSecondary,
  },
});
```

- [ ] **Step 2: Create leaderboard service**

```typescript
// src/features/gamification/leaderboardService.ts
import { apiClient } from '../../infrastructure/api/client';

export type LeaderboardEntry = {
  rank: number;
  athleteId: string;
  name: string;
  score: number;
};

export async function getLeaderboard(
  groupId: string,
  period: 'week' | 'month' | 'all'
): Promise<LeaderboardEntry[]> {
  const { data } = await apiClient.get('/coaching/leaderboard', {
    params: { groupId, period },
  });
  return data.entries;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/components/social/LeaderboardRow.tsx src/features/gamification/leaderboardService.ts
git commit -m "feat: add leaderboard component and service"
```

---

### Task 23: Create Coach-Only Feed

**Files:**
- Create: `src/features/community/coachFeedService.ts`
- Create: `src/features/community/presentation/screens/CoachFeedScreen.tsx`

**Interfaces:**
- Consumes: `apiClient`
- Produces: Private activity feed visible to athlete + coach only

- [ ] **Step 1: Create coach feed service**

```typescript
// src/features/community/coachFeedService.ts
import { apiClient } from '../../infrastructure/api/client';

export type FeedItem = {
  id: string;
  athleteId: string;
  athleteName: string;
  type: 'workout_completed' | 'pr_achieved' | 'milestone' | 'badge_unlocked';
  title: string;
  description: string;
  timestamp: string;
};

export async function getCoachFeed(): Promise<FeedItem[]> {
  const { data } = await apiClient.get('/coaching/coach-feed');
  return data.items;
}
```

- [ ] **Step 2: Create CoachFeedScreen**

```typescript
// src/features/community/presentation/screens/CoachFeedScreen.tsx
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { colors, fontFamilies, spacing } from '../../../../shared/theme/tokens';
import { ScreenHeader } from '../../../../shared/components/ui/ScreenHeader';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';
import { getCoachFeed, type FeedItem } from '../../coachFeedService';

export function CoachFeedScreen() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['coach-feed'],
    queryFn: getCoachFeed,
    staleTime: 60_000,
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Activity" />
      {isLoading ? (
        <EmptyState variant="loading" />
      ) : items.length === 0 ? (
        <EmptyState variant="empty" message="No activity yet" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text style={styles.name}>{item.athleteName}</Text>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  item: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  name: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 14,
    color: colors.primary,
  },
  title: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 16,
    color: colors.text,
    marginTop: spacing.xs,
  },
  description: {
    fontFamily: fontFamilies.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add src/features/community/coachFeedService.ts src/features/community/presentation/screens/CoachFeedScreen.tsx
git commit -m "feat: add coach-only activity feed"
```

---

### Task 24: Add Gamification to Navigation

**Files:**
- Modify: `src/navigation/Navigation.tsx`
- Modify: `src/navigation/AthleteTabs.tsx`

**Interfaces:**
- Consumes: CoachFeedScreen (Task 23)
- Produces: New tab/screen in navigation

- [ ] **Step 1: Add CoachFeed to RootStackParamList**

```typescript
export type RootStackParamList = {
  // ... existing
  CoachFeed: undefined;
};
```

- [ ] **Step 2: Add CoachFeedScreen to Stack**

```tsx
<Stack.Screen name="CoachFeed" component={CoachFeedScreen} />
```

- [ ] **Step 3: Add Activity tab to AthleteTabs (optional)**

Consider replacing Events tab or adding as 6th tab.

- [ ] **Step 4: Commit**

```bash
git add src/navigation/Navigation.tsx src/navigation/AthleteTabs.tsx
git commit -m "feat: add CoachFeed to navigation"
```

---

## Phase 5: Integration & Polish (Tasks 25-28)

### Task 25: Add Badge Unlock Celebration

**Files:**
- Create: `src/shared/components/gamification/BadgeUnlockCelebration.tsx`

**Interfaces:**
- Consumes: `react-native-reanimated`
- Produces: Subtle toast notification on badge unlock

- [ ] **Step 1: Create celebration component**

```typescript
// src/shared/components/gamification/BadgeUnlockCelebration.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { colors, fontFamilies, radius, spacing } from '../../theme/tokens';

type Props = {
  icon: string;
  title: string;
  onDismiss: () => void;
};

export function BadgeUnlockCelebration({ icon, title, onDismiss }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-50);

  useEffect(() => {
    opacity.value = withSpring(1);
    translateY.value = withSpring(0);

    const timer = setTimeout(() => {
      opacity.value = withTiming(0);
      translateY.value = withTiming(-50);
      setTimeout(onDismiss, 300);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateY }] }]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    zIndex: 100,
  },
  icon: {
    fontSize: 24,
  },
  title: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 14,
    color: colors.primary,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/components/gamification/BadgeUnlockCelebration.tsx
git commit -m "feat: add badge unlock celebration toast"
```

---

### Task 26: Add PR Celebration Animation

**Files:**
- Create: `src/shared/components/gamification/PRCelebration.tsx`

**Interfaces:**
- Consumes: `react-native-reanimated`
- Produces: Full-screen PR celebration (triggered sparingly)

- [ ] **Step 1: Create PR celebration**

```typescript
// src/shared/components/gamification/PRCelebration.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, withSpring, withDelay } from 'react-native-reanimated';
import { colors, fontFamilies, spacing } from '../../theme/tokens';

type Props = {
  exerciseName: string;
  value: number;
  unit: string;
  onDismiss: () => void;
};

export function PRCelebration({ exerciseName, value, unit, onDismiss }: Props) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(100, withSpring(1));

    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.content, { transform: [{ scale }] }]}>
        <Text style={styles.label}>NEW PR</Text>
        <Text style={styles.exercise}>{exerciseName}</Text>
        <Text style={styles.value}>{value} {unit}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,11,13,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  content: {
    alignItems: 'center',
    gap: spacing.md,
  },
  label: {
    fontFamily: fontFamilies.overline,
    fontSize: 14,
    color: colors.primary,
    letterSpacing: 4,
  },
  exercise: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 28,
    color: colors.text,
  },
  value: {
    fontFamily: fontFamilies.displayBlack,
    fontSize: 56,
    color: colors.primary,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/components/gamification/PRCelebration.tsx
git commit -m "feat: add PR celebration full-screen animation"
```

---

### Task 27: Integrate Gamification into WorkoutExecutionScreen

**Files:**
- Modify: `src/features/training/presentation/screens/WorkoutExecutionScreen.tsx`

**Interfaces:**
- Consumes: PR tracking, Badge system, Celebrations
- Produces: PR checks on set completion, badge unlocks

- [ ] **Step 1: Add PR check on set completion**

```typescript
const handleSetComplete = async () => {
  // ... existing logic

  // Check for new PR
  const isNewPR = await checkForNewPR(
    currentExercise.id,
    'max_weight',
    currentWeight
  );

  if (isNewPR) {
    setShowPRCelebration(true);
  }
};
```

- [ ] **Step 2: Add badge check on workout complete**

```typescript
const handleWorkoutComplete = async () => {
  // ... existing logic

  // Check for new badges
  const unlockedBadges = await checkForNewBadges();
  if (unlockedBadges.length > 0) {
    setNewBadge(unlockedBadges[0]);
  }
};
```

- [ ] **Step 3: Commit**

```bash
git add src/features/training/presentation/screens/WorkoutExecutionScreen.tsx
git commit -m "feat: integrate PR and badge checks into workout execution"
```

---

### Task 28: Final Integration Test

**Files:**
- All modified files

**Interfaces:**
- All components and services

- [ ] **Step 1: Run full TypeScript check**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 2: Run all tests**

Run: `cd apps/mobile && npm test`
Expected: PASS

- [ ] **Step 3: Manual smoke test**

Run app on simulator, verify:
- Dashboard loads with bento grid
- Activity rings render
- Workout execution shows timer + camera
- Badges display correctly
- Leaderboard loads

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete mobile fitness redesign v1"
```

---

## Summary

**Total Tasks:** 28
**Estimated Time:** 2-3 weeks (solo engineer)

**Task Breakdown:**
- Phase 1 (UI Foundation): 8 tasks
- Phase 2 (Dashboard): 4 tasks
- Phase 3 (Workout): 6 tasks
- Phase 4 (Social/Gamification): 6 tasks
- Phase 5 (Integration): 4 tasks

**Dependencies:**
- react-native-vision-camera (Phase 3)
- react-native-worklets (Phase 3)
- expo-health (Phase 2)
- expo-haptics (Phase 3)

**Backend Required:**
- New API endpoints for gamification (Phase 4)
- Video analytics endpoints (Phase 3)
- Form analysis AI model (Phase 3)

---

## Appendix: File Structure

```
src/
├── shared/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── BentoGrid.tsx
│   │   │   ├── StatCard.tsx
│   │   │   └── __tests__/
│   │   ├── fitness/
│   │   │   ├── ActivityRings.tsx
│   │   │   ├── RestTimer.tsx
│   │   │   ├── WorkoutCard.tsx
│   │   │   ├── FormAnalyzer.tsx
│   │   │   ├── WeightInput.tsx
│   │   │   └── __tests__/
│   │   ├── gamification/
│   │   │   ├── StreakBadge.tsx
│   │   │   ├── AchievementBadge.tsx
│   │   │   ├── BadgeUnlockCelebration.tsx
│   │   │   ├── PRCelebration.tsx
│   │   │   └── __tests__/
│   │   ├── social/
│   │   │   └── LeaderboardRow.tsx
│   │   └── media/
│   │       └── TrackedVideoPlayer.tsx
│   └── theme/
│       └── tokens.ts (modified)
├── features/
│   ├── training/
│   │   └── presentation/screens/
│   │       ├── TodayScreen.tsx (modified)
│   │       └── WorkoutExecutionScreen.tsx (modified)
│   ├── gamification/
│   │   ├── streakService.ts
│   │   ├── badgeService.ts
│   │   ├── badges.ts
│   │   ├── prService.ts
│   │   ├── leaderboardService.ts
│   │   └── hooks/
│   │       ├── useStreak.ts
│   │       └── usePersonalRecords.ts
│   └── community/
│       ├── coachFeedService.ts
│       └── presentation/screens/
│           └── CoachFeedScreen.tsx
├── infrastructure/
│   ├── health/
│   │   └── index.ts
│   └── api/
│       └── videoAnalytics.ts
└── navigation/
    ├── Navigation.tsx (modified)
    └── AthleteTabs.tsx (modified)
```
