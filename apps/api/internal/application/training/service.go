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
	exerciseRepo        training.ExerciseRepository
	workoutRepo         training.WorkoutRepository
	progressRepo        training.ProgressRepository
	trainingSessionRepo training.TrainingSessionRepository
}

// NewService creates a new training application service with the given repositories.
func NewService(
	exerciseRepo training.ExerciseRepository,
	workoutRepo training.WorkoutRepository,
	progressRepo training.ProgressRepository,
	trainingSessionRepo training.TrainingSessionRepository,
) *Service {
	return &Service{
		exerciseRepo:        exerciseRepo,
		workoutRepo:         workoutRepo,
		progressRepo:        progressRepo,
		trainingSessionRepo: trainingSessionRepo,
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
		ImageURL:    req.ImageURL,
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

// UpdateWorkoutTemplate updates an existing workout template.
func (s *Service) UpdateWorkoutTemplate(ctx context.Context, coachID, id string, req dto.CreateWorkoutTemplateRequest) (*training.WorkoutTemplate, error) {
	if strings.TrimSpace(req.Name) == "" {
		return nil, errors.BadRequest("template name is required")
	}
	existing, err := s.workoutRepo.GetTemplate(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing.CoachID != coachID {
		return nil, errors.Forbidden("you can only update your own templates")
	}

	exercises := make([]training.WorkoutExercise, len(req.Exercises))
	for i, ex := range req.Exercises {
		exercises[i] = training.WorkoutExercise{
			ID:                uuid.New().String(),
			TemplateID:        id,
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
		ID:                      id,
		CoachID:                 coachID,
		Name:                    strings.TrimSpace(req.Name),
		Description:             req.Description,
		Goal:                    req.Goal,
		EstimatedDurationMinutes: req.EstimatedDurationMinutes,
		Exercises:               exercises,
	}

	if err := s.workoutRepo.UpdateTemplate(ctx, template); err != nil {
		return nil, fmt.Errorf("update workout template: %w", err)
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

// GetProgressSummary returns aggregated progress metrics for an athlete within a date range.
func (s *Service) GetProgressSummary(ctx context.Context, athleteID string, dateRange training.ProgressDateRange) (*training.ProgressSummary, error) {
	if dateRange.StartDate == "" || dateRange.EndDate == "" {
		return nil, errors.BadRequest("start_date and end_date are required")
	}

	summary, err := s.progressRepo.GetProgressSummary(ctx, athleteID, dateRange)
	if err != nil {
		return nil, fmt.Errorf("get progress summary: %w", err)
	}

	return summary, nil
}

// GetAssignedWorkoutDetail returns a full assigned workout carrier with exercises and session.
func (s *Service) GetAssignedWorkoutDetail(ctx context.Context, workoutID string) (*training.WorkoutDetail, error) {
	detail, err := s.workoutRepo.GetAssignedWorkoutDetail(ctx, workoutID)
	if err != nil {
		return nil, fmt.Errorf("get assigned workout detail: %w", err)
	}
	return detail, nil
}

// GetWorkoutSession returns a workout session by ID.
func (s *Service) GetWorkoutSession(ctx context.Context, sessionID string) (*training.WorkoutSession, error) {
	session, err := s.workoutRepo.GetWorkoutSession(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("get workout session: %w", err)
	}
	return session, nil
}

// CreateWorkoutSession creates a new workout session for an athlete.
func (s *Service) CreateWorkoutSession(ctx context.Context, workoutID, athleteID string) (*training.WorkoutSession, error) {
	session, err := s.workoutRepo.CreateWorkoutSession(ctx, workoutID, athleteID)
	if err != nil {
		return nil, fmt.Errorf("create workout session: %w", err)
	}
	return session, nil
}

// CompleteSession marks a workout session as completed with the given duration.
func (s *Service) CompleteSession(ctx context.Context, sessionID string, durationSeconds int) error {
	if err := s.workoutRepo.CompleteSession(ctx, sessionID, durationSeconds); err != nil {
		return fmt.Errorf("complete session: %w", err)
	}
	return nil
}

// GetPrescription returns the exercise prescription for an assigned workout.
func (s *Service) GetPrescription(ctx context.Context, workoutID string) ([]training.WorkoutExercise, error) {
	exercises, err := s.workoutRepo.GetPrescription(ctx, workoutID)
	if err != nil {
		return nil, fmt.Errorf("get prescription: %w", err)
	}
	return exercises, nil
}

// ListAssignedWorkoutsByCoach returns all assigned workouts created by a coach.
func (s *Service) ListAssignedWorkoutsByCoach(ctx context.Context, coachID string) ([]*training.AssignedWorkout, error) {
	workouts, err := s.workoutRepo.ListAssignedWorkoutsByCoach(ctx, coachID)
	if err != nil {
		return nil, fmt.Errorf("list assigned workouts by coach: %w", err)
	}
	return workouts, nil
}

// UpdateAssignedWorkout updates an assigned workout's schedule and status.
func (s *Service) UpdateAssignedWorkout(ctx context.Context, id string, aw *training.AssignedWorkout) error {
	if err := s.workoutRepo.UpdateAssignedWorkout(ctx, id, aw); err != nil {
		return fmt.Errorf("update assigned workout: %w", err)
	}
	return nil
}

// DeleteAssignedWorkout deletes an assigned workout and its exercises.
func (s *Service) DeleteAssignedWorkout(ctx context.Context, id string) error {
	if err := s.workoutRepo.DeleteAssignedWorkout(ctx, id); err != nil {
		return fmt.Errorf("delete assigned workout: %w", err)
	}
	return nil
}

// DeleteWorkoutTemplate deletes a workout template and its exercises.
func (s *Service) DeleteWorkoutTemplate(ctx context.Context, id string) error {
	if err := s.workoutRepo.DeleteTemplate(ctx, id); err != nil {
		return fmt.Errorf("delete workout template: %w", err)
	}
	return nil
}

// CreateTrainingSession creates a new training session aggregate.
func (s *Service) CreateTrainingSession(ctx context.Context, coachID, athleteID, title, scheduledAt, status string) (*training.TrainingSession, error) {
	if coachID == "" || athleteID == "" || title == "" {
		return nil, errors.BadRequest("coach_id, athlete_id and title are required")
	}
	session := training.NewTrainingSession(coachID, athleteID, title, scheduledAt, status)
	if err := s.trainingSessionRepo.Create(ctx, session); err != nil {
		return nil, fmt.Errorf("create training session: %w", err)
	}
	return session, nil
}

// ListTrainingSessions returns training sessions for coach or athlete.
func (s *Service) ListTrainingSessions(ctx context.Context, coachID, athleteID string) ([]*training.TrainingSession, error) {
	sessions, err := s.trainingSessionRepo.List(ctx, coachID, athleteID)
	if err != nil {
		return nil, fmt.Errorf("list training sessions: %w", err)
	}
	return sessions, nil
}
