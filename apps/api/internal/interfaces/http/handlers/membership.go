// Package handlers provides HTTP endpoint handlers for the membership domain.
package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	membershipapp "github.com/innotechlabs01/mr-training-api/internal/application/membership"
	membershipdomain "github.com/innotechlabs01/mr-training-api/internal/domain/membership"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	"github.com/innotechlabs01/mr-training-api/internal/pkg/validator"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// MembershipHandler handles HTTP requests for the membership domain.
type MembershipHandler struct {
	service *membershipapp.Service
}

// NewMembershipHandler creates a new MembershipHandler with the given application service.
func NewMembershipHandler(service *membershipapp.Service) *MembershipHandler {
	return &MembershipHandler{service: service}
}

// GetMembership handles GET /memberships.
// Returns the authenticated athlete's current membership.
func (h *MembershipHandler) GetMembership(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	m, err := h.service.GetMembership(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, toMembershipResponse(m))
}

// CreateMembership handles POST /memberships.
// Creates a new membership for an athlete. Requires coach role.
func (h *MembershipHandler) CreateMembership(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.CreateMembershipRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if validationErrs := validator.ValidateCreateMembership(&req); len(validationErrs) > 0 {
		return h.handleValidationError(c, validationErrs)
	}

	m, err := h.service.CreateMembership(c.Context(), membershipapp.CreateRequest{
		AthleteID:     req.AthleteID,
		CoachID:       coachID,
		PlanName:      req.PlanName,
		PlanPrice:     req.PlanPrice,
		BillingPeriod: req.BillingPeriod,
		StartDate:     req.StartDate,
	})
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, toMembershipResponse(m))
}

// CancelMembership handles PUT /memberships/:id/cancel.
// Cancels a membership. Requires coach role.
func (h *MembershipHandler) CancelMembership(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "membership ID is required")
	}

	if err := h.service.CancelMembership(c.Context(), id); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{"message": "membership cancelled"})
}

// RenewMembership handles PUT /memberships/:id/renew.
// Renews a membership by extending the billing period. Requires coach role.
func (h *MembershipHandler) RenewMembership(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "membership ID is required")
	}

	if err := h.service.RenewMembership(c.Context(), id); err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{"message": "membership renewed"})
}

// GetPaymentHistory handles GET /memberships/:id/payments.
// Returns payment history for the authenticated athlete.
func (h *MembershipHandler) GetPaymentHistory(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	payments, err := h.service.GetPaymentHistory(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
	}

	paymentResponses := make([]dto.PaymentResponse, len(payments))
	for i, p := range payments {
		paymentResponses[i] = *toPaymentResponse(p)
	}

	return appresponse.Success(c, dto.ListResponse[dto.PaymentResponse]{
		Data:  paymentResponses,
		Total: len(paymentResponses),
		Page:  1,
		Limit: len(paymentResponses),
	})
}

// ListMembershipsByCoach handles GET /coaches/memberships.
// Returns all memberships for the authenticated coach's athletes.
func (h *MembershipHandler) ListMembershipsByCoach(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	memberships, err := h.service.ListMembershipsByCoach(c.Context(), coachID)
	if err != nil {
		return h.handleError(c, err)
	}

	membershipResponses := make([]dto.MembershipResponse, len(memberships))
	for i, m := range memberships {
		membershipResponses[i] = *toMembershipResponse(m)
	}

	return appresponse.Success(c, dto.ListResponse[dto.MembershipResponse]{
		Data:  membershipResponses,
		Total: len(membershipResponses),
		Page:  1,
		Limit: len(membershipResponses),
	})
}

// handleValidationError converts validation errors into a 422 response.
func (h *MembershipHandler) handleValidationError(c *fiber.Ctx, validationErrs validator.ValidationErrors) error {
	var messages []string
	for _, e := range validationErrs {
		messages = append(messages, e.Field+": "+e.Message)
	}
	return appresponse.Error(c, fiber.StatusUnprocessableEntity, strings.Join(messages, "; "))
}

// handleError maps application errors to appropriate HTTP responses.
func (h *MembershipHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}

// toMembershipResponse converts a domain Membership entity to a DTO response.
func toMembershipResponse(m *membershipdomain.Membership) *dto.MembershipResponse {
	return &dto.MembershipResponse{
		ID:                 m.ID,
		AthleteID:          m.AthleteID,
		CoachID:            m.CoachID,
		PlanName:           m.PlanName,
		PlanPrice:          m.PlanPrice,
		BillingPeriod:      m.BillingPeriod,
		Status:             m.Status,
		CurrentPeriodStart: m.CurrentPeriodStart,
		CurrentPeriodEnd:   m.CurrentPeriodEnd,
		GracePeriodDays:    m.GracePeriodDays,
		PaymentDueDate:     m.PaymentDueDate,
		CreatedAt:          m.CreatedAt,
		UpdatedAt:          m.UpdatedAt,
	}
}

// toPaymentResponse converts a domain Payment entity to a DTO response.
func toPaymentResponse(p *membershipdomain.Payment) *dto.PaymentResponse {
	return &dto.PaymentResponse{
		ID:           p.ID,
		MembershipID: p.MembershipID,
		Amount:       p.Amount,
		Currency:     p.Currency,
		Status:       p.Status,
		PolarOrderID: p.PolarOrderID,
		PeriodStart:  p.PeriodStart,
		PeriodEnd:    p.PeriodEnd,
		PaidAt:       p.PaidAt,
		CreatedAt:    p.CreatedAt,
	}
}
