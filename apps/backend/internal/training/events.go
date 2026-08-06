package training

import (
	"time"

	"github.com/google/uuid"
)

type DomainEvent interface {
	AggregateID() uuid.UUID
	EventType() string
	OccurredAt() time.Time
}

type WorkoutCompleted struct {
	WorkoutID   uuid.UUID
	AthleteID   uuid.UUID
	CoachID     *uuid.UUID
	OrgID       uuid.UUID
	CompletedAt time.Time
	RPE         int
	occurredAt  time.Time
}

func (e WorkoutCompleted) AggregateID() uuid.UUID { return e.WorkoutID }
func (e WorkoutCompleted) EventType() string       { return "workout.completed" }
func (e WorkoutCompleted) OccurredAt() time.Time   { return e.occurredAt }

func init() {
	// Default to now
}

type WorkoutReviewed struct {
	WorkoutID  uuid.UUID
	ReviewedBy uuid.UUID
	ReviewedAt time.Time
	occurredAt time.Time
}

func (e WorkoutReviewed) AggregateID() uuid.UUID { return e.WorkoutID }
func (e WorkoutReviewed) EventType() string       { return "workout.reviewed" }
func (e WorkoutReviewed) OccurredAt() time.Time   { return e.occurredAt }

type ProgramPublished struct {
	ProgramID  uuid.UUID
	OrgID      uuid.UUID
	occurredAt time.Time
}

func (e ProgramPublished) AggregateID() uuid.UUID { return e.ProgramID }
func (e ProgramPublished) EventType() string         { return "program.published" }
func (e ProgramPublished) OccurredAt() time.Time     { return e.occurredAt }

type ProgramAssigned struct {
	ProgramID  uuid.UUID
	AthleteID  uuid.UUID
	CoachID    uuid.UUID
	OrgID      uuid.UUID
	occurredAt time.Time
}

func (e ProgramAssigned) AggregateID() uuid.UUID { return e.ProgramID }
func (e ProgramAssigned) EventType() string       { return "program.assigned" }
func (e ProgramAssigned) OccurredAt() time.Time   { return e.occurredAt }

type ProgramPhaseAdded struct {
	ProgramID  uuid.UUID
	Phase      string
	occurredAt time.Time
}

func (e ProgramPhaseAdded) AggregateID() uuid.UUID { return e.ProgramID }
func (e ProgramPhaseAdded) EventType() string       { return "program.phase_added" }
func (e ProgramPhaseAdded) OccurredAt() time.Time   { return e.occurredAt }

func init() {
	// Initialize default occurredAt times
}

func NewWorkoutCompleted(workoutID, athleteID uuid.UUID, coachID *uuid.UUID, orgID uuid.UUID, completedAt time.Time, rpe int) WorkoutCompleted {
	return WorkoutCompleted{
		WorkoutID:   workoutID,
		AthleteID:   athleteID,
		CoachID:     coachID,
		OrgID:       orgID,
		CompletedAt: completedAt,
		RPE:         rpe,
		occurredAt:  time.Now(),
	}
}

func NewWorkoutReviewed(workoutID, reviewedBy uuid.UUID, reviewedAt time.Time) WorkoutReviewed {
	return WorkoutReviewed{
		WorkoutID:  workoutID,
		ReviewedBy: reviewedBy,
		ReviewedAt: reviewedAt,
		occurredAt: time.Now(),
	}
}

func NewProgramPublished(programID, orgID uuid.UUID) ProgramPublished {
	return ProgramPublished{
		ProgramID:  programID,
		OrgID:      orgID,
		occurredAt: time.Now(),
	}
}

func NewProgramAssigned(programID, athleteID, coachID, orgID uuid.UUID) ProgramAssigned {
	return ProgramAssigned{
		ProgramID:  programID,
		AthleteID:  athleteID,
		CoachID:    coachID,
		OrgID:      orgID,
		occurredAt: time.Now(),
	}
}

func NewProgramPhaseAdded(programID uuid.UUID, phase string) ProgramPhaseAdded {
	return ProgramPhaseAdded{
		ProgramID:  programID,
		Phase:      phase,
		occurredAt: time.Now(),
	}
}
