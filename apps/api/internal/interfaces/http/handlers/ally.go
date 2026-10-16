package handlers

import (
	"github.com/gofiber/fiber/v2"

	allyapp "github.com/innotechlabs01/mr-training-api/internal/application/ally"
	allydomain "github.com/innotechlabs01/mr-training-api/internal/domain/ally"
	commissionapp "github.com/innotechlabs01/mr-training-api/internal/application/commission"
	commissiondomain "github.com/innotechlabs01/mr-training-api/internal/domain/commission"
	auditinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/audit"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// AllyHandler handles HTTP requests for the Alianzas (ally) domain.
type AllyHandler struct {
	allyService      *allyapp.Service
	commissionService *commissionapp.Service
	auditRepo        *auditinfra.Repository
}

// NewAllyHandler creates a new AllyHandler.
func NewAllyHandler(allyService *allyapp.Service, commissionService *commissionapp.Service, auditRepo *auditinfra.Repository) *AllyHandler {
	return &AllyHandler{
		allyService:       allyService,
		commissionService: commissionService,
		auditRepo:         auditRepo,
	}
}

// CreateAlly handles POST /coach/allies.
func (h *AllyHandler) CreateAlly(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.CreateAllyRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	ally, relationship, err := h.allyService.CreateAlly(c.Context(), allydomain.CreateInput{
		CoachID:        coachID,
		LegalName:      req.LegalName,
		CommercialName: req.CommercialName,
		Category:       req.Category,
		ContactEmail:   req.ContactEmail,
		ContactPhone:   req.ContactPhone,
		TaxID:          req.TaxID,
		OwnerUserID:    req.OwnerUserID,
	}, coachID)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, fiber.Map{
		"ally": dto.AllyResponse{
			ID:             ally.ID,
			OwnerUserID:    ally.OwnerUserID,
			LegalName:      ally.LegalName,
			CommercialName: ally.CommercialName,
			Category:       ally.Category,
			ContactEmail:   ally.ContactEmail,
			ContactPhone:   ally.ContactPhone,
			TaxID:          ally.TaxID,
			Status:         ally.Status,
			CreatedAt:      ally.CreatedAt,
			UpdatedAt:      ally.UpdatedAt,
		},
		"relationship": dto.RelationshipResponse{
			ID:           relationship.ID,
			CoachID:      relationship.CoachID,
			AllyID:       relationship.AllyID,
			Status:       relationship.Status,
			AttributedBy: relationship.AttributedBy,
			InvitedAt:    relationship.InvitedAt,
			ActivatedAt:  relationship.ActivatedAt,
			EndedAt:      relationship.EndedAt,
			CreatedAt:    relationship.CreatedAt,
			UpdatedAt:    relationship.UpdatedAt,
		},
	})
}

// ListCoachAllies handles GET /coach/allies.
func (h *AllyHandler) ListCoachAllies(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	allies, err := h.allyService.ListByCoach(c.Context(), coachID)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.AllySummaryResponse, len(allies))
	for i, a := range allies {
		responses[i] = dto.AllySummaryResponse{
			RelationshipID: a.RelationshipID,
			CoachID:        a.CoachID,
			AllyID:         a.AllyID,
			LegalName:      a.LegalName,
			CommercialName: a.CommercialName,
			Category:       a.Category,
			Status:         a.Status,
		}
	}

	return appresponse.Success(c, dto.ListResponse[dto.AllySummaryResponse]{
		Data:  responses,
		Total: len(responses),
		Page:  1,
		Limit: len(responses),
	})
}

// GetCoachAlly handles GET /coach/allies/:id.
func (h *AllyHandler) GetCoachAlly(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	relationshipID := c.Params("id")
	if relationshipID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "relationship ID is required")
	}

	detail, err := h.allyService.GetByIDForCoach(c.Context(), relationshipID, coachID)
	if err != nil {
		return h.handleError(c, err)
	}

	members := make([]*dto.AllyMemberResponse, len(detail.Members))
	for i, m := range detail.Members {
		members[i] = &dto.AllyMemberResponse{
			ID:        m.ID,
			AllyID:    m.AllyID,
			UserID:    m.UserID,
			Role:      m.Role,
			CreatedAt: m.CreatedAt,
		}
	}

	return appresponse.Success(c, dto.AllyDetailResponse{
		Ally: &dto.AllyResponse{
			ID:             detail.Ally.ID,
			OwnerUserID:    detail.Ally.OwnerUserID,
			LegalName:      detail.Ally.LegalName,
			CommercialName: detail.Ally.CommercialName,
			Category:       detail.Ally.Category,
			ContactEmail:   detail.Ally.ContactEmail,
			ContactPhone:   detail.Ally.ContactPhone,
			TaxID:          detail.Ally.TaxID,
			Status:         detail.Ally.Status,
			CreatedAt:      detail.Ally.CreatedAt,
			UpdatedAt:      detail.Ally.UpdatedAt,
		},
		Relationship: &dto.RelationshipResponse{
			ID:           detail.Relationship.ID,
			CoachID:      detail.Relationship.CoachID,
			AllyID:       detail.Relationship.AllyID,
			Status:       detail.Relationship.Status,
			AttributedBy: detail.Relationship.AttributedBy,
			InvitedAt:    detail.Relationship.InvitedAt,
			ActivatedAt:  detail.Relationship.ActivatedAt,
			EndedAt:      detail.Relationship.EndedAt,
			CreatedAt:    detail.Relationship.CreatedAt,
			UpdatedAt:    detail.Relationship.UpdatedAt,
		},
		Members: members,
	})
}

// CreateCommissionAgreement handles PUT /coach/allies/:id/commission-agreement.
func (h *AllyHandler) CreateCommissionAgreement(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	relationshipID := c.Params("id")
	if relationshipID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "relationship ID is required")
	}

	var req dto.CreateCommissionAgreementRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if req.Currency == "" {
		req.Currency = "COP"
	}

	agreement, err := h.commissionService.CreateAgreementVersion(c.Context(), commissiondomain.CreateAgreementInput{
		RelationshipID:   relationshipID,
		CoachID:          coachID,
		RateBps:          req.RateBps,
		FixedAmountCents: req.FixedAmountCents,
		Currency:         req.Currency,
		ValidFrom:        req.ValidFrom,
	}, coachID)
	if err != nil {
		return h.handleError(c, err)
	}

	validTo := ""
	if agreement.ValidTo != nil {
		validTo = *agreement.ValidTo
	}

	return appresponse.Success(c, dto.CommissionAgreementResponse{
		ID:               agreement.ID,
		RelationshipID:   agreement.RelationshipID,
		Version:          agreement.Version,
		RateBps:          agreement.RateBps,
		FixedAmountCents: agreement.FixedAmountCents,
		EligibleBaseRule: agreement.EligibleBaseRule,
		Rounding:         agreement.Rounding,
		Currency:         agreement.Currency,
		ValidFrom:        agreement.ValidFrom,
		ValidTo:          validTo,
		Status:           agreement.Status,
		AcceptedBy:       agreement.AcceptedBy,
		AcceptedAt:       agreement.AcceptedAt,
		CreatedAt:        agreement.CreatedAt,
	})
}

// GetMyAlly handles GET /ally/me (ally user scope).
func (h *AllyHandler) GetMyAlly(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	allies, err := h.allyService.ListByAllyUser(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.AllySummaryResponse, len(allies))
	for i, a := range allies {
		responses[i] = dto.AllySummaryResponse{
			RelationshipID: a.RelationshipID,
			CoachID:        a.CoachID,
			AllyID:         a.AllyID,
			LegalName:      a.LegalName,
			CommercialName: a.CommercialName,
			Category:       a.Category,
			Status:         a.Status,
		}
	}

	return appresponse.Success(c, dto.ListResponse[dto.AllySummaryResponse]{
		Data:  responses,
		Total: len(responses),
		Page:  1,
		Limit: len(responses),
	})
}

// ListFinancialAudit handles GET /admin/financial-audit.
func (h *AllyHandler) ListFinancialAudit(c *fiber.Ctx) error {
	events, err := h.auditRepo.ListRecent(c.Context(), 100)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.FinancialAuditEventResponse, len(events))
	for i, e := range events {
		responses[i] = dto.FinancialAuditEventResponse{
			ID:        e.ID,
			Entity:    e.Entity,
			EntityID:  e.EntityID,
			Action:    e.Action,
			ActorID:   e.ActorID,
			ActorType: e.ActorType,
			Payload:   e.Payload,
			CreatedAt: e.CreatedAt,
		}
	}

	return appresponse.Success(c, dto.ListResponse[dto.FinancialAuditEventResponse]{
		Data:  responses,
		Total: len(responses),
		Page:  1,
		Limit: len(responses),
	})
}

// handleError maps application errors to appropriate HTTP responses.
func (h *AllyHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}
