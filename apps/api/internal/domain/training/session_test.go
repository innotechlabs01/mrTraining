package training

import "testing"

func TestNewTrainingSession(t *testing.T) {
	s := NewTrainingSession("coach-1", "athlete-1", "Strength Day", "2026-08-26T10:00:00Z", "scheduled")
	if s.ID == "" {
		t.Fatal("expected non-empty ID")
	}
	if s.CoachID != "coach-1" {
		t.Fatalf("expected coach-1, got %s", s.CoachID)
	}
	if s.AthleteID != "athlete-1" {
		t.Fatalf("expected athlete-1, got %s", s.AthleteID)
	}
	if s.Title != "Strength Day" {
		t.Fatalf("expected Strength Day, got %s", s.Title)
	}
	if s.Status != "scheduled" {
		t.Fatalf("expected scheduled, got %s", s.Status)
	}
}
