# Dashboard Redesign — Neon Cyber-Gym

**Date:** 2026-07-06
**Style:** Neon cyber-gym aesthetic
**Layout:** Sidebar navigation + single scrollable content

## Goal

Redesign the MR TRAINING dashboard from minimal placeholder cards into a full-featured, gym-themed performance dashboard with a neon cyber-gym visual identity. All data sourced from PocketBase.

## Layout

### Sidebar (fixed 260px, left)
- MR TRAINING logo at top
- Nav links: Dashboard, Workouts, Profile, Billing
- User avatar + sign out button at bottom
- Background: `#0A0B0D`
- Right border: 1px solid `rgba(255,107,0,0.15)`

### Main Content (scrollable, bg `#0F0F0F`)
Single scroll page with 4 grouped sections.

## Sections

### 1. Training Hub

#### Today's Workout (hero card)
- Exercise list with: exercise name, sets × reps, weight (kg), completed checkbox
- "Start Session" button (electric orange glow)
- Empty state: "No workout scheduled today"

#### Performance Stats (4-card row)
- Workouts This Week (count)
- Total Volume (kg, formatted with commas)
- Day Streak (🔥 icon + number)
- Calories Burned (sum)
- Each card: neon glow progress bar, Montserrat Bold 48px number, uppercase Inter label

#### Active Plan
- Plan name + progress bar (gradient orange→blue fill)
- Next session preview (name + time)

### 2. Progress Lab

#### Body Metrics
- Weight trend (sparkline or simple chart)
- Body fat % (latest value)
- Strength maxes: Bench, Squat, Deadlift (latest value each)
- Use `progress_metrics` collection

#### Workout History
- Recent completed workouts as compact cards
- Each: session name, date, completion checkmark, duration

### 3. Fuel & Recovery

#### Nutrition Tracker
- Circular macro ring (protein / carbs / fat)
- Calorie goal bar
- Note: nutrition data is mock for now (no PocketBase collection yet)

### 4. Ecosystem

#### Community Feed
- Recent activity from other athletes (mock data)
- Each: avatar, name, action ("Completed Upper Body Strength"), timestamp

#### Coach Messages
- Chat-like message cards
- Each: coach avatar, message text, timestamp
- Mock data for now

## Visual Style — Neon Cyber-Gym

### Cards
- Background: `#141618`
- Border: 1px solid `rgba(255,107,0,0.2)` (orange accent) or `rgba(0,102,255,0.2)` (blue accent)
- Border-radius: 12px
- Box-shadow: `0 0 20px rgba(255,107,0,0.1)` (orange glow) or `0 0 20px rgba(0,102,255,0.1)` (blue glow)
- Hover: intensified glow (`0 0 30px rgba(255,107,0,0.2)`)

### Progress Bars
- Track height: 8px, bg `#0F0F0F`, border-radius 9999px
- Fill: gradient from electric orange `#FF6B00` to performance blue `#0066FF`
- Filled portion has subtle glow

### Stats Numbers
- Font: Montserrat Bold, 48px
- Color: white or accent color
- Text-shadow glow on accent numbers

### Labels
- Font: Inter 600, 11px, uppercase, letter-spacing 0.1em
- Color: `#C4C7C7` at 60% opacity

### Sidebar
- Background: `#0A0B0D`
- Active nav: electric orange left border + text color
- Inactive nav: `#C4C7C7` text, hover to white

## Data Sources

### Existing Collections (use as-is)
- `workouts` — user's workouts
- `exercises` — exercises per workout
- `workout_programs` — training programs
- `progress_metrics` — body/strength metrics
- `plans` — subscription plans
- `subscriptions` — user subscriptions

### New Repositories Needed
1. `IExerciseRepository` / `PocketBaseExerciseRepository` — `findByWorkoutId`, `create`, `update`
2. `IProgressMetricRepository` / `PocketBaseProgressMetricRepository` — `findByUserAndType`, `findLatest`, `create`
3. `ISubscriptionRepository` / `PocketBaseSubscriptionRepository` — `findByUserId`, `findActive`

### Mock Data Sections (no PocketBase collection yet)
- Nutrition Tracker (calories, macros)
- Community Feed (other athletes' activity)
- Coach Messages (chat messages)

## Files to Create/Modify

### New Files
- `src/app/(dashboard)/layout.tsx` — sidebar layout (replace current top-bar layout)
- `src/components/dashboard/sidebar.tsx` — sidebar navigation
- `src/components/dashboard/today-workout.tsx` — hero workout card
- `src/components/dashboard/performance-stats.tsx` — 4-card metrics row
- `src/components/dashboard/active-plan.tsx` — plan progress card
- `src/components/dashboard/body-metrics.tsx` — body metrics + sparklines
- `src/components/dashboard/workout-history.tsx` — recent sessions list
- `src/components/dashboard/nutrition-tracker.tsx` — macro ring + calorie bar
- `src/components/dashboard/community-feed.tsx` — activity feed
- `src/components/dashboard/coach-messages.tsx` — message cards
- `src/domain/entities/exercise.entity.ts` — Exercise entity
- `src/domain/entities/progress-metric.entity.ts` — ProgressMetric entity
- `src/domain/entities/subscription.entity.ts` — Subscription entity
- `src/infrastructure/repositories/exercise.repository.ts` — PocketBase repo
- `src/infrastructure/repositories/progress-metric.repository.ts` — PocketBase repo
- `src/infrastructure/repositories/subscription.repository.ts` — PocketBase repo

### Modified Files
- `src/app/(dashboard)/layout.tsx` — replace top-nav with sidebar layout
- `src/app/(dashboard)/dashboard/page.tsx` — compose all dashboard sections

## Implementation Order

1. Sidebar layout + navigation
2. Exercise + ProgressMetric + Subscription entities + repos
3. Today's Workout component
4. Performance Stats component
5. Active Plan component
6. Body Metrics component
7. Workout History component
8. Nutrition Tracker (mock)
9. Community Feed (mock)
10. Coach Messages (mock)
11. Wire all into dashboard page
12. Final verification
