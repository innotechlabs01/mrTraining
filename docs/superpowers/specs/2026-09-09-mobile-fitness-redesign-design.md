# MR Training Mobile — Fitness Redesign Design Spec

**Date:** 2026-09-09
**Status:** Approved
**Scope:** `apps/mobile/` — UI/UX overhaul + new fitness features

---

## 1. Executive Summary

Complete redesign of MR Training mobile app using Sleek Stride as UI reference. Four-phase rollout: UI foundation, dashboard with activity rings, workout experience with AI form analysis, and social/gamification layer.

**Goal:** Transform functional-but-flat app into premium fitness experience that hooks athletes visually and retains them through competition and accountability.

---

## 2. Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Primary Color | Volt `#C8FF00` | Brand §4 authority. Resolves divergence from Electric Green. |
| Activity Rings | Hybrid (Move + Exercise + Recovery) | Familiar Apple Watch pattern + coaching-relevant Recovery metric. |
| Gamification | Medium | Streaks + Badges + PRs + Challenges + Group Leaderboards. Not consumer-heavy, not too light. |
| Dashboard | Fixed bento grid | Simpler, consistent UX, faster to ship. |
| Workout UI | Timer-centric + Camera AI | Rest timer as visual anchor. AI form analysis ensures valid rep counting. |
| Video Analytics | Play/pause tracking + Coach metrics | Gives coaches insight into athlete content engagement. |
| Social Feed | Coach-only | Private, accountability-focused, no social distraction. |

---

## 3. Phase 1: UI Foundation

### 3.1 Token Updates

```typescript
// apps/mobile/src/shared/theme/tokens.ts
export const colors = {
  base: '#0A0B0D',           // App background (darkest)
  surface: '#0F0F0F',        // Primary surface
  surfaceRaised: '#141416',  // Elevated surface
  border: '#1A1A1C',         // Hairlines
  primary: '#C8FF00',        // Volt — THE accent
  primaryPressed: '#A8D900', // Pressed state
  success: '#34D399',
  warning: '#FBBF24',
  error: '#FF5A5F',
  text: '#F5F5F7',
  textSecondary: '#9CA3AF',
  skeletonBase: '#141416',
  skeletonHighlight: '#1A1A1C',
};
```

**90/10 Rule:** ≥90% neutrals, ≤10% Volt. One primary CTA per screen.

### 3.2 New Component Primitives

| Component | Purpose | Location |
|-----------|---------|----------|
| `BentoGrid` | Flexible tile layout for dashboard | `shared/components/ui/BentoGrid.tsx` |
| `ActivityRings` | SVG animated rings (Move/Exercise/Recovery) | `shared/components/fitness/ActivityRings.tsx` |
| `RestTimer` | Circular countdown timer | `shared/components/fitness/RestTimer.tsx` |
| `StatCard` | Large numeral + label tile | `shared/components/ui/StatCard.tsx` |
| `WorkoutCard` | Photo thumbnail + duration + difficulty | `shared/components/fitness/WorkoutCard.tsx` |
| `LeaderboardRow` | Rank + avatar + score | `shared/components/social/LeaderboardRow.tsx` |
| `StreakBadge` | Flame icon + count | `shared/components/gamification/StreakBadge.tsx` |
| `AchievementBadge` | Unlockable icon | `shared/components/gamification/AchievementBadge.tsx` |
| `FormAnalyzer` | Camera + AI form feedback | `shared/components/fitness/FormAnalyzer.tsx` |
| `VideoPlayer` | Tracked video with analytics | `shared/components/media/TrackedVideoPlayer.tsx` |

### 3.3 Design Principles

- **Clean Athletic** aesthetic (Sleek Stride reference)
- Off-white canvas → dark-first (MR Training brand)
- White cards floating on soft shadow
- Large bold numerals, quiet grey labels
- One energetic accent (Volt) for rings, progress, CTA
- 22px rounded corners on cards
- Flat bottom tab bar with Volt active state

---

## 4. Phase 2: Dashboard + Activity Rings

### 4.1 Bento Grid Layout

Fixed 2-column grid. Tiles vary in height.

```
┌─────────────┬──────────┐
│ Activity    │ Steps    │
│ Rings       │ 8,240    │
│ (2x2)       │ (1x1)    │
├─────────────┼──────────┤
│ Heart Rate  │ Calories │
│ 72 bpm      │ 1,840    │
│ (1x1)       │ (1x1)    │
├─────────────┴──────────┤
│ Start Workout (CTA)    │
│ (2x1)                  │
├────────────────────────┤
│ Today's Sessions       │
│ (2x1)                  │
├────────────────────────┤
│ Active Workouts        │
│ (2x1)                  │
├────────────────────────┤
│ Community (Coach Feed) │
│ (2x1)                  │
└────────────────────────┘
```

### 4.2 Activity Rings Component

**Metrics:**
- **Move** (outer ring): Active calories burned vs daily goal
- **Exercise** (middle ring): Active minutes vs daily goal
- **Recovery** (inner ring): Readiness score (0-100)

**Visual:**
- SVG circles with stroke-dasharray animation
- Clockwise fill from top (12 o'clock)
- Glow effect on completion
- Large centered number (total % or score)

**Data Source:**
- Move/Exercise: Apple HealthKit / Google Health Connect
- Recovery: `useRecoveryData()` hook (existing)

### 4.3 Dashboard Tiles

| Tile | Data | Size |
|------|------|------|
| Activity Rings | Move/Exercise/Recovery | 2x2 |
| Steps | HealthKit/HealthConnect | 1x1 |
| Heart Rate | Wearable API | 1x1 |
| Calories | HealthKit + Nutrition | 1x1 |
| Start Workout | Navigation CTA | 2x1 |
| Today's Sessions | `/athlete/today` API | 2x1 |
| Active Workouts | `/athlete/today` API | 2x1 |
| Community | Coach feed preview | 2x1 |

---

## 5. Phase 3: Workout Experience

### 5.1 Execution Screen Layout

Timer-centric with camera AI integration.

```
┌────────────────────────┐
│   Exercise Name        │
│   Set 3/4  Reps 10    │
├────────────────────────┤
│   ┌──────────────┐     │
│   │  CAMERA FEED │     │
│   │  (AI Form)   │     │
│   │              │     │
│   └──────────────┘     │
│   Form: ✓ Good (3/4)   │
├────────────────────────┤
│    ┌──────────────┐    │
│    │   REST       │    │
│    │   0:45       │    │
│    │   (ring)     │    │
│    └──────────────┘    │
├────────────────────────┤
│   Weight: 80 kg  [±]   │
├────────────────────────┤
│   Up Next: Squat 4x8   │
├────────────────────────┤
│  [Pause]    [Complete]  │
└────────────────────────┘
```

### 5.2 AI Form Analysis

**Requirements:**
- Real-time camera feed during exercise
- AI model analyzes movement form
- Rep counted ONLY if form score ≥ threshold
- Bad form = rep NOT counted + visual/audio feedback
- Coach configurable strictness per exercise

**Data Flow:**
```
Camera → AI Model → Form Score → Rep Counter → Session Stats
                                  ↓
                          if score < threshold:
                          rep not counted
                          feedback shown
```

**Form Metrics:**
- Rep count (valid vs attempted)
- Form score per rep (0-100)
- Average form score per set
- Common form issues (logged for coach)

**Storage:**
```typescript
FormEvent {
  athleteId: string;
  exerciseId: string;
  repNumber: number;
  formScore: number;      // 0-100
  isValid: boolean;       // formScore >= threshold
  issues: string[];       // ["knee valgus", "incomplete ROM"]
  timestamp: number;
}
```

### 5.3 Rest Timer

- Circular countdown ring (animated)
- Configurable rest duration (default: 90s)
- Audio/vibration alert at 0
- Skip button (early rest complete)
- Auto-start after set completion

### 5.4 Weight Input

- Large display: `80 kg`
- Quick +/- buttons (2.5kg increments)
- Long-press for rapid adjustment
- Haptic feedback on change

---

## 6. Phase 3 (Extended): Video Analytics

### 6.1 Tracking Requirements

**Events to capture:**
- Play (position, timestamp)
- Pause (position, timestamp)
- Complete (total watch time)
- Seek (from position, to position)
- Re-watch (play count per video)

**Data Model:**
```typescript
VideoEvent {
  id: string;
  athleteId: string;
  videoId: string;
  eventType: 'play' | 'pause' | 'complete' | 'seek';
  position: number;        // seconds
  duration: number;        // total video seconds
  timestamp: number;
}
```

### 6.2 Coach Dashboard Metrics

| Metric | Description |
|--------|-------------|
| Most Viewed Videos | Ranked by view count |
| Average Watch Time | Per video |
| Completion Rate | % who finish each video |
| Drop-off Points | Where athletes quit (heat map) |
| Importance Score | Composite: views × completion × re-watches |
| Athlete Engagement | Which athletes watch vs skip |

### 6.3 Implementation

**Storage:** MMKV for local cache, API sync for coach dashboard.

**API Endpoints (new):**
- `POST /api/coaching/video-events` — log event
- `GET /api/coaching/video-analytics/:videoId` — coach metrics
- `GET /api/coaching/video-analytics/athlete/:athleteId` — athlete engagement

---

## 7. Phase 4: Social + Gamification

### 7.1 Social Feed (Coach-Only)

**Visibility:** Athlete + assigned coach only. No public feed.

**Feed Items:**
- Workout completed
- Personal record achieved
- Challenge entry
- Milestone (100th session, 7-day streak)
- Achievement unlocked

**API:** Reuse existing `/api/coaching/messages` pattern.

### 7.2 Gamification Features

#### Streaks
- Consecutive training days
- Calendar visualization (heat map)
- Milestones: 7, 30, 90, 365 days
- Break = streak reset (with grace period option)

#### Badges (Achievements)

| Badge | Condition | Icon |
|-------|-----------|------|
| First Workout | Complete first session | 🏋️ |
| 7-Day Streak | 7 consecutive days | 🔥 |
| 30-Day Streak | 30 consecutive days | 💪 |
| 100 Sessions | Complete 100 sessions | 💯 |
| PR Crusher | Set 5+ personal records | 🏆 |
| Form Master | 90%+ avg form score | ⭐ |
| Early Bird | 5 workouts before 7am | 🌅 |
| Weekend Warrior | 10 weekend workouts | ⚔️ |

#### Personal Records (PRs)

**Tracked PRs:**
- Max weight per exercise
- Best form score per exercise
- Longest workout
- Most volume in session
- Fastest completion time

**Storage:**
```typescript
PersonalRecord {
  athleteId: string;
  exerciseId: string;
  type: 'max_weight' | 'best_form' | 'max_volume' | 'fastest_time';
  value: number;
  achievedAt: number;
  workoutId: string;
}
```

**Celebration:** Full-screen animation on PR achievement.

#### Weekly Challenges

**Coach-organized:**
- Create challenge (name, rules, duration, scoring)
- Athletes join/compete
- Progress posts auto-generated
- Leaderboard updates in real-time

**Challenge Types:**
- Volume challenge (total kg lifted)
- Consistency challenge (most sessions)
- Form challenge (highest avg form score)
- Custom (coach-defined rules)

#### Group Leaderboards

**Scope:** Within athlete's group/team only.

**Rankings:**
- Weekly points
- Monthly points
- All-time points

**Scoring:**
- Workout completed: +10 pts
- PR achieved: +25 pts
- Challenge win: +50 pts
- Streak day: +5 pts

---

## 8. Implementation Phases

### Phase 1: UI Foundation (Week 1-2)
- [ ] Update tokens.ts with Volt colors
- [ ] Create BentoGrid component
- [ ] Create ActivityRings component
- [ ] Create RestTimer component
- [ ] Create StatCard component
- [ ] Create WorkoutCard component
- [ ] Update GlassDock with new styling
- [ ] Refactor existing screens to use new tokens

### Phase 2: Dashboard (Week 3-4)
- [ ] Redesign TodayScreen with bento layout
- [ ] Integrate ActivityRings with HealthKit/HealthConnect
- [ ] Add stats tiles (steps, HR, calories)
- [ ] Update session/workout cards
- [ ] Add community coach feed preview

### Phase 3: Workout Experience (Week 5-8)
- [ ] Redesign WorkoutExecutionScreen (timer-centric)
- [ ] Implement FormAnalyzer with camera AI
- [ ] Build rest timer with audio/vibration
- [ ] Add weight input with quick +/- buttons
- [ ] Implement video analytics tracking
- [ ] Build coach video metrics dashboard

### Phase 4: Social + Gamification (Week 9-12)
- [ ] Implement streak tracking
- [ ] Create badge system
- [ ] Build PR tracking with celebrations
- [ ] Add weekly challenges
- [ ] Create group leaderboards
- [ ] Build coach-only feed

---

## 9. Technical Requirements

### 9.1 Dependencies (new)

| Package | Purpose |
|---------|---------|
| `react-native-reanimated` | Ring animations, transitions |
| `react-native-vision-camera` | Camera feed for AI analysis |
| `react-native-worklets` | Frame processing for AI |
| `@shopify/flash-list` | Performant lists (already in stack) |
| `react-native-svg` | Activity rings rendering |
| `expo-haptics` | Haptic feedback |

### 9.2 API Contracts (new)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/coaching/video-events` | POST | Log video play/pause events |
| `/api/coaching/video-analytics/:videoId` | GET | Coach video metrics |
| `/api/coaching/form-events` | POST | Log AI form analysis results |
| `/api/coaching/personal-records` | GET/POST | PR tracking |
| `/api/coaching/streaks` | GET | Streak data |
| `/api/coaching/badges` | GET | Achievement badges |
| `/api/coaching/challenges` | GET/POST | Weekly challenges |
| `/api/coaching/leaderboard` | GET | Group leaderboards |
| `/api/coaching/coach-feed` | GET | Coach-only activity feed |

### 9.3 Backend Changes

**Required (coordinar con Web/API):**
- New tables: `video_events`, `form_events`, `personal_records`, `streaks`, `badges`, `challenges`, `leaderboard_entries`
- New API routes for all endpoints above
- AI model integration for form analysis (third-party or custom)

---

## 10. Success Metrics

| Metric | Target (3 months post-launch) |
|--------|-------------------------------|
| Daily Active Users | +30% vs baseline |
| Workout Completion Rate | +20% vs baseline |
| Avg Session Duration | +15% vs baseline |
| Athlete Retention (30-day) | +25% vs baseline |
| Coach Engagement | +40% vs baseline |

**Note:** Baselines to be measured before Phase 1 launch. Metrics tracked via existing analytics + new gamification events.

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI form analysis accuracy | High | Start with simple exercises, iterate. Human review of edge cases. |
| Camera permissions | Medium | Clear UX explaining why camera needed. Fallback to manual counting. |
| Performance on low-end devices | Medium | Optimize AI model, frame rate throttling, graceful degradation. |
| Backend API development time | High | Frontend-first approach with mock data. API contracts defined upfront. |

---

## 12. Resolved Questions

| Question | Decision | Rationale |
|----------|----------|-----------|
| AI form analysis source | Google MediaPipe (or similar third-party) | Faster to ship, proven accuracy, no ML team needed. |
| Camera permission UX | Modal explaining: "Camera helps count reps accurately and improve your form. Video stays on device." | Transparent, value-focused, privacy-assured. |
| Badge unlock animation | Subtle toast + badge added to profile. No full-screen interruption. | Non-intrusive, keeps workout flow. |
| Leaderboard reset | Weekly (Monday reset). Monthly leaderboard as separate view. | Fresh competition each week, historical view for trends. |

---

## Appendix A: Sleek Stride Reference

Source: https://sleek.design/templates/fitness-app

**Key patterns adopted:**
- Bento-grid dashboard with floating tiles
- Activity rings (3-color)
- Large bold numerals with quiet labels
- Workout library cards with photos
- Rest timer ring during sessions
- Progress view with weekly minutes + streaks
- History list grouped by week

**Patterns modified:**
- Dark-first (MR Training brand, not off-white)
- Volt accent (not orange)
- Camera AI form analysis (unique to MR Training)
- Coach-only social (not public feed)
