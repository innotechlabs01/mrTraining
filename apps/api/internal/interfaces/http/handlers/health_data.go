package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"

	healthapp "github.com/innotechlabs01/mr-training-api/internal/application/health"
	"github.com/innotechlabs01/mr-training-api/internal/domain/health"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// HealthDataHandler handles health-related HTTP requests.
type HealthDataHandler struct {
	service *healthapp.Service
}

// NewHealthDataHandler creates a new health data handler.
func NewHealthDataHandler(service *healthapp.Service) *HealthDataHandler {
	return &HealthDataHandler{service: service}
}

// GetMetrics handles GET /health/metrics.
func (h *HealthDataHandler) GetMetrics(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	targetUserID := userID
	if middleware.GetUserRole(c) == "coach" {
		if aid := c.Query("athlete_id"); aid != "" {
			targetUserID = aid
		}
	}
	days, _ := strconv.Atoi(c.Query("days", "7"))
	metrics, err := h.service.GetMetrics(c.Context(), targetUserID, days)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return appresponse.Success(c, fiber.Map{"metrics": metrics})
}

// RecordMetric handles POST /health/metrics.
func (h *HealthDataHandler) RecordMetric(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	var req dto.RecordMetricRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	metricType := req.MetricType
	if metricType == "" {
		metricType = req.MetricTypeCamel
	}
	sourceWorkoutID := req.SourceWorkoutID
	if sourceWorkoutID == nil {
		sourceWorkoutID = req.SourceWorkoutIDCam
	}
	recordedAt := req.RecordedAt
	if recordedAt == "" {
		recordedAt = req.RecordedAtCamel
	}
	m := &health.HealthMetric{
		MetricType:      metricType,
		Value:           req.Value,
		Unit:            req.Unit,
		Source:          req.Source,
		SourceWorkoutID: sourceWorkoutID,
		RecordedAt:      recordedAt,
	}
	if err := h.service.RecordMetric(c.Context(), userID, m); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return appresponse.Success(c, fiber.Map{"ok": true})
}

// GetSleepLogs handles GET /health/sleep.
func (h *HealthDataHandler) GetSleepLogs(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	targetUserID := userID
	if middleware.GetUserRole(c) == "coach" {
		if aid := c.Query("athlete_id"); aid != "" {
			targetUserID = aid
		}
	}
	days, _ := strconv.Atoi(c.Query("days", "7"))
	logs, err := h.service.GetSleepLogs(c.Context(), targetUserID, days)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return appresponse.Success(c, fiber.Map{"sleepLogs": logs})
}

// RecordSleepLog handles POST /health/sleep.
func (h *HealthDataHandler) RecordSleepLog(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	var req dto.RecordSleepRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	totalMin := req.TotalMinutes
	if totalMin == 0 {
		totalMin = req.TotalMinutesCamel
	}
	deepMin := req.DeepMinutes
	if deepMin == nil {
		deepMin = req.DeepMinutesCamel
	}
	remMin := req.RemMinutes
	if remMin == nil {
		remMin = req.RemMinutesCamel
	}
	lightMin := req.LightMinutes
	if lightMin == nil {
		lightMin = req.LightMinutesCamel
	}
	awakeMin := req.AwakeMinutes
	if awakeMin == nil {
		awakeMin = req.AwakeMinutesCamel
	}
	sl := &health.SleepLog{
		Date:         req.Date,
		TotalMinutes: totalMin,
		DeepMinutes:  deepMin,
		RemMinutes:   remMin,
		LightMinutes: lightMin,
		AwakeMinutes: awakeMin,
		Efficiency:   req.Efficiency,
		Score:        req.Score,
		Source:       req.Source,
	}
	if err := h.service.RecordSleepLog(c.Context(), userID, sl); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return appresponse.Success(c, fiber.Map{"ok": true})
}

// GetDevices handles GET /health/devices.
func (h *HealthDataHandler) GetDevices(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	targetUserID := userID
	if middleware.GetUserRole(c) == "coach" {
		if aid := c.Query("athlete_id"); aid != "" {
			targetUserID = aid
		}
	}
	devices, err := h.service.GetDevices(c.Context(), targetUserID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return appresponse.Success(c, fiber.Map{"devices": devices})
}

// RegisterDevice handles POST /health/devices.
func (h *HealthDataHandler) RegisterDevice(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	var req dto.RegisterHealthDeviceRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	deviceName := req.DeviceName
	if deviceName == "" {
		deviceName = req.DeviceNameCamel
	}
	deviceBrand := req.DeviceBrand
	if deviceBrand == "" {
		deviceBrand = req.DeviceBrandCamel
	}
	d := &health.HealthDevice{
		Platform:    req.Platform,
		DeviceName:  deviceName,
		DeviceBrand: deviceBrand,
		IsActive:    true,
	}
	if err := h.service.RegisterDevice(c.Context(), userID, d); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return appresponse.Success(c, fiber.Map{"ok": true})
}

// RemoveDevice handles DELETE /health/devices/:id.
func (h *HealthDataHandler) RemoveDevice(c *fiber.Ctx) error {
	deviceID := c.Params("id")
	if err := h.service.RemoveDevice(c.Context(), deviceID); err != nil {
		return appresponse.Error(c, fiber.StatusNotFound, err.Error())
	}
	return appresponse.Success(c, fiber.Map{"ok": true})
}
