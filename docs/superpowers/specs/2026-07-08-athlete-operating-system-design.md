# Athlete Operating System — Design Specification

> Build the complete athlete experience — a guided daily journey through morning check-in, workout, recovery, nutrition, community, and night summary. Every screen answers "what should I do now?" with one clear action. Never overload. Always motivate.

---

## Architecture

### Route Structure
```
/(app)/athlete/
├── layout.tsx              # AthleteLayout (simple top bar + bottom nav)
├── page.tsx                # Redirect to /athlete/today
└── today/
    ├── page.tsx            # Redirect to current block
    └── [block]/
        └── page.tsx        # Block page (morning, workout, recovery, nutrition, community, night)
```

### Time Blocks
| Block | Time | Purpose | Primary Action |
|-------|------|---------|---------------|
| morning | 6:00 AM | Wake up, sleep review, today's focus | "Start Your Day" / "View Workout" |
| workout | 7:00 AM | Guided workout with rest timer | "Complete Set" → "Finish" |
| recovery | Post-workout | Stretching, hydration | "Log Recovery" |
| nutrition | Meal times | Meal logging, water tracking | "Log Meal" / "Drink Water" |
| community | Flexible | Team feed, coach messages | Reply / Cheer |
| night | 8:00 PM | Summary, streak, tomorrow | "Preview Tomorrow" |

### Layout
- **Top bar:** Greeting + profile avatar + day progress dots
- **Content:** Full-width, focused on one task
- **Bottom nav:** Time block progress (compact dots + current label)
- No sidebar, no right panel — keep it simple for athletes

### Design Notes
- Big typography, lots of whitespace
- Encouraging tone throughout ("Great job!", "You've got this", "Another day stronger")
- One primary action per screen (large button)
- Minimal metrics — only what the athlete needs to act on
- Gamification: streak counter, celebration animations
- Every screen has loading (skeleton with pulse), empty (motivational), error (retry), and completion states

---

## Screen-by-Screen

### 1. Morning Check-in
- "Good morning, [name]" with time-based greeting
- Sleep quality: emoji + hours
- Today's workout: name + focus + short coach note
- Optional: weather, daily quote
- **Primary:** "Let's Go" → navigate to workout
- **Animations:** Staggered fade-up, greeting appears first

### 2. Guided Workout
- Current exercise: big name, sets/reps/weight
- Progress: "Set 2 of 4" with progress bar
- Rest timer between sets (countdown with motivational message)
- Next exercise preview
- **Completion:** Full-screen "Workout Complete!" with animated checkmark + streaks
- **States:** loading (exercise skeleton), empty, error, rest (timer active), active (performing), complete

### 3. Recovery
- Post-workout stretching list with checkboxes
- Hydration reminder
- Recovery tip from coach/AI
- **Primary:** "Log Recovery Complete"
- Simple, calming design

### 4. Nutrition
- Current meal suggestion
- Water tracking (glass fill)
- Supplement reminders
- **Primary:** "Log Meal" / "Add Water"
- **States:** tracking, logged (checked state), all logged (celebration)

### 5. Community
- Team activity feed
- Coach announcements
- Teammate achievements (cheer button)
- **Primary:** React or reply
- **States:** loading (post skeletons), empty (welcome message), data

### 6. Night Summary
- Today's achievements (workout done, meals logged, streak)
- Motivational quote
- Tomorrow's preview
- **Primary:** "Great Day" / "Preview Tomorrow"
- **Animations:** Staggered stat cards, streak fire, celebrate

---

## Implementation Approach
Use same patterns as Coach OS:
- `'use client'` components
- `cn()` from `@/lib/utils`
- Framer Motion (easeOut, 0.25-0.3s)
- `glass-card` pattern
- Dark theme (surface-0 to surface-6)
- Loading/empty/error/data states everywhere
- Dynamic imports with Suspense
- Mock data in `data/_mocks.ts`
