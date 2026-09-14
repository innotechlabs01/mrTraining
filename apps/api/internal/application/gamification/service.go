package gamification

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/innotechlabs01/mr-training-api/internal/domain/gamification"
)

// Badge definitions - matching mobile's badgeService.ts
var badgeDefinitions = map[string]struct {
	Title       string
	Description string
	Category    string
	Icon        string
	Threshold   int
}{
	"streak-3":    {"Constancia", "3 días seguidos entrenando", "streak", "FireIcon", 3},
	"streak-7":    {"Semana Perfecta", "7 días seguidos entrenando", "streak", "FireIcon", 7},
	"streak-14":   {"Imparable", "14 días seguidos entrenando", "streak", "FireIcon", 14},
	"streak-30":   {"Centurión", "30 días seguidos entrenando", "streak", "FireIcon", 30},
	"workout-10":  {"Primeros Pasos", "10 entrenamientos completados", "workout", "BarbellIcon", 10},
	"workout-50":  {"Dedicación", "50 entrenamientos completados", "workout", "BarbellIcon", 50},
	"workout-100": {"Centenario", "100 entrenamientos completados", "workout", "BarbellIcon", 100},
	"pr-1":        {"Primera Marca", "Primer récord personal registrado", "pr", "TrophyIcon", 1},
	"pr-10":       {"Récords Rotos", "10 récords personales alcanzados", "pr", "TrophyIcon", 10},
	"social-5":    {"Compañero", "5 interacciones en el feed del coach", "social", "ChatIcon", 5},
}

// GetBadgeDefinition returns a badge definition by ID.
func GetBadgeDefinition(id string) (struct {
	Title       string
	Description string
	Category    string
	Icon        string
	Threshold   int
}, bool) {
	def, ok := badgeDefinitions[id]
	return def, ok
}

// Service handles gamification business logic.
type Service struct {
	repo gamification.Repository
}

// NewService creates a new gamification service.
func NewService(repo gamification.Repository) *Service {
	return &Service{repo: repo}
}

// GetStreak returns the athlete's current streak data.
func (s *Service) GetStreak(ctx context.Context, athleteID string) (*gamification.Streak, error) {
	if strings.TrimSpace(athleteID) == "" {
		return nil, fmt.Errorf("athlete ID is required")
	}

	streak, err := s.repo.GetStreak(ctx, athleteID)
	if err != nil {
		return nil, err
	}
	if streak == nil {
		// Return fresh streak for new users
		return &gamification.Streak{
			ID:            uuid.New().String(),
			AthleteID:     athleteID,
			CurrentStreak: 0,
			LongestStreak: 0,
			CreatedAt:     time.Now().UTC().Format(time.RFC3339),
			UpdatedAt:     time.Now().UTC().Format(time.RFC3339),
		}, nil
	}
	return streak, nil
}

// LogWorkoutDay records a workout day and updates streak.
func (s *Service) LogWorkoutDay(ctx context.Context, athleteID, workoutDate string, workoutID *string) (*gamification.Streak, error) {
	if strings.TrimSpace(athleteID) == "" {
		return nil, fmt.Errorf("athlete ID is required")
	}
	if strings.TrimSpace(workoutDate) == "" {
		return nil, fmt.Errorf("workout date is required")
	}

	// Check if already logged today
	existing, err := s.repo.ListWorkoutDays(ctx, athleteID, workoutDate)
	if err != nil {
		return nil, err
	}
	for _, day := range existing {
		if day.WorkoutDate == workoutDate {
			// Already logged, return current streak
			return s.GetStreak(ctx, athleteID)
		}
	}

	// Log the workout day
	day := &gamification.WorkoutDay{
		ID:          uuid.New().String(),
		AthleteID:   athleteID,
		WorkoutDate: workoutDate,
		WorkoutID:   workoutID,
		CreatedAt:   time.Now().UTC().Format(time.RFC3339),
	}
	if err := s.repo.LogWorkoutDay(ctx, day); err != nil {
		return nil, err
	}

	// Get all workout days to recalculate streak
	allDays, err := s.repo.ListWorkoutDays(ctx, athleteID, "")
	if err != nil {
		return nil, err
	}

	// Calculate streak
	dates := make([]string, len(allDays))
	for i, d := range allDays {
		dates[i] = d.WorkoutDate
	}
	current, longest := calculateStreak(dates)

	// Update streak record
	streak, err := s.repo.GetStreak(ctx, athleteID)
	if err != nil {
		return nil, err
	}
	if streak == nil {
		streak = &gamification.Streak{
			ID:        uuid.New().String(),
			AthleteID: athleteID,
		}
	}
	streak.CurrentStreak = current
	if longest > streak.LongestStreak {
		streak.LongestStreak = longest
	}
	streak.LastWorkoutDate = &workoutDate
	streak.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	if err := s.repo.UpsertStreak(ctx, streak); err != nil {
		return nil, err
	}

	return streak, nil
}

// ListBadges returns all badges for an athlete.
func (s *Service) ListBadges(ctx context.Context, athleteID string) ([]*gamification.Badge, error) {
	if strings.TrimSpace(athleteID) == "" {
		return nil, fmt.Errorf("athlete ID is required")
	}
	return s.repo.ListBadges(ctx, athleteID)
}

// CheckBadges evaluates badge unlocks and returns newly unlocked badges.
func (s *Service) CheckBadges(ctx context.Context, athleteID string, totalWorkouts int, totalPRs int, feedInteractions int) ([]*gamification.Badge, error) {
	if strings.TrimSpace(athleteID) == "" {
		return nil, fmt.Errorf("athlete ID is required")
	}

	// Get current streak
	streak, err := s.GetStreak(ctx, athleteID)
	if err != nil {
		return nil, err
	}

	// Get existing badges
	existing, err := s.repo.ListBadges(ctx, athleteID)
	if err != nil {
		return nil, err
	}
	existingMap := make(map[string]bool)
	for _, b := range existing {
		existingMap[b.BadgeID] = true
	}

	// Evaluate all badges
	var newBadges []*gamification.Badge
	now := time.Now().UTC().Format(time.RFC3339)

	for badgeID, def := range badgeDefinitions {
		if existingMap[badgeID] {
			continue // Already unlocked
		}

		earned := false
		switch def.Category {
		case "streak":
			earned = streak.LongestStreak >= def.Threshold
		case "workout":
			earned = totalWorkouts >= def.Threshold
		case "pr":
			earned = totalPRs >= def.Threshold
		case "social":
			earned = feedInteractions >= def.Threshold
		}

		if earned {
			badge := &gamification.Badge{
				ID:         uuid.New().String(),
				AthleteID:  athleteID,
				BadgeID:    badgeID,
				UnlockedAt: now,
			}
			if err := s.repo.UpsertBadge(ctx, badge); err != nil {
				return nil, err
			}
			newBadges = append(newBadges, badge)
		}
	}

	return newBadges, nil
}

// ListPRs returns all personal records for an athlete.
func (s *Service) ListPRs(ctx context.Context, athleteID string) ([]*gamification.PersonalRecord, error) {
	if strings.TrimSpace(athleteID) == "" {
		return nil, fmt.Errorf("athlete ID is required")
	}
	return s.repo.ListPRs(ctx, athleteID)
}

// RecordPR records a new personal record attempt.
func (s *Service) RecordPR(ctx context.Context, athleteID, exerciseID, exerciseName string, value float64, unit string) (*gamification.PersonalRecord, bool, error) {
	if strings.TrimSpace(athleteID) == "" {
		return nil, false, fmt.Errorf("athlete ID is required")
	}
	if strings.TrimSpace(exerciseID) == "" {
		return nil, false, fmt.Errorf("exercise ID is required")
	}

	// Get existing PR
	existing, err := s.repo.GetPR(ctx, athleteID, exerciseID)
	if err != nil {
		return nil, false, err
	}

	now := time.Now().UTC().Format(time.RFC3339)
	isNewPR := false

	if existing == nil {
		// First PR for this exercise
		isNewPR = true
		pr := &gamification.PersonalRecord{
			ID:         uuid.New().String(),
			AthleteID:  athleteID,
			ExerciseID: exerciseID,
			BestValue:  value,
			Unit:       unit,
			AchievedAt: now,
		}
		if err := s.repo.UpsertPR(ctx, pr); err != nil {
			return nil, false, err
		}
		return pr, isNewPR, nil
	}

	// Check if new value is better
	if value > existing.BestValue {
		isNewPR = true
		prevBest := existing.BestValue
		existing.PreviousBest = &prevBest
		existing.BestValue = value
		existing.AchievedAt = now
		if err := s.repo.UpsertPR(ctx, existing); err != nil {
			return nil, false, err
		}
		return existing, isNewPR, nil
	}

	return existing, false, nil
}

// calculateStreak computes current and longest streak from sorted date strings.
func calculateStreak(sortedDates []string) (current, longest int) {
	if len(sortedDates) == 0 {
		return 0, 0
	}

	// Deduplicate and sort
	seen := make(map[string]bool)
	unique := make([]string, 0)
	for _, d := range sortedDates {
		if !seen[d] {
			seen[d] = true
			unique = append(unique, d)
		}
	}

	sort.Strings(unique)

	// Calculate longest streak
	run := 1
	longest = 1
	for i := 1; i < len(unique); i++ {
		prev, _ := time.Parse("2006-01-02", unique[i-1])
		curr, _ := time.Parse("2006-01-02", unique[i])
		if curr.Sub(prev) == 24*time.Hour {
			run++
		} else {
			if run > longest {
				longest = run
			}
			run = 1
		}
	}
	if run > longest {
		longest = run
	}

	// Calculate current streak (backwards from today)
	current = 0
	for i := len(unique) - 1; i >= 0; i-- {
		expected := time.Now().UTC().Add(-time.Duration(current) * 24 * time.Hour).Format("2006-01-02")
		if unique[i] == expected {
			current++
		} else {
			break
		}
	}

	return current, longest
}
