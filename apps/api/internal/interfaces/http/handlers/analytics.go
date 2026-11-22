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
	service         *analyticsapp.Service
	db              *sql.DB
	tenantResolver  middleware.TenantResolver
}

func NewAnalyticsHandler(service *analyticsapp.Service, db *sql.DB, tenantResolver middleware.TenantResolver) *AnalyticsHandler {
	return &AnalyticsHandler{service: service, db: db, tenantResolver: tenantResolver}
}

func (h *AnalyticsHandler) withTx(c *fiber.Ctx, fn func(*analyticsapp.Service) error) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	athleteID := c.Params("athleteId")
		if athleteID != "" && userID != athleteID {
		if h.tenantResolver == nil {
			return appresponse.Error(c, fiber.StatusForbidden, "no active relationship with this athlete")
		}
		ok, err := h.tenantResolver.AthleteHasActiveCoach(c.Context(), athleteID, userID)
		if err != nil || !ok {
			return appresponse.Error(c, fiber.StatusForbidden, "no active relationship with this athlete")
		}
	}

	coachID := middleware.GetCoachID(c)
	if h.db == nil {
		return fn(h.service)
	}
	if coachID == "" {
		coachID = userID
	}
	role := middleware.GetUserRole(c)
	if role == "" {
		role = "athlete"
	}
	uow := database.NewUnitOfWork(h.db)
	if err := uow.Begin(c.Context(), userID, coachID, role); err != nil {
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

		requesterID := middleware.GetUserID(c)
		// Self-access: an athlete may read their own analytics.
		// Coach access: only an active coach-athlete relationship authorizes it.
		if requesterID != athleteID && h.tenantResolver != nil && requesterID != "" {
			ok, err := h.tenantResolver.AthleteHasActiveCoach(c.Context(), athleteID, requesterID)
			if err != nil || !ok {
				return appresponse.Error(c, fiber.StatusForbidden, "no active relationship with this athlete")
			}
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

		requesterID := middleware.GetUserID(c)
		// Self-access: an athlete may read their own analytics.
		// Coach access: only an active coach-athlete relationship authorizes it.
		if requesterID != athleteID && h.tenantResolver != nil && requesterID != "" {
			ok, err := h.tenantResolver.AthleteHasActiveCoach(c.Context(), athleteID, requesterID)
			if err != nil || !ok {
				return appresponse.Error(c, fiber.StatusForbidden, "no active relationship with this athlete")
			}
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

		requesterID := middleware.GetUserID(c)
		// Self-access: an athlete may read their own analytics.
		// Coach access: only an active coach-athlete relationship authorizes it.
		if requesterID != athleteID && h.tenantResolver != nil && requesterID != "" {
			ok, err := h.tenantResolver.AthleteHasActiveCoach(c.Context(), athleteID, requesterID)
			if err != nil || !ok {
				return appresponse.Error(c, fiber.StatusForbidden, "no active relationship with this athlete")
			}
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

		requesterID := middleware.GetUserID(c)
		// Self-access: an athlete may read their own analytics.
		// Coach access: only an active coach-athlete relationship authorizes it.
		if requesterID != athleteID && h.tenantResolver != nil && requesterID != "" {
			ok, err := h.tenantResolver.AthleteHasActiveCoach(c.Context(), athleteID, requesterID)
			if err != nil || !ok {
				return appresponse.Error(c, fiber.StatusForbidden, "no active relationship with this athlete")
			}
		}
		effort, err := svc.GetEffort(c.Context(), athleteID)
		if err != nil {
			return err
		}
		return appresponse.Success(c, effort)
	})
}

// GetAthleteTrainingSummary handles GET /athlete/:athleteId/analytics/training-summary?days=28.
// Accessible by the athlete themselves or a coach with an active relationship.
func (h *AnalyticsHandler) GetAthleteTrainingSummary(c *fiber.Ctx) error {
	return h.withTx(c, func(svc *analyticsapp.Service) error {
		athleteID := c.Params("athleteId")
		if athleteID == "" {
			return appresponse.Error(c, fiber.StatusBadRequest, "athleteId required")
		}
		days := c.QueryInt("days", 28)
		if days <= 0 {
			days = 28
		}
		if days > 365 {
			days = 365
		}
		summary, err := svc.GetAthleteTrainingSummary(middleware.RequestContext(c), athleteID, days)
		if err != nil {
			return appresponse.Error(c, fiber.StatusInternalServerError, "failed to get athlete training summary")
		}
		return appresponse.Success(c, summary)
	})
}

// GetAthleteVideoAnalytics handles GET /coach/athletes/:athleteId/video-analytics.
// Aggregates video_views by exercise for the athlete within a UnitOfWork RLS transaction.
func (h *AnalyticsHandler) GetAthleteVideoAnalytics(c *fiber.Ctx) error {
	return h.withTx(c, func(svc *analyticsapp.Service) error {
		athleteID := c.Params("athleteId")
		if athleteID == "" {
			return appresponse.Error(c, fiber.StatusBadRequest, "athleteId required")
		}
		analytics, err := svc.GetAthleteVideoAnalytics(middleware.RequestContext(c), athleteID)
		if err != nil {
			return appresponse.Error(c, fiber.StatusInternalServerError, "failed to get athlete video analytics")
		}
		return appresponse.Success(c, fiber.Map{
			"analytics": analytics,
		})
	})
}
