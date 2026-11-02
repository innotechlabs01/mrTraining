package ally_operations

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"strings"
	"time"

	apperrors "github.com/innotechlabs01/mr-training-api/internal/errors"

	allyopsdomain "github.com/innotechlabs01/mr-training-api/internal/domain/ally_operations"
)

// Service handles ally operations business logic.
type Service struct {
	repo allyopsdomain.Repository
}

// NewService creates a new ally operations service.
func NewService(repo allyopsdomain.Repository) *Service {
	return &Service{repo: repo}
}

// CreateOperation creates a new operation (order or reservation) for an athlete
// through a specific coach-ally relationship. The relationship_id is validated
// to exist, belong to the coach, and be active (R7).
func (s *Service) CreateOperation(ctx context.Context, in allyopsdomain.CreateOperationInput, coachID string) (*allyopsdomain.AllyOperation, error) {
	if in.Kind == "" {
		return nil, apperrors.BadRequest("kind is required")
	}
	if in.Kind != "order" && in.Kind != "reservation" {
		return nil, apperrors.BadRequest("kind must be 'order' or 'reservation'")
	}
	if in.RelationshipID == "" {
		return nil, apperrors.BadRequest("relationship ID is required")
	}
	if in.AthleteID == "" {
		return nil, apperrors.BadRequest("athlete ID is required")
	}
	if coachID == "" {
		return nil, apperrors.BadRequest("coach ID is required")
	}

	return s.repo.CreateOperation(ctx, in, coachID)
}

// GetOperation returns an operation only when it belongs to the given athlete.
func (s *Service) GetOperation(ctx context.Context, operationID, athleteID string) (*allyopsdomain.AllyOperation, error) {
	if operationID == "" || athleteID == "" {
		return nil, apperrors.BadRequest("operation ID and athlete ID are required")
	}
	return s.repo.GetOperation(ctx, operationID, athleteID)
}

// ListOperationsByAthlete returns all operations for an athlete.
func (s *Service) ListOperationsByAthlete(ctx context.Context, athleteID string) ([]*allyopsdomain.AllyOperation, error) {
	if athleteID == "" {
		return nil, apperrors.BadRequest("athlete ID is required")
	}
	return s.repo.ListOperationsByAthlete(ctx, athleteID)
}

// ListOperationsByCoach returns all operations for a coach's relationships.
func (s *Service) ListOperationsByCoach(ctx context.Context, coachID string) ([]*allyopsdomain.AllyOperation, error) {
	if coachID == "" {
		return nil, apperrors.BadRequest("coach ID is required")
	}
	return s.repo.ListOperationsByCoach(ctx, coachID)
}

// ListOperationsByAlly returns all operations for an ally.
func (s *Service) ListOperationsByAlly(ctx context.Context, allyID string) ([]*allyopsdomain.AllyOperation, error) {
	if allyID == "" {
		return nil, apperrors.BadRequest("ally ID is required")
	}
	return s.repo.ListOperationsByAlly(ctx, allyID)
}

// ListOperationsByUser resolves the ally from the user and returns their operations.
func (s *Service) ListOperationsByUser(ctx context.Context, userID string) ([]*allyopsdomain.AllyOperation, error) {
	if userID == "" {
		return nil, apperrors.BadRequest("user ID is required")
	}
	allyID, err := s.repo.ResolveAllyID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return s.repo.ListOperationsByAlly(ctx, allyID)
}

// CreateOperationItem adds a catalog item to an operation.
func (s *Service) CreateOperationItem(ctx context.Context, in allyopsdomain.CreateOperationItemInput) (*allyopsdomain.AllyOperationItem, error) {
	if in.OperationID == "" {
		return nil, apperrors.BadRequest("operation ID is required")
	}
	if in.OfferKind == "" {
		return nil, apperrors.BadRequest("offer kind is required")
	}
	if in.OfferKind != "product" && in.OfferKind != "service" {
		return nil, apperrors.BadRequest("offer kind must be 'product' or 'service'")
	}
	if in.OfferID == "" {
		return nil, apperrors.BadRequest("offer ID is required")
	}
	if in.Name == "" {
		return nil, apperrors.BadRequest("name is required")
	}
	if in.UnitPriceCents < 0 {
		return nil, apperrors.BadRequest("unit_price_cents must be non-negative")
	}
	if in.Quantity < 1 {
		return nil, apperrors.BadRequest("quantity must be at least 1")
	}

	return s.repo.CreateOperationItem(ctx, in)
}

// ListOperationItems returns all items of an operation.
func (s *Service) ListOperationItems(ctx context.Context, operationID string) ([]*allyopsdomain.AllyOperationItem, error) {
	if operationID == "" {
		return nil, apperrors.BadRequest("operation ID is required")
	}
	return s.repo.ListOperationItems(ctx, operationID)
}

// CreateRedemption creates a redemption (ticket/QR) for an operation.
func (s *Service) CreateRedemption(ctx context.Context, in allyopsdomain.CreateRedemptionInput) (*allyopsdomain.AllyRedemption, error) {
	if in.OperationID == "" {
		return nil, apperrors.BadRequest("operation ID is required")
	}
	if in.ExpiresAt == "" {
		return nil, apperrors.BadRequest("expires_at is required")
	}
	return s.repo.CreateRedemption(ctx, in)
}

// GetRedemption returns a redemption by ID for a given operation.
func (s *Service) GetRedemption(ctx context.Context, redemptionID, operationID string) (*allyopsdomain.AllyRedemption, error) {
	if redemptionID == "" || operationID == "" {
		return nil, apperrors.BadRequest("redemption ID and operation ID are required")
	}
	return s.repo.GetRedemption(ctx, redemptionID, operationID)
}

// RedeemRedemption atomically redeems a ticket/QR token. Returns ErrNotFound
// if the token is invalid, expired, or already redeemed (no information leaked
// about whether the token belongs to another ally).
func (s *Service) RedeemRedemption(ctx context.Context, token string, redeemedBy string) (*allyopsdomain.AllyRedemption, error) {
	if token == "" {
		return nil, apperrors.BadRequest("token is required")
	}
	if redeemedBy == "" {
		return nil, apperrors.BadRequest("redeemed_by is required")
	}

	// Hash the token to look it up (SHA-256, base64url)
	hash := sha256.Sum256([]byte(token))
	tokenHash := base64URLEncode(hash[:])

	// Find the redemption by token_hash
	redemption, err := s.repo.GetRedemptionByTokenHash(ctx, tokenHash)
	if err != nil {
		return nil, apperrors.NotFound("redemption", tokenHash)
	}

	// Verify status is 'issued' (not already redeemed/expired/cancelled)
	if redemption.Status != "issued" {
		return nil, apperrors.NotFound("redemption", tokenHash)
	}

	// Verify not expired (string comparison works for our datetime format)
	now := time.Now().Format("2006-01-02 15:04:05")
	if redemption.ExpiresAt < now {
		return nil, apperrors.NotFound("redemption", tokenHash)
	}

	// Atomic redeem: UPDATE ... WHERE status='issued'
	if err := s.repo.MarkRedeemed(ctx, redemption.ID, redemption.OperationID, redeemedBy); err != nil {
		return nil, err
	}

	// Return the updated redemption
	return s.repo.GetRedemption(ctx, redemption.ID, redemption.OperationID)
}

// base64URLEncode codifica a base64url (sin relleno).
func base64URLEncode(b []byte) string {
	s := base64.URLEncoding.EncodeToString(b)
	s = strings.TrimRight(s, "=")
	return s
}
