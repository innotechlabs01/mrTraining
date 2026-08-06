package athlete

import (
	"time"

	"github.com/google/uuid"
)

type AthleteStatus string

const (
	AthleteStatusActive   AthleteStatus = "active"
	AthleteStatusInactive AthleteStatus = "inactive"
	AthleteStatusInjured  AthleteStatus = "injured"
)

type InjuryStatus string

const (
	InjuryStatusHealthy InjuryStatus = "healthy"
	InjuryStatusMinor   InjuryStatus = "minor"
	InjuryStatusMajor   InjuryStatus = "major"
)

type Athlete struct {
	id               uuid.UUID
	userID           uuid.UUID
	organizationID   uuid.UUID
	primarySport     string
	experienceLevel string
	heightCm         *float64
	weightKg         *float64
	bodyFatPct       *float64
	injuryStatus     InjuryStatus
	trainingStatus   AthleteStatus
	goals            []string
	settings         map[string]interface{}
	coachID          *uuid.UUID
	createdAt        time.Time
	updatedAt        time.Time
	version          int
	domainEvents     []DomainEvent
}

func NewAthlete(userID, orgID uuid.UUID, sport, experienceLevel string) *Athlete {
	return &Athlete{
		id:               uuid.New(),
		userID:           userID,
		organizationID:   orgID,
		primarySport:     sport,
		experienceLevel:  experienceLevel,
		trainingStatus:   AthleteStatusActive,
		injuryStatus:     InjuryStatusHealthy,
		goals:            []string{},
		settings:         make(map[string]interface{}),
		version:          1,
		createdAt:        time.Now(),
		updatedAt:        time.Now(),
	}
}

func (a *Athlete) AssignCoach(coachID uuid.UUID) {
	if a.coachID != &coachID {
		oldCoachID := a.coachID
		a.coachID = &coachID
		a.updatedAt = time.Now()
		a.version++
		a.raiseEvent(AthleteCoachAssigned{
			AthleteID:  a.id,
			OldCoachID: oldCoachID,
			NewCoachID: coachID,
		})
	}
}

func (a *Athlete) UpdateMetrics(height, weight, bodyFat *float64, injuryStatus InjuryStatus) {
	a.heightCm = height
	a.weightKg = weight
	a.bodyFatPct = bodyFat
	a.injuryStatus = injuryStatus
	a.updatedAt = time.Now()
	a.version++
}

func (a *Athlete) AddGoal(goal string) {
	for _, g := range a.goals {
		if g == goal {
			return
		}
	}
	a.goals = append(a.goals, goal)
	a.updatedAt = time.Now()
	a.version++
}

func (a *Athlete) DomainEvents() []DomainEvent {
	return a.domainEvents
}

func (a *Athlete) ClearEvents() {
	a.domainEvents = nil
}

func (a *Athlete) raiseEvent(event DomainEvent) {
	a.domainEvents = append(a.domainEvents, event)
}

func (a *Athlete) ID() uuid.UUID { return a.id }
func (a *Athlete) UserID() uuid.UUID { return a.userID }
func (a *Athlete) OrganizationID() uuid.UUID { return a.organizationID }
func (a *Athlete) PrimarySport() string { return a.primarySport }
func (a *Athlete) ExperienceLevel() string { return a.experienceLevel }
func (a *Athlete) HeightCm() *float64 { return a.heightCm }
func (a *Athlete) WeightKg() *float64 { return a.weightKg }
func (a *Athlete) BodyFatPct() *float64 { return a.bodyFatPct }
func (a *Athlete) InjuryStatus() InjuryStatus { return a.injuryStatus }
func (a *Athlete) TrainingStatus() AthleteStatus { return a.trainingStatus }
func (a *Athlete) Goals() []string { return a.goals }
func (a *Athlete) Settings() map[string]interface{} { return a.settings }
func (a *Athlete) CoachID() *uuid.UUID { return a.coachID }
func (a *Athlete) CreatedAt() time.Time { return a.createdAt }
func (a *Athlete) UpdatedAt() time.Time { return a.updatedAt }
func (a *Athlete) Version() int { return a.version }
