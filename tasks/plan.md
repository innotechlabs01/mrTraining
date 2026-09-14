# Implementation Plan: Full Stack Gamification Connection

## Overview
Connect all gamification features end-to-end: React Query hooks for existing API, new API endpoints for leaderboard/coach feed/video analytics, and mobile integration.

## Architecture Decisions
- React Query hooks wrap existing service functions (streakService, badgeService, prService)
- New API endpoints follow existing Clean Architecture pattern (domain → app → handler → repo)
- Mobile uses `goApiClient` for Go API calls (already configured)
- Local fallback pattern preserved: API returns null → use local computation

---

## Phase 1: React Query Hooks (Mobile)

### Task 1: Create gamification hooks
**Description:** Create `useStreak`, `useBadges`, `usePRs` hooks using React Query.

**Acceptance criteria:**
- [ ] `useStreak()` returns streak data from API with local fallback
- [ ] `useBadges()` returns badges from API
- [ ] `usePRs()` returns PRs from API
- [ ] `useLogWorkout()` mutation calls API and invalidates streak query
- [ ] `useRecordPR()` mutation calls API and invalidates PRs query

**Verification:**
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] Tests pass: `npm test`

**Dependencies:** None

**Files likely touched:**
- `apps/mobile/src/features/gamification/hooks/useStreak.ts`
- `apps/mobile/src/features/gamification/hooks/useBadges.ts`
- `apps/mobile/src/features/gamification/hooks/usePRs.ts`

**Estimated scope:** S (1-2 files)

---

### Task 2: Connect TodayScreen to streak API
**Description:** Replace mock streak data with real API data in TodayScreen.

**Acceptance criteria:**
- [ ] StreakBadge shows actual streak from API
- [ ] Falls back to local computation if API unavailable

**Verification:**
- [ ] TypeScript compiles
- [ ] Tests pass

**Dependencies:** Task 1

**Files likely touched:**
- `apps/mobile/src/features/training/presentation/screens/TodayScreen.tsx`

**Estimated scope:** XS (1 file, small change)

---

### Task 3: Connect WorkoutExecutionScreen to gamification
**Description:** Log workouts to API and show real streak/badges/PRs.

**Acceptance criteria:**
- [ ] On workout completion, calls `logWorkoutDayToAPI()`
- [ ] StreakBadge shows actual streak from API
- [ ] AchievementBadge shows actual unlocked badges
- [ ] PR celebration shows actual PRs

**Verification:**
- [ ] TypeScript compiles
- [ ] Tests pass

**Dependencies:** Task 1

**Files likely touched:**
- `apps/mobile/src/features/training/presentation/screens/WorkoutExecutionScreen.tsx`

**Estimated scope:** S (1 file, moderate changes)

---

## Checkpoint 1: Mobile Gamification Connected
- [ ] All hooks created
- [ ] TodayScreen shows real streak
- [ ] WorkoutExecutionScreen logs to API
- [ ] TypeScript compiles, tests pass

---

## Phase 2: Leaderboard API (Go)

### Task 4: Leaderboard domain + migration
**Description:** Create domain entities and database migration for leaderboard.

**Acceptance criteria:**
- [ ] `leaderboard.go` with GroupLeaderboard, WeeklyLeaderboard entities
- [ ] Migration `005_leaderboard.sql` with tables + indexes

**Verification:**
- [ ] `go build ./...` clean

**Dependencies:** None

**Files likely touched:**
- `apps/api/internal/domain/leaderboard/leaderboard.go`
- `apps/api/internal/domain/leaderboard/repository.go`
- `apps/api/migrations/005_leaderboard.sql`

**Estimated scope:** S

---

### Task 5: Leaderboard application + handlers
**Description:** Create service layer and HTTP handlers.

**Acceptance criteria:**
- [ ] `GET /api/v1/leaderboard/group/:groupId` — group leaderboard
- [ ] `GET /api/v1/leaderboard/weekly` — weekly ranking
- [ ] `GET /api/v1/leaderboard/history` — user history

**Verification:**
- [ ] `go build ./...` clean
- [ ] `go test ./...` pass

**Dependencies:** Task 4

**Files likely touched:**
- `apps/api/internal/application/leaderboard/service.go`
- `apps/api/internal/interfaces/http/handlers/leaderboard.go`
- `apps/api/internal/interfaces/http/dto/leaderboard.go`
- `apps/api/internal/infrastructure/leaderboard/repository.go`
- `apps/api/internal/interfaces/http/routes/routes.go`
- `apps/api/cmd/api/main.go`

**Estimated scope:** M

---

## Checkpoint 2: Leaderboard API Complete
- [ ] 3 endpoints live
- [ ] Build clean, tests pass

---

## Phase 3: Coach Feed API (Go)

### Task 6: Coach Feed domain + migration
**Description:** Create domain entities and migration for coach feed.

**Acceptance criteria:**
- [ ] `coachfeed.go` with Post, Reaction, Comment entities
- [ ] Migration `006_coach_feed.sql` with tables + indexes

**Verification:**
- [ ] `go build ./...` clean

**Dependencies:** None

**Files likely touched:**
- `apps/api/internal/domain/coachfeed/coachfeed.go`
- `apps/api/internal/domain/coachfeed/repository.go`
- `apps/api/migrations/006_coach_feed.sql`

**Estimated scope:** S

---

### Task 7: Coach Feed application + handlers
**Description:** Create service layer and HTTP handlers.

**Acceptance criteria:**
- [ ] `GET /api/v1/coach/feed` — list posts
- [ ] `POST /api/v1/coach/feed` — create post (coach only)
- [ ] `POST /api/v1/coach/feed/:postId/react` — add reaction
- [ ] `POST /api/v1/coach/feed/:postId/comment` — add comment
- [ ] `DELETE /api/v1/coach/feed/:postId` — delete post (coach only)

**Verification:**
- [ ] `go build ./...` clean
- [ ] `go test ./...` pass

**Dependencies:** Task 6

**Files likely touched:**
- `apps/api/internal/application/coachfeed/service.go`
- `apps/api/internal/interfaces/http/handlers/coachfeed.go`
- `apps/api/internal/interfaces/http/dto/coachfeed.go`
- `apps/api/internal/infrastructure/coachfeed/repository.go`
- `apps/api/internal/interfaces/http/routes/routes.go`
- `apps/api/cmd/api/main.go`

**Estimated scope:** M

---

## Checkpoint 3: Coach Feed API Complete
- [ ] 5 endpoints live
- [ ] Build clean, tests pass

---

## Phase 4: Video Analytics API (Go)

### Task 8: Video Analytics domain + migration
**Description:** Create domain entities and migration for video analytics.

**Acceptance criteria:**
- [ ] `videoanalytics.go` with SessionAnalysis, ExerciseAnalysis entities
- [ ] Migration `007_video_analytics.sql` with tables + indexes

**Verification:**
- [ ] `go build ./...` clean

**Dependencies:** None

**Files likely touched:**
- `apps/api/internal/domain/videoanalytics/videoanalytics.go`
- `apps/api/internal/domain/videoanalytics/repository.go`
- `apps/api/migrations/007_video_analytics.sql`

**Estimated scope:** S

---

### Task 9: Video Analytics application + handlers
**Description:** Create service layer and HTTP handlers.

**Acceptance criteria:**
- [ ] `POST /api/v1/video-analytics/track` — track exercise session
- [ ] `GET /api/v1/video-analytics/summary` — get summary
- [ ] `GET /api/v1/video-analytics/per-exercise` — per-exercise breakdown

**Verification:**
- [ ] `go build ./...` clean
- [ ] `go test ./...` pass

**Dependencies:** Task 8

**Files likely touched:**
- `apps/api/internal/application/videoanalytics/service.go`
- `apps/api/internal/interfaces/http/handlers/videoanalytics.go`
- `apps/api/internal/interfaces/http/dto/videoanalytics.go`
- `apps/api/internal/infrastructure/videoanalytics/repository.go`
- `apps/api/internal/interfaces/http/routes/routes.go`
- `apps/api/cmd/api/main.go`

**Estimated scope:** M

---

## Checkpoint 4: Video Analytics API Complete
- [ ] 3 endpoints live
- [ ] Build clean, tests pass

---

## Phase 5: Mobile Integration (New APIs)

### Task 10: Leaderboard mobile service + hooks
**Description:** Create mobile API client and React Query hooks for leaderboard.

**Acceptance criteria:**
- [ ] `infrastructure/leaderboard/api.ts` — API client
- [ ] `hooks/useLeaderboard.ts` — React Query hooks
- [ ] LeaderboardScreen connected to API

**Verification:**
- [ ] TypeScript compiles
- [ ] Tests pass

**Dependencies:** Task 5

**Files likely touched:**
- `apps/mobile/src/infrastructure/leaderboard/api.ts`
- `apps/mobile/src/features/gamification/hooks/useLeaderboard.ts`

**Estimated scope:** S

---

### Task 11: Coach Feed mobile service + hooks
**Description:** Create mobile API client and React Query hooks for coach feed.

**Acceptance criteria:**
- [ ] `infrastructure/coachfeed/api.ts` — API client
- [ ] `hooks/useCoachFeed.ts` — React Query hooks
- [ ] CoachFeedScreen connected to API

**Verification:**
- [ ] TypeScript compiles
- [ ] Tests pass

**Dependencies:** Task 7

**Files likely touched:**
- `apps/mobile/src/infrastructure/coachfeed/api.ts`
- `apps/mobile/src/features/gamification/hooks/useCoachFeed.ts`

**Estimated scope:** S

---

### Task 12: Video Analytics mobile service + hooks
**Description:** Create mobile API client and React Query hooks for video analytics.

**Acceptance criteria:**
- [ ] `infrastructure/videoanalytics/api.ts` — API client
- [ ] `hooks/useVideoAnalytics.ts` — React Query hooks
- [ ] VideoAnalyticsScreen connected to API

**Verification:**
- [ ] TypeScript compiles
- [ ] Tests pass

**Dependencies:** Task 9

**Files likely touched:**
- `apps/mobile/src/infrastructure/videoanalytics/api.ts`
- `apps/mobile/src/features/training/hooks/useVideoAnalytics.ts`

**Estimated scope:** S

---

## Checkpoint 5: All Mobile Integration Complete
- [ ] All hooks created
- [ ] All screens connected
- [ ] TypeScript compiles, tests pass

---

## Final Checkpoint: Full Stack Complete
- [ ] All API endpoints live (14 total)
- [ ] All mobile hooks connected
- [ ] All screens using real data
- [ ] Mobile: `npx tsc --noEmit` clean
- [ ] Mobile: `npm test` all pass
- [ ] API: `go build ./...` clean
- [ ] API: `go test ./...` pass

---

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| API endpoints need auth | Medium | Use existing Clerk middleware |
| Mobile offline support | Low | Local fallback pattern already in place |
| Database schema changes | Low | Migrations are additive |

## Open Questions
- None — all decisions made based on existing patterns
