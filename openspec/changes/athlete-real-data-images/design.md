# Design: Athlete real data + images

## Technical Approach

Make the athlete experience run on real DB data end-to-end and give exercise images a single source of truth on `exercise_library`. The change is one coordinated slice across `db → go-api → web-coach → mobile`. Go DTOs standardize to camelCase at the wire boundary (mobile already defines camelCase types); `ImageURL` joins from `exercise_library` via `LEFT JOIN`; `/detail` returns `{workout, exercises, session}`; coach gallery picker persists `image_url` through `POST /exercises`; TodayScreen and Empezar/Continuar consume live data with no mocks.

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|---|---|---|---|
| Image source | A) `exercise_library.image_url` + runtime JOIN; B) denormalize onto `workout_exercises` | **A** | Single source of truth mirrors `video_url`; avoids dual-write drift (proposal Option B out of scope) |
| Wire casing | A) Go→camelCase; B) mobile→snake_case | **A** | Mobile types already camelCase (`contentName`, `weightKg`); flipping Go DTO tags is a pure rename, one wire convention |
| `/detail` shape | Return workout only (today) vs envelope | **Envelope** `{workout, exercises, session}` | Mobile `WorkoutDetailData` already expects it; fixes "No exercises"; session exposes resume index |
| Today rec image | First prescription/template exercise image vs template image | **First prescription image via JOIN** | Consistent with `/detail`; falls back to placeholder when NULL |
| Articles/Weekly | Real `blog_posts`/real source or **hidden** | **Hide when empty** | Spec: never mock; empty sections removed |

## Data Flow

```
coach (web) ──POST /exercises{imageUrl}──▶ Go Create → exercise_library.image_url
                                                │ LEFT JOIN library_exercise_id
mobile WorkoutList/History ◀──GET /workouts──┘        ▼
mobile Detail ◀──GET /workouts/:id/detail── Go LoadAssignedWorkout + Exercises + Session
mobile Today   ◀──GET /athletes/today───▶ today repo (workouts + joined image + blog_posts)
```

## Interfaces / Contracts

**GET /workouts/:id/detail** (was: bare mapped workout):

| Field | Type | Notes |
|---|---|---|
| `workout` | AssignedWorkoutResponse | camelCase |
| `exercises[]` | WorkoutExerciseResponse | `imageUrl` from JOIN; empty only if no prescriptions |
| `session` | WorkoutSessionResponse \| null | latest in-progress `currentExerciseIndex`; null if none |

**ExerciseResponse / WorkoutExerciseResponse**: add `imageUrl string omitempty` (null via `*string` or `omitempty`+null scan). **CreateExerciseRequest**: add `imageUrl string`.

camelCase tags applied across `dto/training.go` (e.g. `contentName`, `startDate`, `weightKg`, `libraryExerciseId`, `currentExerciseIndex`).

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/web/migrations/019_exercise_image_url.sql` | Create | Guarded `ALTER exercise_library ADD COLUMN image_url TEXT` (nullable, mirrors `video_url`) |
| `apps/api/internal/domain/training/{exercise,workout}.go` | Modify | `ImageURL` on ExerciseEntry & WorkoutExercise; `WorkoutDetail` carrier or repo return |
| `apps/api/internal/interfaces/http/dto/training.go` | Modify | camelCase tags; `imageUrl`; `WorkoutDetailResponse` |
| `apps/api/internal/interfaces/http/handlers/training.go` | Modify | `/detail` returns envelope + session; `ImageURL` in mappers; `CreateExercise` reads imageUrl |
| `apps/api/internal/infrastructure/training/{exercise,workout}_repository.go` | Modify | read/write `image_url`; `LEFT JOIN` in `getAssignedWorkoutExercises`; detail returns exercises+latest session; `FindLatestSession` |
| `apps/api/internal/application/training/service.go` | Modify | detail returns `{workout,ex,ses}`; pass imageUrl to repo |
| `apps/api/internal/domain/today/{today.go,repository.go}`, `handlers/today.go` | Modify | `ActiveWorkout.Image`; repo JOIN + `blog_posts` reading; TodayData/Response gains articles + weekly + image |
| `apps/web/src/features/workout/hooks/useExerciseLibrary.ts` | Modify | MOCK → `exerciseApi.list()`; no silent mock fallback; retry on error |
| `apps/web/src/features/coach/components/workouts/ExerciseLibrary.tsx` | Modify | paint `imageUrl`; gallery picker in `CreateExerciseModal`; persist via `exerciseApi.create` |
| `apps/web/src/features/shared/api/client.ts`, `features/workout/types/index.ts` | Modify | `Exercise.imageUrl`; map Go `ListResponse{data}` → list; `imageUrl` on create |
| `apps/mobile/src/features/training/presentation/screens/{Today,History,WorkoutList,WorkoutDetail}.tsx` | Modify | remove mocks; camelCase parse; Empezar/Continuar by status+progress |
| `apps/mobile/src/infrastructure/api/client.ts` | Modify | resume by session index if needed |

## Component Structure

- **web**: `CreateExerciseModal` → new `ImageGalleryPicker` (bounded to library images, no upload) bound below Video URL; `ExerciseCard` renders `imageUrl` placeholder when null.
- **mobile**: new `ActionButton` (Empezar/Continuar/Done via `status`+`progress`); `ImageFallback` shared; Today `Recommendations`/`ArticlesSection`/`WeeklyChallengeCard` render real data and hide when empty.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit (Go) | camelCase JSON tags; `/detail` envelope `{workout,exercises,session}`; imageUrl mapping; empty-list path | `training_test.go` handler tests + mapper tests |
| Integration (Go) | `LEFT JOIN` returns `image_url`; Create persists it | repo tests on Turso/sqlmock: seed `exercise_library.image_url`, assert prescription/detail carry it |
| Unit (web) | `useExerciseLibrary` load/empty/error+retry (no mock rows); picker sets+persists `imageUrl` | mock `exerciseApi`; render `CreateExerciseModal` |
| Unit (mobile) | camelCase fixture decodes (no blank card); Empezar/Continuar completed/progress>0/==0; Today fallback placeholder; empty states | Jest + React Testing Library fixtures, existing `__tests__` pattern |
| E2E | declare coverage: coach image reaches mobile | manual on Turso + simulator (no runner) |

Applicable threat-matrix rows: `N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary introduced; modifies existing HTTP handlers only.`

## Migration / Rollout

Ordered apply: (1) `019` SQL applied manually to Turso; (2) Go DTO casing + `/detail` fix (prereq) verified; (3) images (JOIN + gallery); (4) mobile Today + Empezar/Continuar. Rollback is per-slice revertible: drop `image_url`, revert Go tags/mobile parse to snake_case, restore Today mock components, revert button logic to always-`POST`.

## Open Questions

- [ ] `blog_posts` source for Today articles: reuse existing blog domain endpoint vs new query in today repo?
- [ ] Weekly Challenge real-source model: dedicated column/flag on `assigned_workouts`?