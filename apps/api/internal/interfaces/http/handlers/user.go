// Package handlers provides HTTP endpoint handlers for the user domain.
package handlers

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"

	userapp "github.com/innotechlabs01/mr-training-api/internal/application/user"
	userdomain "github.com/innotechlabs01/mr-training-api/internal/domain/user"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	"github.com/innotechlabs01/mr-training-api/internal/pkg/validator"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// UserHandler handles HTTP requests for the user domain.
type UserHandler struct {
	service *userapp.Service
}

// NewUserHandler creates a new UserHandler with the given application service.
func NewUserHandler(service *userapp.Service) *UserHandler {
	return &UserHandler{service: service}
}

// GetCurrentUser handles GET /users/me.
// Returns the authenticated user's profile along with role-specific data.
func (h *UserHandler) GetCurrentUser(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	u, coach, athlete, err := h.service.GetCurrentUser(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
	}

	resp := dto.CurrentUserResponse{
		User: toUserResponse(u),
	}
	if coach != nil {
		resp.Coach = toCoachResponse(coach)
	}
	if athlete != nil {
		resp.AthleteProfile = toAthleteProfileResponse(athlete)
	}

	return appresponse.Success(c, resp)
}

// UpdateProfile handles PUT /users/me.
// Updates the authenticated user's name and avatar.
func (h *UserHandler) UpdateProfile(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if validationErrs := validator.ValidateUpdateProfile(&req); len(validationErrs) > 0 {
		return h.handleValidationError(c, validationErrs)
	}

	if err := h.service.UpdateProfile(c.Context(), userID, req); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{"message": "profile updated"})
}

// GetUserByID handles GET /users/:id.
// Returns a user by ID. Requires admin role.
func (h *UserHandler) GetUserByID(c *fiber.Ctx) error {
	targetUserID := c.Params("id")
	if targetUserID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "user ID is required")
	}

	u, err := h.service.GetUser(c.Context(), targetUserID)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, toUserResponse(u))
}

// ListCoaches handles GET /coaches.
// Returns a paginated list of active coaches.
func (h *UserHandler) ListCoaches(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	params := dto.PaginationParams{Page: page, Limit: limit}
	params.Normalize()

	coaches, total, err := h.service.ListCoaches(c.Context(), params.Page, params.Limit)
	if err != nil {
		return h.handleError(c, err)
	}

	coachResponses := make([]dto.CoachResponse, len(coaches))
	for i, coach := range coaches {
		coachResponses[i] = *toCoachResponse(coach)
	}

	return appresponse.Success(c, dto.ListResponse[dto.CoachResponse]{
		Data:  coachResponses,
		Total: total,
		Page:  params.Page,
		Limit: params.Limit,
	})
}

// GetAthletesByCoach handles GET /coaches/:id/athletes.
// Returns all active athletes linked to the specified coach.
func (h *UserHandler) GetAthletesByCoach(c *fiber.Ctx) error {
	coachID := c.Params("id")
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "coach ID is required")
	}

	athletes, err := h.service.GetAthletesByCoach(c.Context(), coachID)
	if err != nil {
		return h.handleError(c, err)
	}

	athleteResponses := make([]dto.AthleteProfileResponse, len(athletes))
	for i, athlete := range athletes {
		athleteResponses[i] = *toAthleteProfileResponse(athlete)
	}

	return appresponse.Success(c, dto.ListResponse[dto.AthleteProfileResponse]{
		Data:  athleteResponses,
		Total: len(athleteResponses),
		Page:  1,
		Limit: len(athleteResponses),
	})
}

// UpdateCoachProfile handles PUT /coaches/me.
// Updates the authenticated coach's extended profile.
func (h *UserHandler) UpdateCoachProfile(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.UpdateCoachRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if validationErrs := validator.ValidateUpdateCoach(&req); len(validationErrs) > 0 {
		return h.handleValidationError(c, validationErrs)
	}

	if err := h.service.UpdateCoachProfile(c.Context(), userID, req); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{"message": "coach profile updated"})
}

// UpdateAthleteProfile handles PUT /athletes/me.
// Updates the authenticated athlete's extended profile.
func (h *UserHandler) UpdateAthleteProfile(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.UpdateAthleteRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if validationErrs := validator.ValidateUpdateAthlete(&req); len(validationErrs) > 0 {
		return h.handleValidationError(c, validationErrs)
	}

	if err := h.service.UpdateAthleteProfile(c.Context(), userID, req); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{"message": "athlete profile updated"})
}

// handleValidationError converts validation errors into a 422 response.
func (h *UserHandler) handleValidationError(c *fiber.Ctx, validationErrs validator.ValidationErrors) error {
	var messages []string
	for _, e := range validationErrs {
		messages = append(messages, e.Field+": "+e.Message)
	}
	return appresponse.Error(c, fiber.StatusUnprocessableEntity, strings.Join(messages, "; "))
}

// handleError maps application errors to appropriate HTTP responses.
func (h *UserHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}

// toUserResponse converts a domain User entity to a DTO response.
func toUserResponse(u *userdomain.User) *dto.UserResponse {
	return &dto.UserResponse{
		ID:        u.ID,
		Email:     u.Email,
		Name:      u.Name,
		AvatarURL: u.AvatarURL,
		Role:      u.Role,
		IsActive:  u.IsActive,
		CreatedAt: u.CreatedAt,
		UpdatedAt: u.UpdatedAt,
	}
}

// toCoachResponse converts a domain Coach entity to a DTO response.
func toCoachResponse(c *userdomain.Coach) *dto.CoachResponse {
	return &dto.CoachResponse{
		ID:                  c.ID,
		Email:               c.Email,
		Name:                c.Name,
		AvatarURL:           c.AvatarURL,
		Bio:                 c.Bio,
		Specializations:     c.Specializations,
		Certifications:      c.Certifications,
		ExperienceYears:     c.ExperienceYears,
		MaxAthletes:         c.MaxAthletes,
		IsAcceptingAthletes: c.IsAcceptingAthletes,
		IsActive:            c.IsActive,
		CreatedAt:           c.CreatedAt,
		UpdatedAt:           c.UpdatedAt,
	}
}

// toAthleteProfileResponse converts a domain AthleteProfile entity to a DTO response.
func toAthleteProfileResponse(a *userdomain.AthleteProfile) *dto.AthleteProfileResponse {
	return &dto.AthleteProfileResponse{
		ID:               a.ID,
		Email:            a.Email,
		Name:             a.Name,
		AvatarURL:        a.AvatarURL,
		Sport:            a.Sport,
		ExperienceLevel:  a.ExperienceLevel,
		HeightCm:         a.HeightCm,
		WeightKg:         a.WeightKg,
		EmergencyContact: a.EmergencyContact,
		EmergencyPhone:   a.EmergencyPhone,
		Modality:         a.Modality,
		ScheduleDays:     a.ScheduleDays,
		ScheduleTime:     a.ScheduleTime,
		IsActive:         a.IsActive,
		CreatedAt:        a.CreatedAt,
		UpdatedAt:        a.UpdatedAt,
	}
}
