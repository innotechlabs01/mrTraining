# Experience 06 — Workout Experience Design

> Complete workout lifecycle management: exercise library, builder, templates, AI suggestions, scheduling, publishing, execution, history, analytics.

---

## Architecture

### Route Structure

**Coach (management):**
```
/coach/workouts/layout.tsx        # Sub-layout with tab bar
/coach/workouts/page.tsx          # Dashboard redirect
/coach/workouts/exercises/        # Exercise Library (grid, search, CRUD)
/coach/workouts/builder/          # Workout Builder (compose exercises)
/coach/workouts/templates/        # Template Gallery
/coach/workouts/schedule/         # Schedule & Publish (calendar + athlete assignment)
```

**Athlete (consumption):**
```
/athlete/today/workout            # Workout Execution (existing, enhanced)
/athlete/history/                 # Past workout records
/athlete/analytics/               # Personal analytics (volume, PRs, consistency)
```

### Shared Module
New `features/workout/` module with unified types consumed by both coach and athlete.

### Coach Layout
Sub-layout under `/coach/workouts/` with tab navigation bar replacing TimelineSidebar context for these pages, leaving the coach timeline layout intact for `/coach/today/*`.

---

## Screens

### 1. Exercise Library (Coach)
**Route:** `/coach/workouts/exercises`
**States:** loading (skeleton grid), empty ("Build your first exercise"), error, data
**Content:** Search bar + filter chips (muscle group, equipment) + exercise card grid
**Exercise Card:** name, muscle group tags, equipment icon, difficulty badge, 3-dot menu (Edit/Delete)
**Create/Edit:** Modal with name, description, muscle group multi-select, equipment, difficulty, instructions (textarea list), video URL
**Primary action:** "Create Exercise" button → opens modal

### 2. Workout Builder (Coach)
**Route:** `/coach/workouts/builder`
**States:** loading, empty, error, data (workout in progress or saved)
**Content:** Two-panel layout
- **Left panel:** Searchable exercise list (from library) with "+ Add" buttons
- **Right panel:** Workout composition area
  - Name field, focus/goal selector, estimated duration
  - Ordered exercise list with drag/reorder, inline edit (sets/reps/rest/weight/RPE)
  - "Save Plan" and "Save as Template" buttons
  - "AI Generate" button → opens AI Generation modal

### 3. Templates (Coach)
**Route:** `/coach/workouts/templates`
**States:** loading (skeleton cards), empty ("Create your first template"), error, data
**Content:** Card grid of templates. Each card: name, goal badge, exercise count, duration, frequency
**Click:** Opens full workout preview in modal → "Use in Builder" or "Edit"
**Primary action:** "New Template" button

### 4. Schedule + Publishing (Coach)
**Route:** `/coach/workouts/schedule`
**States:** loading, empty ("Schedule your first session"), error, data
**Content:** Week-based calendar grid with event cards
**Event Card:** workout name, time, athlete count, status badge (Draft/Scheduled/Published/Completed)
**Create Event:** Modal with date picker, time, workout selector, athlete multi-select, notes
**Publish:** Button on draft/scheduled events → flips to published status
**Published events** appear in athlete's today view

### 5. Workout Execution (Athlete — enhance existing)
Enhance `WorkoutSession.tsx` to show:
- Richer exercise data (muscle group, form tips during rest)
- RPE logging per set after completion
- Actual weight tracking
Already has: rest timer, completion celebration, progress bar

### 6. History (Athlete)
**Route:** `/athlete/history`
**Content:** List of completed workouts sorted by date
- Row: date, workout name, duration, volume, exercises breakdown
- Expand row: per-exercise set details (target vs actual)
- Empty: "Complete your first workout to see history here"
- Loading: skeleton list

### 7. Analytics (Athlete)
**Route:** `/athlete/analytics`
**Content:** 
- Stat cards (top row): Total Sessions, Total Volume, Avg RPE, Streak
- Weekly volume chart (CSS bar chart, no library)
- Recent PRs list
- Consistency percentage
- Empty: "Start training to see your analytics"

---

## Data Model

```
Exercise → WorkoutPlan / Template → ScheduleEvent → WorkoutSessionRecord → Analytics
```

All types unified in `features/workout/types/`.

---

## Implementation

- Follow same patterns as existing Coach OS and Athlete OS
- Framer Motion for all interactions
- Dark theme (surface-0 to surface-6), Electric Orange primary
- Loading/empty/error/data states on every screen
- All mock data with simulated async loading
- One primary action per screen
