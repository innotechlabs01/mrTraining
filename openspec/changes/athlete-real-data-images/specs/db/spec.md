# Delta for db

## ADDED Requirements

### Requirement: exercise_library.image_url column

Migration `019_exercise_image_url.sql` MUST add a nullable `image_url TEXT` column to `exercise_library`. The column MUST mirror `video_url`: nullable, no default, single source of truth for exercise images (no denormalized copies). Existing rows MUST remain valid with `NULL` image.

#### Scenario: Migration applies a nullable column

- GIVEN migration `019` has not yet been applied to Turso
- WHEN the migration is applied
- THEN `exercise_library` has an `image_url TEXT` column that is nullable
- AND existing `exercise_library` rows have `NULL` image_url

#### Scenario: Image added for an existing exercise

- GIVEN an `exercise_library` row with `image_url = NULL`
- WHEN a coach persists a gallery image URL for that exercise
- THEN the row returns the image_url without affecting `video_url` or other columns

#### Scenario: No image set (fallback)

- GIVEN an `exercise_library` row with `image_url = NULL`
- WHEN the image is read for a prescription
- THEN the runtime returns no image and consumers display a fallback placeholder
- AND no OTHER table (`workout_exercises`, `workout_template_exercises`) carries an image column

#### Scenario: Migration idempotency/ownership

- GIVEN `exercise_library` already contains the image_url column
- WHEN migration `019` is inspected pre-apply
- THEN it is explicitly guarded against duplicate column creation (manual apply, no runner)

## REMOVED Requirements

(No requirements removed — new column only.)