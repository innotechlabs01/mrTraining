# Tasks: Athlete real data + images

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~975 (adds+dels) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 db → PR2 go-api → PR3 web-coach → PR4 mobile-today → PR5 mobile-history |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | exercise_library.image_url migration | PR 1 | `sqlite3 :memory: <019...sql` guard check | apply to Turso staging DB | drop column / don't apply |
| 2 | Go camelCase + /detail envelope + image JOIN | PR 2 | `cd apps/api && go test ./internal/...` | run API + curl /workouts/:id/detail | revert Go tags/repo mapping |
| 3 | Coach gallery picker + real useExerciseLibrary | PR 3 | `cd apps/web && pnpm test ExerciseLibrary` | dev server; create exercise w/ image | revert hook/modal |
| 4 | TodayScreen real data + articles + hide challenge | PR 4 | `cd apps/mobile && npm test TodayScreen` | sim + athlete with/without blog_posts | restore Today components |
| 5 | History/WorkoutList camelCase + Empezar/Continuar | PR 5 | `cd apps/mobile && npm test HistoryScreen` | sim; completed/ongoing/zero workouts | revert button logic |

## Phase 1: db migration (PR 1)

- [x] 1.1 Create `apps/web/migrations/019_exercise_image_url.sql` guarded `ALTER TABLE exercise_library ADD COLUMN image_url TEXT` (nullable, mirrors video_url). Dep: none. ~15 lines.
- [x] 1.2 AC: manual apply to Turso; existing rows `NULL`; re-apply guarded (no dup). Dep: 1.1. Verify: migration applies + idempotency guard. ~5 lines.

## Phase 2: go-api casing + detail + images (PR 2)

- [ ] 2.1 RED: handler test (+) camelCase JSON tags on `dto/training.go` & `today.go`; `imageUrl` on Exercise/WorkoutExerciseResponse. Dep: 1.1. ~40 lines.
- [ ] 2.2 GREEN: flip `dto/training.go` + `dto/today.go` JSON tags to camelCase; add `ImageURL string \`json:"imageUrl,omitempty"\`` on ExerciseEntry/WorkoutExercise (`domain/training/{exercise,workout}.go`) + DTOs. Dep: 2.1. ~60 lines.
- [ ] 2.3 RED: repo test for `LEFT JOIN exercise_library` returning `image_url` in `getAssignedWorkoutExercises` + detail returning `{workout,exercises,session}`. Dep: 2.2. ~40 lines.
- [ ] 2.4 GREEN: `workout_repository.go` add JOIN on `library_exercise_id`; read/write `image_url` in `exercise_repository.go`; `FindLatestSession` + detail returns envelope + session. Dep: 2.3. ~80 lines.
- [ ] 2.5 `training/service.go` + `handlers/training.go`: detail mappers return `{workout,exercises,session}`; `CreateExercise` reads `imageUrl`; `handlers/today.go` + repo expose `ActiveWorkout.Image` + blog_posts source. Dep: 2.4. ~80 lines.

## Phase 3: web coach gallery + wiring (PR 3)

- [ ] 3.1 RED: `useExerciseLibrary` tests: loads from `exerciseApi.list()`, empty→empty state, error→retry (no mock fallback). Dep: 2.5. `apps/web/src/features/workout/hooks/__tests__/`. ~40 lines.
- [ ] 3.2 Add `imageUrl: string \| null` to `Exercise` type + map Go `ListResponse{data}` in `features/workout/types/index.ts` + `features/shared/api/client.ts`. Dep: 3.1. ~20 lines.
- [ ] 3.3 Replace mock in `useExerciseLibrary.ts` with real `exerciseApi`; wire error/retry/empty. Dep: 3.2. ~40 lines.
- [ ] 3.4 `ExerciseLibrary.tsx`/`WorkoutBuilder.tsx`: `ImageGalleryPicker` in `CreateExerciseModal` (library-bound, no upload); render `imageUrl`/placeholder; persist selected url via `exerciseApi.create`. Dep: 3.3. ~60 lines.

## Phase 4: mobile today real-data (PR 4)

- [ ] 4.1 Remove `MOCK_RECOMMENDATIONS`/`MOCK_ARTICLES`/`WEEKLY_CHALLENGE` + Unsplash URLs from `TodayScreen.tsx`. Dep: 2.5. ~40 lines.
- [ ] 4.2 Articles: fetch REAL `blog_posts`; empty → default "no hay artículos disponibles" message (NOT mock, NOT hidden). CLOSED DECISION. Dep: 2.5. ~30 lines.
- [ ] 4.3 Weekly Challenge: HIDE section entirely, no model, deferred. CLOSED DECISION. Dep: 4.1. ~15 lines.
- [ ] 4.4 Recommendations from live `activeWorkouts` w/ first-prescription image via `ActiveWorkout.Image`; fallback placeholder when null; empty state. Dep: 4.1+2.5. ~50 lines.
- [ ] 4.5 CamelCase parse + mobile image fallback contract; tests: card shows image/placeholder, empty states, no broken image. Dep: 4.2-4.4. `TodayScreen.__tests__`. ~70 lines.

## Phase 5: mobile history empezar/continuar (PR 5)

- [ ] 5.1 RED: History/WorkoutList camelCase decode tests (contentName/startDate/weightKg/imageUrl) — no blank cards; empty state. Dep: 2.5. ~50 lines.
- [ ] 5.2 `HistoryScreen.tsx`/`WorkoutListScreen.tsx`: camelCase parsing + image fallback + empty state. Dep: 5.1. ~60 lines.
- [ ] 5.3 RED: Empezar/Continuar decision tests: completed→no action; progress>0→Continuar; ==0→Empezar. Dep: 5.2. ~45 lines.
- [ ] 5.4 `ActionButton` decided by `status`+`progress`; Continuar resumes at detail session index (no silent new session when index absent — surface missing-resume); Empezar calls `POST /workouts/:id/session`; wire in History/Detail cards. Dep: 5.3+2.5. ~80 lines.

## Phase 6: verification

- [ ] 6.1 Full pass: `go test ./...`, web `jest`, mobile `jest` per unit commands above. Dep: all. ~0 new.
- [ ] 6.2 Manual E2E (no runner): coach persists image → mobile Today/History shows it; /detail Exercises non-empty. Dep: 6.1. ~0 new.