# MR Training — Mobile Code Quality

**Version 1.0 — 2026**

---

## 1. TypeScript

Strict mode is **mandatory**. No exceptions.

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**Forbidden:**
- `any` — never. Use `unknown` and type guards.
- `as` casts — prefer type predicates.
- `@ts-ignore` / `@ts-nocheck` — fix the type, don't suppress the error.
- Implicit `any` in callbacks — always type parameters.

---

## 2. File Organization

| Rule | Limit |
|------|-------|
| Lines per file | 250 max |
| Lines per function | 30 max |
| Lines per screen | 80 max (just composition) |
| Indentation depth | 3 levels max |
| Cyclomatic complexity | Low (no nested ternaries) |

---

## 3. Imports

Organized in this order, separated by blank line:

1. React / React Native
2. Third-party libraries
3. Internal modules (absolute paths: `@/features/...`, `@/shared/...`)
4. Relative imports (same feature)
5. Types (separate `import type`)

```typescript
import { useState, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';

import { useQuery } from '@tanstack/react-query';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useAuth } from '@/shared/hooks/useAuth';
import { WorkoutCard } from '@/features/training/presentation/components';

import { formatDuration } from './utils';
```

---

## 4. Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files | kebab-case | `workout-card.tsx` |
| Directories | kebab-case | `use-cases/` |
| Components | PascalCase | `WorkoutCard` |
| Hooks | camelCase, `use` prefix | `useWorkoutData` |
| Functions | camelCase, verb | `calculateTrainingLoad` |
| Types/Interfaces | PascalCase | `WorkoutSession` |
| Constants | UPPER_SNAKE_CASE | `MAX_SETS_PER_EXERCISE` |
| Test files | `*.test.ts` | `workout-card.test.tsx` |

---

## 5. Components

### Rules

- **Never inline styles.** Use `StyleSheet.create()`.
- **Never logic in render.** Extract to hooks or use cases.
- **Never `useEffect` unnecessarily.** Prefer event handlers and React Query.
- **Small components.** If a component exceeds 150 lines, split it.
- **Export default for screens**, named exports for shared components.

### Pattern

```typescript
// ✅ Good: Clean component with typed props
type WorkoutCardProps = {
  workout: Workout;
  onPress: (id: string) => void;
};

export function WorkoutCard({ workout, onPress }: WorkoutCardProps) {
  const handlePress = useCallback(() => {
    onPress(workout.id);
  }, [workout.id, onPress]);

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <Text style={styles.title}>{workout.name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { /* ... */ },
  title: { /* ... */ },
});
```

---

## 6. Hooks

- **Custom hooks** for reusable logic.
- **Single responsibility.** A hook does ONE thing.
- **Return consistent shape.** Prefer objects over tuples for >2 values.
- **Never call hooks conditionally.** Extract conditional logic inside the hook.

---

## 7. State Management

| Concern | Tool |
|---------|------|
| Server state | React Query (`useQuery`, `useMutation`) |
| Client/global state | Zustand |
| Form state | React Hook Form |
| URL/params state | React Navigation params |
| Ephemeral UI state | `useState` (local) |
| Persistent local data | MMKV |

**Never duplicate server state in Zustand.** React Query IS the cache.

---

## 8. Error Handling

```typescript
// Always handle loading, error, and success states
const { data, isLoading, isError, error, refetch } = useQuery({
  queryKey: ['workouts', athleteId],
  queryFn: () => api.getWorkouts(athleteId),
});

if (isLoading) return <WorkoutListSkeleton />;
if (isError) return <ErrorState message={error.message} onRetry={refetch} />;
if (!data?.length) return <EmptyWorkouts />;

return <WorkoutList workouts={data} />;
```

---

## 9. Forbidden

- `console.log` — use structured logger
- `TODO` / `FIXME` — create a ticket instead
- Dead code — delete it (git history exists)
- Unused imports — ESLint catches these
- Commented-out code — delete it
- Magic numbers — name them as constants
- `Promise.all` without error handling — use `Promise.allSettled`

---

## 10. Tooling

| Tool | Config |
|------|--------|
| ESLint | `@react-native/eslint-config` + `@typescript-eslint` strict |
| Prettier | 2-space indent, single quotes, trailing commas |
| TypeScript | strict mode |
| Husky | pre-commit lint + typecheck |
| Jest | unit tests |
| Maestro | E2E tests |

**CI must pass:** `tsc --noEmit`, `eslint`, `prettier --check`, `jest`.
