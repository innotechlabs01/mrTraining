# Proposal: Athlete real data + images

## Intent

The athlete mobile app is largely fed by mocks and broken by a Go↔mobile contract mismatch. `TodayScreen` renders hardcoded Unsplash workouts, fake articles and a canned Weekly Challenge because live `activeWorkouts` carry no image. `History`/`WorkoutList` show blank cards because they read camelCase keys (`contentName`) while Go emits snake_case, and `WorkoutDetail` shows "No exercises" because `GET /workouts/:id/detail` loads then discards exercises. Coaches cannot attach images to exercises because the web builder's `useExerciseLibrary` is 100% mock and `exercise_library` has no image column. This change makes the athlete experience run on real DB data end-to-end and adds a single source of truth for exercise images with a coach gallery picker (scope confirmed: gallery, not upload).

## Scope

### In Scope
1. Add `image_url` to `exercise_library` (migration + Go domain/DTO/repo read-write); propagate to mobile prescriptions via `LEFT JOIN exercise_library ON library_exercise_id` in `getAssignedWorkoutExercises`.
2. Fix real-data pipeline: `GET /workouts/:id/detail` returns `{workout, exercises}`; unify Go DTOs to camelCase and align mobile parsing (HistoryScreen/WorkoutListScreen blank cards, WorkoutDetail "No exercises").
3. `TodayScreen` real data: remove `MOCK_RECOMMENDATIONS`/`MOCK_ARTICLES`/`WEEKLY_CHALLENGE`; recommendations from live `activeWorkouts` (+ image from prescription/template); articles from `blog_posts` or hidden; Weekly Challenge from real source or hidden.
4. Coach gallery image picker: wire `useExerciseLibrary` to Go `/exercises` (remove mock); add image gallery picker to `CreateExerciseModal`, persist `imageUrl` via Go `POST /exercises`; `Exercise` type gains `imageUrl`.
5. **Empezar/Continuar** button on workout history/detail cards, decided by `status`+`progress`: `completed`→none/disabled "Done"; `progress>0`→Continuar (resume in-progress session); `progress==0`→Empezar (`POST /workouts/:id/session`).

### Out of Scope
- Image upload/processing in the coach flow (gallery only, per scope confirmation).
- Denormalized image columns on `workout_exercises`/`workout_template_exercises` (Option B) — deferred, single source of truth chosen.
- Exercise images in `WorkoutDetail`/`WorkoutExecution` screens (keyed to /detail fix, not a separate visual slice).
- Go migrations runner (migration applied manually to Turso, as today).

## Key Decisions

- **Image source of truth**: `exercise_library.image_url` only, mirroring `video_url`. No denormalized copies; runtime `LEFT JOIN`. Joins per workout are acceptable vs. dual-write drift.
- **Wire casing convention → camelCase (DECIDED)**: standardize Go DTO JSON tags to camelCase and make mobile parse camelCase. Mobile already reads `contentName`/`startDate`/`weightKg` across History, WorkoutList, Detail, Execution; flipping Go tags is a pure rename (no schema/business change) and gives ONE wire convention, removing per-endpoint snake_case workarounds. Alternative (mobile→snake_case) was rejected: it forces a mobile-wide parser rewrite and reads awkward against existing camelCase mobile types.
- **Rec image**: reuse first prescription exercise image (via JOIN) or template image; Today rec = `activeWorkouts[].contentName` mapped to prescription exercise image.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/web/migrations/019_exercise_image_url.sql` | New | `ALTER exercise_library ADD image_url TEXT` |
| `apps/api/internal/domain/training/{exercise,workout}.go` | Modified | `ImageURL` in ExerciseEntry/WorkoutExercise |
| `apps/api/internal/interfaces/http/dto/training.go` | Modified | camelCase JSON tags; `image_url`; `WorkoutExerciseResponse` |
| `apps/api/internal/interfaces/http/handlers/training.go` | Modified | `GetAssignedWorkoutDetail` returns exercises; mappers |
| `apps/api/internal/interfaces/http/handlers/today.go` + dto + today domain | Modified | `ActiveWorkout.image` |
| `apps/api/internal/infrastructure/training/{exercise,workout}_repository.go` | Modified | read/write image_url; JOIN on prescription; return exercises in detail |
| `apps/api/internal/infrastructure/today/repository.go` | Modified | image to ActiveWorkout |
| `apps/web/src/features/workout/hooks/useExerciseLibrary.ts` | Modified | MOCK → real `exerciseApi` |
| `apps/web/src/features/coach/components/workouts/{ExerciseLibrary,WorkoutBuilder}.tsx` | Modified | gallery picker; persist imageUrl |
| `apps/web/src/features/workout/types/index.ts`, `features/shared/api/client.ts` | Modified | `imageUrl` on `Exercise` |
| `apps/mobile/src/features/training/presentation/screens/{Today,History,WorkoutList,WorkoutDetail}.tsx` | Modified | real data; camelCase parse; Empezar/Continuar |
| `apps/mobile/src/infrastructure/api/client.ts` | Modified | aligned parse / resume endpoint |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Migration not auto-applied (no runner); Turso drift web vs Go | Med | Numbered migration applied manually; single shared DB verified before QA |
| Pre-existing /detail brokenness hides image work | High | Fix /detail + casing as prerequisite DTO slice first, verified before images |
| snake_case/camelCase mismatch persists if any endpoint missed | Med | Central Go DTO camelCase pass; mobile fixture/test per screen |
| Resume in-progress session index not exposed | Med | Add session/latest-index to detail DTO or dedicated resume lookup |

## Rollback Plan

- **Image/coach**: revert `019` migration (drop `image_url`), roll back Go/web changes; existing data unaffected.
- **Real-data + casing**: revert Go DTO tags and mobile parse to snake_case; restore mocked TodayScreen components if regression.
- **Empezar/Continuar**: revert button logic to single always-`POST` Comenzar.
- All slices are independently revertible; no schema backfill or dual-write makes rollback non-trivial except the applied migration.

## Dependencies

- Turso access for manual `019_exercise_image_url.sql` apply.
- Go `POST /exercises` + `GET /workouts`/`:id/detail` already present (verify shape).

## Success Criteria

- [ ] Athlete screens render real workouts/exercises with images — zero mocks remain in TodayScreen.
- [ ] History/WorkoutList show non-blank cards; WorkoutDetail shows exercise list.
- [ ] Coach assigns image via gallery and it persists through `/exercises` to mobile.
- [ ] Empezar/Continuar correct per `status`+`progress` (completed/progress/zero cases).
- [ ] Go DTOs emitted in a single camelCase convention, no snake_case leftover.

## Capabilities

### New Capabilities
- `exercise-image-source`: `exercise_library.image_url` lifecycle (migration, Go read/write, exercise gallery selection, JOIN propagation to mobile prescriptions).

### Modified Capabilities
- `None` — `openspec/specs/` is empty; no existing spec capabilities to modify.