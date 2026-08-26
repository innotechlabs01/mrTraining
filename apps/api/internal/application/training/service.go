// Package training provides the application service layer for the training domain.
// It orchestrates business logic between HTTP handlers and repositories,
// keeping domain rules decoupled from transport concerns.
package training

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/innotechlabs01/mr-training-api/internal/domain/training"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
)

// Service implements training-related business operations.
// It depends on repository interfaces, making it testable with mocks.
type Service struct {
	exerciseRepo training.ExerciseRepository
	workoutRepo  training.WorkoutRepository
	progressRepo training.ProgressRepository
}

// NewService creates a new training application service with the given repositories.
func NewService(
	exerciseRepo training.ExerciseRepository,
	workoutRepo training.WorkoutRepository,
	progressRepo training.ProgressRepository,
) *Service {
	return &Service{
		exerciseRepo: exerciseRepo,
		workoutRepo:  workoutRepo,
		progressRepo: progressRepo,
	}
}

// ListExercises returns a paginated list of exercises with optional filters.
// Global exercises are visible to all coaches; custom exercises are scoped to the coach.
func (s *Service) ListExercises(ctx context.Context, page, limit int, filter training.ExerciseFilter) ([]*training.ExerciseEntry, int, error) {
	offset := (page - 1) * limit

	exercises, total, err := s.exerciseRepo.List(ctx, filter, offset, limit)
	if err != nil {
		return nil, 0, fmt.Errorf("list exercises: %w", err)
	}

	return exercises, total, nil
}

// GetExercise returns a single exercise by ID.
func (s *Service) GetExercise(ctx context.Context, id string) (*training.ExerciseEntry, error) {
	exercise, err := s.exerciseRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get exercise: %w", err)
	}
	return exercise, nil
}

// CreateExercise creates a new custom exercise for a coach.
// The slug is auto-generated from the exercise name.
func (s *Service) CreateExercise(ctx context.Context, coachID string, req dto.CreateExerciseRequest) (*training.ExerciseEntry, error) {
	if strings.TrimSpace(req.Name) == "" {
		return nil, errors.BadRequest("exercise name is required")
	}

	// Generate slug from name
	baseSlug := strings.ToLower(strings.TrimSpace(req.Name))
	baseSlug = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			return r
		}
		return '-'
	}, baseSlug)
	// Clean up multiple dashes
	for strings.Contains(baseSlug, "--") {
		baseSlug = strings.ReplaceAll(baseSlug, "--", "-")
	}
	baseSlug = strings.Trim(baseSlug, "-")
	if baseSlug == "" {
		baseSlug = "exercise"
	}
	slug := fmt.Sprintf("%s-%s", baseSlug, uuid.New().String()[:8])

	isCustom := true
	exercise := &training.ExerciseEntry{
		ID:          uuid.New().String(),
		Slug:        slug,
		Name:        strings.TrimSpace(req.Name),
		Description: req.Description,
		Mode:        req.Mode,
		BodyPart:    req.BodyPart,
		Equipment:   req.Equipment,
		Difficulty:  req.Difficulty,
		Category:    req.Category,
		Instructions: req.Instructions,
		IsCustom:    isCustom,
		CoachID:     &coachID,
	}

	if req.Mode == "" {
		exercise.Mode = "reps"
	}

	if err := s.exerciseRepo.Create(ctx, exercise); err != nil {
		return nil, fmt.Errorf("create exercise: %w", err)
	}

	return exercise, nil
}

// ListWorkoutTemplates returns all workout templates for a coach.
func (s *Service) ListWorkoutTemplates(ctx context.Context, coachID string) ([]*training.WorkoutTemplate, error) {
	templates, err := s.workoutRepo.ListTemplates(ctx, coachID)
	if err != nil {
		return nil, fmt.Errorf("list workout templates: %w", err)
	}
	return templates, nil
}

// GetWorkoutTemplate returns a single workout template with its exercises.
func (s *Service) GetWorkoutTemplate(ctx context.Context, id string) (*training.WorkoutTemplate, error) {
	template, err := s.workoutRepo.GetTemplate(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get workout template: %w", err)
	}
	return template, nil
}

// CreateWorkoutTemplate creates a new workout template with exercises.
func (s *Service) CreateWorkoutTemplate(ctx context.Context, coachID string, req dto.CreateWorkoutTemplateRequest) (*training.WorkoutTemplate, error) {
	if strings.TrimSpace(req.Name) == "" {
		return nil, errors.BadRequest("template name is required")
	}

	exercises := make([]training.WorkoutExercise, len(req.Exercises))
	for i, ex := range req.Exercises {
		exercises[i] = training.WorkoutExercise{
			ID:                uuid.New().String(),
			Name:              ex.Name,
			Sets:              ex.Sets,
			Reps:              ex.Reps,
			WeightKg:          ex.WeightKg,
			RestSeconds:       ex.RestSeconds,
			SortOrder:         i,
			Notes:             ex.Notes,
			Mode:              ex.Mode,
			Phase:             ex.Phase,
			SupersetGroup:     ex.SupersetGroup,
			BodyPart:          ex.BodyPart,
			MuscleGroups:      ex.MuscleGroups,
			LibraryExerciseID: ex.LibraryExerciseID,
		}
	}

	template := &training.WorkoutTemplate{
		ID:                      uuid.New().String(),
		CoachID:                 coachID,
		Name:                    strings.TrimSpace(req.Name),
		Description:             req.Description,
		Goal:                    req.Goal,
		EstimatedDurationMinutes: req.EstimatedDurationMinutes,
		Exercises:               exercises,
	}

	if err := s.workoutRepo.CreateTemplate(ctx, template); err != nil {
		return nil, fmt.Errorf("create workout template: %w", err)
	}

	return template, nil
}

// AssignWorkout assigns a workout template to an athlete.
func (s *Service) AssignWorkout(ctx context.Context, coachID string, req dto.AssignWorkoutRequest) (*training.AssignedWorkout, error) {
	if strings.TrimSpace(req.AthleteID) == "" {
		return nil, errors.BadRequest("athlete_id is required")
	}
	if strings.TrimSpace(req.TemplateID) == "" {
		return nil, errors.BadRequest("template_id is required")
	}

	// Verify the template exists and belongs to the coach
	template, err := s.workoutRepo.GetTemplate(ctx, req.TemplateID)
	if err != nil {
		return nil, fmt.Errorf("get template for assignment: %w", err)
	}
	if template.CoachID != coachID {
		return nil, errors.Forbidden("you can only assign your own templates")
	}

	assigned := &training.AssignedWorkout{
		ID:          uuid.New().String(),
		AthleteID:   req.AthleteID,
		AthleteName: req.AthleteName,
		ContentID:   req.TemplateID,
		ContentType: "workout",
		ContentName: template.Name,
		Modality:    req.Modality,
		StartDate:   req.StartDate,
		EndDate:     req.EndDate,
		DaysOfWeek:  req.DaysOfWeek,
		Status:      "active",
		Progress:    0,
		CoachID:     coachID,
	}

	if err := s.workoutRepo.AssignWorkout(ctx, assigned); err != nil {
		return nil, fmt.Errorf("assign workout: %w", err)
	}

	return assigned, nil
}

// GetAssignedWorkouts returns all assigned workouts for an athlete.
func (s *Service) GetAssignedWorkouts(ctx context.Context, athleteID string) ([]*training.AssignedWorkout, error) {
	workouts, err := s.workoutRepo.ListAssignedWorkouts(ctx, athleteID)
	if err != nil {
		return nil, fmt.Errorf("get assigned workouts: %w", err)
	}
	return workouts, nil
}

// LogWorkoutSet logs a completed set within a workout session.
func (s *Service) LogWorkoutSet(ctx context.Context, workoutID string, req dto.LogWorkoutSetRequest) (*training.WorkoutSet, error) {
	if strings.TrimSpace(req.ExerciseID) == "" {
		return nil, errors.BadRequest("exercise_id is required")
	}
	if req.SetIndex < 1 {
		return nil, errors.BadRequest("set_index must be at least 1")
	}

	set := &training.WorkoutSet{
		ExerciseID: req.ExerciseID,
		SetIndex:   req.SetIndex,
		WeightKg:   req.WeightKg,
		Reps:       req.Reps,
		Completed:  true,
		Phase:      req.Phase,
		RIR:        req.RIR,
		RPE:        req.RPE,
		Duration:   req.Duration,
		Speed:      req.Speed,
		Skipped:    req.Skipped,
	}

	loggedSet, err := s.workoutRepo.LogWorkoutSet(ctx, set, workoutID, req.AthleteID)
	if err != nil {
		return nil, fmt.Errorf("log workout set: %w", err)
	}

	return loggedSet, nil
}

// GetProgress returns progress data for an athlete within a date range.
func (s *Service) GetProgress(ctx context.Context, athleteID string, dateRange training.ProgressDateRange) ([]*training.ProgressEntry, error) {
	if dateRange.StartDate == "" || dateRange.EndDate == "" {
		return nil, errors.BadRequest("start_date and end_date are required")
	}

	entries, err := s.progressRepo.GetProgress(ctx, athleteID, dateRange)
	if err != nil {
		return nil, fmt.Errorf("get progress: %w", err)
	}

	return entries, nil
}
