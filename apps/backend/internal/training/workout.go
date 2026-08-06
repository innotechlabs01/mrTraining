package training

import (
	"time"

	"github.com/google/uuid"
)

type WorkoutStatus string

const (
	WorkoutStatusScheduled WorkoutStatus = "scheduled"
	WorkoutStatusCompleted WorkoutStatus = "completed"
	WorkoutStatusReviewed  WorkoutStatus = "reviewed"
)

type WorkoutExercise struct {
	id          uuid.UUID
	exerciseID  uuid.UUID
	section     string
	sortOrder   int
	notes       string
	restSeconds int
	tempo       string
	sets        []ExerciseSet
}

func (e WorkoutExercise) ID() uuid.UUID { return e.id }
func (e WorkoutExercise) ExerciseID() uuid.UUID { return e.exerciseID }
func (e WorkoutExercise) Section() string { return e.section }
func (e WorkoutExercise) SortOrder() int { return e.sortOrder }
func (e WorkoutExercise) Notes() string { return e.notes }
func (e WorkoutExercise) RestSeconds() int { return e.restSeconds }
func (e WorkoutExercise) Tempo() string { return e.tempo }
func (e WorkoutExercise) Sets() []ExerciseSet { return e.sets }

type ExerciseSet struct {
	id                uuid.UUID
	setNumber         int
	setType           string
	prescribedReps    *int
	prescribedWeight  *float64
	prescribedRPE     *float64
	actualReps        *int
	actualWeight      *float64
	isCompleted       bool
	isSkipped         bool
	completedAt       *time.Time
	notes             string
}

func (s ExerciseSet) ID() uuid.UUID { return s.id }
func (s ExerciseSet) SetNumber() int { return s.setNumber }
func (s ExerciseSet) SetType() string { return s.setType }
func (s ExerciseSet) PrescribedReps() *int { return s.prescribedReps }
func (s ExerciseSet) PrescribedWeight() *float64 { return s.prescribedWeight }
func (s ExerciseSet) PrescribedRPE() *float64 { return s.prescribedRPE }
func (s ExerciseSet) ActualReps() *int { return s.actualReps }
func (s ExerciseSet) ActualWeight() *float64 { return s.actualWeight }
func (s ExerciseSet) IsCompleted() bool { return s.isCompleted }
func (s ExerciseSet) IsSkipped() bool { return s.isSkipped }
func (s ExerciseSet) CompletedAt() *time.Time { return s.completedAt }
func (s ExerciseSet) Notes() string { return s.notes }

type Workout struct {
	id           uuid.UUID
	programID    *uuid.UUID
	organizationID uuid.UUID
	athleteID    uuid.UUID
	coachID      *uuid.UUID
	name         string
	description  string
	sportType    string
	scheduledDate time.Time
	completedAt  *time.Time
	exercises    []WorkoutExercise
	status       WorkoutStatus
	rpe          *int
	athleteNotes string
	coachNotes   string
	coachFeedback string
	reviewedAt   *time.Time
	reviewedBy   *uuid.UUID
	source       string
	sourceID     string
	version      int
	createdAt    time.Time
	domainEvents []DomainEvent
}

func NewWorkout(name, description, sportType string, scheduledDate time.Time, athleteID, orgID uuid.UUID, coachID *uuid.UUID) *Workout {
	now := time.Now()
	return &Workout{
		id:              uuid.New(),
		programID:       nil,
		organizationID:  orgID,
		athleteID:       athleteID,
		coachID:         coachID,
		name:            name,
		description:     description,
		sportType:       sportType,
		scheduledDate:   scheduledDate,
		status:          WorkoutStatusScheduled,
		source:          "manual",
		version:         1,
		createdAt:       now,
	}
}

func (w *Workout) AddExercise(exerciseID uuid.UUID, section string, sortOrder int, notes string, restSeconds int, tempo string) {
	w.exercises = append(w.exercises, WorkoutExercise{
		id:          uuid.New(),
		exerciseID:  exerciseID,
		section:     section,
		sortOrder:   sortOrder,
		notes:       notes,
		restSeconds: restSeconds,
		tempo:       tempo,
	})
	w.version++
}

func (w *Workout) AddSet(exerciseIdx int, setNumber int, setType string, reps *int, weight *float64, rpe *float64) {
	if exerciseIdx >= 0 && exerciseIdx < len(w.exercises) {
		w.exercises[exerciseIdx].sets = append(w.exercises[exerciseIdx].sets, ExerciseSet{
			id:             uuid.New(),
			setNumber:      setNumber,
			setType:        setType,
			prescribedReps: reps,
			prescribedWeight: weight,
			prescribedRPE:  rpe,
			isCompleted:    false,
		})
		w.version++
	}
}

func (w *Workout) Complete(rpe int, notes string) {
	if w.status != WorkoutStatusScheduled {
		return
	}
	if rpe < 1 || rpe > 10 {
		return
	}
	now := time.Now()
	w.status = WorkoutStatusCompleted
	w.completedAt = &now
	w.rpe = &rpe
	w.athleteNotes = notes
	w.version++
	w.raiseEvent(WorkoutCompleted{
		WorkoutID: w.id,
		AthleteID: w.athleteID,
		CoachID: w.coachID,
		OrgID:   w.organizationID,
		CompletedAt: now,
		RPE: rpe,
	})
}

func (w *Workout) MarkSetCompleted(exerciseIdx, setIdx int, reps *int, weight *float64) {
	if exerciseIdx >= 0 && exerciseIdx < len(w.exercises) {
		ex := &w.exercises[exerciseIdx]
		if setIdx >= 0 && setIdx < len(ex.sets) {
			ex.sets[setIdx].actualReps = reps
			ex.sets[setIdx].actualWeight = weight
			ex.sets[setIdx].isCompleted = true
			now := time.Now()
			ex.sets[setIdx].completedAt = &now
		}
	}
}

func (w *Workout) SetProgramID(programID *uuid.UUID) {
	w.programID = programID
}

func (w *Workout) Review(feedback string, reviewedBy uuid.UUID) {
	if w.status != WorkoutStatusCompleted {
		return
	}
	now := time.Now()
	w.coachFeedback = feedback
	w.reviewedAt = &now
	w.reviewedBy = &reviewedBy
	w.status = WorkoutStatusReviewed
	w.version++
	w.raiseEvent(WorkoutReviewed{
		WorkoutID: w.id,
		ReviewedBy: reviewedBy,
		ReviewedAt: now,
	})
}

func (w *Workout) DomainEvents() []DomainEvent {
	return w.domainEvents
}

func (w *Workout) ClearEvents() {
	w.domainEvents = nil
}

func (w *Workout) raiseEvent(event DomainEvent) {
	w.domainEvents = append(w.domainEvents, event)
}

func (w *Workout) ID() uuid.UUID { return w.id }
func (w *Workout) ProgramID() *uuid.UUID { return w.programID }
func (w *Workout) OrganizationID() uuid.UUID { return w.organizationID }
func (w *Workout) AthleteID() uuid.UUID { return w.athleteID }
func (w *Workout) CoachID() *uuid.UUID { return w.coachID }
func (w *Workout) Name() string { return w.name }
func (w *Workout) Description() string { return w.description }
func (w *Workout) SportType() string { return w.sportType }
func (w *Workout) ScheduledDate() time.Time { return w.scheduledDate }
func (w *Workout) CompletedAt() *time.Time { return w.completedAt }
func (w *Workout) Exercises() []WorkoutExercise { return w.exercises }
func (w *Workout) Status() WorkoutStatus { return w.status }
func (w *Workout) RPE() *int { return w.rpe }
func (w *Workout) AthleteNotes() string { return w.athleteNotes }
func (w *Workout) CoachNotes() string { return w.coachNotes }
func (w *Workout) CoachFeedback() string { return w.coachFeedback }
func (w *Workout) ReviewedAt() *time.Time { return w.reviewedAt }
func (w *Workout) ReviewedBy() *uuid.UUID { return w.reviewedBy }
func (w *Workout) Source() string { return w.source }
func (w *Workout) SourceID() string { return w.sourceID }
func (w *Workout) Version() int { return w.version }
func (w *Workout) CreatedAt() time.Time { return w.createdAt }

func ReconstructWorkout(
	id uuid.UUID,
	programID *uuid.UUID,
	orgID, athleteID uuid.UUID,
	coachID *uuid.UUID,
	name, description, sportType string,
	scheduledDate time.Time,
	completedAt *time.Time,
	status WorkoutStatus,
	rpe *int,
	athleteNotes, coachNotes, coachFeedback string,
	reviewedAt *time.Time,
	reviewedBy *uuid.UUID,
	source, sourceID string,
	version int,
	createdAt time.Time,
) *Workout {
	return &Workout{
		id:             id,
		programID:      programID,
		organizationID: orgID,
		athleteID:      athleteID,
		coachID:        coachID,
		name:           name,
		description:    description,
		sportType:      sportType,
		scheduledDate:  scheduledDate,
		completedAt:    completedAt,
		status:         status,
		rpe:            rpe,
		athleteNotes:   athleteNotes,
		coachNotes:     coachNotes,
		coachFeedback:  coachFeedback,
		reviewedAt:     reviewedAt,
		reviewedBy:     reviewedBy,
		source:         source,
		sourceID:       sourceID,
		version:        version,
		createdAt:      createdAt,
		exercises:      []WorkoutExercise{},
	}
}

func (w *Workout) AddReconstructedSet(exerciseIdx int, setID uuid.UUID, setNumber int, setType string, reps *int, weight *float64, rpe *float64, actualReps *int, actualWeight *float64, isCompleted bool, isSkipped bool, completedAt *time.Time, notes string) {
	if exerciseIdx >= 0 && exerciseIdx < len(w.exercises) {
		w.exercises[exerciseIdx].sets = append(w.exercises[exerciseIdx].sets, ExerciseSet{
			id:              setID,
			setNumber:       setNumber,
			setType:         setType,
			prescribedReps:  reps,
			prescribedWeight: weight,
			prescribedRPE:   rpe,
			actualReps:      actualReps,
			actualWeight:    actualWeight,
			isCompleted:     isCompleted,
			isSkipped:       isSkipped,
			completedAt:     completedAt,
			notes:           notes,
		})
	}
}
