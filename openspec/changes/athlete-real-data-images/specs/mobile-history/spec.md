# Delta for mobile-history

## MODIFIED Requirements

### Requirement: Empezar/Continuar decided by status + progress

Workout history/detail cards MUST show a single action decided by `status` + `progress`:
- `completed` → no action button (or disabled "Done"); MUST NOT offer Empezar/Continuar.
- `progress > 0` → "Continuar" (resume the in-progress session).
- `progress == 0` → "Empezar" (`POST /workouts/:id/session`).

The decision MUST be computed from real API data, never from mock state. (Previously: a single always-`POST` "Comenzar" button ignoring status/progress.)

#### Scenario: Completed workout hides the action

- GIVEN a workout with `status = completed`
- WHEN the card renders
- THEN no Empezar/Continuar button appears (completed state shown)
- AND a resume/restart is not offered

#### Scenario: In-progress workout shows Continuar

- GIVEN a workout with `progress > 0` (in-flight session)
- WHEN the card renders
- THEN a "Continuar" action appears
- AND it resumes the in-progress session rather than starting a new one

#### Scenario: Not-started workout shows Empezar

- GIVEN a workout with `progress == 0`
- WHEN the card renders
- THEN an "Empezar" action appears
- AND tapping it calls `POST /workouts/:id/session`

#### Scenario: Empty state (no workouts)

- GIVEN the history list returns zero workouts
- WHEN the screen renders
- THEN a clear empty state is shown instead of blank cards

## ADDED Requirements

### Requirement: History/WorkoutList parse camelCase contract

HistoryScreen and WorkoutListScreen MUST decode real API payloads using camelCase keys (`contentName`, `startDate`, `weightKg`, `imageUrl`). A card MUST render its data when the API returns it, and MUST NOT show blank cards for valid data. (Context: Go now emits a single camelCase convention, resolved alongside go-api.)

#### Scenario: Card shows real content name/date/image

- GIVEN a workout payload with camelCase `contentName`, `startDate`, and `imageUrl`
- WHEN WorkoutList/History renders the card
- THEN the name, date, and image (or fallback) are displayed
- AND the card is not blank

#### Scenario: Missing image falls back

- GIVEN a workout card with `imageUrl = null`
- WHEN it renders
- THEN a fallback placeholder shows
- AND the card still shows text data

#### Scenario: camelCase payload decodes cleanly

- GIVEN a valid camelCase JSON payload
- WHEN the client decodes it
- THEN no field is lost to casing mismatch
- AND blank-card regressions do not occur

### Requirement: In-flight progress resume marker

The Continuar action MUST rely on the resume session marker/index exposed by the detail endpoint (see go-api "Resume session index exposure"). When detail is unavailable, Continuar MUST NOT silently start a new session.

#### Scenario: Resume target present

- GIVEN detail reports an in-progress session index
- WHEN the user taps Continuar
- THEN the client resumes at the reported index/session

#### Scenario: Resume target absent

- GIVEN detail reports no session index but progress > 0
- WHEN the user taps Continuar
- THEN the client surfaces the missing-resume condition instead of silently starting a new session