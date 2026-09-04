// Package handlers provides HTTP endpoint handlers for the training domain.
package handlers

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"

	trainingapp "github.com/innotechlabs01/mr-training-api/internal/application/training"
	trainingdomain "github.com/innotechlabs01/mr-training-api/internal/domain/training"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	"github.com/innotechlabs01/mr-training-api/internal/pkg/validator"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// TrainingHandler handles HTTP requests for the training domain.
type TrainingHandler struct {
	service *trainingapp.Service
}

// NewTrainingHandler creates a new TrainingHandler with the given application service.
func NewTrainingHandler(service *trainingapp.Service) *TrainingHandler {
	return &TrainingHandler{service: service}
}

// ListExercises handles GET /exercises.
// Returns a paginated list of exercises with optional filters.
func (h *TrainingHandler) ListExercises(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	filter := trainingdomain.ExerciseFilter{
		BodyPart:   c.Query("body_part"),
		Equipment:  c.Query("equipment"),
		Difficulty: c.Query("difficulty"),
		Search:     c.Query("search"),
		CoachID:    c.Query("coach_id"),
	}

	exercises, total, err := h.service.ListExercises(c.Context(), page, limit, filter)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.ExerciseResponse, len(exercises))
	for i, e := range exercises {
		responses[i] = *toExerciseResponse(e)
	}

	return appresponse.Success(c, dto.ListResponse[dto.ExerciseResponse]{
		Data:  responses,
		Total: total,
		Page:  page,
		Limit: limit,
	})
}

// GetExercise handles GET /exercises/:id.
// Returns a single exercise by ID.
func (h *TrainingHandler) GetExercise(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "exercise ID is required")
	}

	exercise, err := h.service.GetExercise(c.Context(), id)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, toExerciseResponse(exercise))
}

// CreateExercise handles POST /exercises.
// Creates a new custom exercise for a coach.
func (h *TrainingHandler) CreateExercise(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.CreateExerciseRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if validationErrs := validator.ValidateCreateExercise(&req); len(validationErrs) > 0 {
		return h.handleValidationError(c, validationErrs)
	}

	exercise, err := h.service.CreateExercise(c.Context(), userID, req)
	if err != nil {
		return h.handleError(c, err)
	}

	middleware.InvalidateCache("exercises")
	return appresponse.Success(c, toExerciseResponse(exercise))
}

// ListWorkoutTemplates handles GET /workout-templates.
// Returns all workout templates for the authenticated coach.
func (h *TrainingHandler) ListWorkoutTemplates(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	templates, err := h.service.ListWorkoutTemplates(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.WorkoutTemplateResponse, len(templates))
	for i, t := range templates {
		responses[i] = *toWorkoutTemplateResponse(t)
	}

	return appresponse.Success(c, dto.ListResponse[dto.WorkoutTemplateResponse]{
		Data:  responses,
		Total: len(responses),
		Page:  1,
		Limit: len(responses),
	})
}

// GetWorkoutTemplate handles GET /workout-templates/:id.
// Returns a single workout template with its exercises.
func (h *TrainingHandler) GetWorkoutTemplate(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "template ID is required")
	}

	template, err := h.service.GetWorkoutTemplate(c.Context(), id)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, toWorkoutTemplateResponse(template))
}

// UpdateWorkoutTemplate handles PUT /workout-templates/:id.
func (h *TrainingHandler) UpdateWorkoutTemplate(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "template ID is required")
	}
	var req dto.CreateWorkoutTemplateRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if validationErrs := validator.ValidateCreateWorkoutTemplate(&req); len(validationErrs) > 0 {
		return h.handleValidationError(c, validationErrs)
	}
	template, err := h.service.UpdateWorkoutTemplate(c.Context(), userID, id, req)
	if err != nil {
		return h.handleError(c, err)
	}
	middleware.InvalidateCache("workout-templates")
	return appresponse.Success(c, toWorkoutTemplateResponse(template))
}

// CreateWorkoutTemplate handles POST /workout-templates.
// Creates a new workout template with exercises.
func (h *TrainingHandler) CreateWorkoutTemplate(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.CreateWorkoutTemplateRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if validationErrs := validator.ValidateCreateWorkoutTemplate(&req); len(validationErrs) > 0 {
		return h.handleValidationError(c, validationErrs)
	}

	template, err := h.service.CreateWorkoutTemplate(c.Context(), userID, req)
	if err != nil {
		return h.handleError(c, err)
	}

	middleware.InvalidateCache("workout-templates")
	return appresponse.Success(c, toWorkoutTemplateResponse(template))
}

// AssignWorkout handles POST /workouts/assign.
// Assigns a workout template to an athlete.
func (h *TrainingHandler) AssignWorkout(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.AssignWorkoutRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if validationErrs := validator.ValidateAssignWorkout(&req); len(validationErrs) > 0 {
		return h.handleValidationError(c, validationErrs)
	}

	assigned, err := h.service.AssignWorkout(c.Context(), userID, req)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, toAssignedWorkoutResponse(assigned))
}

// GetAssignedWorkouts handles GET /workouts.
// Returns all assigned workouts for the authenticated athlete.
func (h *TrainingHandler) GetAssignedWorkouts(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	workouts, err := h.service.GetAssignedWorkouts(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.AssignedWorkoutResponse, len(workouts))
	for i, w := range workouts {
		responses[i] = *toAssignedWorkoutResponse(w)
	}

	return appresponse.Success(c, dto.ListResponse[dto.AssignedWorkoutResponse]{
		Data:  responses,
		Total: len(responses),
		Page:  1,
		Limit: len(responses),
	})
}

// GetAssignedWorkoutDetail handles GET /workouts/:id/detail.
// Returns a single assigned workout for the authenticated athlete.
func (h *TrainingHandler) GetAssignedWorkoutDetail(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "workout ID is required")
	}

	detail, err := h.service.GetAssignedWorkoutDetail(c.Context(), id)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, toWorkoutDetailResponse(detail))
}

// GetWorkoutPrescription handles GET /workouts/:id/prescription.
// Returns the exercise prescription for an assigned workout.
func (h *TrainingHandler) GetWorkoutPrescription(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "workout ID is required")
	}

	exercises, err := h.service.GetPrescription(c.Context(), id)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.WorkoutExerciseResponse, len(exercises))
	for i, ex := range exercises {
		responses[i] = *toWorkoutExerciseResponse(&ex)
	}

	return appresponse.Success(c, dto.ListResponse[dto.WorkoutExerciseResponse]{Data: responses})
}

// CreateWorkoutSession handles POST /workouts/:id/session.
// Starts a new workout session for the authenticated athlete.
func (h *TrainingHandler) CreateWorkoutSession(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "workout ID is required")
	}

	session, err := h.service.CreateWorkoutSession(c.Context(), id, userID)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, toWorkoutSessionResponse(session))
}

// GetWorkoutSession handles GET /workouts/sessions/:id.
// Returns a single workout session for the authenticated athlete.
func (h *TrainingHandler) GetWorkoutSession(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	sessionID := c.Params("id")
	if sessionID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "session ID is required")
	}

	session, err := h.service.GetWorkoutSession(c.Context(), sessionID)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, toWorkoutSessionResponse(session))
}

// CompleteSession handles POST /workouts/sessions/:id/complete.
// Marks a workout session as completed for the authenticated athlete.
func (h *TrainingHandler) CompleteSession(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	sessionID := c.Params("id")
	if sessionID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "session ID is required")
	}

	var req dto.CompleteSessionRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if err := h.service.CompleteSession(c.Context(), sessionID, req.DurationSeconds); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{"ok": true})
}

// LogWorkoutSet handles POST /workouts/:id/sets.
// Logs a completed set within a workout session.
func (h *TrainingHandler) LogWorkoutSet(c *fiber.Ctx) error {
	workoutID := c.Params("id")
	if workoutID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "workout ID is required")
	}

	var req dto.LogWorkoutSetRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	// Set athlete ID from auth context if not provided
	if req.AthleteID == "" {
		req.AthleteID = middleware.GetUserID(c)
	}
	if req.AthleteID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	if validationErrs := validator.ValidateLogWorkoutSet(&req); len(validationErrs) > 0 {
		return h.handleValidationError(c, validationErrs)
	}

	set, err := h.service.LogWorkoutSet(c.Context(), workoutID, req)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, toWorkoutSetResponse(set))
}

// GetProgress handles GET /progress.
// Returns progress data for the authenticated athlete.
func (h *TrainingHandler) GetProgress(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	if startDate == "" || endDate == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "start_date and end_date are required")
	}

	dateRange := trainingdomain.ProgressDateRange{
		StartDate: startDate,
		EndDate:   endDate,
	}

	entries, err := h.service.GetProgress(c.Context(), userID, dateRange)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.ProgressResponse, len(entries))
	for i, e := range entries {
		responses[i] = *toProgressResponse(e)
	}

	return appresponse.Success(c, dto.ListResponse[dto.ProgressResponse]{
		Data:  responses,
		Total: len(responses),
		Page:  1,
		Limit: len(responses),
	})
}

// GetProgressSummary handles GET /progress/summary.
// Returns aggregated progress metrics for the authenticated athlete.
func (h *TrainingHandler) GetProgressSummary(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	if startDate == "" || endDate == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "start_date and end_date are required")
	}

	dateRange := trainingdomain.ProgressDateRange{
		StartDate: startDate,
		EndDate:   endDate,
	}

	summary, err := h.service.GetProgressSummary(c.Context(), userID, dateRange)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, toProgressSummaryResponse(summary))
}

// handleValidationError converts validation errors into a 422 response.
func (h *TrainingHandler) handleValidationError(c *fiber.Ctx, validationErrs validator.ValidationErrors) error {
	var messages []string
	for _, e := range validationErrs {
		messages = append(messages, e.Field+": "+e.Message)
	}
	return appresponse.Error(c, fiber.StatusUnprocessableEntity, strings.Join(messages, "; "))
}

// handleError maps application errors to appropriate HTTP responses.
func (h *TrainingHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}

// toExerciseResponse converts a domain ExerciseEntry entity to a DTO response.
func toExerciseResponse(e *trainingdomain.ExerciseEntry) *dto.ExerciseResponse {
	return &dto.ExerciseResponse{
		ID:               e.ID,
		Slug:             e.Slug,
		Name:             e.Name,
		Description:      e.Description,
		Mode:             e.Mode,
		BodyPart:         e.BodyPart,
		MuscleGroups:     e.MuscleGroups,
		SecondaryMuscles: e.SecondaryMuscles,
		Equipment:        e.Equipment,
		Difficulty:       e.Difficulty,
		Category:         e.Category,
		Instructions:     e.Instructions,
		DefaultSec:       e.DefaultSec,
		VideoURL:         e.VideoURL,
		ImageURL:         e.ImageURL,
		IsCustom:         e.IsCustom,
		CoachID:          e.CoachID,
		CreatedAt:        e.CreatedAt,
		UpdatedAt:        e.UpdatedAt,
	}
}

// toWorkoutTemplateResponse converts a domain WorkoutTemplate entity to a DTO response.
func toWorkoutTemplateResponse(t *trainingdomain.WorkoutTemplate) *dto.WorkoutTemplateResponse {
	exercises := make([]dto.WorkoutExerciseResponse, len(t.Exercises))
	for i, ex := range t.Exercises {
		exercises[i] = dto.WorkoutExerciseResponse{
			ID:                ex.ID,
			TemplateID:        ex.TemplateID,
			Name:              ex.Name,
			Sets:              ex.Sets,
			Reps:              ex.Reps,
			WeightKg:          ex.WeightKg,
			RestSeconds:       ex.RestSeconds,
			SortOrder:         ex.SortOrder,
			Notes:             ex.Notes,
			Mode:              ex.Mode,
			Phase:             ex.Phase,
			SupersetGroup:     ex.SupersetGroup,
			BodyPart:          ex.BodyPart,
			MuscleGroups:      ex.MuscleGroups,
			LibraryExerciseID: ex.LibraryExerciseID,
		}
	}

	return &dto.WorkoutTemplateResponse{
		ID:                       t.ID,
		CoachID:                  t.CoachID,
		Name:                     t.Name,
		Description:              t.Description,
		Goal:                     t.Goal,
		EstimatedDurationMinutes: t.EstimatedDurationMinutes,
		CreatedAt:                t.CreatedAt,
		UpdatedAt:                t.UpdatedAt,
		Exercises:                exercises,
	}
}

// toAssignedWorkoutResponse converts a domain AssignedWorkout entity to a DTO response.
func toAssignedWorkoutResponse(a *trainingdomain.AssignedWorkout) *dto.AssignedWorkoutResponse {
	return &dto.AssignedWorkoutResponse{
		ID:          a.ID,
		AthleteID:   a.AthleteID,
		AthleteName: a.AthleteName,
		ContentID:   a.ContentID,
		ContentType: a.ContentType,
		ContentName: a.ContentName,
		Modality:    a.Modality,
		StartDate:   a.StartDate,
		EndDate:     a.EndDate,
		DaysOfWeek:  a.DaysOfWeek,
		Status:      a.Status,
		Progress:    a.Progress,
		CoachID:     a.CoachID,
		CreatedAt:   a.CreatedAt,
		UpdatedAt:   a.UpdatedAt,
	}
}

// toWorkoutExerciseResponse converts a domain WorkoutExercise entity to a DTO response.
func toWorkoutExerciseResponse(ex *trainingdomain.WorkoutExercise) *dto.WorkoutExerciseResponse {
	return &dto.WorkoutExerciseResponse{
		ID:                ex.ID,
		TemplateID:        ex.TemplateID,
		Name:              ex.Name,
		Sets:              ex.Sets,
		Reps:              ex.Reps,
		WeightKg:          ex.WeightKg,
		RestSeconds:       ex.RestSeconds,
		SortOrder:         ex.SortOrder,
		Notes:             ex.Notes,
		Mode:              ex.Mode,
		Phase:             ex.Phase,
		SupersetGroup:     ex.SupersetGroup,
		BodyPart:          ex.BodyPart,
		MuscleGroups:      ex.MuscleGroups,
		ImageURL:          ex.ImageURL,
		VideoURL:          ex.VideoURL,
		GPSRoute:          ex.GPSRoute,
		LibraryExerciseID: ex.LibraryExerciseID,
	}
}

// toWorkoutDetailResponse converts a domain WorkoutDetail into the {workout, exercises, session}
// envelope, mapping each exercise with its joined imageUrl.
func toWorkoutDetailResponse(d *trainingdomain.WorkoutDetail) *dto.WorkoutDetailResponse {
	resp := &dto.WorkoutDetailResponse{Workout: toAssignedWorkoutResponse(d.Workout)}
	resp.Exercises = make([]dto.WorkoutExerciseResponse, len(d.Exercises))
	for i, ex := range d.Exercises {
		e := toWorkoutExerciseResponse(&ex)
		resp.Exercises[i] = *e
	}
	if d.Session != nil {
		resp.Session = toWorkoutSessionResponse(d.Session)
	}
	return resp
}

// toWorkoutSessionResponse converts a domain WorkoutSession entity to a DTO response.
func toWorkoutSessionResponse(s *trainingdomain.WorkoutSession) *dto.WorkoutSessionResponse {
	return &dto.WorkoutSessionResponse{
		ID:                   s.ID,
		WorkoutID:            s.WorkoutID,
		AthleteID:            s.AthleteID,
		StartedAt:            s.StartedAt,
		Completed:            s.Completed,
		CompletedAt:          s.CompletedAt,
		CurrentExerciseIndex: s.CurrentExerciseIndex,
		DurationSeconds:      s.DurationSeconds,
	}
}

// toWorkoutSetResponse converts a domain WorkoutSet entity to a DTO response.
func toWorkoutSetResponse(s *trainingdomain.WorkoutSet) *dto.WorkoutSetResponse {
	return &dto.WorkoutSetResponse{
		ID:         s.ID,
		SessionID:  s.SessionID,
		ExerciseID: s.ExerciseID,
		SetIndex:   s.SetIndex,
		WeightKg:   s.WeightKg,
		Reps:       s.Reps,
		Completed:  s.Completed,
		LoggedAt:   s.LoggedAt,
		Phase:      s.Phase,
		RIR:        s.RIR,
		RPE:        s.RPE,
		Duration:   s.Duration,
		Speed:      s.Speed,
		Skipped:    s.Skipped,
	}
}

// toProgressResponse converts a domain ProgressEntry entity to a DTO response.
func toProgressResponse(p *trainingdomain.ProgressEntry) *dto.ProgressResponse {
	return &dto.ProgressResponse{
		AthleteID:         p.AthleteID,
		Date:              p.Date,
		WorkoutsAssigned:  p.WorkoutsAssigned,
		WorkoutsCompleted: p.WorkoutsCompleted,
		TotalSets:         p.TotalSets,
		CompletedSets:     p.CompletedSets,
		AverageWeight:     p.AverageWeight,
		TotalVolume:       p.TotalVolume,
		CompletionRate:    p.CompletionRate,
	}
}

// toProgressSummaryResponse converts a domain ProgressSummary entity to a DTO response.
func toProgressSummaryResponse(s *trainingdomain.ProgressSummary) *dto.ProgressSummaryResponse {
	return &dto.ProgressSummaryResponse{
		AthleteID:         s.AthleteID,
		StartDate:         s.StartDate,
		EndDate:           s.EndDate,
		WorkoutsCompleted: s.WorkoutsCompleted,
		TotalVolume:       s.TotalVolume,
		AvgCompletionRate: s.AvgCompletionRate,
		Streak:            s.Streak,
	}
}

// ListTrainingSessions handles GET /training/sessions
func (h *TrainingHandler) ListTrainingSessions(c *fiber.Ctx) error {
	coachID := c.Query("coach_id")
	athleteID := c.Query("athlete_id")
	sessions, err := h.service.ListTrainingSessions(c.Context(), coachID, athleteID)
	if err != nil {
		return h.handleError(c, err)
	}
	responses := make([]dto.TrainingSessionResponse, len(sessions))
	for i, s := range sessions {
		responses[i] = *toTrainingSessionResponse(s)
	}
	return appresponse.Success(c, dto.ListResponse[dto.TrainingSessionResponse]{
		Data: responses,
	})
}

// CreateTrainingSession handles POST /training/sessions
func (h *TrainingHandler) CreateTrainingSession(c *fiber.Ctx) error {
	var req struct {
		CoachID     string `json:"coach_id"`
		AthleteID   string `json:"athlete_id"`
		Title       string `json:"title"`
		ScheduledAt string `json:"scheduled_at"`
		Status      string `json:"status"`
		EndAt       string `json:"end_at,omitempty"`
		Location    string `json:"location,omitempty"`
		Notes       string `json:"notes,omitempty"`
	}
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if req.CoachID == "" || req.AthleteID == "" || req.Title == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "coach_id, athlete_id and title are required")
	}
	session, err := h.service.CreateTrainingSession(c.Context(), req.CoachID, req.AthleteID, req.Title, req.ScheduledAt, req.Status)
	if err != nil {
		return h.handleError(c, err)
	}
	return appresponse.Success(c, toTrainingSessionResponse(session))
}

func toTrainingSessionResponse(s *trainingdomain.TrainingSession) *dto.TrainingSessionResponse {
	return &dto.TrainingSessionResponse{
		ID:          s.ID,
		CoachID:     s.CoachID,
		AthleteID:   s.AthleteID,
		Title:       s.Title,
		ScheduledAt: s.ScheduledAt,
		EndAt:       s.EndAt,
		Location:    s.Location,
		Status:      s.Status,
		Notes:       s.Notes,
	}
}
