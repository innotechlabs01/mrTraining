// Package athlete defines the Athlete aggregate root for the MR Training API.
// The Athlete aggregate owns athlete-scoped concerns (profile, primary sport,
// training status, injury status, assigned coaches, metrics summary) and
// delegates data access to sub-domains through repository interfaces.
package athlete

// PrimarySport is the athlete's primary sport discipline.
type PrimarySport string

const (
	SportGym      PrimarySport = "gym"
	SportRunning  PrimarySport = "running"
	SportTennis   PrimarySport = "tennis"
	SportSwimming PrimarySport = "swimming"
	SportCycling  PrimarySport = "cycling"
	SportCrossFit PrimarySport = "crossfit"
)

// TrainingStatus describes the athlete's current training state.
type TrainingStatus string

const (
	TrainingActive     TrainingStatus = "active"
	TrainingInactive   TrainingStatus = "inactive"
	TrainingPaused     TrainingStatus = "paused"
	TrainingRecovering TrainingStatus = "recovering"
)

// InjuryStatus describes the athlete's current injury state.
type InjuryStatus string

const (
	InjuryHealthy  InjuryStatus = "healthy"
	InjuryMinor    InjuryStatus = "minor"
	InjuryModerate InjuryStatus = "moderate"
	InjurySevere   InjuryStatus = "severe"
)

// CoachAssignment is a coach assigned to an athlete.
type CoachAssignment struct {
	CoachID    string `json:"coach_id"`
	CoachName  string `json:"coach_name,omitempty"`
	IsPrimary  bool   `json:"is_primary"`
	AssignedAt string `json:"assigned_at"`
}

// Athlete is the aggregate root for an athlete profile.
type Athlete struct {
	ID              string            `json:"id"`
	UserID          string            `json:"user_id"`
	PrimarySport    PrimarySport      `json:"primary_sport"`
	TrainingStatus  TrainingStatus    `json:"training_status"`
	InjuryStatus    InjuryStatus      `json:"injury_status"`
	AssignedCoaches []CoachAssignment `json:"assigned_coaches"`
	MetricsSummary  *MetricsSummary   `json:"metrics_summary,omitempty"`
}

// MetricsSummary holds high-level metrics for an athlete.
type MetricsSummary struct {
	WeeklyLoad     float64 `json:"weekly_load"`
	AdherencePct   float64 `json:"adherence_pct"`
	ReadinessScore float64 `json:"readiness_score"`
	Acwr           float64 `json:"acwr"`
	LastUpdatedAt  string  `json:"last_updated_at"`
}

// NewAthlete creates a new Athlete aggregate with validated fields.
func NewAthlete(id, userID string, primarySport PrimarySport) *Athlete {
	return &Athlete{
		ID:              id,
		UserID:          userID,
		PrimarySport:    primarySport,
		TrainingStatus:  TrainingActive,
		InjuryStatus:    InjuryHealthy,
		AssignedCoaches: []CoachAssignment{},
	}
}

// ValidatePrimarySport checks that a PrimarySport value is recognized.
func ValidatePrimarySport(s PrimarySport) bool {
	switch s {
	case SportGym, SportRunning, SportTennis, SportSwimming, SportCycling, SportCrossFit:
		return true
	default:
		return false
	}
}

// AssignCoach adds a coach to the athlete's assigned coaches list.
func (a *Athlete) AssignCoach(coachID, coachName string, isPrimary bool) {
	for i := range a.AssignedCoaches {
		if a.AssignedCoaches[i].CoachID == coachID {
			a.AssignedCoaches[i].IsPrimary = isPrimary
			a.AssignedCoaches[i].CoachName = coachName
			return
		}
	}
	a.AssignedCoaches = append(a.AssignedCoaches, CoachAssignment{
		CoachID:    coachID,
		CoachName:  coachName,
		IsPrimary:  isPrimary,
		AssignedAt: "",
	})
}

// RemoveCoach removes a coach from the athlete's assigned coaches.
func (a *Athlete) RemoveCoach(coachID string) {
	filtered := make([]CoachAssignment, 0, len(a.AssignedCoaches))
	for _, c := range a.AssignedCoaches {
		if c.CoachID != coachID {
			filtered = append(filtered, c)
		}
	}
	a.AssignedCoaches = filtered
}

// SetMetricsSummary updates the athlete's metrics summary.
func (a *Athlete) SetMetricsSummary(summary *MetricsSummary) {
	a.MetricsSummary = summary
}
