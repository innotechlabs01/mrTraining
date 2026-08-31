package handlers

import (
	"github.com/gofiber/fiber/v2"

	onboardingapp "github.com/innotechlabs01/mr-training-api/internal/application/onboarding"
	"github.com/innotechlabs01/mr-training-api/internal/domain/onboarding"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// OnboardingHandler handles onboarding HTTP requests.
type OnboardingHandler struct {
	service *onboardingapp.Service
}

// NewOnboardingHandler creates a new OnboardingHandler.
func NewOnboardingHandler(service *onboardingapp.Service) *OnboardingHandler {
	return &OnboardingHandler{service: service}
}

// SaveOnboarding handles POST /athletes/onboard.
func (h *OnboardingHandler) SaveOnboarding(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	var req struct {
		Sports                []string `json:"sports"`
		Modality              string   `json:"modality"`
		ExperienceLevel       string   `json:"experienceLevel"`
		Goal                  string   `json:"goal"`
		SessionsPerWeek       int      `json:"sessionsPerWeek"`
		SessionDuration       int      `json:"sessionDuration"`
		Equipment             string   `json:"equipment"`
		AthleteRoutineAccepted bool    `json:"athleteRoutineAccepted"`
	}
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	d := &onboarding.OnboardingData{
		Sports:                req.Sports,
		Modality:              req.Modality,
		ExperienceLevel:       req.ExperienceLevel,
		Goal:                  req.Goal,
		SessionsPerWeek:       req.SessionsPerWeek,
		SessionDuration:       req.SessionDuration,
		Equipment:             req.Equipment,
		AthleteRoutineAccepted: req.AthleteRoutineAccepted,
	}
	if err := h.service.Save(c.Context(), userID, d); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return appresponse.Success(c, fiber.Map{"ok": true})
}

// GetOnboarding handles GET /athletes/onboard.
func (h *OnboardingHandler) GetOnboarding(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	d, err := h.service.Get(c.Context(), userID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusNotFound, err.Error())
	}
	return appresponse.Success(c, d)
}
