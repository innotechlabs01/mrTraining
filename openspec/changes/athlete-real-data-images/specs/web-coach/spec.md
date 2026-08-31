# Delta for web-coach

## MODIFIED Requirements

### Requirement: useExerciseLibrary backed by real /exercises API

`useExerciseLibrary` MUST load exercises from the Go `/exercises` API instead of mock data. The `Exercise` type MUST gain `imageUrl`. A fetch failure MUST surface a load error state with the option to retry — never silently fall back to mocks. (Previously: 100% mock data with no backend call.)

#### Scenario: Library loads from API

- GIVEN the `/exercises` endpoint is reachable and returns exercises
- WHEN the coach opens the exercise library
- THEN exercises render, including `imageUrl` where present

#### Scenario: API returns no exercises

- GIVEN `/exercises` returns an empty list
- WHEN the library loads
- THEN an empty state is shown (no mock rows)

#### Scenario: API failure

- GIVEN `/exercises` fails or times out
- WHEN the library loads
- THEN an error state with a retry action is shown
- AND no mock data is displayed

## ADDED Requirements

### Requirement: Gallery image picker in CreateExerciseModal

`CreateExerciseModal` MUST offer a gallery image picker bound to the exercise library. Selecting an image sets the exercise's `imageUrl`. On save, the coach MUST persist the selected `imageUrl` via Go `POST /exercises` so it becomes `exercise_library.image_url`.

#### Scenario: Coach selects and persists an image

- GIVEN the coach is creating/editing an exercise and chooses a gallery image
- WHEN the exercise is saved
- THEN `POST /exercises` includes the selected `imageUrl`
- AND the backend persists it to `exercise_library.image_url`

#### Scenario: No image selected

- GIVEN the coach does not select an image
- WHEN the exercise is saved
- THEN `imageUrl` is sent as null/absent
- AND the exercise is created without an image

#### Scenario: Selected image propagates to library row

- GIVEN an exercise saved with a gallery `imageUrl`
- WHEN the exercise library reloads
- THEN the exercise shows the persisted `imageUrl`

#### Scenario: Gallery only (no upload)

- GIVEN a coach workflow
- WHEN image handling occurs
- THEN the coach selects from an existing gallery only
- AND the flow does NOT provide upload/processing of new image files

### Requirement: Exercise.type imageUrl contract

The shared `Exercise` type MUST include an optional `imageUrl: string | null` field, used by both the library list and the persisted create/edit request.

#### Scenario: Null-safe rendering

- GIVEN an exercise with `imageUrl = null`
- WHEN it renders in the library or picker
- THEN a fallback/placeholder is shown without error