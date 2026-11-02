# API + Mobile Integration Analysis

**Date:** 2026-09-09
**Status:** Analysis Complete — Awaiting Decision

---

## 1. Mobile Next Steps Analysis

### Step 1: Wire Gamification Services to Backend API

**Current State:**
- `streakService.ts` — Local-only, calculates streaks from workout dates
- `badgeService.ts` — Local-only, evaluates badges from stats
- `prService.ts` — Local-only, tracks personal records

**Problem:**
- Data is device-local → lost on uninstall/change device
- No cross-device sync
- No coach visibility into athlete gamification
- No server-side validation (client can fake streaks)

**What Needs to Happen:**
1. Create API endpoints for streaks, badges, PRs
2. Create database tables to persist gamification data
3. Migrate mobile services to use API instead of local-only
4. Add server-side validation (e.g., can't log 2 workouts in same day for streak)

**Complexity:** HIGH
**Priority:** HIGH — Core feature, data loss risk

---

### Step 2: Add Real Device QA for HealthKit/HealthConnect

**Current State:**
- `healthService.ts` — Platform-aware wrapper with fallback
- Tests mock native modules
- No real device testing

**Problem:**
- HealthKit/HealthConnect permissions are tricky
- Different devices report different data formats
- Background sync may not work reliably
- Battery drain from frequent polling

**What Needs to Happen:**
1. Test on real iOS device with HealthKit
2. Test on real Android device with HealthConnect
3. Verify permission flows
4. Test background sync
5. Measure battery impact
6. Handle edge cases (no data, partial data, permission denied)

**Complexity:** MEDIUM
**Priority:** MEDIUM — Can ship with fallback, but quality risk

---

### Step 3: Add MediaPipe Pose Detection Pipeline

**Current State:**
- `FormAnalyzer.tsx` — Display-only component
- Receives form score via props
- No actual pose detection

**Problem:**
- Form score is always 0
- No camera integration
- No ML pipeline
- MediaPipe is third-party (dependency risk)

**What Needs to Happen:**
1. Add camera permission handling
2. Integrate MediaPipe Pose (or MoveNet)
3. Create frame processing pipeline
4. Calculate form score from landmarks
5. Feed score to FormAnalyzer
6. Optimize for 60 FPS on mobile

**Complexity:** VERY HIGH
**Priority:** LOW — Nice-to-have, not core

---

### Step 4: Consider Native Blur Library for GlassDock

**Current State:**
- `GlassDock.tsx` — CSS-only frosted glass effect
- Uses opacity + border
- No native blur

**Problem:**
- CSS blur doesn't look as good as native
- Performance may suffer with complex backgrounds
- No true frosted glass effect

**What Needs to Happen:**
1. Evaluate `@react-native-community/blur`
2. Test performance on low-end devices
3. Implement fallback for unsupported devices
4. A/B test visual quality

**Complexity:** LOW
**Priority:** LOW — Polish, not functional

---

## 2. API Gap Analysis

### What Mobile Needs vs What API Has:

| Feature | Mobile Implementation | API Status | Gap |
|---------|----------------------|------------|-----|
| **Streaks** | `streakService.ts` (local) | ❌ None | **CRITICAL** |
| **Badges** | `badgeService.ts` (local) | ❌ None | **CRITICAL** |
| **PRs** | `prService.ts` (local) | ❌ None | **CRITICAL** |
| **Leaderboard** | `Leaderboard.tsx` (local) | ❌ None | **HIGH** |
| **Coach Feed** | `CoachFeedScreen.tsx` (local) | ⚠️ `/athlete/community/messages` | **MEDIUM** |
| **Video Analytics** | `videoAnalytics.ts` (local) | ⚠️ `/video-views` (basic) | **MEDIUM** |
| **Activity Rings** | `healthService.ts` (HealthKit) | ⚠️ `/health/metrics` | **LOW** |
| **Today Dashboard** | `TodayScreen.tsx` | ✅ `/athletes/today` | **NONE** |

---

## 3. Proposed API Endpoints

### 3.1 Gamification Domain

```
# Streaks
GET    /api/v1/gamification/streak           → Get user streak data
POST   /api/v1/gamification/streak/log       → Log workout day (server-validated)

# Badges
GET    /api/v1/gamification/badges           → Get user badges
POST   /api/v1/gamification/badges/check     → Check for new unlocks

# Personal Records
GET    /api/v1/gamification/prs              → Get personal records
POST   /api/v1/gamification/prs              → Record new PR
GET    /api/v1/gamification/prs/history      → PR history per exercise
```

**Database Tables:**
```sql
-- Streak tracking
CREATE TABLE gamification_streaks (
    id UUID PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    athlete_id UUID NOT NULL REFERENCES athletes(id),
    current_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    last_workout_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workout days (for streak calculation)
CREATE TABLE gamification_workout_days (
    id UUID PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    athlete_id UUID NOT NULL REFERENCES athletes(id),
    workout_date DATE NOT NULL,
    workout_id UUID REFERENCES workouts(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(athlete_id, workout_date)
);

-- Badges
CREATE TABLE gamification_badges (
    id UUID PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    athlete_id UUID NOT NULL REFERENCES athletes(id),
    badge_id VARCHAR(50) NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(athlete_id, badge_id)
);

-- Personal Records
CREATE TABLE gamification_prs (
    id UUID PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    athlete_id UUID NOT NULL REFERENCES athletes(id),
    exercise_id UUID NOT NULL REFERENCES exercises(id),
    best_value DECIMAL(10,2) NOT NULL,
    unit VARCHAR(10) NOT NULL,
    achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    previous_best DECIMAL(10,2),
    UNIQUE(athlete_id, exercise_id)
);
```

---

### 3.2 Leaderboard Domain

```
# Group Leaderboard
GET    /api/v1/leaderboard                   → Get group leaderboard
GET    /api/v1/leaderboard/weekly            → Get weekly standings
GET    /api/v1/leaderboard/history           → Historical rankings
```

**Database Tables:**
```sql
-- Weekly leaderboard snapshots
CREATE TABLE leaderboard_weekly (
    id UUID PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    group_id UUID NOT NULL REFERENCES groups(id),
    athlete_id UUID NOT NULL REFERENCES athletes(id),
    week_start DATE NOT NULL,
    score INT NOT NULL DEFAULT 0,
    rank INT,
    workouts_completed INT DEFAULT 0,
    total_minutes INT DEFAULT 0,
    streak_days INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, athlete_id, week_start)
);
```

---

### 3.3 Coach Feed Domain

```
# Coach-Only Feed
GET    /api/v1/coach/feed                    → Get coach feed posts
POST   /api/v1/coach/feed                    → Create post (coach only)
POST   /api/v1/coach/feed/:id/react          → React to post
GET    /api/v1/coach/feed/:id/comments       → Get comments
POST   /api/v1/coach/feed/:id/comments       → Add comment
```

**Database Tables:**
```sql
-- Coach feed posts
CREATE TABLE coach_feed_posts (
    id UUID PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    coach_id UUID NOT NULL REFERENCES users(id),
    group_id UUID REFERENCES groups(id),
    content TEXT NOT NULL,
    post_type VARCHAR(20) DEFAULT 'text', -- text, workout, achievement, announcement
    visibility VARCHAR(20) DEFAULT 'group', -- group, all_athletes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feed reactions
CREATE TABLE coach_feed_reactions (
    id UUID PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    post_id UUID NOT NULL REFERENCES coach_feed_posts(id),
    athlete_id UUID NOT NULL REFERENCES athletes(id),
    reaction_type VARCHAR(20) DEFAULT 'like',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, athlete_id)
);

-- Feed comments
CREATE TABLE coach_feed_comments (
    id UUID PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    post_id UUID NOT NULL REFERENCES coach_feed_posts(id),
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### 3.4 Video Analytics Domain

```
# Video Analytics
POST   /api/v1/video-analytics/track         → Track play/pause/seek events
GET    /api/v1/video-analytics               → Get video analytics (coach)
GET    /api/v1/video-analytics/:exerciseId   → Analytics per exercise
```

**Database Tables:**
```sql
-- Video view events (extend existing)
CREATE TABLE video_analytics_events (
    id UUID PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    athlete_id UUID NOT NULL REFERENCES athletes(id),
    exercise_id UUID NOT NULL REFERENCES exercises(id),
    event_type VARCHAR(20) NOT NULL, -- play, pause, seek, complete
    position_seconds INT NOT NULL,
    duration_seconds INT,
    playback_speed DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Video analytics summary (materialized)
CREATE TABLE video_analytics_summary (
    exercise_id UUID PRIMARY KEY REFERENCES exercises(id),
    total_views INT DEFAULT 0,
    unique_viewers INT DEFAULT 0,
    avg_completion_rate DECIMAL(5,2) DEFAULT 0,
    avg_watch_duration_seconds INT DEFAULT 0,
    most_rewatched_section_start INT,
    most_rewatched_section_end INT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### 3.5 Health Rings Extension

```
# Activity Rings
GET    /api/v1/health/rings                  → Get today's activity rings
POST   /api/v1/health/rings/sync             → Sync from HealthKit/HealthConnect
GET    /api/v1/health/rings/history          → Historical rings data
```

**Database Tables:**
```sql
-- Daily activity rings
CREATE TABLE health_activity_rings (
    id UUID PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    athlete_id UUID NOT NULL REFERENCES athletes(id),
    ring_date DATE NOT NULL,
    move_value DECIMAL(10,2) DEFAULT 0,
    move_target DECIMAL(10,2) DEFAULT 500,
    exercise_value INT DEFAULT 0,
    exercise_target INT DEFAULT 30,
    recovery_value DECIMAL(5,2) DEFAULT 0,
    recovery_target DECIMAL(5,2) DEFAULT 100,
    source VARCHAR(20) DEFAULT 'manual', -- healthkit, healthconnect, manual
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(athlete_id, ring_date)
);
```

---

## 4. Implementation Plan

### Phase 1: Gamification API (Week 1)
1. Create database migrations
2. Implement domain layer (streak, badge, pr)
3. Implement application layer (services)
4. Implement API handlers
5. Add routes to routes.go
6. Write tests
7. Update mobile to use API

### Phase 2: Leaderboard + Coach Feed (Week 2)
1. Create database migrations
2. Implement domain layer
3. Implement application layer
4. Implement API handlers
5. Add routes to routes.go
6. Write tests
7. Update mobile to use API

### Phase 3: Video Analytics + Health Rings (Week 3)
1. Extend existing video-views endpoint
2. Add analytics aggregation
3. Create health rings endpoints
4. Write tests
5. Update mobile to use API

### Phase 4: Device QA + Polish (Week 4)
1. Real device testing for HealthKit/HealthConnect
2. Performance optimization
3. Error handling improvements
4. Documentation

---

## 5. Decision Required

**¿Cuál es la prioridad?**

| Opción | Scope | Timeline | Risk |
|--------|-------|----------|------|
| **A) Gamification first** | Streaks + Badges + PRs | 1 week | LOW — Core feature |
| **B) Leaderboard first** | Leaderboard + Coach Feed | 1 week | LOW — Social feature |
| **C) Full API** | All 5 domains | 3 weeks | MEDIUM — Scope creep |
| **D) Skip API, keep local** | No API changes | 0 weeks | HIGH — Data loss risk |

**Recommended:** Option A (Gamification first) — Highest user value, lowest risk.

---

## 6. Files Affected

### API (Go)
- `apps/api/internal/domain/gamification/` (NEW)
- `apps/api/internal/application/gamification/` (NEW)
- `apps/api/internal/interfaces/http/handlers/gamification.go` (NEW)
- `apps/api/internal/interfaces/http/routes/routes.go` (MODIFY)
- `apps/api/migrations/` (NEW migrations)

### Mobile (TypeScript)
- `apps/mobile/src/features/gamification/domain/streakService.ts` (MODIFY → use API)
- `apps/mobile/src/features/gamification/domain/badgeService.ts` (MODIFY → use API)
- `apps/mobile/src/features/gamification/domain/prService.ts` (MODIFY → use API)
- `apps/mobile/src/infrastructure/api/client.ts` (MODIFY → add new endpoints)
