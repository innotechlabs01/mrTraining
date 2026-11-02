// Package trainingai computes actionable workout insights from logged training
// data. Rules are deterministic and explainable; no external model call is made
// (v1), so responses stay under the <2s p95 budget of the AI spec.
package trainingai

import (
	"context"
	"fmt"
	"math"
	"time"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/trainingai"
)

// Service builds AI insights for a workout detail view.
type Service struct {
	repo domain.Repository
}

// NewService creates a trainingai service with the given repository.
func NewService(repo domain.Repository) *Service {
	return &Service{repo: repo}
}

const (
	// defaultIncrementKg is the smallest standard plate jump when progressing.
	defaultIncrementKg = 2.5
	// plateauSessions: consecutive sessions without improvement to flag a plateau.
	plateauSessions = 3
	// fatigueHalfLifeHours mirrors the analytics fatigue model.
	fatigueHalfLifeHours = 72.0
)

// GetWorkoutAthlete returns the athlete a workout is assigned to.
// Handlers use it to enforce ownership before building insights.
func (s *Service) GetWorkoutAthlete(ctx context.Context, workoutID string) (string, error) {
	return s.repo.GetWorkoutAthlete(ctx, workoutID)
}

// GetWorkoutInsights returns per-exercise suggestions for the given workout.
// Ownership is enforced by the caller (handler) using GetWorkoutAthlete.
func (s *Service) GetWorkoutInsights(ctx context.Context, workoutID string) (*domain.WorkoutInsights, error) {
	exercises, err := s.repo.GetWorkoutExercises(ctx, workoutID)
	if err != nil {
		return nil, fmt.Errorf("workout insights: %w", err)
	}

	athleteID, err := s.repo.GetWorkoutAthlete(ctx, workoutID)
	if err != nil {
		return nil, fmt.Errorf("workout insights athlete: %w", err)
	}

	insights := make([]domain.ExerciseInsight, 0, len(exercises))
	for _, ex := range exercises {
		history, err := s.repo.GetExerciseHistory(ctx, athleteID, ex.Name, 8)
		if err != nil {
			return nil, fmt.Errorf("workout insights history: %w", err)
		}
		loadByDay, err := s.repo.GetExerciseLoadByDay(ctx, athleteID, ex.Name)
		if err != nil {
			return nil, fmt.Errorf("workout insights load: %w", err)
		}

		insights = append(insights, buildInsight(ex, history, loadByDay))
	}

	return &domain.WorkoutInsights{
		WorkoutID:   workoutID,
		Exercises:   insights,
		GeneratedAt: time.Now().UTC().Format(time.RFC3339),
	}, nil
}

// buildInsight applies the progression/plateau/fatigue rules for one exercise.
func buildInsight(
	ex domain.WorkoutExercise,
	history []domain.SetHistoryEntry,
	loadByDay map[string]float64,
) domain.ExerciseInsight {
	insight := domain.ExerciseInsight{
		ExerciseID:      ex.ID,
		Name:            ex.Name,
		PrescribedSets:  ex.Sets,
		PrescribedReps:  ex.Reps,
		SuggestedWeight: ex.WeightKg,
		SuggestedReps:   ex.Reps,
		TargetRIR:       3,
		Confidence:      0.3,
		Reason:          "Sin historial previo: mantenemos la carga prescrita y apuntamos a RIR 3.",
	}

	if len(history) == 0 {
		insight.FatigueScore = fatigueFromLoads(loadByDay)
		return insight
	}

	// 1RM estimate: best Epley across history.
	bestOneRM := 0.0
	for _, h := range history {
		rm := epleyOneRM(h.Weight, h.Reps)
		if rm > bestOneRM {
			bestOneRM = rm
		}
	}
	insight.OneRM = round2(bestOneRM)

	last := history[0]
	insight.SuggestedWeight = last.Weight
	insight.SuggestedReps = ex.Reps
	insight.Confidence = confidenceFor(len(history))

	// Plateau: last `plateauSessions` sessions show no improvement in best
	// estimated 1RM.
	if len(history) >= plateauSessions {
		improving := false
		for i := 1; i < plateauSessions; i++ {
			if epleyOneRM(history[i-1].Weight, history[i-1].Reps) >
				epleyOneRM(history[i].Weight, history[i].Reps)+0.01 {
				improving = true
				break
			}
		}
		if !improving {
			insight.Plateau = true
		}
	}

	if insight.Plateau {
		// Deload suggestion: -10% of last weight, one more rep target.
		insight.SuggestedWeight = round2(last.Weight * 0.9)
		insight.SuggestedReps = ex.Reps + 1
		insight.TargetRIR = 2
		insight.Reason = fmt.Sprintf(
			"Plato detectado (%d sesiones sin progreso). Sugerimos deload a %.1f kg con %d reps para recuperar adaptación.",
			plateauSessions, insight.SuggestedWeight, insight.SuggestedReps)
	} else if last.Reps >= float64(ex.Reps) && last.Weight >= ex.WeightKg {
		// Progressive overload: completed the rep target → add a plate jump.
		insight.SuggestedWeight = round2(last.Weight + defaultIncrementKg)
		insight.Reason = fmt.Sprintf(
			"Progresión: completaste %d reps con %.1f kg. Subimos a %.1f kg manteniendo RIR 3.",
			int(last.Reps), last.Weight, insight.SuggestedWeight)
	} else {
		insight.Reason = fmt.Sprintf(
			"Mantenemos %.1f kg: la última sesión hizo %.0f reps (objetivo %d). Apuntá a RIR 3.",
			last.Weight, last.Reps, ex.Reps)
	}

	insight.FatigueScore = fatigueFromLoads(loadByDay)
	if insight.FatigueScore >= 70 {
		insight.TargetRIR = 4
		insight.Reason += " Fatiga alta en los últimos 7 días: reservá 4 reps en recámara."
	}

	return insight
}

// epleyOneRM estimates 1RM with the Epley formula.
func epleyOneRM(weight, reps float64) float64 {
	if weight <= 0 || reps <= 0 {
		return 0
	}
	return weight * (1 + reps/30.0)
}

// confidenceFor maps history depth to a 0-1 confidence score (AI spec: <0.7
// results are observations, not recommendations).
func confidenceFor(sessions int) float64 {
	switch {
	case sessions >= 5:
		return 0.9
	case sessions >= 3:
		return 0.75
	case sessions >= 1:
		return 0.6
	default:
		return 0.3
	}
}

// fatigueFromLoads applies a 72h exponential decay over per-day load and
// normalizes to 0-100 (3000 kg·reps of decayed load ≈ fully fatigued).
func fatigueFromLoads(loadByDay map[string]float64) float64 {
	now := time.Now().UTC()
	decayed := 0.0
	for date, load := range loadByDay {
		t, err := time.Parse("2006-01-02", date)
		if err != nil {
			continue
		}
		hours := now.Sub(t.Add(12 * time.Hour)).Hours()
		if hours < 0 {
			hours = 0
		}
		decayed += load * math.Exp2(-hours/fatigueHalfLifeHours)
	}
	score := decayed / 30.0
	if score > 100 {
		score = 100
	}
	return round2(score)
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}
