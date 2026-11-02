# T-012: Exercise Detail Video UX Design Spec

**Author**: UX Designer
**Date**: 2026-10-13
**Related**: T-009 (upload demo video per exercise), TrackedVideoPlayer, ExerciseDemoModal, ExerciseVideoPlayer, isPlayableVideoUrl

---

## 1. Inventory: What we already have

### Data per exercise (from API DTO / presentation types)

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Exercise ID |
| `name` | `string` | Ejercicio name |
| `sets` | `number` | Series |
| `reps` | `number` | Repeticiones |
| `weightKg` | `number \| null` | Peso |
| `restSeconds` | `number \| null` | Descanso |
| `notes` | `string \| null` | Notas |
| `videoUrl` | `string \| null \| undefined` | **Demo video URL** — optional, uploaded by coach |
| `gpsRoute` | `string \| null \| undefined` | Ruta GPS |
| `mode` | `string \| undefined` | Modo (ej. "timed", "reps") |
| `phase` | `string \| undefined` | Fase (warmup, main, cooldown) |
| `bodyPart` | `string` | Grupo muscular (from PrescriptionExercise) |
| `muscleGroups` | `string` | Grupos musculares (from PrescriptionExercise) |

### Existing components (reused, NO new ones introduced)

| Component | Purpose | Key states |
|---|---|---|
| `TrackedVideoPlayer` | Inline video player with tracking (start/progress/complete). Used in `WorkoutDetailScreen` exercise cards. | idle, loading, playing, error. Shows play-button overlay when not playing. Returns `null` if `!isPlayableVideoUrl(videoUrl)` — **no black box**. |
| `ExerciseVideoPlayer` | Full video player with controls, progress bar, title, loading overlay. Wraps `VideoView` from `expo-video`. Used inside modals. | loading, playing, completed. Has controls overlay with play/pause, replay, record CTA. |
| `ExerciseDemoModal` | Fullscreen modal wrapping `ExerciseVideoPlayer`. Owned by parent screen (visibility, AI flag, navigation). | visible / invisible. Has close button, AI "record my form" CTA. |
| `isPlayableVideoUrl` | Pure guard for video URLs. Returns `false` for empty/null/undefined/invalid. | — |
| `EmptyState` | Standard empty/error/loading state component. Reusable across screens. | empty, error, loading, skeleton. |
| `FlashList` | Scrollable list performance (already used in both screens). | — |

### Current pain points (from code review)

1. **WorkoutDetailScreen** — When `ex.videoUrl` is absent/falsy, `TrackedVideoPlayer` is completely skipped via the `isPlayableVideoUrl` guard. **Nothing renders** — no placeholder hint that the coach may have uploaded a video, and no hint to the user that a demo exists.

2. **WorkoutExecutionScreen** — The demo video only appears in `ExerciseDemoModal` when `vm.demoVisible` is true. User may not know a demo video exists for the current exercise.

3. **Performance** — mobile-rules/05-mobile-performance.md: "don't mount multiple `VideoView`s in a scroll list; thumbnail + lazy mount on tap is preferred." Currently, `TrackedVideoPlayer` mounts a `VideoView` for every exercise that has a videoUrl, which could be N players on one screen.

4. **No-first-class video states** — No explicit "has-video / no-video-with-hint / loading / error" states in the exercise card UI.

---

## 2. Proposed UX: Thumbnail → Tap → Fullscreen

### Overall approach

Using **existing building blocks only** (no new components), the design implements a **thumbnail + lazy mount** pattern:

#### In WorkoutDetailScreen (exercise list / workout detail)

| State | Visual | Interaction |
|---|---|---|
| **has-video** | Exercise card shows a **thumbnail** (first frame placeholder or static SVG icon) at the top of the card. Label "Ver demo" beneath it. | Tap → opens `ExerciseDemoModal` fullscreen with the video. |
| **no-video-with-hint** | Small hint text: "Sin video demo" or "Añadir video demo" in `--color-text-tertiary` gray, below the exercise name. | N/A — no player mounted. |
| **loading** | Pulse skeleton placeholder where the thumbnail would be. | While video URL is being validated/prepared. |
| **error** | Error icon + "Reintentar" in `--color-error` (#FF5A5F). | Retry button re-loads the video. |

**Key performance behavior**: The thumbnail is **NOT** a mounted `VideoView`. It's a static image/placeholder. Only when the user taps "Ver demo" does the `ExerciseDemoModal` mount for that specific exercise. All other exercises on the screen remain as lightweight thumbnails.

#### In WorkoutExecutionScreen (during workout)

| State | Visual | Interaction |
|---|---|---|
| **has-video** | "Ver demo" button on the exercise card (primary action). | Tap → opens `ExerciseDemoModal` fullscreen. |
| **no-video** | "Grabar forma" CTA (AI form recording path). | Opens the recording consent / form analyzer path. |
| **loading** | Skeleton placeholder in card. | While form/video loads. |
| **error** | Error state with retry. | Retry the video or form analysis. |

### Autoplay vs tap-to-play policy

- **Never autoplay with sound**. Autoplay is muted by default; user taps to unmute and play.
- **Muted autoplay with play button** is allowed on modern mobile browsers, but given that athletes train in gyms, pools, and outdoors with spotty connectivity, we default to **tap-to-play**.
- The thumbnail shows a "Play" triangle overlay; tapping starts playback (first muted, then unmuted on user gesture).

### Behavior in the list (many videos on one screen → performance)

- **Thumbnail + lazy mount on tap** is the preferred approach per `mobile-rules/05-mobile-performance.md`.
- Each exercise card in the FlashList renders:
  - A static thumbnail (first-frame SVG placeholder, or the exercise icon)
  - Video metadata (sets/reps/rest) beneath
  - "Ver demo" CTA if `videoUrl` is playable
- **Only the tapped exercise** mounts `ExerciseDemoModal` → `ExerciseVideoPlayer` → `VideoView`.
- All other exercises on screen stay as thumbnails — no N `VideoView`s mounted simultaneously.
- FlashList's `estimatedItemSize` ensures accurate initial render without measuring each item.

### Interaction: "Ver demo" in detail vs execution

#### WorkoutDetailScreen

1. User opens workout detail → sees exercise list grouped by phase.
2. Each exercise card has a "Ver demo" area at the top.
3. Tap "Ver demo" → `ExerciseDemoModal` opens fullscreen:
   - `ExerciseVideoPlayer` with `videoType="demo"`
   - Title shows exercise name
   - Controls: play/pause, replay
   - AI CTA: "Grabar forma" (shows only if `showAiCta` prop is true, passed from parent)
   - Close button (X) dismisses and returns to workout detail.
4. On close, return to exercise list at current position.

#### WorkoutExecutionScreen

1. User is in the middle of a workout, on exercise X.
2. Exercise card shows "Ver demo" button (or "Grabar forma" if no video).
3. Tap "Ver demo" → `ExerciseDemoModal` opens fullscreen (same component as detail).
4. Modal has:
   - `ExerciseVideoPlayer` with `videoType="demo"`, `title={exerciseName}`
   - AI "record my form" CTA (the `onRecordPress` prop, owned by the execution view model)
   - Close button dismisses and returns to the workout.
5. The modal is already positioned above the workout scroll area; user can return to the exercise after closing.

---

## 3. States (detailed)

### WorkoutDetailScreen exercise card — four first-class states

```tsx
// Pseudo-code for the exercise card renderItem
<ExerciseCardVideoState
  videoUrl={ex.videoUrl}
  onWatchDemo={() => navigation.push('ExerciseDemoModal', { videoUrl, exerciseName })}
  onErrorRetry={() => {/* handle error */}}
/>
```

| State | When it triggers | Visual |
|---|---|---|
| **has-video** | `isPlayableVideoUrl(videoUrl)` returns `true` | Thumbnail + "Ver demo" label. Tap → modal. |
| **no-video-with-hint** | `!videoUrl || videoUrl === undefined || videoUrl === null` | Gray text: "Sin video demo" below exercise name. |
| **loading** | Video URL exists but player is initializing | Pulse skeleton placeholder where thumbnail would be. |
| **error** | Video URL is valid but playback failed | Error icon + "Reintentar" button. On press, re-attempt playback. |

### WorkoutExecutionScreen exercise card — four first-class states

| State | When it triggers | Visual |
|---|---|---|
| **has-video** | `vm.demoVideoUrl` is playable AND user has tapped "Ver demo" | "Ver demo" button on card. Tap → `ExerciseDemoModal`. |
| **no-video** | No `demoVideoUrl` configured for this exercise | "Grabar forma" CTA (opens AI form recording). |
| **loading** | Video or form analysis is loading | Skeleton placeholder in card area. |
| **error** | Playback or form analysis failed | Error state with retry action. |

---

## 4. Tokens used (canonical)

All tokens come from `src/shared/theme/tokens.ts` (dark-first, MR Blue `#15AAF2`).

| Token | Value | Usage in video UX |
|---|---|---|
| `--color-brand-primary` | `#15AAF2` | "Ver demo" label color, primary CTA in modal |
| `--color-brand-primary-pressed` | `#0E93D4` | Hover/pressed state on "Ver demo" button |
| `--color-text-primary` | `#F5F5F7` | Body text in exercise cards |
| `--color-text-secondary` | `#9CA3AF` | "Sin video demo" hint, secondary labels |
| `--color-text-tertiary` | `#8A8A8A` | "Sin video demo" placeholder text (Note: per brand guidelines, `#8A8A8A` on `#0F0F0F` does NOT meet AA contrast; use `--color-text-secondary` `--color-text-tertiary` only for decorative/non-essential text; for essential info use `#C4C4C4` Fog — but since this is a hint, we use `--color-text-secondary` with adequate contrast) |
| `--color-error` | `#FF5A5F` | Error state text/border |
| `--color-surface-3` | `#1A1A1C` | Exercise card background |
| `--color-surface-4` | `#1C1C1C` | Hover/selected state on card |
| `--radius-md` | `8px` | Card corners, modal corners |
| `--radius-sm` | `4px` | Button corners, input corners |
| `--space-3` | `12px` | Card internal padding |
| `--space-4` | `16px` | Section gaps, modal padding |
| `--space-6` | `24px` | Page margins, between exercise cards |
| `--gap-md` | `12px` | Group separation within card |
| `--gap-lg` | `24px` | Section separation |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.4)` + spread | Exercise card elevation |
| `--shadow-md` | `0 4px 8px rgba(0,0,0,0.5)` + spread | Elevated elements |
| `--duration-micro` | `150ms` | Button state changes (hover, press) |
| `--duration-standard` | `350ms` | Panel transitions, modal open/close |
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Default transitions |

**Typography in video UX:**
- Exercise name: `--text-bodyStrong` (Montserrat SemiBold, 15px, `--color-text`)
- Sets/reps: `--text-caption` (12px, `--color-text-secondary`)
- "Ver demo" label: `--text-caption` or `--text-body`, color `--color-brand-primary`
- "Sin video demo" hint: `--text-caption` color `--color-text-tertiary` or `--color-text-secondary`
- Modal title: `--text-h2` (Montserrat Bold, 28px mobile / 36px desktop)
- Modal close button: 24px icon, `--color-text` on base surface

---

## 5. Micro-copy (i18n, consistent with existing `texts`)

All copy comes from the existing `texts` i18n library. No new copy strings are introduced unless marked **NEW**.

| Key | Current value | New/updated usage |
|---|---|---|
| `texts.screens.workoutExecution.viewDemo` | `'Ver demo'` | Primary CTA on exercise cards (detail + execution). |
| `texts.common.retry` | `'Reintentar'` | Error state retry button on video playback. |
| `texts.screens.trackedVideoPlayer.loadError` | `'No se pudo cargar el video'` | Error message when video fails to load. |
| `texts.common.noData` | `'No hay información todavía. Intenta refrescar o vuelve más tarde.'` | Could reuse for "no video" hint, but we propose custom copy below. |
| **NEW** (to be added to `trainingScreensTexts.ts` or `screensTexts.ts`): | | |
| `workoutDetailScreen.noVideoHint` | `NEW: 'Sin video demo'` | Shown when exercise has no video URL. |
| **OR** reuse existing: | | |
| `texts.state.noVideo` | Could be added if needed. | — |

**Suggested new i18n keys** (add to the appropriate i18n file):

```ts
// In trainingScreensTexts.ts or screensTexts.ts, add:
workoutDetailScreen: {
  // ... existing ...
  noVideoHint: 'Sin video demo', // shown when exercise has no demo video
},
execution: {
  // ... existing ...
  noVideoHint: 'Sin video demo',
},
```

**Micro-copy guidelines followed** (from `03-ux-workflows.md § Microcopy Guidelines`):
- Verb-first: "Ver demo" ✅ (2 words, verb + noun)
- No "Submit", "OK", "Click Here" ✅
- Consistent with existing pattern ✅
- No emojis in product copy ✅ (per `01-brand-guidelines.md § Voice & Tone: "Never use emoji in product interface copy"`

---

## 6. Performance approach (mobile-rules/05-mobile-performance.md)

### Key constraints respected

| Constraint | How it's addressed |
|---|---|
| **Don't mount multiple VideoViews in a scroll list** | Thumbnail + lazy mount on tap. Only the tapped exercise mounts `ExerciseVideoPlayer` → `VideoView`. All others are static placeholders. |
| **60 FPS minimum** | No animation-heavy video previews in the list. Thumbnail is a static SVG/placeholder. The modal's `ExerciseVideoPlayer` uses `expo-video` with proper worklet separation. |
| **FlashList for scrollable lists** | Both `WorkoutDetailScreen` and `WorkoutExecutionScreen` already use FlashList (or scrollable lists). The thumbnail rendering integrates with FlashList's `renderItem`. |
| **Lazy loading / estimated item size** | `estimatedItemSize` already set in FlashList usage. Thumbnail height is fixed (no layout thrashing). |
| **Memory leak prevention** | `ExerciseDemoModal` already cleans up on close (`onClose={() => vm.setDemoVisible(false)}`). Video metrics are sent on unmount via `ExerciseVideoPlayer`'s `useEffect`. |
| **Bundle size** | No new imports. All components (`TrackedVideoPlayer`, `ExerciseVideoPlayer`, `ExerciseDemoModal`, `isPlayableVideoUrl`) already exist in the codebase. |
| **Offline / no-network behavior** | `isPlayableVideoUrl` guards ensure no attempt to mount a player for invalid URLs. If the network fails mid-playback, `TrackedVideoPlayer` shows an error state with "Reintentar". The `ExerciseDemoModal` already has the same error-overlay pattern. |

### Offline / no-network behavior

- When the device has no connection and the user taps "Ver demo":
  - `isPlayableVideoUrl` still returns `true` (URL format is valid), but the `VideoView` will fail to load.
  - `TrackedVideoPlayer` shows the **error state** with "Reintentar" button. Tapping retries playback.
  - The error state is non-blocking — the user can dismiss it and continue the workout.
  - When connectivity returns, the retry succeeds and playback resumes.
- When there's no video URL at all (`!videoUrl`):
  - The "Sin video demo" hint is shown immediately — no network request, no loading state.
  - Fully offline-capable.

---

## 7. Screen structure + component hierarchy

### WorkoutDetailScreen — exercise card with video

```
<FlashList>
  {exercises.map(ex => (
    <Card key={ex.id} style={styles.card} >
      <View style={styles.exerciseTopRow}>
        <Text style={styles.exerciseName}>{ex.name}</Text>
        <View style={styles.chipRow}>
          {sets/reps chips}
        </View>
      </View>
      
      {/* VIDEO STATE — first-class citizen */}
      {videoState(ex.videoUrl, ex.id, athleteId)}
      
      {ex.notes && <Text style={styles.notes}>{ex.notes}</Text>}
      {ex.gpsRoute && <RunningRouteView gpsRoute={ex.gpsRoute} />}
    </Card>
  ))}
</FlashList>
```

#### `videoState` function (logic, no component)

```ts
function videoState(videoUrl: string | undefined, exerciseId: string, athleteId: string) {
  if (!videoUrl) {
    // no-video-with-hint
    return (
      <Text style={styles.noVideoHint} color={colors.textSecondary}>
        {t.noVideoHint} {/* "Sin video demo" */}
      </Text>
    );
  }
  
  if (!isPlayableVideoUrl(videoUrl)) {
    // invalid URL — defense in depth, should not happen if API validates
    return (
      <Text style={styles.errorText} color={colors.error}>
        {t.loadError} {/* "No se pudo cargar el video" */}
      </Text>
    );
  }
  
  // has-video — thumbnail with play action
  return (
    <Pressable style={styles.thumbnailWrap} onPress={() => openDemoModal(videoUrl, ex.name)}>
      <Image
        source={/* first frame or placeholder SVG */}
        style={styles.thumbnail}
        resizeMode="cover"
      />
      <Text style={styles.thumbnailLabel}>Ver demo</Text>
    </Pressable>
  );
}
```

**Styles used** (from existing `StyleSheet.create` in `WorkoutDetailScreen`):
- `styles.thumbnailWrap`: `Padding: spacing.sm`, `AspectRatio: 16/9`, `BorderRadius: radius.sm`, `Overflow: 'hidden'`, background `--color-surface-3`
- `styles.thumbnail`: `Width: '100%'`, `Height: 100%`, `resizeMode: 'cover'`
- `styles.thumbnailLabel`: `...typography.caption`, `color: colors.primary`, `marginTop: spacing.xs`, `TextAlign: 'center'`
- `styles.noVideoHint`: `...typography.caption`, `color: colors.textSecondary`, `MarginTop: spacing.xs`, `TextAlign: 'center'`
- `styles.errorText`: `...typography.body`, `color: colors.error`, `TextAlign: 'center'`, `MarginTop: spacing.xs`

### WorkoutExecutionScreen — exercise card with video

```
<ScrollView>
  {currentExerciseData}
  
  {/* PROGRESS BAR */}
  <ProgressBar progress={computedProgress} />
  
  {/* EXERCISE CARD */}
  <ExerciseCard
    name={currentExercise.name}
    detail={targetLabel + restText}
    viewDemoLabel={t.viewDemo}  // "Ver demo"
    onViewDemo={() => setDemoVisible(true)}  // opens modal
    /* other props */
  />
  
  {/* UP NEXT, FORM ANALYZER, REP COUNTER, WEIGHT INPUT, PRIMARY BUTTON */}
  {/* ... existing content ... */}
</ScrollView>

{vm.demoVisible && vm.currentExercise && isPlayableVideoUrl(vm.demoVideoUrl) ? (
  <ExerciseDemoModal
    videoUrl={vm.demoVideoUrl}
    exerciseId={vm.currentExercise.id}
    exerciseName={vm.currentExercise.name}
    showAiCta={vm.aiActive}
    onClose={() => vm.setDemoVisible(false)}
    onRecordPress={vm.handleOpenAiWorkout}
  />
) : null}
```

**Key change**: The `ExerciseCard` component (already exists in `apps/mobile/src/features/training/presentation/components/execution/ExerciseCard.tsx`) needs to accept an `onViewDemo` prop and render the "Ver demo" CTA. Currently it receives `viewDemoLabel={t.viewDemo}` and `{ onViewDemo: ... }` but the button may not be rendering the video state correctly. The design assumes `ExerciseCard` is updated to show the proper state (has-video vs no-video).

Actually, looking at the code more carefully, `ExerciseCard` already receives `onViewDemo` prop. The design just needs to ensure the parent (`WorkoutExecutionScreen`) passes the right state and the card renders the appropriate CTA.

---

## 8. Micro-copy summary

| Situation | Copy key | Copy value |
|---|---|---|
| Exercise card "Ver demo" CTA | `texts.screens.workoutExecution.viewDemo` | `'Ver demo'` |
| Exercise card "Sin video demo" hint (new) | `workoutDetailScreen.noVideoHint` (or new key) | `'Sin video demo'` |
| Video error "Reintentar" | `texts.common.retry` | `'Reintentar'` |
| Video load error | `texts.screens.trackedVideoPlayer.loadError` | `'No se pudo cargar el video'` |
| Modal close button label | `texts.common.close` | `'Cerrar'` (from `EmptyState` / modal patterns) |
| AI "record my form" CTA | `texts.aiWorkout.trainWithAi` | `'Entrenar con IA'` (already exists) |

All copy is consistent with existing i18n, no emojis, verb-first, concise.

---

## 9. Acceptance checklist

- [ ] **Design spec written** to `docs/superpowers/specs/2026-10-13-T-012-exercise-video-ux.md`
- [ ] **No new components** introduced — all UX uses existing: `TrackedVideoPlayer`, `ExerciseVideoPlayer`, `ExerciseDemoModal`, `isPlayableVideoUrl`, `EmptyState`, `FlashList`
- [ ] **Thumbnail + lazy mount** pattern: only tapped exercise mounts `VideoView`; others are static placeholders
- [ ] **Four first-class states** per exercise: `has-video`, `no-video-with-hint`, `loading`, `error`
- [ ] **Tap-to-play policy**: muted start, user taps to unmute/play. Never autoplay with sound.
- [ ] **Performance**: FlashList + thumbnail pattern satisfies "don't mount N VideoViews in a scroll list"
- [ ] **Offline capable**: "Sin video demo" hint shows immediately without network. Error state with retry when network fails mid-playback.
- [ ] **Consistent tokens**: All colors, spacing, typography, radius from `src/shared/theme/tokens.ts` (dark-first, MR Blue `#15AAF2`)
- [ ] **Micro-copy**: All copy from existing `texts` i18n. No emojis. New keys added if needed.
- [ ] **Video in detail AND execution**: Same `ExerciseDemoModal` component reused in both screens. "Ver demo" CTA works in both contexts.
- [ ] **One primary action per screen**: Each screen still has exactly one primary CTA (start workout in detail; complete set in execution). Video is a secondary contextual action.
- [ ] **Accessibility**: Touch targets ≥ 44pt. Focus ring on "Ver demo" button. Screen reader labels (`demoA11y: 'Ver video demostrativo'` already exists). Respects `prefers-reduced-motion`.