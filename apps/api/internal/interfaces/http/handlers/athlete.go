// Package handlers provides HTTP endpoint handlers for the athlete domain.
// Handlers are thin translation layers — parse, validate, call use case,
// map to DTO, return response. No business logic lives here.
package handlers

import (
	"database/sql"
	"strconv"

	"github.com/gofiber/fiber/v2"

	athleteapp "github.com/innotechlabs01/mr-training-api/internal/application/athlete"
	athleteDomain "github.com/innotechlabs01/mr-training-api/internal/domain/athlete"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// AthleteHandler handles HTTP requests for athlete-scoped resources.
type AthleteHandler struct {
	service        *athleteapp.Service
	db             *sql.DB
	tenantResolver middleware.TenantResolver
}

// NewAthleteHandler creates a new AthleteHandler with the given application
// service, database connection (for UnitOfWork RLS), and tenant resolver.
func NewAthleteHandler(service *athleteapp.Service, db *sql.DB, tenantResolver middleware.TenantResolver) *AthleteHandler {
	return &AthleteHandler{
		service:        service,
		db:             db,
		tenantResolver: tenantResolver,
	}
}

func (h *AthleteHandler) withTx(c *fiber.Ctx, fn func(*athleteapp.Service) error) error {
	if h.db == nil {
		return fn(h.service)
	}

	userID := middleware.GetUserID(c)
	coachID := middleware.GetCoachID(c)
	if coachID == "" {
		coachID = userID
	}
	role := middleware.GetUserRole(c)
	if role == "" {
		role = "athlete"
	}

	uow := database.NewUnitOfWork(h.db)
	ctx := middleware.RequestContext(c)
	if err := uow.Begin(ctx, userID, coachID, role); err != nil {
		return errors.Internal("failed to begin transaction")
	}
	defer uow.Rollback(ctx)

	svc := h.service.SetExecutor(uow.Tx())
	if err := fn(svc); err != nil {
		return err
	}

	if err := uow.Commit(ctx); err != nil {
		return errors.Internal("failed to commit transaction")
	}
	return nil
}

// GetWorkouts handles GET /athletes/:id/workouts.
// Returns the athlete's assigned workouts.
func (h *AthleteHandler) GetWorkouts(c *fiber.Ctx) error {
	athleteID := c.Params("id")
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "athlete ID is required")
	}

	if err := h.ensureAthleteAccess(c, athleteID); err != nil {
		return appresponse.Error(c, err.Status, err.Message)
	}

	var workouts []*athleteDomain.WorkoutSummary
	if err := h.withTx(c, func(svc *athleteapp.Service) error {
		var err error
		workouts, err = svc.ListWorkouts(middleware.RequestContext(c), athleteID)
		return err
	}); err != nil {
		return handleAppError(c, err)
	}

	resp := make([]dto.AthleteWorkoutResponse, len(workouts))
	for i, w := range workouts {
		resp[i] = dto.AthleteWorkoutResponse{
			ID:            w.ID,
			Name:          w.Name,
			SportType:     w.SportType,
			ScheduledDate: w.ScheduledDate,
			Status:        w.Status,
		}
	}
	return appresponse.Success(c, dto.AthleteWorkoutsResponse{
		Data:  resp,
		Total: len(resp),
	})
}

// GetMetrics handles GET /athletes/:id/metrics.
// Returns time-series metrics for the athlete.
func (h *AthleteHandler) GetMetrics(c *fiber.Ctx) error {
	athleteID := c.Params("id")
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "athlete ID is required")
	}

	if err := h.ensureAthleteAccess(c, athleteID); err != nil {
		return appresponse.Error(c, err.Status, err.Message)
	}

	var metrics []*athleteDomain.MetricPoint
	if err := h.withTx(c, func(svc *athleteapp.Service) error {
		var err error
		metrics, err = svc.GetMetrics(middleware.RequestContext(c), athleteID)
		return err
	}); err != nil {
		return handleAppError(c, err)
	}

	resp := make([]dto.AthleteMetricsResponse, len(metrics))
	for i, m := range metrics {
		resp[i] = dto.AthleteMetricsResponse{
			MetricDate: m.MetricDate,
			WeightKg:   m.WeightKg,
			RestingHR:  m.RestingHR,
			Vo2Max:     m.Vo2Max,
		}
	}
	return appresponse.Success(c, dto.AthleteMetricsResponseList{
		Data:  resp,
		Total: len(resp),
	})
}

// GetMessages handles GET /athletes/:id/messages.
// Returns message threads for the athlete.
func (h *AthleteHandler) GetMessages(c *fiber.Ctx) error {
	athleteID := c.Params("id")
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "athlete ID is required")
	}

	if err := h.ensureAthleteAccess(c, athleteID); err != nil {
		return appresponse.Error(c, err.Status, err.Message)
	}

	var threads []*athleteDomain.MessageThread
	if err := h.withTx(c, func(svc *athleteapp.Service) error {
		var err error
		threads, err = svc.ListMessages(middleware.RequestContext(c), athleteID)
		return err
	}); err != nil {
		return handleAppError(c, err)
	}

	resp := make([]dto.AthleteMessageResponse, len(threads))
	for i, t := range threads {
		resp[i] = dto.AthleteMessageResponse{
			ID:          t.ID,
			CoachID:     t.CoachID,
			CoachName:   t.CoachName,
			Subject:     t.Subject,
			LastMessage: t.LastMessage,
			LastSentAt:  t.LastSentAt,
			UnreadCount: t.UnreadCount,
			CreatedAt:   t.CreatedAt,
		}
	}
	return appresponse.Success(c, dto.AthleteMessagesResponse{
		Data:  resp,
		Total: len(resp),
	})
}

// ensureAthleteAccess verifies the authenticated user may access the given
// athlete's data: the athlete themselves, a coach with an active link to the
// athlete, or a platform super_admin. Blanket coach/admin bypass is denied.
func (h *AthleteHandler) ensureAthleteAccess(c *fiber.Ctx, athleteID string) *errors.AppError {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return errors.Unauthorized("user not authenticated")
	}
	role := middleware.GetUserRole(c)

	// The athlete may access their own data.
	if userID == athleteID {
		return nil
	}

	// Only super_admin may bypass per-athlete relationship checks.
	if role == "super_admin" {
		return nil
	}

	// A coach may only access athletes with whom they have an active link.
	if role == "coach" {
		if h.tenantResolver == nil {
			return errors.Forbidden("no active relationship with this athlete")
		}
		ok, err := h.tenantResolver.AthleteHasActiveCoach(middleware.RequestContext(c), athleteID, userID)
		if err != nil || !ok {
			return errors.Forbidden("no active relationship with this athlete")
		}
		return nil
	}

	// An athlete trying to access another athlete's data is forbidden.
	if role == "athlete" {
		return errors.Forbidden("you can only access your own data")
	}

	return errors.Forbidden("insufficient permissions")
}

func handleAppError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
}

// parsePageLimit reads and normalizes page/limit query parameters.
func parsePageLimit(c *fiber.Ctx) (page, limit int) {
	page, _ = strconv.Atoi(c.Query("page", "1"))
	limit, _ = strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	return page, limit
}
