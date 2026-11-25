package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

type memCoachPayoutAccountStore struct {
	accounts map[string]*CoachPayoutAccount
}

func newMemCoachPayoutAccountStore() *memCoachPayoutAccountStore {
	return &memCoachPayoutAccountStore{
		accounts: make(map[string]*CoachPayoutAccount),
	}
}

func (m *memCoachPayoutAccountStore) GetByCoachID(_ context.Context, coachID string) (*CoachPayoutAccount, error) {
	return m.accounts[coachID], nil
}

func (m *memCoachPayoutAccountStore) Upsert(_ context.Context, acc *CoachPayoutAccount) (*CoachPayoutAccount, error) {
	cp := *acc
	cp.CreatedAt = "2026-11-25T00:00:00Z"
	cp.UpdatedAt = "2026-11-25T00:00:00Z"
	m.accounts[acc.CoachID] = &cp
	return &cp, nil
}

func TestCoachPayoutAccountHandler_GetAndUpsert(t *testing.T) {
	store := newMemCoachPayoutAccountStore()
	h := NewCoachPayoutAccountHandlerWithStore(store)

	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals(middleware.UserIDKey, "coach-1")
		c.Locals(middleware.CoachIDKey, "coach-1")
		c.Locals(middleware.UserRoleKey, "coach")
		return c.Next()
	})
	app.Get("/api/v1/coach/payout-account", h.GetPayoutAccount)
	app.Put("/api/v1/coach/payout-account", h.UpsertPayoutAccount)

	// 1. GET before setting returns 200 with null data
	req := httptest.NewRequest(http.MethodGet, "/api/v1/coach/payout-account", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("GET failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	var getEmpty *CoachPayoutAccount
	if err := json.NewDecoder(resp.Body).Decode(&getEmpty); err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	if getEmpty != nil {
		t.Fatalf("expected nil, got %+v", getEmpty)
	}

	// 2. PUT with invalid account_type returns 422
	badBody := []byte(`{"bank_name":"Bancolombia","account_type":"crypto","account_number":"123","account_holder_name":"Coach Uno","document_number":"102030"}`)
	req = httptest.NewRequest(http.MethodPut, "/api/v1/coach/payout-account", bytes.NewReader(badBody))
	req.Header.Set("Content-Type", "application/json")
	resp, err = app.Test(req)
	if err != nil {
		t.Fatalf("PUT bad failed: %v", err)
	}
	if resp.StatusCode != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422 for invalid account_type, got %d", resp.StatusCode)
	}

	// 3. PUT with valid payload succeeds and defaults document_type to CC
	goodBody := []byte(`{"bank_name":"Bancolombia","account_type":"savings","account_number":"0123456789","account_holder_name":"Coach Uno","document_number":"10203040"}`)
	req = httptest.NewRequest(http.MethodPut, "/api/v1/coach/payout-account", bytes.NewReader(goodBody))
	req.Header.Set("Content-Type", "application/json")
	resp, err = app.Test(req)
	if err != nil {
		t.Fatalf("PUT good failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	var putResp CoachPayoutAccount
	if err := json.NewDecoder(resp.Body).Decode(&putResp); err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	if putResp.DocumentType != "CC" || putResp.BankName != "Bancolombia" {
		t.Fatalf("unexpected saved data: %+v", putResp)
	}

	// 4. Subsequent GET returns saved account
	req = httptest.NewRequest(http.MethodGet, "/api/v1/coach/payout-account", nil)
	resp, err = app.Test(req)
	if err != nil {
		t.Fatalf("GET after PUT failed: %v", err)
	}
	var getSaved CoachPayoutAccount
	if err := json.NewDecoder(resp.Body).Decode(&getSaved); err != nil {
		t.Fatalf("decode failed: %v", err)
	}
	if getSaved.AccountNumber != "0123456789" {
		t.Fatalf("expected saved account number, got %+v", getSaved)
	}
}
