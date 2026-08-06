package training

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type WorkoutRepository interface {
	Save(ctx context.Context, w *Workout) error
	FindByID(ctx context.Context, id, orgID uuid.UUID) (*Workout, error)
	FindByAthlete(ctx context.Context, athleteID uuid.UUID, dateRange DateRangeFilter) ([]*Workout, error)
	FindByProgram(ctx context.Context, programID uuid.UUID) ([]*Workout, error)
	FindScheduledForDate(ctx context.Context, athleteID uuid.UUID, date time.Time) ([]*Workout, error)
	FindPendingReview(ctx context.Context, coachID, orgID uuid.UUID) ([]*Workout, error)
}

type ProgramRepository interface {
	Save(ctx context.Context, p *WorkoutProgram) error
	FindByID(ctx context.Context, id, orgID uuid.UUID) (*WorkoutProgram, error)
	FindByCoach(ctx context.Context, coachID, orgID uuid.UUID) ([]*WorkoutProgram, error)
	FindByAthlete(ctx context.Context, athleteID, orgID uuid.UUID) ([]*WorkoutProgram, error)
	SaveAssignment(ctx context.Context, programID, athleteID, coachID uuid.UUID) error
}

type ExerciseRepository interface {
	FindByID(ctx context.Context, id, orgID uuid.UUID) (*ExerciseLibrary, error)
	List(ctx context.Context, orgID uuid.UUID, filter ExerciseFilter) ([]*ExerciseLibrary, error)
}

type ExerciseLibrary struct {
	id          uuid.UUID
	organizationID *uuid.UUID
	name        string
	slug        string
	category    string
	sportType   string
	muscleGroups []string
	equipment   []string
	difficulty  string
	description string
	instructions string
	videoURL    string
	thumbnailURL string
	isVerified  bool
	isCustom    bool
	createdBy   *uuid.UUID
}

func (e *ExerciseLibrary) ID() uuid.UUID { return e.id }
func (e *ExerciseLibrary) Name() string { return e.name }
func (e *ExerciseLibrary) Slug() string { return e.slug }
func (e *ExerciseLibrary) Category() string { return e.category }
func (e *ExerciseLibrary) SportType() string { return e.sportType }
func (e *ExerciseLibrary) MuscleGroups() []string { return e.muscleGroups }
func (e *ExerciseLibrary) Equipment() []string { return e.equipment }
func (e *ExerciseLibrary) Difficulty() string { return e.difficulty }
func (e *ExerciseLibrary) Description() string { return e.description }
func (e *ExerciseLibrary) Instructions() string { return e.instructions }
func (e *ExerciseLibrary) VideoURL() string { return e.videoURL }
func (e *ExerciseLibrary) ThumbnailURL() string { return e.thumbnailURL }
func (e *ExerciseLibrary) IsVerified() bool { return e.isVerified }
func (e *ExerciseLibrary) IsCustom() bool { return e.isCustom }
func (e *ExerciseLibrary) CreatedBy() *uuid.UUID { return e.createdBy }

type DateRangeFilter struct {
	Start time.Time
	End   time.Time
}

type ExerciseFilter struct {
	SportType  string
	Category   string
	Search     string
	IsVerified *bool
	Limit      int
	Offset     int
}
