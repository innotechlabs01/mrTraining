package training

import (
	"time"

	"github.com/google/uuid"
)

type ProgramStatus string

const (
	ProgramStatusDraft     ProgramStatus = "draft"
	ProgramStatusPublished ProgramStatus = "published"
	ProgramStatusActive    ProgramStatus = "active"
	ProgramStatusArchived  ProgramStatus = "archived"
)

type ProgramPhase struct {
	id              uuid.UUID
	name            string
	description     string
	weekStart       int
	weekEnd         int
	workoutTemplateIDs []uuid.UUID
}

type WorkoutProgram struct {
	id              uuid.UUID
	organizationID  uuid.UUID
	coachID         uuid.UUID
	name            string
	description     string
	sportType       string
	programType     string
	startDate       time.Time
	endDate         *time.Time
	durationWeeks   *int
	phases          []ProgramPhase
	status          ProgramStatus
	isTemplate      bool
	assignedAthletes map[uuid.UUID]bool
	publishedAt     *time.Time
	domainEvents    []DomainEvent
	version         int
}

func NewWorkoutProgram(name, description, sportType string, startDate, endDate time.Time, coachID, orgID uuid.UUID) *WorkoutProgram {
	return &WorkoutProgram{
		id:              uuid.New(),
		organizationID:  orgID,
		coachID:         coachID,
		name:            name,
		description:     description,
		sportType:       sportType,
		programType:     "custom",
		startDate:       startDate,
		endDate:         &endDate,
		status:          ProgramStatusDraft,
		isTemplate:      false,
		assignedAthletes: make(map[uuid.UUID]bool),
		version:         1,
	}
}

func (p *WorkoutProgram) AddPhase(name, description string, weekStart, weekEnd int) error {
	if weekStart > weekEnd {
		return ErrInvalidPhaseRange
	}
	p.phases = append(p.phases, ProgramPhase{
		id:          uuid.New(),
		name:        name,
		description: description,
		weekStart:   weekStart,
		weekEnd:     weekEnd,
	})
	p.version++
	p.raiseEvent(ProgramPhaseAdded{
		ProgramID: p.id,
		Phase:     name,
	})
	return nil
}

func (p *WorkoutProgram) AssignAthlete(athleteID uuid.UUID) {
	if !p.assignedAthletes[athleteID] {
		p.assignedAthletes[athleteID] = true
		p.raiseEvent(ProgramAssigned{
			ProgramID:  p.id,
			AthleteID:  athleteID,
			CoachID:    p.coachID,
			OrgID:      p.organizationID,
		})
	}
}

func (p *WorkoutProgram) Publish() error {
	if p.status != ProgramStatusDraft {
		return ErrProgramNotDraft
	}
	p.status = ProgramStatusPublished
	now := time.Now()
	p.publishedAt = &now
	p.version++
	p.raiseEvent(ProgramPublished{
		ProgramID: p.id,
		OrgID:     p.organizationID,
	})
	return nil
}

func (p *WorkoutProgram) DomainEvents() []DomainEvent {
	return p.domainEvents
}

func (p *WorkoutProgram) ClearEvents() {
	p.domainEvents = nil
}

func (p *WorkoutProgram) raiseEvent(event DomainEvent) {
	p.domainEvents = append(p.domainEvents, event)
}

func (p *WorkoutProgram) ID() uuid.UUID { return p.id }
func (p *WorkoutProgram) OrganizationID() uuid.UUID { return p.organizationID }
func (p *WorkoutProgram) CoachID() uuid.UUID { return p.coachID }
func (p *WorkoutProgram) Name() string { return p.name }
func (p *WorkoutProgram) Description() string { return p.description }
func (p *WorkoutProgram) SportType() string { return p.sportType }
func (p *WorkoutProgram) ProgramType() string { return p.programType }
func (p *WorkoutProgram) StartDate() time.Time { return p.startDate }
func (p *WorkoutProgram) EndDate() *time.Time { return p.endDate }
func (p *WorkoutProgram) DurationWeeks() *int { return p.durationWeeks }
func (p *WorkoutProgram) Phases() []ProgramPhase { return p.phases }
func (p *WorkoutProgram) Status() ProgramStatus { return p.status }
func (p *WorkoutProgram) IsTemplate() bool { return p.isTemplate }
func (p *WorkoutProgram) AssignedAthletes() map[uuid.UUID]bool { return p.assignedAthletes }
func (p *WorkoutProgram) PublishedAt() *time.Time { return p.publishedAt }
func (p *WorkoutProgram) Version() int { return p.version }

var (
	ErrInvalidPhaseRange = &DomainError{Message: "week start must be before or equal to week end"}
	ErrProgramNotDraft   = &DomainError{Message: "program must be in draft status to publish"}
)

type DomainError struct {
	Message string
}

func (e *DomainError) Error() string {
	return e.Message
}
