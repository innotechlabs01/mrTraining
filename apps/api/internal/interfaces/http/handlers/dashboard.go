package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	dashapp "github.com/innotechlabs01/mr-training-api/internal/application/dashboard"
	dashboarddomain "github.com/innotechlabs01/mr-training-api/internal/domain/dashboard"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

type DashboardHandler struct {
	service *dashapp.Service
}

func NewDashboardHandler(s *dashapp.Service) *DashboardHandler {
	return &DashboardHandler{service: s}
}

func (h *DashboardHandler) GetSummary(c *fiber.Ctx) error {
	summary, err := h.service.GetSummary(c.Context(), middleware.GetUserID(c))
	if err != nil {
		return h.handleError(c, err)
	}
	return appresponse.Success(c, toDashboardResponse(summary))
}

func toDashboardResponse(s *dashboarddomain.DashboardSummary) *dto.DashboardSummaryResponse {
	activities := make([]dto.ActivityItemResponse, len(s.RecentActivity))
	for i, a := range s.RecentActivity {
		activities[i] = dto.ActivityItemResponse{
			ID:          a.ID,
			Type:        a.Type,
			Title:       a.Title,
			Description: a.Description,
			AthleteName: a.AthleteName,
			OccurredAt:  a.OccurredAt.Format(time.RFC3339),
		}
	}
	return &dto.DashboardSummaryResponse{
		TotalAthletes:        s.TotalAthletes,
		ActiveAthletes:       s.ActiveAthletes,
		WorkoutsCompleted:    s.WorkoutsCompleted,
		WorkoutsPlanned:      s.WorkoutsPlanned,
		ComplianceRate:       s.ComplianceRate,
		AverageCompliance:    s.AverageCompliance,
		RevenueCents:         s.RevenueCents,
		UpcomingAppointments: s.UpcomingAppointments,
		UpcomingEvents:       s.UpcomingEvents,
		RecentActivity:       activities,
		GeneratedAt:          s.GeneratedAt.Format(time.RFC3339),
	}
}

func (h *DashboardHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}