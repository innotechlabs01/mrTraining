package paymentledger

import (
	"context"
	"fmt"
	"time"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/payment_ledger"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

type Service struct {
	repo domain.Repository
}

func NewService(repo domain.Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) SetExecutor(exec database.Executor) *Service {
	if r, ok := s.repo.(interface {
		WithExecutor(database.Executor) domain.Repository
	}); ok {
		return &Service{repo: r.WithExecutor(exec)}
	}
	return s
}

func validStatus(status string) bool {
	switch status {
	case domain.StatusPending, domain.StatusApproved, domain.StatusHeld,
		domain.StatusPayable, domain.StatusSettled, domain.StatusReversed:
		return true
	}
	return false
}

func (s *Service) CreateCommissionTerm(ctx context.Context, coachID string, rateBps, fixedFeeCents, processingBps int64, currency, validFrom string) (*domain.CommissionTerm, error) {
	if rateBps < 0 || fixedFeeCents < 0 || processingBps < 0 {
		return nil, errors.BadRequest("commission rates and fees must be non-negative")
	}
	term := &domain.CommissionTerm{
		CoachID:       coachID,
		RateBps:       rateBps,
		FixedFeeCents: fixedFeeCents,
		ProcessingBps: processingBps,
		Currency:      currency,
		Status:        "active",
		ValidFrom:     validFrom,
	}
	return s.repo.CreateTerm(ctx, term)
}

func (s *Service) GetActiveTerm(ctx context.Context, coachID, at string) (*domain.CommissionTerm, error) {
	return s.repo.GetActiveTerm(ctx, coachID, at)
}

func (s *Service) RecordPayment(ctx context.Context, in domain.CreateLedgerEntryInput, actorID string) (*domain.LedgerEntry, error) {
	if in.WompiTransactionID == "" {
		return nil, errors.BadRequest("wompi transaction id is required")
	}
	if in.CoachID == "" {
		return nil, errors.BadRequest("coach id is required")
	}
	if in.AthleteID == "" {
		return nil, errors.BadRequest("athlete id is required")
	}
	if in.GrossAmountCents < 0 {
		return nil, errors.BadRequest("gross amount must be non-negative")
	}
	if in.Currency == "" {
		in.Currency = "COP"
	}
	if in.SourceType == "" {
		in.SourceType = domain.SourceTypeMembership
	}
	if in.SourceType != domain.SourceTypeMembership && in.SourceType != domain.SourceTypeStoreOrder {
		return nil, errors.BadRequest("invalid source type")
	}
	if in.Status == "" {
		in.Status = domain.StatusPending
	}
	if !validStatus(in.Status) {
		return nil, errors.BadRequest("invalid ledger status")
	}
	if in.PeriodStart == "" || in.PeriodEnd == "" {
		return nil, errors.BadRequest("payment period is required")
	}

	// idempotency: return existing entry if wompi transaction already recorded
	if existing, err := s.repo.GetEntryByWompiID(ctx, in.WompiTransactionID); err == nil && existing != nil {
		return existing, nil
	}

	// resolve commission term (optional)
	var term *domain.CommissionTerm
	if in.CommissionTermID != "" {
		// caller supplied a specific term; still attempt active lookup
	}
	at := in.PeriodStart
	if t, err := s.repo.GetActiveTerm(ctx, in.CoachID, at); err == nil {
		term = t
	} else if in.CoachID != "" {
		// fall back to global
		if t2, err2 := s.repo.GetActiveTerm(ctx, "", at); err2 == nil {
			term = t2
		}
	}
	if term != nil && in.CommissionTermID == "" {
		in.CommissionTermID = term.ID
	}

	processingFee := in.ProcessingFeeCents
	if processingFee == 0 && in.ProcessingFeeCents == 0 && term != nil {
		processingFee = roundHalfUp(in.GrossAmountCents, term.ProcessingBps)
	}
	platformCommission := in.PlatformCommissionCents
	if platformCommission == 0 && in.PlatformCommissionCents == 0 && term != nil {
		platformCommission = roundHalfUp(in.GrossAmountCents, term.RateBps) + term.FixedFeeCents
	}
	if processingFee < 0 || platformCommission < 0 {
		return nil, errors.BadRequest("fees and commission must be non-negative")
	}
	if processingFee+platformCommission > in.GrossAmountCents {
		// allow but no negative net; still compute (adjustments may compensate)
	}
	coachNet := in.GrossAmountCents - processingFee - platformCommission
	if coachNet < 0 {
		coachNet = 0
	}

	paymentPeriod := in.PaymentPeriod
	if paymentPeriod == "" {
		if len(in.PeriodStart) >= 7 {
			paymentPeriod = in.PeriodStart[:7]
		} else {
			paymentPeriod = in.PeriodStart
		}
	}

	termVersion := 0
	if term != nil {
		termVersion = term.Version
	}
	if in.CommissionTermID != "" && term != nil {
		termVersion = term.Version
	}

	entry := &domain.LedgerEntry{
		WompiTransactionID:      in.WompiTransactionID,
		SourceType:              in.SourceType,
		MembershipPaymentID:     in.MembershipPaymentID,
		OrderID:                 in.OrderID,
		SubscriptionID:          in.SubscriptionID,
		AthleteID:               in.AthleteID,
		CoachID:                 in.CoachID,
		GrossAmountCents:        in.GrossAmountCents,
		ProcessingFeeCents:      processingFee,
		PlatformCommissionCents: platformCommission,
		CoachNetPayableCents:    coachNet,
		AdjustmentsCents:        0,
		Currency:                in.Currency,
		PeriodStart:             in.PeriodStart,
		PeriodEnd:               in.PeriodEnd,
		PaymentPeriod:           paymentPeriod,
		Status:                  in.Status,
		CommissionTermID:        in.CommissionTermID,
		CommissionTermVersion:   termVersion,
		IdempotencyKey:          in.IdempotencyKey,
	}

	created, err := s.repo.CreateEntry(ctx, entry)
	if err != nil {
		if err == domain.ErrDuplicate {
			if existing, gerr := s.repo.GetEntryByWompiID(ctx, in.WompiTransactionID); gerr == nil {
				return existing, nil
			}
		}
		return nil, err
	}
	// Mark approved/payable accounting does not disburse funds.
	_ = actorID
	_ = fmt.Sprintf
	return created, nil
}

func (s *Service) GetEntry(ctx context.Context, id, coachID string) (*domain.LedgerEntry, error) {
	if id == "" || coachID == "" {
		return nil, errors.BadRequest("entry id and coach id are required")
	}
	return s.repo.GetEntry(ctx, id, coachID)
}

func (s *Service) ListEntriesByCoach(ctx context.Context, coachID string) ([]*domain.LedgerEntry, error) {
	if coachID == "" {
		return nil, errors.BadRequest("coach id is required")
	}
	return s.repo.ListEntriesByCoach(ctx, coachID)
}

func (s *Service) UpdateStatus(ctx context.Context, id, coachID, status string) error {
	if id == "" || coachID == "" {
		return errors.BadRequest("entry id and coach id are required")
	}
	if !validStatus(status) {
		return errors.BadRequest("invalid ledger status")
	}
	// No payout simulation: settled cannot be reached here except via ConfirmSettlement.
	if status == domain.StatusSettled {
		return errors.BadRequest("settled requires third-party confirmation")
	}
	return s.repo.UpdateEntryStatus(ctx, id, coachID, status)
}

func (s *Service) RecordAdjustment(ctx context.Context, in domain.AdjustmentInput) (*domain.FinancialAdjustment, error) {
	if in.EntryID == "" {
		return nil, errors.BadRequest("entry id is required")
	}
	if in.Kind != domain.AdjustmentRefund && in.Kind != domain.AdjustmentChargeback && in.Kind != domain.AdjustmentCorrection {
		return nil, errors.BadRequest("invalid adjustment kind")
	}
	if in.Reason == "" {
		return nil, errors.BadRequest("reason is required")
	}
	if in.CreatedBy == "" {
		return nil, errors.BadRequest("created_by is required")
	}
	entry, err := s.repo.GetEntry(ctx, in.EntryID, "")
	if err != nil {
		return nil, err
	}
	adj := &domain.FinancialAdjustment{
		EntryID:           in.EntryID,
		Kind:              in.Kind,
		AmountCents:       in.AmountCents,
		Reason:            in.Reason,
		CreatedBy:         in.CreatedBy,
		ExternalReference: in.ExternalReference,
	}
	created, err := s.repo.RecordAdjustment(ctx, adj)
	if err != nil {
		return nil, err
	}
	entry.AdjustmentsCents += in.AmountCents
	if in.AmountCents < 0 && (in.Kind == domain.AdjustmentRefund || in.Kind == domain.AdjustmentChargeback) {
		entry.Status = domain.StatusReversed
	}
	if err := s.repo.UpdateEntryAmounts(ctx, entry); err != nil {
		return created, err
	}
	return created, nil
}

func (s *Service) MarkSettled(ctx context.Context, id, coachID, settlementReference string) error {
	if id == "" || coachID == "" {
		return errors.BadRequest("entry id and coach id are required")
	}
	if settlementReference == "" {
		return errors.BadRequest("third-party settlement confirmation is required")
	}
	entry, err := s.repo.GetEntry(ctx, id, coachID)
	if err != nil {
		return err
	}
	if entry.Status == domain.StatusReversed {
		return errors.BadRequest("reversed entries cannot be settled")
	}
	settledAt := time.Now().UTC().Format(time.RFC3339)
	if err := s.repo.SettleEntry(ctx, id, coachID, settlementReference, settledAt); err != nil {
		return err
	}
	return nil
}

func (s *Service) ListAdjustments(ctx context.Context, entryID string) ([]*domain.FinancialAdjustment, error) {
	if entryID == "" {
		return nil, errors.BadRequest("entry id is required")
	}
	return s.repo.ListAdjustments(ctx, entryID)
}

func roundHalfUp(base int64, rateBps int64) int64 {
	if rateBps == 0 {
		return 0
	}
	return (base*rateBps + 5000) / 10000
}
