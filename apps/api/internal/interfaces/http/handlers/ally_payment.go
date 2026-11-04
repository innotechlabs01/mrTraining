package handlers

import (
	"database/sql"

	"github.com/gofiber/fiber/v2"

	allypaymentdeclarationapp "github.com/innotechlabs01/mr-training-api/internal/application/ally_payment_declaration"
	commissionentryapp "github.com/innotechlabs01/mr-training-api/internal/application/commission_entry"
	allypaymentdeclarationdomain "github.com/innotechlabs01/mr-training-api/internal/domain/ally_payment_declaration"
	commissionentrydomain "github.com/innotechlabs01/mr-training-api/internal/domain/commission_entry"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// AllyPaymentDeclarationHandler handles HTTP requests for payment declarations.
type AllyPaymentDeclarationHandler struct {
	service *allypaymentdeclarationapp.Service
}

// NewAllyPaymentDeclarationHandler creates a new handler.
func NewAllyPaymentDeclarationHandler(service *allypaymentdeclarationapp.Service) *AllyPaymentDeclarationHandler {
	return &AllyPaymentDeclarationHandler{service: service}
}

// CreateDeclaration handles POST /ally/payment-declarations.
func (h *AllyPaymentDeclarationHandler) CreateDeclaration(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.CreateAllyPaymentDeclarationRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	decl, err := h.service.CreatePaymentDeclaration(c.Context(), userID, allypaymentdeclarationdomain.CreatePaymentDeclarationInput{
		OperationID: req.OperationID,
		AmountCents: req.AmountCents,
		Currency:    req.Currency,
		Method:      req.Method,
		DeclaredAt:  req.DeclaredAt,
		Reference:   req.Reference,
		EvidenceRef: req.EvidenceRef,
	})
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.AllyPaymentDeclarationResponse{
		ID:           decl.ID,
		OperationID:  decl.OperationID,
		Version:      decl.Version,
		SupersedesID: decl.SupersedesID,
		AmountCents:  decl.AmountCents,
		Currency:     decl.Currency,
		Method:       decl.Method,
		DeclaredAt:   decl.DeclaredAt,
		Reference:    decl.Reference,
		EvidenceRef:  decl.EvidenceRef,
		Status:       decl.Status,
		CreatedAt:    decl.CreatedAt,
	})
}

// GetDeclaration handles GET /ally/payment-declarations/:id.
func (h *AllyPaymentDeclarationHandler) GetDeclaration(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	declarationID := c.Params("id")
	if declarationID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "declaration ID is required")
	}

	decl, err := h.service.GetPaymentDeclaration(c.Context(), userID, declarationID)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.AllyPaymentDeclarationResponse{
		ID:           decl.ID,
		OperationID:  decl.OperationID,
		Version:      decl.Version,
		SupersedesID: decl.SupersedesID,
		AmountCents:  decl.AmountCents,
		Currency:     decl.Currency,
		Method:       decl.Method,
		DeclaredAt:   decl.DeclaredAt,
		Reference:    decl.Reference,
		EvidenceRef:  decl.EvidenceRef,
		Status:       decl.Status,
		ReviewedBy:   decl.ReviewedBy,
		ReviewedAt:   decl.ReviewedAt,
		ReviewNote:   decl.ReviewNote,
		CreatedAt:    decl.CreatedAt,
	})
}

// ListDeclarations handles GET /ally/payment-declarations.
func (h *AllyPaymentDeclarationHandler) ListDeclarations(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	decls, err := h.service.ListPaymentDeclarationsByAlly(c.Context(), userID)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.AllyPaymentDeclarationResponse, len(decls))
	for i, d := range decls {
		responses[i] = dto.AllyPaymentDeclarationResponse{
			ID:           d.ID,
			OperationID:  d.OperationID,
			Version:      d.Version,
			SupersedesID: d.SupersedesID,
			AmountCents:  d.AmountCents,
			Currency:     d.Currency,
			Method:       d.Method,
			DeclaredAt:   d.DeclaredAt,
			Reference:    d.Reference,
			EvidenceRef:  d.EvidenceRef,
			Status:       d.Status,
			ReviewedBy:   d.ReviewedBy,
			ReviewedAt:   d.ReviewedAt,
			ReviewNote:   d.ReviewNote,
			CreatedAt:    d.CreatedAt,
		}
	}

	return appresponse.Success(c, dto.ListResponse[dto.AllyPaymentDeclarationResponse]{
		Data:  responses,
		Total: len(responses),
		Page:  1,
		Limit: len(responses),
	})
}

// ReviewDeclaration handles PUT /ally/payment-declarations/:id/review.
func (h *AllyPaymentDeclarationHandler) ReviewDeclaration(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	declarationID := c.Params("id")
	if declarationID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "declaration ID is required")
	}

	var req dto.ReviewAllyPaymentDeclarationRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	if req.Status != "confirmed" && req.Status != "rejected" {
		return appresponse.Error(c, fiber.StatusBadRequest, "status must be 'confirmed' or 'rejected'")
	}

	decl, err := h.service.ReviewPaymentDeclaration(c.Context(), userID, declarationID, allypaymentdeclarationdomain.ReviewPaymentDeclarationInput{
		Status:     req.Status,
		ReviewedBy: userID,
		ReviewNote: req.ReviewNote,
	})
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.AllyPaymentDeclarationResponse{
		ID:           decl.ID,
		OperationID:  decl.OperationID,
		Version:      decl.Version,
		SupersedesID: decl.SupersedesID,
		AmountCents:  decl.AmountCents,
		Currency:     decl.Currency,
		Method:       decl.Method,
		DeclaredAt:   decl.DeclaredAt,
		Reference:    decl.Reference,
		EvidenceRef:  decl.EvidenceRef,
		Status:       decl.Status,
		ReviewedBy:   decl.ReviewedBy,
		ReviewedAt:   decl.ReviewedAt,
		ReviewNote:   decl.ReviewNote,
		CreatedAt:    decl.CreatedAt,
	})
}

// ReverseDeclaration handles POST /ally/payment-declarations/:id/reverse.
func (h *AllyPaymentDeclarationHandler) ReverseDeclaration(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	declarationID := c.Params("id")
	if declarationID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "declaration ID is required")
	}

	decl, err := h.service.ReversePaymentDeclaration(c.Context(), userID, declarationID)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.AllyPaymentDeclarationResponse{
		ID:           decl.ID,
		OperationID:  decl.OperationID,
		Version:      decl.Version,
		SupersedesID: decl.SupersedesID,
		AmountCents:  decl.AmountCents,
		Currency:     decl.Currency,
		Method:       decl.Method,
		DeclaredAt:   decl.DeclaredAt,
		Reference:    decl.Reference,
		EvidenceRef:  decl.EvidenceRef,
		Status:       decl.Status,
		CreatedAt:    decl.CreatedAt,
	})
}

// handleError maps application errors to appropriate HTTP responses.
func (h *AllyPaymentDeclarationHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}

// CommissionEntryHandler handles HTTP requests for commission entries.
type CommissionEntryHandler struct {
	service *commissionentryapp.Service
	db      *sql.DB
}

// NewCommissionEntryHandler creates a new handler.
func NewCommissionEntryHandler(service *commissionentryapp.Service, db *sql.DB) *CommissionEntryHandler {
	return &CommissionEntryHandler{service: service, db: db}
}

// withTx injects a UnitOfWork into the service when a coach context is available.
func (h *CommissionEntryHandler) withTx(c *fiber.Ctx, fn func(*commissionentryapp.Service) error) error {
	userID := middleware.GetUserID(c)
	coachID := middleware.GetCoachID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusForbidden, "coach tenant context is required")
	}
	if h.db == nil {
		return fn(h.service)
	}
	uow := database.NewUnitOfWork(h.db)

	if err := uow.Begin(c.Context(), userID, coachID, middleware.GetUserRole(c)); err != nil {
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

// CreateCommissionEntry handles POST /coach/commission-entries.
func (h *CommissionEntryHandler) CreateCommissionEntry(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.CreateCommissionEntryRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	var entry *commissionentrydomain.CommissionEntry
	err := h.withTx(c, func(svc *commissionentryapp.Service) error {
		e, err := svc.CreateCommissionEntry(c.Context(), coachID, req.OperationID)
		if err != nil {
			return err
		}
		entry = e
		return nil
	})
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.CommissionEntryResponse{
		ID:               entry.ID,
		OperationID:      entry.OperationID,
		RelationshipID:   entry.RelationshipID,
		CoachID:          entry.CoachID,
		AgreementID:      entry.AgreementID,
		AgreementVersion: entry.AgreementVersion,
		BaseCents:        entry.BaseCents,
		RateBps:          entry.RateBps,
		FixedAmountCents: entry.FixedAmountCents,
		AmountCents:      entry.AmountCents,
		Currency:         entry.Currency,
		Status:           entry.Status,
		ComputedAt:       entry.ComputedAt,
		CreatedAt:        entry.CreatedAt,
	})
}

// ListCommissionEntries handles GET /coach/commission-entries.
func (h *CommissionEntryHandler) ListCommissionEntries(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var entries []*commissionentrydomain.CommissionEntry
	err := h.withTx(c, func(svc *commissionentryapp.Service) error {
		e, err := svc.ListCommissionEntriesByCoach(c.Context(), coachID)
		if err != nil {
			return err
		}
		entries = e
		return nil
	})
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.CommissionEntryResponse, len(entries))
	for i, e := range entries {
		responses[i] = dto.CommissionEntryResponse{
			ID:               e.ID,
			OperationID:      e.OperationID,
			RelationshipID:   e.RelationshipID,
			CoachID:          e.CoachID,
			AgreementID:      e.AgreementID,
			AgreementVersion: e.AgreementVersion,
			BaseCents:        e.BaseCents,
			RateBps:          e.RateBps,
			FixedAmountCents: e.FixedAmountCents,
			AmountCents:      e.AmountCents,
			Currency:         e.Currency,
			Status:           e.Status,
			ComputedAt:       e.ComputedAt,
			CreatedAt:        e.CreatedAt,
		}
	}

	return appresponse.Success(c, dto.ListResponse[dto.CommissionEntryResponse]{
		Data:  responses,
		Total: len(responses),
		Page:  1,
		Limit: len(responses),
	})
}

// GetCommissionEntry handles GET /coach/commission-entries/:id.
func (h *CommissionEntryHandler) GetCommissionEntry(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	entryID := c.Params("id")
	if entryID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "entry ID is required")
	}

	var entry *commissionentrydomain.CommissionEntry
	err := h.withTx(c, func(svc *commissionentryapp.Service) error {
		e, err := svc.GetCommissionEntry(c.Context(), entryID, coachID)
		if err != nil {
			return err
		}
		entry = e
		return nil
	})
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.CommissionEntryResponse{
		ID:               entry.ID,
		OperationID:      entry.OperationID,
		RelationshipID:   entry.RelationshipID,
		CoachID:          entry.CoachID,
		AgreementID:      entry.AgreementID,
		AgreementVersion: entry.AgreementVersion,
		BaseCents:        entry.BaseCents,
		RateBps:          entry.RateBps,
		FixedAmountCents: entry.FixedAmountCents,
		AmountCents:      entry.AmountCents,
		Currency:         entry.Currency,
		Status:           entry.Status,
		ComputedAt:       entry.ComputedAt,
		CreatedAt:        entry.CreatedAt,
	})
}

// ReverseCommissionEntry handles POST /coach/commission-entries/:id/reverse.
func (h *CommissionEntryHandler) ReverseCommissionEntry(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	entryID := c.Params("id")
	if entryID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "entry ID is required")
	}

	var req dto.ReverseCommissionEntryRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	entry, adjustment, err := h.service.ReverseCommissionEntry(c.Context(), entryID, coachID, req.Reason)
	if err != nil {
		return h.handleError(c, err)
	}

	adjResp := dto.FinancialAdjustmentResponse{
		ID:           adjustment.ID,
		EntryID:      adjustment.EntryID,
		SettlementID: adjustment.SettlementID,
		Kind:         adjustment.Kind,
		AmountCents:  adjustment.AmountCents,
		Reason:       adjustment.Reason,
		CreatedBy:    adjustment.CreatedBy,
		CreatedAt:    adjustment.CreatedAt,
	}

	return appresponse.Success(c, fiber.Map{
		"entry": dto.CommissionEntryResponse{
			ID:               entry.ID,
			OperationID:      entry.OperationID,
			RelationshipID:   entry.RelationshipID,
			CoachID:          entry.CoachID,
			AgreementID:      entry.AgreementID,
			AgreementVersion: entry.AgreementVersion,
			BaseCents:        entry.BaseCents,
			RateBps:          entry.RateBps,
			FixedAmountCents: entry.FixedAmountCents,
			AmountCents:      entry.AmountCents,
			Currency:         entry.Currency,
			Status:           entry.Status,
			ComputedAt:       entry.ComputedAt,
			CreatedAt:        entry.CreatedAt,
		},
		"adjustment": adjResp,
	})
}

// CreateFinancialAdjustment handles POST /coach/commission-entries/:id/adjustments.
func (h *CommissionEntryHandler) CreateFinancialAdjustment(c *fiber.Ctx) error {
	actorID := middleware.GetUserID(c)
	if actorID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	entryID := c.Params("id")
	if entryID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "entry ID is required")
	}

	var req dto.CreateFinancialAdjustmentRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	adj, err := h.service.CreateFinancialAdjustment(c.Context(), commissionentrydomain.CreateFinancialAdjustmentInput{
		EntryID:      entryID,
		SettlementID: req.SettlementID,
		Kind:         req.Kind,
		AmountCents:  req.AmountCents,
		Reason:       req.Reason,
		CreatedBy:    actorID,
	}, actorID)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.FinancialAdjustmentResponse{
		ID:           adj.ID,
		EntryID:      adj.EntryID,
		SettlementID: adj.SettlementID,
		Kind:         adj.Kind,
		AmountCents:  adj.AmountCents,
		Reason:       adj.Reason,
		CreatedBy:    adj.CreatedBy,
		CreatedAt:    adj.CreatedAt,
	})
}

// ListFinancialAdjustments handles GET /coach/commission-entries/:id/adjustments.
func (h *CommissionEntryHandler) ListFinancialAdjustments(c *fiber.Ctx) error {
	entryID := c.Params("id")
	if entryID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "entry ID is required")
	}

	adjustments, err := h.service.ListFinancialAdjustmentsByEntry(c.Context(), entryID)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.FinancialAdjustmentResponse, len(adjustments))
	for i, a := range adjustments {
		responses[i] = dto.FinancialAdjustmentResponse{
			ID:           a.ID,
			EntryID:      a.EntryID,
			SettlementID: a.SettlementID,
			Kind:         a.Kind,
			AmountCents:  a.AmountCents,
			Reason:       a.Reason,
			CreatedBy:    a.CreatedBy,
			CreatedAt:    a.CreatedAt,
		}
	}

	return appresponse.Success(c, dto.ListResponse[dto.FinancialAdjustmentResponse]{
		Data:  responses,
		Total: len(responses),
		Page:  1,
		Limit: len(responses),
	})
}

// handleError maps application errors to appropriate HTTP responses.
func (h *CommissionEntryHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}
