package handlers

import (
	"github.com/gofiber/fiber/v2"

	allyopsapp "github.com/innotechlabs01/mr-training-api/internal/application/ally_operations"
	allyopsdomain "github.com/innotechlabs01/mr-training-api/internal/domain/ally_operations"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// AllyOperationsHandler handles HTTP requests for ally operations (orders,
// reservations, and QR redemptions).
type AllyOperationsHandler struct {
	service *allyopsapp.Service
}

// NewAllyOperationsHandler creates a new AllyOperationsHandler.
func NewAllyOperationsHandler(service *allyopsapp.Service) *AllyOperationsHandler {
	return &AllyOperationsHandler{service: service}
}

// CreateOrder handles POST /athlete/orders.
func (h *AllyOperationsHandler) CreateOrder(c *fiber.Ctx) error {
	athleteID := middleware.GetUserID(c)
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.CreateAllyOperationRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	coachID := c.Query("coach_id")
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "coach_id query parameter is required")
	}

	op, err := h.service.CreateOperation(c.Context(), allyopsdomain.CreateOperationInput{
		Kind:          "order",
		RelationshipID: req.RelationshipID,
		AthleteID:     athleteID,
		ScheduledAt:   req.ScheduledAt,
	}, coachID)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.AllyOperationResponse{
		ID:            op.ID,
		Kind:          op.Kind,
		RelationshipID: op.RelationshipID,
		AllyID:        op.AllyID,
		AthleteID:     op.AthleteID,
		Status:        op.Status,
		ScheduledAt:   op.ScheduledAt,
		CreatedAt:     op.CreatedAt,
		UpdatedAt:     op.UpdatedAt,
	})
}

// CreateReservation handles POST /athlete/reservations.
func (h *AllyOperationsHandler) CreateReservation(c *fiber.Ctx) error {
	athleteID := middleware.GetUserID(c)
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.CreateAllyOperationRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	coachID := c.Query("coach_id")
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "coach_id query parameter is required")
	}

	if req.ScheduledAt == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "scheduled_at is required for reservations")
	}

	op, err := h.service.CreateOperation(c.Context(), allyopsdomain.CreateOperationInput{
		Kind:          "reservation",
		RelationshipID: req.RelationshipID,
		AthleteID:     athleteID,
		ScheduledAt:   req.ScheduledAt,
	}, coachID)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.AllyOperationResponse{
		ID:            op.ID,
		Kind:          op.Kind,
		RelationshipID: op.RelationshipID,
		AllyID:        op.AllyID,
		AthleteID:     op.AthleteID,
		Status:        op.Status,
		ScheduledAt:   op.ScheduledAt,
		CreatedAt:     op.CreatedAt,
		UpdatedAt:     op.UpdatedAt,
	})
}

// GetOperation handles GET /athlete/operations/:id.
func (h *AllyOperationsHandler) GetOperation(c *fiber.Ctx) error {
	athleteID := middleware.GetUserID(c)
	if athleteID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	operationID := c.Params("id")
	if operationID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "operation ID is required")
	}

	op, err := h.service.GetOperation(c.Context(), operationID, athleteID)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.AllyOperationResponse{
		ID:            op.ID,
		Kind:          op.Kind,
		RelationshipID: op.RelationshipID,
		AllyID:        op.AllyID,
		AthleteID:     op.AthleteID,
		Status:        op.Status,
		ScheduledAt:   op.ScheduledAt,
		ConfirmedAt:   op.ConfirmedAt,
		CompletedAt:   op.CompletedAt,
		CancelledAt:   op.CancelledAt,
		CreatedAt:     op.CreatedAt,
		UpdatedAt:     op.UpdatedAt,
	})
}

// ListAllyOperations handles GET /ally/operations.
func (h *AllyOperationsHandler) ListAllyOperations(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	operations, err := h.service.ListOperationsByUser(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.AllyOperationResponse, len(operations))
	for i, op := range operations {
		responses[i] = dto.AllyOperationResponse{
			ID:            op.ID,
			Kind:          op.Kind,
			RelationshipID: op.RelationshipID,
			AllyID:        op.AllyID,
			AthleteID:     op.AthleteID,
			Status:        op.Status,
			ScheduledAt:   op.ScheduledAt,
			ConfirmedAt:   op.ConfirmedAt,
			CompletedAt:   op.CompletedAt,
			CancelledAt:   op.CancelledAt,
			CreatedAt:     op.CreatedAt,
			UpdatedAt:     op.UpdatedAt,
		}
	}

	return appresponse.Success(c, dto.ListResponse[dto.AllyOperationResponse]{
		Data:  responses,
		Total: len(responses),
		Page:  1,
		Limit: len(responses),
	})
}

// AddOperationItem handles POST /ally/operations/:id/items.
func (h *AllyOperationsHandler) AddOperationItem(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	operationID := c.Params("id")
	if operationID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "operation ID is required")
	}

	var req dto.AddAllyOperationItemRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	item, err := h.service.CreateOperationItem(c.Context(), allyopsdomain.CreateOperationItemInput{
		OperationID:  operationID,
		OfferKind:    req.OfferKind,
		OfferID:      req.OfferID,
		Name:         req.Name,
		UnitPriceCents: req.UnitPriceCents,
		Quantity:     req.Quantity,
	})
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.AllyOperationItemResponse{
		ID:            item.ID,
		OperationID:   item.OperationID,
		OfferKind:     item.OfferKind,
		OfferID:       item.OfferID,
		Name:          item.Name,
		UnitPriceCents: item.UnitPriceCents,
		Quantity:      item.Quantity,
	})
}

// ListOperationItems handles GET /ally/operations/:id/items.
func (h *AllyOperationsHandler) ListOperationItems(c *fiber.Ctx) error {
	operationID := c.Params("id")
	if operationID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "operation ID is required")
	}

	items, err := h.service.ListOperationItems(c.Context(), operationID)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.AllyOperationItemResponse, len(items))
	for i, item := range items {
		responses[i] = dto.AllyOperationItemResponse{
			ID:            item.ID,
			OperationID:   item.OperationID,
			OfferKind:     item.OfferKind,
			OfferID:       item.OfferID,
			Name:          item.Name,
			UnitPriceCents: item.UnitPriceCents,
			Quantity:      item.Quantity,
		}
	}

	return appresponse.Success(c, dto.ListResponse[dto.AllyOperationItemResponse]{
		Data:  responses,
		Total: len(responses),
		Page:  1,
		Limit: len(responses),
	})
}

// CreateRedemption handles POST /ally/redemptions.
func (h *AllyOperationsHandler) CreateRedemption(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.CreateAllyRedemptionRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	operationID := c.Query("operation_id")
	if operationID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "operation_id query parameter is required")
	}

	redemption, err := h.service.CreateRedemption(c.Context(), allyopsdomain.CreateRedemptionInput{
		OperationID: operationID,
		ExpiresAt:   req.ExpiresAt,
	})
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.AllyRedemptionResponse{
		ID:          redemption.ID,
		OperationID: redemption.OperationID,
		TokenHash:   redemption.TokenHash,
		ExpiresAt:   redemption.ExpiresAt,
		Status:      redemption.Status,
		CreatedAt:   redemption.CreatedAt,
	})
}

// RedeemRedemption handles POST /ally/redemptions/:token/redeem.
func (h *AllyOperationsHandler) RedeemRedemption(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	token := c.Params("token")
	if token == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "token is required")
	}

	redemption, err := h.service.RedeemRedemption(c.Context(), token, userID)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.RedeemRedemptionResponse{
		Redeemed: true,
		Status:   redemption.Status,
		Message:  "redemption completed successfully",
	})
}

// handleError maps application errors to appropriate HTTP responses.
func (h *AllyOperationsHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}
