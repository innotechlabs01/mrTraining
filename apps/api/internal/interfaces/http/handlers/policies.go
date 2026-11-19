package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"

	commissionapp "github.com/innotechlabs01/mr-training-api/internal/application/commission"
	commissionentryapp "github.com/innotechlabs01/mr-training-api/internal/application/commission_entry"
	commissionentrydomain "github.com/innotechlabs01/mr-training-api/internal/domain/commission_entry"
	commissiondomain "github.com/innotechlabs01/mr-training-api/internal/domain/commission"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// CommissionPolicyHandler handles commission policy configuration and listing.
// Endpoints: POST /api/v1/policies/commission, GET /api/v1/commissions.
type CommissionPolicyHandler struct {
	commissionSvc   *commissionapp.Service
	commissionEntry *commissionentryapp.Service
}

// NewCommissionPolicyHandler creates a new policy handler.
func NewCommissionPolicyHandler(
	commissionSvc *commissionapp.Service,
	commissionEntry *commissionentryapp.Service,
) *CommissionPolicyHandler {
	return &CommissionPolicyHandler{
		commissionSvc:   commissionSvc,
		commissionEntry: commissionEntry,
	}
}

// ConfigureCommission configures a commission policy for the authenticated coach.
// POST /api/v1/policies/commission
func (h *CommissionPolicyHandler) ConfigureCommission(c *fiber.Ctx) error {
	coachID := middleware.GetCoachID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.ConfigureCommissionRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if req.RelationshipID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "relationship_id is required")
	}
	if req.RateBps < 0 || req.RateBps > 100000 {
		return appresponse.Error(c, fiber.StatusBadRequest, "rate_bps must be between 0 and 100000")
	}
	if req.FixedAmountCents < 0 {
		return appresponse.Error(c, fiber.StatusBadRequest, "fixed_amount_cents must be non-negative")
	}
	if req.Currency == "" {
		req.Currency = "COP"
	}
	if req.ValidFrom == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "valid_from is required")
	}

	agreement, err := h.commissionSvc.CreateAgreementVersion(c.Context(), commissiondomain.CreateAgreementInput{
		RelationshipID:   req.RelationshipID,
		CoachID:          coachID,
		RateBps:          req.RateBps,
		FixedAmountCents: req.FixedAmountCents,
		Currency:         req.Currency,
		ValidFrom:        req.ValidFrom,
	}, coachID)
	if err != nil {
		return h.handlePolicyError(c, err)
	}

	return appresponse.Success(c, dto.CommissionPolicyResponse{
		ID:               agreement.ID,
		RelationshipID:   agreement.RelationshipID,
		Version:          agreement.Version,
		RateBps:          agreement.RateBps,
		FixedAmountCents: agreement.FixedAmountCents,
		Currency:         agreement.Currency,
		ValidFrom:        agreement.ValidFrom,
		ValidTo:          ptrOrEmpty(agreement.ValidTo),
		Status:           agreement.Status,
		CreatedAt:        agreement.CreatedAt,
	})
}

// ListCommissions lists commission entries for the authenticated coach.
// RLS at the database layer complements the coach_id filter here.
// GET /api/v1/commissions
func (h *CommissionPolicyHandler) ListCommissions(c *fiber.Ctx) error {
	coachID := middleware.GetCoachID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	page := 1
	limit := 20
	if p := c.Query("page"); p != "" {
		if n, err := strconv.Atoi(p); err == nil && n > 0 {
			page = n
		}
	}
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 100 {
			limit = n
		}
	}

	entries, err := h.commissionEntry.ListCommissionEntriesByCoach(c.Context(), coachID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to list commissions")
	}

	// Paginate in memory (dataset is coach-scoped and small).
	start := (page - 1) * limit
	var pageEntries []*commissionentrydomain.CommissionEntry
	if start >= len(entries) {
		pageEntries = entries[:0]
	} else {
		end := start + limit
		if end > len(entries) {
			end = len(entries)
		}
		pageEntries = entries[start:end]
	}

	responses := make([]dto.CommissionEntryResponse, len(pageEntries))
	for i, e := range pageEntries {
		responses[i] = dto.CommissionEntryResponse{
			ID:                e.ID,
			OperationID:       e.OperationID,
			RelationshipID:    e.RelationshipID,
			CoachID:           e.CoachID,
			AgreementID:       e.AgreementID,
			AgreementVersion:  e.AgreementVersion,
			BaseCents:         e.BaseCents,
			RateBps:           e.RateBps,
			FixedAmountCents:  e.FixedAmountCents,
			AmountCents:       e.AmountCents,
			Currency:          e.Currency,
			Status:            e.Status,
			ComputedAt:        e.ComputedAt,
			CreatedAt:         e.CreatedAt,
		}
	}

	return appresponse.Success(c, dto.CommissionListResponse{
		Data:  responses,
		Total: len(responses),
		Page:  page,
		Limit: limit,
	})
}

func (h *CommissionPolicyHandler) handlePolicyError(c *fiber.Ctx, err error) error {
	switch err {
	case commissiondomain.ErrNotFound:
		return appresponse.Error(c, fiber.StatusNotFound, "relationship not found or not owned by this coach")
	case commissiondomain.ErrOverlap:
		return appresponse.Error(c, fiber.StatusConflict, "commission interval overlaps an existing agreement")
	default:
		return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
	}
}

func ptrOrEmpty(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
