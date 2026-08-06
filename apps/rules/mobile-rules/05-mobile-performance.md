# MR Training — Mobile Performance

**Version 1.0 — 2026**

---

## 1. Performance Targets

| Metric | Target |
|--------|--------|
| FPS | 60 FPS minimum, no jank |
| App Launch (cold) | < 2 seconds |
| Screen Transition | < 300ms |
| List Scroll | Buttery smooth at any length |
| Bundle Size (JS) | < 5 MB compressed |
| Image Loading | Lazy + progressive |
| Memory | No leaks, < 200 MB peak |

---

## 2. Common Performance Issues

### Re-renders

```typescript
// ❌ Bad: Inline object creates new reference every render
<WorkoutCard style={{ marginTop: 16 }} />

// ✅ Good: Static style reference
<WorkoutCard style={styles.card} />

// ❌ Bad: Inline callback
<Pressable onPress={() => handlePress(id)} />

// ✅ Good: useCallback
const handlePress = useCallback(() => onPress(id), [id, onPress]);
<Pressable onPress={handlePress} />
```

### Component Memoization

```typescript
// ✅ Good: memo for pure presentational components
export const WorkoutCard = memo(function WorkoutCard({ workout, onPress }: Props) {
  // ...
});
```

### Expensive Computations

```typescript
// ❌ Bad: Expensive calculation on every render
const sorted = workouts.sort(/* ... */);

// ✅ Good: useMemo
const sorted = useMemo(() => [...workouts].sort(/* ... */), [workouts]);
```

---

## 3. List Performance

```typescript
// ✅ Always use FlashList for any scrollable list
import { FlashList } from '@shopify/flash-list';

// ✅ Provide estimated item size for accurate initial render
<FlashList
  data={workouts}
  renderItem={renderWorkout}
  estimatedItemSize={120}
  keyExtractor={(item) => item.id}
/>

// ❌ Never: FlatList with dozens of items and complex renderItem
// ❌ Never: ScrollView with .map() for dynamic lists
```

---

## 4. Image Optimization

```typescript
// ✅ Good: FastImage with caching
import FastImage from 'react-native-fast-image';

<FastImage
  source={{ uri: athlete.avatarUrl, priority: 'normal' }}
  style={styles.avatar}
  resizeMode="cover"
/>

// ❌ Bad: Remote images in regular <Image>
// <Image source={{ uri: url }} /> // No caching
```

---

## 5. Animation Performance

```typescript
// ✅ Good: Reanimated worklets (run on UI thread)
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';

// ✅ Good: Gesture Handler for touch interactions
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

// ❌ Bad: Animated API for complex animations (JS thread)
// ❌ Bad: LayoutAnimation for frequently reordering lists
```

---

## 6. Code Splitting & Lazy Loading

```typescript
// ✅ Good: Lazy load screens
const WorkoutDetail = lazy(() => import('@/features/training/presentation/screens/WorkoutDetail'));

// ✅ Good: Lazy load heavy features
const VideoPlayer = lazy(() => import('@/features/live-session/presentation/VideoPlayer'));
```

---

## 7. Memory Leak Prevention

```typescript
// ✅ Good: Clean up subscriptions
useEffect(() => {
  const subscription = eventEmitter.addListener('workoutUpdate', handler);
  return () => subscription.remove();
}, []);

// ✅ Good: Abort fetch on unmount
useEffect(() => {
  const controller = new AbortController();
  fetch(url, { signal: controller.signal }).then(/* ... */);
  return () => controller.abort();
}, []);

// ❌ Bad: setState after unmount (React Query handles this, don't worry)
```

---

## 8. Network Optimization

- **React Query** deduplicates in-flight requests automatically
- **Stale time** of 5 minutes for slow-changing data (profiles, plans)
- **Stale time** of 30 seconds for real-time data (live sessions, today's workout)
- **Pagination** with `useInfiniteQuery` for long lists
- **Background refresh** with `refetchInterval` for today's workout (every 60s)

---

## 9. Bundle Size

- Enable Hermes engine (default in React Native 0.70+)
- Tree-shaking works automatically with static imports
- Avoid importing entire icon libraries — use individual SVGs
- Run `npx react-native-bundle-visualizer` to analyze
- Target: JS bundle under 5 MB compressed

---

## 10. Performance Profiling

- **Flipper** + React DevTools for render profiling
- **FlashList** `onLoad` callback for list performance
- **Xcode Instruments** for iOS memory/time profiling
- **Android Profiler** for Android memory/CPU
- Benchmark on a low-end device (iPhone SE, budget Android)
