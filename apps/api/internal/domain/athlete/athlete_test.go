package athlete

import (
	"testing"
)

func TestValidatePrimarySport(t *testing.T) {
	valid := []PrimarySport{SportGym, SportRunning, SportTennis, SportSwimming, SportCycling, SportCrossFit}
	for _, s := range valid {
		if !ValidatePrimarySport(s) {
			t.Errorf("ValidatePrimarySport(%q) = false, want true", s)
		}
	}
	if ValidatePrimarySport("invalid") {
		t.Error("ValidatePrimarySport(\"invalid\") = true, want false")
	}
}

func TestNewAthlete(t *testing.T) {
	a := NewAthlete("ath-1", "user-1", SportRunning)
	if a.ID != "ath-1" || a.UserID != "user-1" || a.PrimarySport != SportRunning {
		t.Fatalf("unexpected athlete: %+v", a)
	}
	if a.TrainingStatus != TrainingActive {
		t.Errorf("default training status = %q, want %q", a.TrainingStatus, TrainingActive)
	}
	if a.InjuryStatus != InjuryHealthy {
		t.Errorf("default injury status = %q, want %q", a.InjuryStatus, InjuryHealthy)
	}
	if a.AssignedCoaches == nil {
		t.Error("expected AssignedCoaches to be initialized (non-nil)")
	}
	if a.MetricsSummary != nil {
		t.Error("expected MetricsSummary to be nil by default")
	}
}

func TestAthleteAssignAndRemoveCoach(t *testing.T) {
	a := NewAthlete("ath-1", "user-1", SportRunning)
	a.AssignCoach("coach-1", "Sarah Chen", true)
	if len(a.AssignedCoaches) != 1 {
		t.Fatalf("expected 1 coach, got %d", len(a.AssignedCoaches))
	}
	if a.AssignedCoaches[0].CoachID != "coach-1" || !a.AssignedCoaches[0].IsPrimary {
		t.Errorf("unexpected coach assignment: %+v", a.AssignedCoaches[0])
	}

	// Re-assign same coach toggles primary flag
	a.AssignCoach("coach-1", "Sarah Chen", false)
	if len(a.AssignedCoaches) != 1 {
		t.Fatalf("expected 1 coach after re-assign, got %d", len(a.AssignedCoaches))
	}
	if a.AssignedCoaches[0].IsPrimary {
		t.Error("expected IsPrimary=false after re-assign")
	}

	// Add a second coach
	a.AssignCoach("coach-2", "Mike Ross", true)
	if len(a.AssignedCoaches) != 2 {
		t.Fatalf("expected 2 coaches, got %d", len(a.AssignedCoaches))
	}

	// Remove first coach
	a.RemoveCoach("coach-1")
	if len(a.AssignedCoaches) != 1 {
		t.Fatalf("expected 1 coach after removal, got %d", len(a.AssignedCoaches))
	}
	if a.AssignedCoaches[0].CoachID != "coach-2" {
		t.Errorf("expected coach-2 to remain, got %+v", a.AssignedCoaches[0])
	}
}

func TestAthleteSetMetricsSummary(t *testing.T) {
	a := NewAthlete("ath-1", "user-1", SportRunning)
	summary := &MetricsSummary{WeeklyLoad: 450.5, AdherencePct: 92.5, ReadinessScore: 82, Acwr: 1.11}
	a.SetMetricsSummary(summary)
	if a.MetricsSummary == nil {
		t.Fatal("expected MetricsSummary to be set")
	}
	if a.MetricsSummary.WeeklyLoad != 450.5 {
		t.Errorf("WeeklyLoad = %v, want 450.5", a.MetricsSummary.WeeklyLoad)
	}
}
