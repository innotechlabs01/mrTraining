# Experience 07 — Live Workout Experience

> A real-time, guided follow-along workout session for the athlete. One screen, one primary action: press start and the coach runs the session. Timers drive every second. Rest is recovery with coaching. Music fuels the effort. Video demonstrates the movement. The coach talks throughout. Progress is always visible.

---

## Context

Experience 06 built *workout management* (library, builder, templates, scheduling, set-based execution, history, analytics). Experience 07 builds the *live session* — the moment the athlete actually trains. It is a different mental model: not a checklist to log, but a real-time broadcast where the timer, the video, the music, and the coach's voice are synchronized into a single immersive flow.

This experience replaces the rough `LiveWorkout` prototype that previously occupied the `workout` block in the athlete's daily journey.

---

## Design Principles

1. **One tap to begin.** The session starts with a single Start button. No configuration, no decisions.
2. **The timer is the conductor.** Work → Rest → Transition → Work. The athlete never wonders what to do — the phase is always explicit.
3. **Everything is visible at a glance.** Current exercise, set number, overall progress, and elapsed time are always on screen.
4. **The coach is present.** Contextual cues appear in work (technique), rest (recovery), and transition (what's next).
5. **Music is part of the workout.** A built-in player keeps energy up and ducks during coach cues.
6. **Celebrate the finish.** Completion shows real stats, not a generic "done".

---

## Architecture

### Module Structure

New `features/live-workout/` module, fully self-contained (no cross-feature dependencies):

```
src/features/live-workout/
├── types.ts                     # LiveWorkoutPlan, LiveExercise, MusicTrack, LivePhase, CueTone
├── data/
│   └── _mocks.ts                # Mock "Morning Speed" session + playlist + motivational lines
├── hooks/
│   └── useLiveWorkout.ts        # The real-time state machine (engine)
├── components/
│   ├── LiveWorkoutView.tsx      # Orchestrator (public)
│   ├── ExerciseStage.tsx        # Video stage + exercise detail + form tip
│   ├── RestTimer.tsx            # Circular countdown ring + recovery cue
│   ├── WorkoutProgress.tsx      # Overall + per-exercise progress + elapsed clock
│   ├── CoachFeedback.tsx        # Coach avatar + tone-styled message bubble
│   ├── MusicPlayer.tsx          # Self-contained playlist player
│   └── CompletionScreen.tsx     # Celebration + session stats + restart
└── index.ts                     # Public barrel
```

### Wiring

`src/app/(app)/athlete/today/[block]/page.tsx` already maps the `workout` block to `LiveWorkout`. That component (`src/components/LiveWorkout/LiveWorkout.tsx`) is now a thin wrapper that renders `LiveWorkoutView` from the feature module. No route change required.

### State Machine

The engine (`useLiveWorkout`) is a single reducer-style state machine driven by a 1-second interval while running:

```
idle ──start──▶ work ──(set done)──▶ rest ──▶ work (next set)
                      │                         │
                      └──(last set)──▶ transition ──▶ work (next exercise)
                                                │
                                                └──(last exercise)──▶ complete
```

- **work**: counts down `exercise.duration`. Video plays. Coach shows a technique/tip cue. A fresh motivational line rotates every ~9s.
- **rest**: counts down `exercise.rest`. Circular ring animates. Coach shows a recovery/motivation cue. Music ducks.
- **transition**: 8s bridge between exercises. Coach announces "Up next".
- **complete**: celebration screen with time, exercise count, and sets completed.

Pause/Resume freezes the interval. Skip advances the state machine instantly (skips the current work/rest). Restart resets to `idle`.

Elapsed time accumulates across all phases. Overall progress = `completedSets / totalSets`.

---

## Components

### ExerciseStage
- 4:3 video surface (best-effort `<video>`; graceful animated fallback when no source)
- Phase badge (Warm-Up / Working Set / Cool Down) + Set X/Y
- Exercise name, muscle-group tags, single rotating form tip
- Video dims during rest, plays during work

### RestTimer
- SVG circular progress ring (orange) shrinking as rest elapses
- MM:SS readout + "recover" label
- Rotating recovery cue from the exercise

### WorkoutProgress
- "Exercise X of Y" + elapsed clock
- Overall progress bar (completed sets / total sets)
- Per-exercise segment chips (done = orange, active = dim, pending = faint)
- Percentage footer

### CoachFeedback
- Coach avatar (initials) + name
- Tone-styled message bubble: tip (blue), praise (green), correction (orange), motivation (violet)
- Animated text swap on each new cue; ring pulses during work

### MusicPlayer
- Self-contained: current track, artist, BPM, equalizer animation
- Play/Pause, Prev/Next, simulated progress bar (auto-advances, loops)
- `<audio>` element attempts real playback; visual progress is timer-driven so it works without audio assets

### CompletionScreen
- Trophy animation, "Workout complete!"
- Stat cards: Time, Exercises, Sets
- "Do it again" restart

---

## Data Model

```typescript
LiveExercise {
  id, name, section: 'warmup'|'main'|'cooldown'
  sets, duration (active work seconds), rest (seconds)
  muscleGroups, equipment?, videoUrl?, formTips[], cues[]
}

LiveCoachCue { id, tone: 'tip'|'praise'|'correction'|'motivation', text }

MusicTrack { id, title, artist, durationSec, url, bpm }

LiveWorkoutPlan {
  id, name, focus, coachName, coachInitials
  estimatedDuration, exercises[], playlist[]
}
```

All mock data lives in `features/live-workout/data/_mocks.ts`. The engine simulates async load (500ms) to match the platform's loading-state convention.

---

## States

| State | Behavior |
|-------|----------|
| Loading | Skeleton (header, progress, stage, panel) |
| Idle | Stage shows first exercise dimmed; single "Start Workout" CTA |
| Active (work) | Video plays, timer counts down, coach tip, music up |
| Active (rest) | Circular rest timer, recovery cue, music ducked |
| Active (transition) | "Get ready" banner, next exercise announced |
| Paused | Interval frozen; Resume button |
| Complete | Celebration + stats + restart |

---

## Design System Compliance

- Dark theme: `surface-0` page, `surface-1/2` cards, white text, `orange-500` primary accent
- Framer Motion on every transition (stage swap, timer ring, cue text, progress bar, completion)
- Mobile-first, content area `max-w-2xl` (matches AthleteLayout)
- One primary action per phase; controls sticky at bottom
- `prefers-reduced-motion` respected via global globals.css rule
- No external UI library — pure Tailwind + design tokens, consistent with the rest of the app

---

## Out of Scope / Follow-ups

- **Experience 06 carry-over:** `features/workout/components/WorkoutHistory.tsx` and `WorkoutAnalytics.tsx` contain pre-existing JSX structural errors (and use an unimplemented `var(--color-*)` token set) that block a full `next build`. They are unrelated to this experience; recommend a separate pass to repair or align them to the `surface-*` design tokens.
- Real video/audio assets (paths are placeholders; components degrade gracefully).
- Persisting completed live sessions into the athlete's history (wire `useWorkoutHistory`).
- Coach live-messaging (real-time socket) replacing scripted cues.

---

## Verification

- `npx tsc --noEmit` → no errors in `features/live-workout/**`
- Manual: `npm run dev` → `/athlete/today/workout` → Start → watch work/rest/transition flow, coach cues, music, progress, completion, restart.
