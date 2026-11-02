// Package handlers provides HTTP handlers for analytics domain.
package handlers

import (
	"database/sql"

	"github.com/gofiber/fiber/v2"

	analyticsapp "github.com/innotechlabs01/mr-training-api/internal/application/analytics"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

type AnalyticsHandler struct {
	service *analyticsapp.Service
	db      *sql.DB
}

func NewAnalyticsHandler(service *analyticsapp.Service, db *sql.DB) *AnalyticsHandler {
	return &AnalyticsHandler{service: service, db: db}
}

func (h *AnalyticsHandler) withTx(c *fiber.Ctx, fn func(*analyticsapp.Service) error) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	uow := database.NewUnitOfWork(h.db)
	if err := uow.Begin(c.Context(), userID, middleware.GetCoachID(c), middleware.GetUserRole(c)); err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to begin transaction")
	}
	defer uow.Rollback(c.Context())

	svc := h.service.SetExecutor(uow.Tx())

	if err := fn(svc); err != nil {
		return err
	}

	if err := uow.Commit(c.Context()); err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to commit transaction")
	}

	return nil
}

func (h *AnalyticsHandler) GetDashboardSummary(c *fiber.Ctx) error {
	return h.withTx(c, func(svc *analyticsapp.Service) error {
		userID := middleware.GetUserID(c)
		d, err := svc.GetDashboardSummary(c.Context(), userID)
		if err != nil {
			return err
		}
		return appresponse.Success(c, d)
	})
}

func (h *AnalyticsHandler) GetHRZones(c *fiber.Ctx) error {
	return h.withTx(c, func(svc *analyticsapp.Service) error {
		athleteID := c.Params("athleteId")
		if athleteID == "" {
			return appresponse.Error(c, fiber.StatusBadRequest, "athleteId required")
		}
		zones, err := svc.GetHRZones(c.Context(), athleteID)
		if err != nil {
			return err
		}
		return appresponse.Success(c, zones)
	})
}

func (h *AnalyticsHandler) GetFatigueMap(c *fiber.Ctx) error {
	return h.withTx(c, func(svc *analyticsapp.Service) error {
		athleteID := c.Params("athleteId")
		if athleteID == "" {
			return appresponse.Error(c, fiber.StatusBadRequest, "athleteId required")
		}
		fatigue, err := svc.GetFatigueMap(c.Context(), athleteID)
		if err != nil {
			return err
		}
		return appresponse.Success(c, fatigue)
	})
}

func (h *AnalyticsHandler) GetOneRM(c *fiber.Ctx) error {
	return h.withTx(c, func(svc *analyticsapp.Service) error {
		athleteID := c.Params("athleteId")
		if athleteID == "" {
			return appresponse.Error(c, fiber.StatusBadRequest, "athleteId required")
		}
		oneRM, err := svc.GetOneRM(c.Context(), athleteID)
		if err != nil {
			return err
		}
		return appresponse.Success(c, oneRM)
	})
}

func (h *AnalyticsHandler) GetTrainingSummary(c *fiber.Ctx) error {
	return h.withTx(c, func(svc *analyticsapp.Service) error {
		userID := middleware.GetUserID(c)
		summary, err := svc.GetTrainingSummary(c.Context(), userID)
		if err != nil {
			return err
		}
		return appresponse.Success(c, summary)
	})
}

func (h *AnalyticsHandler) GetEffort(c *fiber.Ctx) error {
	return h.withTx(c, func(svc *analyticsapp.Service) error {
		athleteID := c.Params("athleteId")
		if athleteID == "" {
			return appresponse.Error(c, fiber.StatusBadRequest, "athleteId required")
		}
		effort, err := svc.GetEffort(c.Context(), athleteID)
		if err != nil {
			return err
		}
		return appresponse.Success(c, effort)
	})
}
