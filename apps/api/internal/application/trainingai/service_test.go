package trainingai

import (
	"testing"
	"time"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/trainingai"
)

func ex() domain.WorkoutExercise {
	return domain.WorkoutExercise{ID: "we-1", Name: "Sentadilla", Sets: 4, Reps: 8, WeightKg: 80, RestSeconds: 120}
}

func TestBuildInsight_NoHistory(t *testing.T) {
	ins := buildInsight(ex(), nil, nil)

	if ins.SuggestedWeight != 80 {
		t.Errorf("expected prescribed weight 80, got %f", ins.SuggestedWeight)
	}
	if ins.Confidence != 0.3 {
		t.Errorf("expected confidence 0.3 without history, got %f", ins.Confidence)
	}
	if ins.Plateau {
		t.Error("no history cannot be a plateau")
	}
}

func TestBuildInsight_ProgressiveOverload(t *testing.T) {
	history := []domain.SetHistoryEntry{
		{Date: "2026-10-16", Weight: 80, Reps: 8},
		{Date: "2026-10-12", Weight: 80, Reps: 8},
		{Date: "2026-10-08", Weight: 77.5, Reps: 8},
	}
	ins := buildInsight(ex(), history, nil)

	if ins.SuggestedWeight != 82.5 {
		t.Errorf("expected +2.5kg jump to 82.5, got %f", ins.SuggestedWeight)
	}
	if ins.TargetRIR != 3 {
		t.Errorf("expected RIR 3, got %d", ins.TargetRIR)
	}
	if ins.OneRM == 0 {
		t.Error("expected 1RM estimate")
	}
	if ins.Confidence != 0.75 {
		t.Errorf("expected confidence 0.75 (3 sessions), got %f", ins.Confidence)
	}
}

func TestBuildInsight_PlateauSuggestsDeload(t *testing.T) {
	history := []domain.SetHistoryEntry{
		{Date: "2026-10-16", Weight: 80, Reps: 8},
		{Date: "2026-10-12", Weight: 80, Reps: 8},
		{Date: "2026-10-08", Weight: 80, Reps: 8},
		{Date: "2026-10-04", Weight: 80, Reps: 8},
	}
	ins := buildInsight(ex(), history, nil)

	if !ins.Plateau {
		t.Fatal("expected plateau for 3+ flat sessions")
	}
	if ins.SuggestedWeight != 72 {
		t.Errorf("expected 10%% deload to 72, got %f", ins.SuggestedWeight)
	}
	if ins.SuggestedReps != 9 {
		t.Errorf("expected +1 rep target, got %d", ins.SuggestedReps)
	}
	if ins.TargetRIR != 2 {
		t.Errorf("expected RIR 2 on plateau, got %d", ins.TargetRIR)
	}
}

func TestBuildInsight_HighFatigueRaisesRIR(t *testing.T) {
	history := []domain.SetHistoryEntry{
		{Date: "2026-10-16", Weight: 80, Reps: 6},
	}
	// Load today → full decay factor, score = load/30 (date derived so the
	// test does not depend on the wall clock day).
	today := time.Now().UTC().Format("2006-01-02")
	loads := map[string]float64{today: 3000}

	ins := buildInsight(ex(), history, loads)

	if ins.FatigueScore < 70 {
		t.Fatalf("expected high fatigue, got %f", ins.FatigueScore)
	}
	if ins.TargetRIR != 4 {
		t.Errorf("expected RIR 4 under high fatigue, got %d", ins.TargetRIR)
	}
}

func TestEpileyOneRM(t *testing.T) {
	// 100kg x 5 → 100 * (1 + 5/30) = 116.67
	got := epleyOneRM(100, 5)
	if got < 116.6 || got > 116.7 {
		t.Errorf("unexpected 1RM: %f", got)
	}
	if epleyOneRM(0, 5) != 0 || epleyOneRM(100, 0) != 0 {
		t.Error("invalid inputs must return 0")
	}
}

func TestConfidenceFor(t *testing.T) {
	cases := map[int]float64{0: 0.3, 1: 0.6, 3: 0.75, 5: 0.9, 9: 0.9}
	for sessions, want := range cases {
		if got := confidenceFor(sessions); got != want {
			t.Errorf("confidenceFor(%d) = %f, want %f", sessions, got, want)
		}
	}
}
