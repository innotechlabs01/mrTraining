# Delta for go-api

## MODIFIED Requirements

### Requirement: Single camelCase wire convention for DTOs

All workout, today, and prescription DTO JSON tags MUST emit camelCase (e.g. `contentName`, `startDate`, `weightKg`, `imageUrl`, `videoUrl`). No snake_case tag MAY remain in these DTOs. The mobile client parses camelCase exclusively; snake_case workarounds are removed. (Previously: mixed snake_case serialization requiring per-endpoint mobile parsing workarounds.)

#### Scenario: DTO emits camelCase keys

- GIVEN a workout/today/prescription payload
- WHEN it is serialized to JSON
- THEN every field key is camelCase
- AND no field key is snake_case

#### Scenario: Mobile parses camelCase without per-field mapping

- GIVEN a camelCase JSON payload from any of these endpoints
- WHEN the mobile client decodes it
- THEN it maps directly to existing camelCase mobile types without transformation

### Requirement: ExerciseResponse includes image_url

The exercise/exercise-response DTO MUST expose `imageUrl` mapped from `exercise_library.image_url`. When the source row has `NULL`, the field MUST be omitted or `null` (not "undefined" in transport). (Previously: exercise/prescription DTOs exposed no image field.)

#### Scenario: Exercise with image propagates URL

- GIVEN an `exercise_library` row with `image_url = <url>`
- WHEN its exercise is returned in a prescription/response
- THEN the payload includes `imageUrl: <url>`

#### Scenario: Exercise without image

- GIVEN an `exercise_library` row with `image_url = NULL`
- WHEN its exercise is returned
- THEN the payload has `imageUrl` null/omitted
- AND the mobile fallback placeholder is used

### Requirement: GET /workouts/:id/detail returns exercises

`GET /workouts/:id/detail` MUST return `{ workout, exercises }` where `exercises` is a non-empty list when the workout has prescriptions, built via `LEFT JOIN exercise_library ON library_exercise_id` to propagate images. An empty list is returned only when the workout genuinely has no exercises. (Previously: detail loaded then discarded exercises; client saw "No exercises".)

#### Scenario: Detail returns exercises for a real workout

- GIVEN a workout with assigned prescriptions
- WHEN the client calls `GET /workouts/:id/detail`
- THEN the response includes both `workout` and a populated `exercises` list
- AND each exercise carries `imageUrl` from the `LEFT JOIN`

#### Scenario: Detail preserves image via JOIN

- GIVEN prescriptions referencing `library_exercise_id`s with images
- WHEN exercises are joined in detail
- THEN each `exercises` entry's `imageUrl` matches its `exercise_library.image_url`

#### Scenario: Workout with no assigned exercises

- GIVEN a workout with zero prescriptions
- WHEN the client calls `GET /workouts/:id/detail`
- THEN the response returns an empty `exercises` list (not an error/404)

## ADDED Requirements

### Requirement: Resume session index exposure

The detail DTO MUST expose the latest session start/index (if any) so clients can decide `Empezar` vs `Continuar` from `status`+`progress`. (Scope note: consumed by mobile-history.)

#### Scenario: In-progress session reported

- GIVEN a workout with `progress > 0`
- WHEN detail is fetched
- THEN the payload includes the in-progress session marker to enable "Continuar"

## REMOVED Requirements

(No requirements removed.)