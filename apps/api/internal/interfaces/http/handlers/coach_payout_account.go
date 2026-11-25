package handlers

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// CoachPayoutAccount represents a coach's bank / digital wallet payout details.
type CoachPayoutAccount struct {
	CoachID           string `json:"coach_id"`
	BankName          string `json:"bank_name"`
	AccountType       string `json:"account_type"`
	AccountNumber     string `json:"account_number"`
	AccountHolderName string `json:"account_holder_name"`
	DocumentType      string `json:"document_type"`
	DocumentNumber    string `json:"document_number"`
	CreatedAt         string `json:"created_at"`
	UpdatedAt         string `json:"updated_at"`
}

// UpsertCoachPayoutAccountRequest is the JSON payload for PUT /api/v1/coach/payout-account.
type UpsertCoachPayoutAccountRequest struct {
	BankName          string `json:"bank_name"`
	AccountType       string `json:"account_type"`
	AccountNumber     string `json:"account_number"`
	AccountHolderName string `json:"account_holder_name"`
	DocumentType      string `json:"document_type"`
	DocumentNumber    string `json:"document_number"`
}

var validPayoutAccountTypes = map[string]bool{
	"savings":   true,
	"checking":  true,
	"nequi":     true,
	"daviplata": true,
}

// CoachPayoutAccountStore defines persistence operations for coach payout accounts.
type CoachPayoutAccountStore interface {
	GetByCoachID(ctx context.Context, coachID string) (*CoachPayoutAccount, error)
	Upsert(ctx context.Context, acc *CoachPayoutAccount) (*CoachPayoutAccount, error)
}

type sqlCoachPayoutAccountStore struct {
	db *sql.DB
}

func (s *sqlCoachPayoutAccountStore) GetByCoachID(ctx context.Context, coachID string) (*CoachPayoutAccount, error) {
	if s.db == nil {
		return nil, errors.New("database not configured")
	}
	var acc CoachPayoutAccount
	var createdAt, updatedAt time.Time
	err := s.db.QueryRowContext(ctx, `
		SELECT coach_id, bank_name, account_type, account_number, account_holder_name,
		       document_type, document_number, created_at, updated_at
		FROM coach_payout_accounts
		WHERE coach_id = $1
	`, coachID).Scan(
		&acc.CoachID,
		&acc.BankName,
		&acc.AccountType,
		&acc.AccountNumber,
		&acc.AccountHolderName,
		&acc.DocumentType,
		&acc.DocumentNumber,
		&createdAt,
		&updatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	acc.CreatedAt = createdAt.UTC().Format(time.RFC3339)
	acc.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
	return &acc, nil
}

func (s *sqlCoachPayoutAccountStore) Upsert(ctx context.Context, acc *CoachPayoutAccount) (*CoachPayoutAccount, error) {
	if s.db == nil {
		return nil, errors.New("database not configured")
	}
	var saved CoachPayoutAccount
	var createdAt, updatedAt time.Time
	err := s.db.QueryRowContext(ctx, `
		INSERT INTO coach_payout_accounts (
			coach_id, bank_name, account_type, account_number,
			account_holder_name, document_type, document_number,
			created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
		ON CONFLICT (coach_id) DO UPDATE SET
			bank_name           = EXCLUDED.bank_name,
			account_type        = EXCLUDED.account_type,
			account_number      = EXCLUDED.account_number,
			account_holder_name = EXCLUDED.account_holder_name,
			document_type       = EXCLUDED.document_type,
			document_number     = EXCLUDED.document_number,
			updated_at          = NOW()
		RETURNING coach_id, bank_name, account_type, account_number,
		          account_holder_name, document_type, document_number,
		          created_at, updated_at
	`,
		acc.CoachID,
		acc.BankName,
		acc.AccountType,
		acc.AccountNumber,
		acc.AccountHolderName,
		acc.DocumentType,
		acc.DocumentNumber,
	).Scan(
		&saved.CoachID,
		&saved.BankName,
		&saved.AccountType,
		&saved.AccountNumber,
		&saved.AccountHolderName,
		&saved.DocumentType,
		&saved.DocumentNumber,
		&createdAt,
		&updatedAt,
	)
	if err != nil {
		return nil, err
	}
	saved.CreatedAt = createdAt.UTC().Format(time.RFC3339)
	saved.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
	return &saved, nil
}

// CoachPayoutAccountHandler handles GET/PUT /api/v1/coach/payout-account.
type CoachPayoutAccountHandler struct {
	store CoachPayoutAccountStore
}

// NewCoachPayoutAccountHandler creates a handler backed by PostgreSQL.
func NewCoachPayoutAccountHandler(db *sql.DB) *CoachPayoutAccountHandler {
	return &CoachPayoutAccountHandler{
		store: &sqlCoachPayoutAccountStore{db: db},
	}
}

// NewCoachPayoutAccountHandlerWithStore creates a handler with a custom store (for testing).
func NewCoachPayoutAccountHandlerWithStore(store CoachPayoutAccountStore) *CoachPayoutAccountHandler {
	return &CoachPayoutAccountHandler{store: store}
}

func resolveCoachIDForPayout(c *fiber.Ctx) string {
	if id := middleware.GetCoachID(c); id != "" {
		return id
	}
	return middleware.GetUserID(c)
}

// GetPayoutAccount handles GET /api/v1/coach/payout-account.
// Returns the coach's saved payout account, or null if none is configured yet.
func (h *CoachPayoutAccountHandler) GetPayoutAccount(c *fiber.Ctx) error {
	coachID := resolveCoachIDForPayout(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	acc, err := h.store.GetByCoachID(c.Context(), coachID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to load payout account")
	}
	return appresponse.Success(c, acc)
}

// UpsertPayoutAccount handles PUT /api/v1/coach/payout-account.
func (h *CoachPayoutAccountHandler) UpsertPayoutAccount(c *fiber.Ctx) error {
	coachID := resolveCoachIDForPayout(c)
	if coachID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	var req UpsertCoachPayoutAccountRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	req.BankName = strings.TrimSpace(req.BankName)
	req.AccountType = strings.ToLower(strings.TrimSpace(req.AccountType))
	req.AccountNumber = strings.TrimSpace(req.AccountNumber)
	req.AccountHolderName = strings.TrimSpace(req.AccountHolderName)
	req.DocumentType = strings.ToUpper(strings.TrimSpace(req.DocumentType))
	req.DocumentNumber = strings.TrimSpace(req.DocumentNumber)

	if req.BankName == "" {
		return appresponse.Error(c, fiber.StatusUnprocessableEntity, "bank_name is required")
	}
	if !validPayoutAccountTypes[req.AccountType] {
		return appresponse.Error(c, fiber.StatusUnprocessableEntity, "account_type must be one of: savings, checking, nequi, daviplata")
	}
	if req.AccountNumber == "" {
		return appresponse.Error(c, fiber.StatusUnprocessableEntity, "account_number is required")
	}
	if req.AccountHolderName == "" {
		return appresponse.Error(c, fiber.StatusUnprocessableEntity, "account_holder_name is required")
	}
	if req.DocumentNumber == "" {
		return appresponse.Error(c, fiber.StatusUnprocessableEntity, "document_number is required")
	}
	if req.DocumentType == "" {
		req.DocumentType = "CC"
	}

	saved, err := h.store.Upsert(c.Context(), &CoachPayoutAccount{
		CoachID:           coachID,
		BankName:          req.BankName,
		AccountType:       req.AccountType,
		AccountNumber:     req.AccountNumber,
		AccountHolderName: req.AccountHolderName,
		DocumentType:      req.DocumentType,
		DocumentNumber:    req.DocumentNumber,
	})
	if err != nil {
		return appresponse.Error(c, fiber.StatusInternalServerError, "failed to save payout account")
	}
	return appresponse.Success(c, saved)
}
