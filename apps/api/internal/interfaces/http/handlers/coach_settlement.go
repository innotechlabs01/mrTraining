package handlers

import (
	"github.com/gofiber/fiber/v2"

	coachsetapp "github.com/innotechlabs01/mr-training-api/internal/application/coach_settlement"
	domain "github.com/innotechlabs01/mr-training-api/internal/domain/coach_settlement"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// CoachSettlementHandler handles HTTP requests for coach settlements.
type CoachSettlementHandler struct {
	service *coachsetapp.Service
}

// NewCoachSettlementHandler creates a new handler.
func NewCoachSettlementHandler(service *coachsetapp.Service) *CoachSettlementHandler {
	return &CoachSettlementHandler{service: service}
}

// CreateSettlement handles POST /coach/settlements.
func (h *CoachSettlementHandler) CreateSettlement(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.CreateSettlementRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	settlement, err := h.service.CreateSettlement(c.Context(), domain.CreateSettlementInput{
		CoachID:     req.CoachID,
		AllyID:      req.AllyID,
		PeriodStart: req.PeriodStart,
		PeriodEnd:   req.PeriodEnd,
		PeriodKey:   req.PeriodKey,
		Currency:    req.Currency,
	}, coachID)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.CoachSettlementResponse{
		ID:                   settlement.ID,
		CoachID:              settlement.CoachID,
		AllyID:               settlement.AllyID,
		PeriodStart:          settlement.PeriodStart,
		PeriodEnd:            settlement.PeriodEnd,
		PeriodKey:            settlement.PeriodKey,
		Currency:             settlement.Currency,
		Status:               settlement.Status,
		OperationsCount:      settlement.OperationsCount,
		BaseTotalCents:       settlement.BaseTotalCents,
		CommissionGrossCents: settlement.CommissionGrossCents,
		AdjustmentsCents:     settlement.AdjustmentsCents,
		CommissionNetCents:   settlement.CommissionNetCents,
		CalculatedAt:         settlement.CalculatedAt,
		ApprovedAt:           settlement.ApprovedAt,
		ClosedAt:             settlement.ClosedAt,
		CreatedAt:            settlement.CreatedAt,
		UpdatedAt:            settlement.UpdatedAt,
	})
}

// GetSettlement handles GET /coach/settlements/:id.
func (h *CoachSettlementHandler) GetSettlement(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	settlementID := c.Params("id")
	if settlementID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "settlement ID is required")
	}

	settlement, err := h.service.GetSettlement(c.Context(), settlementID, coachID)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.CoachSettlementResponse{
		ID:                   settlement.ID,
		CoachID:              settlement.CoachID,
		AllyID:               settlement.AllyID,
		PeriodStart:          settlement.PeriodStart,
		PeriodEnd:            settlement.PeriodEnd,
		PeriodKey:            settlement.PeriodKey,
		Currency:             settlement.Currency,
		Status:               settlement.Status,
		OperationsCount:      settlement.OperationsCount,
		BaseTotalCents:       settlement.BaseTotalCents,
		CommissionGrossCents: settlement.CommissionGrossCents,
		AdjustmentsCents:     settlement.AdjustmentsCents,
		CommissionNetCents:   settlement.CommissionNetCents,
		CalculatedAt:         settlement.CalculatedAt,
		ApprovedAt:           settlement.ApprovedAt,
		ClosedAt:             settlement.ClosedAt,
		CreatedAt:            settlement.CreatedAt,
		UpdatedAt:            settlement.UpdatedAt,
	})
}

// ListSettlements handles GET /coach/settlements.
func (h *CoachSettlementHandler) ListSettlements(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	settlements, err := h.service.ListSettlementsByCoach(c.Context(), coachID)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.CoachSettlementResponse, len(settlements))
	for i, s := range settlements {
		responses[i] = dto.CoachSettlementResponse{
			ID:                   s.ID,
			CoachID:              s.CoachID,
			AllyID:               s.AllyID,
			PeriodStart:          s.PeriodStart,
			PeriodEnd:            s.PeriodEnd,
			PeriodKey:            s.PeriodKey,
			Currency:             s.Currency,
			Status:               s.Status,
			OperationsCount:      s.OperationsCount,
			BaseTotalCents:       s.BaseTotalCents,
			CommissionGrossCents: s.CommissionGrossCents,
			AdjustmentsCents:     s.AdjustmentsCents,
			CommissionNetCents:   s.CommissionNetCents,
			CalculatedAt:         s.CalculatedAt,
			ApprovedAt:           s.ApprovedAt,
			ClosedAt:             s.ClosedAt,
			CreatedAt:            s.CreatedAt,
			UpdatedAt:            s.UpdatedAt,
		}
	}

	return appresponse.Success(c, dto.ListResponse[dto.CoachSettlementResponse]{
		Data:  responses,
		Total: len(responses),
		Page:  1,
		Limit: len(responses),
	})
}

// UpdateSettlementStatus handles PUT /coach/settlements/:id/status.
func (h *CoachSettlementHandler) UpdateSettlementStatus(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	settlementID := c.Params("id")
	if settlementID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "settlement ID is required")
	}

	var req dto.UpdateSettlementStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	settlement, err := h.service.UpdateSettlementStatus(c.Context(), settlementID, coachID, req.Status, req.Note)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.CoachSettlementResponse{
		ID:                   settlement.ID,
		CoachID:              settlement.CoachID,
		AllyID:               settlement.AllyID,
		PeriodStart:          settlement.PeriodStart,
		PeriodEnd:            settlement.PeriodEnd,
		PeriodKey:            settlement.PeriodKey,
		Currency:             settlement.Currency,
		Status:               settlement.Status,
		OperationsCount:      settlement.OperationsCount,
		BaseTotalCents:       settlement.BaseTotalCents,
		CommissionGrossCents: settlement.CommissionGrossCents,
		AdjustmentsCents:     settlement.AdjustmentsCents,
		CommissionNetCents:   settlement.CommissionNetCents,
		CalculatedAt:         settlement.CalculatedAt,
		ApprovedAt:           settlement.ApprovedAt,
		ClosedAt:             settlement.ClosedAt,
		CreatedAt:            settlement.CreatedAt,
		UpdatedAt:            settlement.UpdatedAt,
	})
}

// VoidSettlement handles POST /coach/settlements/:id/void.
func (h *CoachSettlementHandler) VoidSettlement(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	settlementID := c.Params("id")
	if settlementID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "settlement ID is required")
	}

	var req dto.VoidSettlementRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	settlement, err := h.service.VoidSettlement(c.Context(), settlementID, coachID, req.Reason)
	if err != nil {
		return h.handleError(c, err)
	}

	return appresponse.Success(c, dto.CoachSettlementResponse{
		ID:                   settlement.ID,
		CoachID:              settlement.CoachID,
		AllyID:               settlement.AllyID,
		PeriodStart:          settlement.PeriodStart,
		PeriodEnd:            settlement.PeriodEnd,
		PeriodKey:            settlement.PeriodKey,
		Currency:             settlement.Currency,
		Status:               settlement.Status,
		OperationsCount:      settlement.OperationsCount,
		BaseTotalCents:       settlement.BaseTotalCents,
		CommissionGrossCents: settlement.CommissionGrossCents,
		AdjustmentsCents:     settlement.AdjustmentsCents,
		CommissionNetCents:   settlement.CommissionNetCents,
		CalculatedAt:         settlement.CalculatedAt,
		ApprovedAt:           settlement.ApprovedAt,
		ClosedAt:             settlement.ClosedAt,
		CreatedAt:            settlement.CreatedAt,
		UpdatedAt:            settlement.UpdatedAt,
	})
}

// ListSettlementItems handles GET /coach/settlements/:id/items.
func (h *CoachSettlementHandler) ListSettlementItems(c *fiber.Ctx) error {
	coachID := middleware.GetUserID(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	settlementID := c.Params("id")
	if settlementID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "settlement ID is required")
	}

	items, err := h.service.ListSettlementItems(c.Context(), settlementID)
	if err != nil {
		return h.handleError(c, err)
	}

	responses := make([]dto.SettlementItemResponse, len(items))
	for i, item := range items {
		responses[i] = dto.SettlementItemResponse{
			ID:           item.ID,
			SettlementID: item.SettlementID,
			EntryID:      item.EntryID,
			BaseCents:    item.BaseCents,
			RateBps:      item.RateBps,
			AmountCents:  item.AmountCents,
			ReleasedAt:   item.ReleasedAt,
			CreatedAt:    item.CreatedAt,
		}
	}

	return appresponse.Success(c, dto.ListResponse[dto.SettlementItemResponse]{
		Data:  responses,
		Total: len(responses),
		Page:  1,
		Limit: len(responses),
	})
}

// handleError maps application errors to appropriate HTTP responses.
func (h *CoachSettlementHandler) handleError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}

// CoachSettlementDocumentHandler handles settlement document requests.
type CoachSettlementDocumentHandler struct {
	service *coachsetapp.Service
}

// NewCoachSettlementDocumentHandler creates a new handler.
func NewCoachSettlementDocumentHandler(service *coachsetapp.Service) *CoachSettlementDocumentHandler {
	return &CoachSettlementDocumentHandler{service: service}
}

// CreateDocument handles POST /coach/settlements/:id/documents.
func (h *CoachSettlementDocumentHandler) CreateDocument(c *fiber.Ctx) error {
	actorID := middleware.GetUserID(c)
	if actorID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	settlementID := c.Params("id")
	if settlementID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "settlement ID is required")
	}

	var req dto.CreateSettlementDocumentRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	doc, err := h.service.CreateSettlementDocument(c.Context(), domain.CreateSettlementDocumentInput{
		SettlementID: settlementID,
		Kind:         req.Kind,
		ContentRef:   req.ContentRef,
	}, actorID)
	if err != nil {
		return h.handleErrorDoc(c, err)
	}

	return appresponse.Success(c, dto.SettlementDocumentResponse{
		ID:           doc.ID,
		SettlementID: doc.SettlementID,
		Kind:         doc.Kind,
		ContentRef:   doc.ContentRef,
		Status:       doc.Status,
		Version:      doc.Version,
		GeneratedAt:  doc.GeneratedAt,
		SentAt:       doc.SentAt,
		CreatedAt:    doc.CreatedAt,
	})
}

// ListDocuments handles GET /coach/settlements/:id/documents.
func (h *CoachSettlementDocumentHandler) ListDocuments(c *fiber.Ctx) error {
	settlementID := c.Params("id")
	if settlementID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "settlement ID is required")
	}

	docs, err := h.service.ListSettlementDocuments(c.Context(), settlementID)
	if err != nil {
		return h.handleErrorDoc(c, err)
	}

	responses := make([]dto.SettlementDocumentResponse, len(docs))
	for i, d := range docs {
		responses[i] = dto.SettlementDocumentResponse{
			ID:           d.ID,
			SettlementID: d.SettlementID,
			Kind:         d.Kind,
			ContentRef:   d.ContentRef,
			Status:       d.Status,
			Version:      d.Version,
			GeneratedAt:  d.GeneratedAt,
			SentAt:       d.SentAt,
			CreatedAt:    d.CreatedAt,
		}
	}

	return appresponse.Success(c, dto.ListResponse[dto.SettlementDocumentResponse]{
		Data:  responses,
		Total: len(responses),
		Page:  1,
		Limit: len(responses),
	})
}

// handleErrorDoc maps application errors to appropriate HTTP responses.
func (h *CoachSettlementDocumentHandler) handleErrorDoc(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}

// CoachPaymentRecordHandler handles coach payment record requests.
type CoachPaymentRecordHandler struct {
	service *coachsetapp.Service
}

// NewCoachPaymentRecordHandler creates a new handler.
func NewCoachPaymentRecordHandler(service *coachsetapp.Service) *CoachPaymentRecordHandler {
	return &CoachPaymentRecordHandler{service: service}
}

// CreateRecord handles POST /coach/payment-records.
func (h *CoachPaymentRecordHandler) CreateRecord(c *fiber.Ctx) error {
	actorID := middleware.GetUserID(c)
	if actorID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req dto.CreateCoachPaymentRecordRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	record, err := h.service.CreateCoachPaymentRecord(c.Context(), domain.CreateCoachPaymentRecordInput{
		SettlementID: req.SettlementID,
		CoachID:      req.CoachID,
		PayerAllyID:  req.PayerAllyID,
		AmountCents:  req.AmountCents,
		Currency:     req.Currency,
		ActorID:      req.ActorID,
		ActorType:    req.ActorType,
		Reference:    req.Reference,
		EvidenceRef:  req.EvidenceRef,
		DeclaredAt:   req.DeclaredAt,
	}, actorID)
	if err != nil {
		return h.handleErrorPay(c, err)
	}

	return appresponse.Success(c, dto.CoachPaymentRecordResponse{
		ID:           record.ID,
		SettlementID: record.SettlementID,
		CoachID:      record.CoachID,
		PayerAllyID:  record.PayerAllyID,
		AmountCents:  record.AmountCents,
		Currency:     record.Currency,
		ActorID:      record.ActorID,
		ActorType:    record.ActorType,
		Reference:    record.Reference,
		EvidenceRef:  record.EvidenceRef,
		DeclaredAt:   record.DeclaredAt,
		Status:       record.Status,
		CreatedAt:    record.CreatedAt,
	})
}

// ConfirmRecord handles POST /coach/payment-records/:id/confirm.
func (h *CoachPaymentRecordHandler) ConfirmRecord(c *fiber.Ctx) error {
	actorID := middleware.GetUserID(c)
	if actorID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	recordID := c.Params("id")
	if recordID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "record ID is required")
	}

	var req dto.ConfirmCoachPaymentRecordRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	record, err := h.service.ConfirmCoachPaymentRecord(c.Context(), recordID, req.ActorID)
	if err != nil {
		return h.handleErrorPay(c, err)
	}

	return appresponse.Success(c, dto.CoachPaymentRecordResponse{
		ID:           record.ID,
		SettlementID: record.SettlementID,
		CoachID:      record.CoachID,
		PayerAllyID:  record.PayerAllyID,
		AmountCents:  record.AmountCents,
		Currency:     record.Currency,
		ActorID:      record.ActorID,
		ActorType:    record.ActorType,
		Reference:    record.Reference,
		EvidenceRef:  record.EvidenceRef,
		DeclaredAt:   record.DeclaredAt,
		Status:       record.Status,
		CreatedAt:    record.CreatedAt,
	})
}

// ListRecords handles GET /coach/payment-records.
func (h *CoachPaymentRecordHandler) ListRecords(c *fiber.Ctx) error {
	coachID := c.Query("coach_id")
	allyID := c.Query("ally_id")

	records, err := h.service.ListCoachPaymentRecords(c.Context(), coachID, allyID)
	if err != nil {
		return h.handleErrorPay(c, err)
	}

	responses := make([]dto.CoachPaymentRecordResponse, len(records))
	for i, r := range records {
		responses[i] = dto.CoachPaymentRecordResponse{
			ID:           r.ID,
			SettlementID: r.SettlementID,
			CoachID:      r.CoachID,
			PayerAllyID:  r.PayerAllyID,
			AmountCents:  r.AmountCents,
			Currency:     r.Currency,
			ActorID:      r.ActorID,
			ActorType:    r.ActorType,
			Reference:    r.Reference,
			EvidenceRef:  r.EvidenceRef,
			DeclaredAt:   r.DeclaredAt,
			Status:       r.Status,
			CreatedAt:    r.CreatedAt,
		}
	}

	return appresponse.Success(c, dto.ListResponse[dto.CoachPaymentRecordResponse]{
		Data:  responses,
		Total: len(responses),
		Page:  1,
		Limit: len(responses),
	})
}

// handleErrorPay maps application errors to appropriate HTTP responses.
func (h *CoachPaymentRecordHandler) handleErrorPay(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}
