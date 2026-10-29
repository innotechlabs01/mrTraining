// Package ally_purchase orchestrates the automatic purchase of an ally product
// by an athlete, creating the operation, operation item, and commission entry
// without manual intervention.
package ally_purchase

import (
	"context"
	"fmt"
	"time"

	"go.uber.org/zap"

	invitedomain "github.com/innotechlabs01/mr-training-api/internal/domain/invite"
	allycatalogdomain "github.com/innotechlabs01/mr-training-api/internal/domain/ally_catalog"
	allydomain "github.com/innotechlabs01/mr-training-api/internal/domain/ally"
	allyopsdomain "github.com/innotechlabs01/mr-training-api/internal/domain/ally_operations"
	commissionentrydomain "github.com/innotechlabs01/mr-training-api/internal/domain/commission_entry"
	runningapp "github.com/innotechlabs01/mr-training-api/internal/application/running"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// Service orchestrates ally product purchases.
type Service struct {
	inviteRepo          invitedomain.Repository
	catalogRepo         allycatalogdomain.Repository
	allyRepo            allydomain.Repository
	opsRepo             allyopsdomain.Repository
	commissionEntryRepo commissionentrydomain.Repository
	log                 *zap.Logger
}

// NewService creates a new ally_purchase service.
func NewService(
	inviteRepo invitedomain.Repository,
	catalogRepo allycatalogdomain.Repository,
	allyRepo allydomain.Repository,
	opsRepo allyopsdomain.Repository,
	commissionEntryRepo commissionentrydomain.Repository,
	log *zap.Logger,
) *Service {
	return &Service{
		inviteRepo:          inviteRepo,
		catalogRepo:         catalogRepo,
		allyRepo:            allyRepo,
		opsRepo:             opsRepo,
		commissionEntryRepo: commissionEntryRepo,
		log:                 log,
	}
}

// CreateAllyPurchaseInput is the payload for purchasing an ally product.
type CreateAllyPurchaseInput struct {
	ProductID  string
	Quantity   int
	AthleteID  string
}

// CreateAllyPurchaseOutput is the result of a purchase.
type CreateAllyPurchaseOutput struct {
	OperationID       string
	OperationKind     string
	RelationshipID    string
	AllyID            string
	CommissionEntryID string
	CommissionCents   int64
	TotalCents        int64
	Currency          string
}

// CreateAllyPurchase processes an athlete's purchase of an ally product.
// It validates the coach-ally relationship, the active commission agreement,
// creates the operation and its item, and accrues the commission automatically.
func (s *Service) CreateAllyPurchase(ctx context.Context, in CreateAllyPurchaseInput) (*CreateAllyPurchaseOutput, error) {
	if in.ProductID == "" {
		return nil, errors.BadRequest("product ID is required")
	}
	if in.Quantity < 1 {
		return nil, errors.BadRequest("quantity must be at least 1")
	}
	if in.AthleteID == "" {
		return nil, errors.BadRequest("athlete ID is required")
	}

	// 1. Resolve the coach linked to this athlete
	coachID, err := s.inviteRepo.GetCoachIDByAthleteID(ctx, in.AthleteID)
	if err != nil {
		return nil, fmt.Errorf("resolve coach for athlete: %w", err)
	}

	// 2. Get the ally product (by ID, regardless of ally ownership)
	product, err := s.catalogRepo.GetProductByID(ctx, in.ProductID)
	if err != nil {
		return nil, fmt.Errorf("get product: %w", err)
	}
	if !product.Active {
		return nil, errors.BadRequest("product is not active")
	}
	if product.Stock < in.Quantity {
		return nil, errors.BadRequest("insufficient stock")
	}

	// 3. Find the active coach-ally relationship
	relationshipID, err := s.allyRepo.FindActiveRelationship(ctx, coachID, product.AllyID)
	if err != nil {
		return nil, fmt.Errorf("no active coach-ally relationship: %w", err)
	}

	// 4. Get the active commission agreement
	agreementID, rateBps, fixedAmountCents, agreementVersion, err := s.commissionEntryRepo.GetActiveAgreement(ctx, relationshipID)
	if err != nil {
		return nil, fmt.Errorf("no active commission agreement: %w", err)
	}

	// 5. Calculate commission
	baseCents := int64(product.PriceCents) * int64(in.Quantity)
	commissionPart := roundHalfUp(baseCents, rateBps)
	amountCents := commissionPart + fixedAmountCents

	// 6. Create the operation (kind=order)
	op, err := s.opsRepo.CreateOperation(ctx, allyopsdomain.CreateOperationInput{
		Kind:          "order",
		RelationshipID: relationshipID,
		AllyID:        product.AllyID,
		AthleteID:     in.AthleteID,
	}, coachID)
	if err != nil {
		return nil, fmt.Errorf("create operation: %w", err)
	}

	// 7. Create the operation item
	_, err = s.opsRepo.CreateOperationItem(ctx, allyopsdomain.CreateOperationItemInput{
		OperationID:    op.ID,
		OfferKind:      "product",
		OfferID:        product.ID,
		Name:           product.Name,
		UnitPriceCents: int64(product.PriceCents),
		Quantity:       in.Quantity,
	})
	if err != nil {
		return nil, fmt.Errorf("create operation item: %w", err)
	}

	// 8. Create the commission entry directly (auto-accrued)
	now := time.Now().Format("2006-01-02 15:04:05")
	commission, err := s.commissionEntryRepo.CreateCommissionEntryDirect(ctx, commissionentrydomain.CreateCommissionEntryInput{
		OperationID:        op.ID,
		RelationshipID:     relationshipID,
		CoachID:            coachID,
		AgreementID:        agreementID,
		AgreementVersion:   agreementVersion,
		BaseCents:          baseCents,
		RateBps:            rateBps,
		FixedAmountCents:   fixedAmountCents,
		AmountCents:        amountCents,
		Currency:           product.Currency,
		ComputedAt:         now,
	}, in.AthleteID)
	if err != nil {
		return nil, fmt.Errorf("create commission entry: %w", err)
	}

	// 9. Publish SSE event for the coach
	runningapp.DefaultHub.Publish(runningapp.Event{
		WorkoutID: coachID,
		Type:      "earnings.new_commission",
		Payload: map[string]interface{}{
			"coach_id":            coachID,
			"ally_id":             product.AllyID,
			"athlete_id":          in.AthleteID,
			"operation_id":        op.ID,
			"commission_entry_id": commission.ID,
			"amount_cents":        amountCents,
			"currency":            product.Currency,
			"created_at":          now,
		},
	})

	s.log.Info("ally purchase completed",
		zap.String("coach_id", coachID),
		zap.String("athlete_id", in.AthleteID),
		zap.String("ally_id", product.AllyID),
		zap.String("product_id", product.ID),
		zap.Int64("commission_cents", amountCents),
	)

	return &CreateAllyPurchaseOutput{
		OperationID:       op.ID,
		OperationKind:     op.Kind,
		RelationshipID:    relationshipID,
		AllyID:            product.AllyID,
		CommissionEntryID: commission.ID,
		CommissionCents:   amountCents,
		TotalCents:        baseCents,
		Currency:          product.Currency,
	}, nil
}

// roundHalfUp computes round(base * rateBps / 10000) with half-up rounding.
func roundHalfUp(baseCents int64, rateBps int64) int64 {
	if rateBps == 0 {
		return 0
	}
	// base * rate / 10000 with half-up rounding
	return (baseCents*rateBps + 5000) / 10000
}
