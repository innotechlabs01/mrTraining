// Package handlers provides HTTP endpoint handlers for the running domain.
package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"

	runningapp "github.com/innotechlabs01/mr-training-api/internal/application/running"
	domain "github.com/innotechlabs01/mr-training-api/internal/domain/running"
	apperrors "github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// RunningHandler handles HTTP requests for the running domain.
type RunningHandler struct {
	service *runningapp.Service
}

// NewRunningHandler creates a new RunningHandler with the given application service.
func NewRunningHandler(service *runningapp.Service) *RunningHandler {
	return &RunningHandler{service: service}
}

// LogSession handles POST /running/sessions.
// Logs a new running session.
func (h *RunningHandler) LogSession(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.LogRunningSessionRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if req.Date == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "date is required")
	}
	if req.Distance <= 0 {
		return appresponse.Error(c, fiber.StatusBadRequest, "distance must be greater than 0")
	}
	if req.Duration <= 0 {
		return appresponse.Error(c, fiber.StatusBadRequest, "duration must be greater than 0")
	}

	session := &domain.RunningSession{
		UserID:    userID,
		Date:      req.Date,
		Distance:  req.Distance,
		Duration:  req.Duration,
		Pace:      req.Pace,
		Calories:  req.Calories,
		Elevation: req.Elevation,
		HeartRate: req.HeartRate,
		Cadence:   req.Cadence,
		GPSRoute:  req.GPSRoute,
		Source:    req.Source,
	}

	if err := h.service.LogRunningSession(c.Context(), session); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, toSessionResponse(session))
}

// GetSession handles GET /running/sessions/:id.
// Returns a single running session with its GPS points for the authenticated user.
func (h *RunningHandler) GetSession(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	sessionID := c.Params("id")
	if sessionID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "session ID is required")
	}

	session, err := h.service.GetSession(c.Context(), sessionID)
	if err != nil {
		return h.handleError(c, err)
	}

	// Verify ownership
	if session.UserID != userID {
		return appresponse.Error(c, fiber.StatusForbidden, "not allowed to view this session")
	}

	points, err := h.service.ListGpsPointsBySession(c.Context(), sessionID)
	if err != nil {
		return h.handleError(c, err)
	}

	gpsPoints := make([]dto.GpsPointResponse, len(points))
	for i, p := range points {
		gpsPoints[i] = dto.GpsPointResponse{
			ID:        p.ID,
			SessionID: p.SessionID,
			Lat:       p.Lat,
			Lng:       p.Lng,
			Alt:       p.Alt,
			Timestamp: p.Timestamp,
			Accuracy:  p.Accuracy,
		}
	}

	return appresponse.Success(c, dto.RunningSessionDetailResponse{
		RunningSessionResponse: toSessionResponse(session),
		GpsPoints:              gpsPoints,
	})
}

// LogGpsPoint handles POST /running/sessions/:id/live-location.
// Records GPS samples for a running session (live tracking). Accepts either a
// single point (legacy shape) or {session_id, points:[...]} for client-side
// batching. Points with accuracy >50m are dropped server-side.
func (h *RunningHandler) LogGpsPoint(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	sessionID := c.Params("id")
	if sessionID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "session ID is required")
	}

	// Verify session exists and belongs to the user before touching GPS data.
	session, err := h.service.GetSession(c.Context(), sessionID)
	if err != nil {
		return h.handleError(c, err)
	}
	if session.UserID != userID {
		return appresponse.Error(c, fiber.StatusForbidden, "not allowed to track this session")
	}

	var batchReq dto.LogGpsBatchRequest
	if err := c.BodyParser(&batchReq); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if batchReq.SessionID != "" && batchReq.SessionID != sessionID {
		return appresponse.Error(c, fiber.StatusBadRequest, "session_id mismatch")
	}

	pointReqs := batchReq.Points
	if len(pointReqs) == 0 {
		// Legacy single-point shape: the body itself is one LogGpsPointRequest.
		var single dto.LogGpsPointRequest
		if err := c.BodyParser(&single); err != nil {
			return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
		}
		if single.SessionID != "" && single.SessionID != sessionID {
			return appresponse.Error(c, fiber.StatusBadRequest, "session_id mismatch")
		}
		pointReqs = []dto.LogGpsPointRequest{single}
	}

	points := make([]*domain.GpsPoint, 0, len(pointReqs))
	for _, pr := range pointReqs {
		if pr.Timestamp == "" {
			return appresponse.Error(c, fiber.StatusBadRequest, "timestamp is required on every point")
		}
		points = append(points, &domain.GpsPoint{
			SessionID: sessionID,
			Lat:       pr.Lat,
			Lng:       pr.Lng,
			Alt:       pr.Alt,
			Timestamp: pr.Timestamp,
			Accuracy:  pr.Accuracy,
		})
	}

	saved, err := h.service.SaveGpsPointsBatch(c.Context(), sessionID, points)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{
		"received": len(points),
		"saved":    saved,
	})
}

// UpdateSession handles PATCH /running/sessions/:id.
// Closes a live-tracked run with final totals (distance, duration, pace…).
func (h *RunningHandler) UpdateSession(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	sessionID := c.Params("id")
	if sessionID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "session ID is required")
	}

	session, err := h.service.GetSession(c.Context(), sessionID)
	if err != nil {
		return h.handleError(c, err)
	}
	if session.UserID != userID {
		return appresponse.Error(c, fiber.StatusForbidden, "not allowed to update this session")
	}

	var req dto.UpdateRunningSessionRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if req.Distance != nil {
		if *req.Distance < 0 {
			return appresponse.Error(c, fiber.StatusBadRequest, "distance must not be negative")
		}
		session.Distance = *req.Distance
	}
	if req.Duration != nil {
		if *req.Duration < 0 {
			return appresponse.Error(c, fiber.StatusBadRequest, "duration must not be negative")
		}
		session.Duration = *req.Duration
	}
	if req.Pace != nil {
		session.Pace = *req.Pace
	}
	if req.Calories != nil {
		session.Calories = *req.Calories
	}
	if req.Elevation != nil {
		session.Elevation = *req.Elevation
	}
	if req.HeartRate != nil {
		session.HeartRate = *req.HeartRate
	}
	if req.Cadence != nil {
		session.Cadence = *req.Cadence
	}
	if req.GPSRoute != nil {
		session.GPSRoute = *req.GPSRoute
	}

	if err := h.service.UpdateSession(c.Context(), session); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, toSessionResponse(session))
}

// DeleteSession handles DELETE /running/sessions/:id.
// Removes a running session owned by the authenticated user.
func (h *RunningHandler) DeleteSession(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	sessionID := c.Params("id")
	if sessionID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "session ID is required")
	}

	session, err := h.service.GetSession(c.Context(), sessionID)
	if err != nil {
		return h.handleError(c, err)
	}
	if session.UserID != userID {
		return appresponse.Error(c, fiber.StatusForbidden, "not allowed to delete this session")
	}

	if err := h.service.DeleteSession(c.Context(), sessionID); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{"message": "session deleted"})
}

// ListSessions handles GET /running/sessions.
// Returns paginated running history for the authenticated user.
func (h *RunningHandler) ListSessions(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	fromDate := c.Query("from_date", "")
	toDate := c.Query("to_date", "")

	params := dto.PaginationParams{Page: page, Limit: limit}
	params.Normalize()

	sessions, total, err := h.service.GetRunningHistory(c.Context(), userID, fromDate, toDate, params.Page, params.Limit)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.RunningSessionResponse, len(sessions))
	for i, s := range sessions {
		responses[i] = toSessionResponse(s)
	}

	return appresponse.Success(c, dto.ListResponse[dto.RunningSessionResponse]{
		Data:  responses,
		Total: total,
		Page:  params.Page,
		Limit: params.Limit,
	})
}

// GetStats handles GET /running/stats.
// Returns aggregated running statistics for the authenticated user.
func (h *RunningHandler) GetStats(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	fromDate := c.Query("from_date", "")
	toDate := c.Query("to_date", "")

	stats, err := h.service.GetRunningStats(c.Context(), userID, fromDate, toDate)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.RunningStatsResponse{
		TotalSessions:  stats.TotalSessions,
		TotalDistance:   stats.TotalDistance,
		TotalDuration:   stats.TotalDuration,
		TotalCalories:   stats.TotalCalories,
		TotalElevation:  stats.TotalElevation,
		AvgDistance:     stats.AvgDistance,
		AvgDuration:     stats.AvgDuration,
		AvgCalories:     stats.AvgCalories,
		AvgHeartRate:    stats.AvgHeartRate,
		AvgPace:         stats.AvgPace,
	})
}

// ConnectDevice handles POST /running/devices.
// Connects a wearable device for the authenticated user.
func (h *RunningHandler) ConnectDevice(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.ConnectDeviceRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if req.DeviceType == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "device_type is required")
	}

	validTypes := map[string]bool{"apple_watch": true, "garmin": true, "healthkit": true}
	if !validTypes[req.DeviceType] {
		return appresponse.Error(c, fiber.StatusBadRequest, "device_type must be one of: apple_watch, garmin, healthkit")
	}

	conn, err := h.service.ConnectDevice(c.Context(), userID, req.DeviceType)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.DeviceConnectionResponse{
		ID:          conn.ID,
		DeviceType:  conn.DeviceType,
		IsActive:    conn.IsActive,
		ConnectedAt: conn.ConnectedAt,
	})
}

// DisconnectDevice handles DELETE /running/devices/:id.
// Disconnects a wearable device.
func (h *RunningHandler) DisconnectDevice(c *fiber.Ctx) error {
	deviceID := c.Params("id")
	if deviceID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "device ID is required")
	}

	if err := h.service.DisconnectDevice(c.Context(), deviceID); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{"message": "device disconnected"})
}

// toSessionResponse converts a domain RunningSession entity to a DTO response.
func toSessionResponse(s *domain.RunningSession) dto.RunningSessionResponse {
	return dto.RunningSessionResponse{
		ID:        s.ID,
		Date:      s.Date,
		Distance:  s.Distance,
		Duration:  s.Duration,
		Pace:      s.Pace,
		Speed:     s.Speed,
		Calories:  s.Calories,
		Elevation: s.Elevation,
		HeartRate: s.HeartRate,
		Cadence:   s.Cadence,
		GPSRoute:  s.GPSRoute,
		Source:    s.Source,
		CreatedAt: s.CreatedAt,
	}
}

// handleError maps application errors to appropriate HTTP responses.
func (h *RunningHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*apperrors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}
