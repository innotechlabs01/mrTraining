// Package handlers provides HTTP endpoint handlers for structured running
// workouts (templates, assignments, guided sessions).
package handlers

import (
	"github.com/gofiber/fiber/v2"

	runningapp "github.com/innotechlabs01/mr-training-api/internal/application/running"
	domain "github.com/innotechlabs01/mr-training-api/internal/domain/running"
	apperrors "github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
	"time"
)

// RunningWorkoutHandler handles HTTP requests for structured running workouts.
type RunningWorkoutHandler struct {
	service *runningapp.Service
}

// NewRunningWorkoutHandler creates a new RunningWorkoutHandler.
func NewRunningWorkoutHandler(service *runningapp.Service) *RunningWorkoutHandler {
	return &RunningWorkoutHandler{service: service}
}

// CreateTemplate handles POST /running/workouts/templates.
// Coach creates a running workout template with ordered segments.
func (h *RunningWorkoutHandler) CreateTemplate(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.CreateRunningWorkoutTemplateRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if req.Name == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "name is required")
	}

	template := &domain.RunningWorkoutTemplate{
		CoachID:              userID,
		Name:                 req.Name,
		Description:          req.Description,
		Type:                 domain.RunningWorkoutTemplateType(req.Type),
		TargetPaceMinPerKm:   req.TargetPaceMinPerKm,
		TargetPaceMaxPerKm:   req.TargetPaceMaxPerKm,
		TargetHeartRateMin:   req.TargetHeartRateMin,
		TargetHeartRateMax:   req.TargetHeartRateMax,
		TargetCadence:        req.TargetCadence,
		TargetDistanceKm:     req.TargetDistanceKm,
		TargetDurationSec:    req.TargetDurationSec,
	}

	for _, segReq := range req.Segments {
		template.Segments = append(template.Segments, &domain.RunningWorkoutSegment{
			OrderIndex:           segReq.OrderIndex,
			Type:                 domain.RunningWorkoutSegmentType(segReq.Type),
			Instruction:          segReq.Instruction,
			SpokenInstruction:    segReq.SpokenInstruction,
			TargetDurationSec:    segReq.TargetDurationSec,
			TargetDistanceKm:     segReq.TargetDistanceKm,
			TargetPaceMinPerKm:   segReq.TargetPaceMinPerKm,
			TargetPaceMaxPerKm:   segReq.TargetPaceMaxPerKm,
			TargetHeartRateMin:   segReq.TargetHeartRateMin,
			TargetHeartRateMax:   segReq.TargetHeartRateMax,
			Repetitions:          segReq.Repetitions,
			RecoverySec:          segReq.RecoverySec,
			CompletionCriteria:   domain.RunningWorkoutCompletionCriteria(segReq.CompletionCriteria),
		})
	}

	if err := h.service.CreateTemplate(c.Context(), template); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, toTemplateResponse(template))
}

// GetTemplate handles GET /running/workouts/templates/:id.
func (h *RunningWorkoutHandler) GetTemplate(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "template id is required")
	}

	template, err := h.service.GetTemplate(c.Context(), id)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, toTemplateResponse(template))
}

// ListTemplatesByCoach handles GET /running/workouts/templates?coach_id=...
func (h *RunningWorkoutHandler) ListTemplatesByCoach(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	coachID := c.Query("coach_id")
	if coachID == "" {
		coachID = userID
	}

	templates, err := h.service.ListTemplatesByCoach(c.Context(), coachID)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.RunningWorkoutTemplateResponse, len(templates))
	for i, t := range templates {
		responses[i] = toTemplateResponse(t)
	}

	return appresponse.Success(c, responses)
}

// DeleteTemplate handles DELETE /running/workouts/templates/:id.
func (h *RunningWorkoutHandler) DeleteTemplate(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "template id is required")
	}

	// Verify ownership: coach can only delete their own templates
	template, err := h.service.GetTemplate(c.Context(), id)
	if err != nil {
		return h.handleError(c, err)
	}
	if template.CoachID != userID {
		return appresponse.Error(c, fiber.StatusForbidden, "not owner of this template")
	}

	if err := h.service.DeleteTemplate(c.Context(), id); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{"deleted": true})
}

// CreateAssignment handles POST /running/workouts/assignments.
// Coach assigns a running workout template to an athlete.
func (h *RunningWorkoutHandler) CreateAssignment(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.CreateRunningWorkoutAssignmentRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if req.TemplateID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "template_id is required")
	}
	if req.AthleteID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "athlete_id is required")
	}
	if req.ScheduledDate == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "scheduled_date is required")
	}

	assignment := &domain.RunningWorkoutAssignment{
		TemplateID:         req.TemplateID,
		AthleteID:          req.AthleteID,
		CoachID:            userID,
		ScheduledDate:      parseTime(req.ScheduledDate),
		AthleteInstructions: req.AthleteInstructions,
	}

	if err := h.service.CreateAssignment(c.Context(), assignment); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, toAssignmentResponse(assignment))
}

// GetAssignment handles GET /running/workouts/assignments/:id.
func (h *RunningWorkoutHandler) GetAssignment(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "assignment id is required")
	}

	assignment, err := h.service.GetAssignment(c.Context(), id)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, toAssignmentResponse(assignment))
}

// ListAssignmentsByAthlete handles GET /coach/athletes/:athleteId/running/assignments.
func (h *RunningWorkoutHandler) ListAssignmentsByAthlete(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	athleteID := c.Params("athleteId")
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "athlete id is required")
	}

	status := domain.RunningWorkoutAssignmentStatus(c.Query("status"))
	assignments, err := h.service.ListAssignmentsByAthlete(c.Context(), athleteID, status)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.RunningWorkoutAssignmentResponse, len(assignments))
	for i, a := range assignments {
		responses[i] = toAssignmentResponse(a)
	}

	return appresponse.Success(c, responses)
}

// ListAssignmentsByCoach handles GET /coach/running/assignments.
func (h *RunningWorkoutHandler) ListAssignmentsByCoach(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	assignments, err := h.service.ListAssignmentsByCoach(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.RunningWorkoutAssignmentResponse, len(assignments))
	for i, a := range assignments {
		responses[i] = toAssignmentResponse(a)
	}

	return appresponse.Success(c, responses)
}

// UpdateAssignmentStatus handles PATCH /running/workouts/assignments/:id/status.
func (h *RunningWorkoutHandler) UpdateAssignmentStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "assignment id is required")
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if req.Status == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "status is required")
	}

	if err := h.service.UpdateAssignmentStatus(c.Context(), id, domain.RunningWorkoutAssignmentStatus(req.Status)); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{"updated": true})
}

// StartSession handles POST /running/workouts/sessions/start.
// Athlete starts an assigned running workout; captures an immutable snapshot.
func (h *RunningWorkoutHandler) StartSession(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.StartRunningSessionRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if req.AssignmentID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "assignment_id is required")
	}

	session, err := h.service.StartSession(c.Context(), req.AssignmentID, userID)
	if err != nil {
		return h.handleError(c, err)
	}

	// Load template + segments for the response
	template, err := h.service.GetTemplate(c.Context(), session.ID)
	_ = template // session ID is used as reference; template loaded via snapshot

	return appresponse.Success(c, dto.StartRunningSessionResponse{
		SessionID: session.ID,
		Status:    "started",
	})
}

// CompleteSession handles POST /running/workouts/sessions/:id/complete.
// Athlete finalizes a running session with real metrics.
func (h *RunningWorkoutHandler) CompleteSession(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	sessionID := c.Params("id")
	if sessionID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "session id is required")
	}

	var req dto.CompleteRunningSessionRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	session := &domain.RunningSession{
		ID:        sessionID,
		UserID:    userID,
		Distance:  req.Distance,
		Duration:  req.Duration,
		Pace:      req.Pace,
		Calories:  req.Calories,
		Elevation: req.Elevation,
		HeartRate: req.HeartRate,
		Cadence:   req.Cadence,
		GPSRoute:  req.GPSRoute,
	}

	if err := h.service.CompleteSession(c.Context(), sessionID, userID, session); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.CompleteRunningSessionResponse{
		SessionID: session.ID,
		Status:    "completed",
		Distance:  session.Distance,
		Duration:  session.Duration,
		Pace:      session.Pace,
		Calories:  session.Calories,
		HeartRate: session.HeartRate,
		Cadence:   session.Cadence,
	})
}

// --- Response mappers ---

func toTemplateResponse(t *domain.RunningWorkoutTemplate) dto.RunningWorkoutTemplateResponse {
	resp := dto.RunningWorkoutTemplateResponse{
		ID:                   t.ID,
		CoachID:              t.CoachID,
		Name:                 t.Name,
		Description:          t.Description,
		Type:                 string(t.Type),
		TargetPaceMinPerKm:   t.TargetPaceMinPerKm,
		TargetPaceMaxPerKm:   t.TargetPaceMaxPerKm,
		TargetHeartRateMin:   t.TargetHeartRateMin,
		TargetHeartRateMax:   t.TargetHeartRateMax,
		TargetCadence:        t.TargetCadence,
		TargetDistanceKm:     t.TargetDistanceKm,
		TargetDurationSec:    t.TargetDurationSec,
		CreatedAt:            t.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:            t.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
	for _, seg := range t.Segments {
		resp.Segments = append(resp.Segments, dto.RunningWorkoutSegmentResponse{
			ID:                   seg.ID,
			TemplateID:           seg.TemplateID,
			OrderIndex:           seg.OrderIndex,
			Type:                 string(seg.Type),
			Instruction:          seg.Instruction,
			SpokenInstruction:    seg.SpokenInstruction,
			TargetDurationSec:    seg.TargetDurationSec,
			TargetDistanceKm:     seg.TargetDistanceKm,
			TargetPaceMinPerKm:   seg.TargetPaceMinPerKm,
			TargetPaceMaxPerKm:   seg.TargetPaceMaxPerKm,
			TargetHeartRateMin:   seg.TargetHeartRateMin,
			TargetHeartRateMax:   seg.TargetHeartRateMax,
			Repetitions:          seg.Repetitions,
			RecoverySec:          seg.RecoverySec,
			CompletionCriteria:   string(seg.CompletionCriteria),
			CreatedAt:            seg.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt:            seg.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}
	return resp
}

func toAssignmentResponse(a *domain.RunningWorkoutAssignment) dto.RunningWorkoutAssignmentResponse {
	return dto.RunningWorkoutAssignmentResponse{
		ID:                 a.ID,
		TemplateID:         a.TemplateID,
		AthleteID:          a.AthleteID,
		CoachID:            a.CoachID,
		ScheduledDate:      a.ScheduledDate.Format("2006-01-02T15:04:05Z07:00"),
		Status:             string(a.Status),
		AthleteInstructions: a.AthleteInstructions,
		CreatedAt:          a.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:          a.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

func parseTime(s string) time.Time {
	if t, err := time.Parse("2006-01-02T15:04:05Z07:00", s); err == nil {
		return t
	}
	if t, err := time.Parse("2006-01-02", s); err == nil {
		return t
	}
	return time.Time{}
}

func (h *RunningWorkoutHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*apperrors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}
