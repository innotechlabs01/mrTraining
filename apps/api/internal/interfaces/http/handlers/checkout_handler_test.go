package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	checkoutapp "github.com/innotechlabs01/mr-training-api/internal/application/checkout"
	checkoutdomain "github.com/innotechlabs01/mr-training-api/internal/domain/checkout"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

type markPaidCall struct {
	checkoutID        string
	providerPaymentID string
	amount            float64
	currency          string
}

// fakeCheckoutService is a test double for the checkout application service.
type fakeCheckoutService struct {
	recoverErr   error
	claimErr     error
	claimResult  *checkoutapp.ClaimResult
	checkoutByID map[string]*checkoutdomain.Checkout
	markPaidErr  error
	recoverCalls []struct{ userID, checkoutID string }
	claimCalls   []struct{ checkoutID, userID string }
	markPaidCalls []markPaidCall
}

func (f *fakeCheckoutService) Start(ctx context.Context, cmd checkoutapp.StartCommand) (*checkoutapp.StartResult, error) {
	return nil, nil
}
func (f *fakeCheckoutService) Claim(ctx context.Context, cmd checkoutapp.ClaimCommand) (*checkoutapp.ClaimResult, error) {
	f.claimCalls = append(f.claimCalls, struct{ checkoutID, userID string }{cmd.CheckoutID, cmd.UserID})
	if f.claimErr != nil {
		return nil, f.claimErr
	}
	return f.claimResult, nil
}
func (f *fakeCheckoutService) GetByID(ctx context.Context, checkoutID string) (*checkoutdomain.Checkout, error) {
	if f.checkoutByID != nil {
		if co, ok := f.checkoutByID[checkoutID]; ok {
			return co, nil
		}
	}
	return nil, errors.NotFound("PendingCheckout", checkoutID)
}
func (f *fakeCheckoutService) MarkPaid(ctx context.Context, checkoutID, providerPaymentID string, amount float64, currency string) error {
	f.markPaidCalls = append(f.markPaidCalls, markPaidCall{
		checkoutID:        checkoutID,
		providerPaymentID: providerPaymentID,
		amount:            amount,
		currency:          currency,
	})
	return f.markPaidErr
}
func (f *fakeCheckoutService) RecoverPayment(ctx context.Context, userID, checkoutID string) error {
	f.recoverCalls = append(f.recoverCalls, struct{ userID, checkoutID string }{userID, checkoutID})
	return f.recoverErr
}

func TestHandleRecoverPayment_UnauthorizedWithoutAuth(t *testing.T) {
	h := NewCheckoutHandler(&fakeCheckoutService{})
	app := fiber.New()
	app.Post("/checkouts/:id/recover", h.HandleRecoverPayment)

	req := httptest.NewRequest("POST", "/checkouts/chk_1/recover", nil)
	resp, _ := app.Test(req)
	if resp.StatusCode != 401 {
		t.Errorf("expected 401 when not authenticated, got %d", resp.StatusCode)
	}
}

func TestHandleRecoverPayment_ForbiddenForAnotherUsersCheckout(t *testing.T) {
	h := NewCheckoutHandler(&fakeCheckoutService{
		recoverErr: errors.Forbidden("this checkout belongs to another account"),
	})
	app := fiber.New()
	app.Post("/checkouts/:id/recover", func(c *fiber.Ctx) error {
		c.Locals(string(middleware.UserIDKey), "attacker_1")
		return h.HandleRecoverPayment(c)
	})

	req := httptest.NewRequest("POST", "/checkouts/chk_victim/recover", nil)
	resp, _ := app.Test(req)
	if resp.StatusCode != 403 {
		t.Errorf("expected 403 for another user's checkout, got %d", resp.StatusCode)
	}
}

func TestHandleRecoverPayment_PassesUserIDToService(t *testing.T) {
	svc := &fakeCheckoutService{
		claimResult: &checkoutapp.ClaimResult{CheckoutID: "chk_1"},
	}
	h := NewCheckoutHandler(svc)
	app := fiber.New()
	app.Post("/checkouts/:id/recover", func(c *fiber.Ctx) error {
		c.Locals(string(middleware.UserIDKey), "owner_1")
		return h.HandleRecoverPayment(c)
	})

	req := httptest.NewRequest("POST", "/checkouts/chk_1/recover", nil)
	resp, _ := app.Test(req)
	if resp.StatusCode != 200 {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}
	if len(svc.recoverCalls) != 1 || svc.recoverCalls[0].userID != "owner_1" || svc.recoverCalls[0].checkoutID != "chk_1" {
		t.Errorf("expected RecoverPayment to be called with the authenticated user and checkout id, got %v", svc.recoverCalls)
	}
}

func setupMockWompiAndClerk(t *testing.T, tx wompiTransaction, clerkUserID string) (cleanup func(), clerkTokenCalls *int) {
	t.Helper()

	wompiSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"data": tx})
	}))

	tokenCalls := 0
	clerkSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch {
		case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/users"):
			_ = json.NewEncoder(w).Encode([]map[string]string{{"id": clerkUserID}})
		case r.Method == http.MethodPost && r.URL.Path == "/sign_in_tokens":
			tokenCalls++
			_ = json.NewEncoder(w).Encode(map[string]string{"token": "tok_test_123"})
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))

	origProd := wompiProdBaseURL
	origSandbox := wompiSandboxBaseURL
	origClerk := clerkAPIBaseURL

	wompiProdBaseURL = wompiSrv.URL + "/"
	wompiSandboxBaseURL = wompiSrv.URL + "/"
	clerkAPIBaseURL = clerkSrv.URL
	t.Setenv("CLERK_SECRET_KEY", "sk_test_123")

	return func() {
		wompiProdBaseURL = origProd
		wompiSandboxBaseURL = origSandbox
		clerkAPIBaseURL = origClerk
		wompiSrv.Close()
		clerkSrv.Close()
	}, &tokenCalls
}

func TestHandleVerify_RejectsReferenceMismatch(t *testing.T) {
	cleanup, tokenCalls := setupMockWompiAndClerk(t, wompiTransaction{
		Status:        "APPROVED",
		Reference:     "checkout:other_chk",
		AmountInCents: 5900,
		Currency:      "USD",
		CustomerEmail: "buyer@example.com",
	}, "user_buyer")
	defer cleanup()

	svc := &fakeCheckoutService{
		checkoutByID: map[string]*checkoutdomain.Checkout{
			"chk_1": {
				ID:       "chk_1",
				Email:    "buyer@example.com",
				Amount:   59,
				Currency: "USD",
				Status:   checkoutdomain.StatusCreated,
			},
		},
	}
	h := NewCheckoutHandler(svc)
	app := fiber.New()
	app.Post("/public/checkouts/:id/verify", h.HandleVerify)

	body := bytes.NewBufferString(`{"transaction_id":"tx_1"}`)
	req := httptest.NewRequest("POST", "/public/checkouts/chk_1/verify", body)
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test failed: %v", err)
	}
	if resp.StatusCode != 409 {
		t.Errorf("expected 409 for reference mismatch, got %d", resp.StatusCode)
	}
	if len(svc.markPaidCalls) != 0 {
		t.Errorf("MarkPaid must not be called on reference mismatch")
	}
	if *tokenCalls != 0 {
		t.Errorf("sign-in token must not be minted on reference mismatch")
	}
}

func TestHandleVerify_RejectsAmountMismatch(t *testing.T) {
	cleanup, _ := setupMockWompiAndClerk(t, wompiTransaction{
		Status:        "APPROVED",
		Reference:     "checkout:chk_1",
		AmountInCents: 100, // $1 instead of $59
		Currency:      "USD",
		CustomerEmail: "buyer@example.com",
	}, "user_buyer")
	defer cleanup()

	svc := &fakeCheckoutService{
		checkoutByID: map[string]*checkoutdomain.Checkout{
			"chk_1": {
				ID:       "chk_1",
				Email:    "buyer@example.com",
				Amount:   59,
				Currency: "USD",
				Status:   checkoutdomain.StatusCreated,
			},
		},
	}
	h := NewCheckoutHandler(svc)
	app := fiber.New()
	app.Post("/public/checkouts/:id/verify", h.HandleVerify)

	body := bytes.NewBufferString(`{"transaction_id":"tx_1"}`)
	req := httptest.NewRequest("POST", "/public/checkouts/chk_1/verify", body)
	req.Header.Set("Content-Type", "application/json")
	resp, _ := app.Test(req)
	if resp.StatusCode != 409 {
		t.Errorf("expected 409 for amount mismatch, got %d", resp.StatusCode)
	}
}

func TestHandleVerify_RejectsCurrencyMismatch(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("WOMPI_ENV", "production")
	t.Setenv("WOMPI_PUBLIC_KEY", "pub_prod_123")

	cleanup, _ := setupMockWompiAndClerk(t, wompiTransaction{
		Status:        "APPROVED",
		Reference:     "checkout:chk_1",
		AmountInCents: 5900,
		Currency:      "COP",
		CustomerEmail: "buyer@example.com",
	}, "user_buyer")
	defer cleanup()

	svc := &fakeCheckoutService{
		checkoutByID: map[string]*checkoutdomain.Checkout{
			"chk_1": {
				ID:       "chk_1",
				Email:    "buyer@example.com",
				Amount:   59,
				Currency: "USD",
				Status:   checkoutdomain.StatusCreated,
			},
		},
	}
	h := NewCheckoutHandler(svc)
	app := fiber.New()
	app.Post("/public/checkouts/:id/verify", h.HandleVerify)

	body := bytes.NewBufferString(`{"transaction_id":"tx_1"}`)
	req := httptest.NewRequest("POST", "/public/checkouts/chk_1/verify", body)
	req.Header.Set("Content-Type", "application/json")
	resp, _ := app.Test(req)
	if resp.StatusCode != 409 {
		t.Errorf("expected 409 for currency mismatch in production, got %d", resp.StatusCode)
	}
}

func TestHandleVerify_AllowsSandboxUSDToCOPConversion(t *testing.T) {
	t.Setenv("WOMPI_ENV", "sandbox")

	cleanup, tokenCalls := setupMockWompiAndClerk(t, wompiTransaction{
		Status:        "APPROVED",
		Reference:     "checkout:chk_1",
		AmountInCents: 24308000, // 59 USD * 4120 COP/USD = 243,080 COP
		Currency:      "COP",
		CustomerEmail: "buyer@example.com",
	}, "user_buyer")
	defer cleanup()

	svc := &fakeCheckoutService{
		checkoutByID: map[string]*checkoutdomain.Checkout{
			"chk_1": {
				ID:       "chk_1",
				Email:    "buyer@example.com",
				Amount:   59,
				Currency: "USD",
				Status:   checkoutdomain.StatusCreated,
			},
		},
	}
	h := NewCheckoutHandler(svc)
	app := fiber.New()
	app.Post("/public/checkouts/:id/verify", h.HandleVerify)

	body := bytes.NewBufferString(`{"transaction_id":"tx_1"}`)
	req := httptest.NewRequest("POST", "/public/checkouts/chk_1/verify", body)
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test failed: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200 for sandbox USD->COP conversion, got %d", resp.StatusCode)
	}
	if *tokenCalls != 1 {
		t.Errorf("expected 1 sign_in_token call, got %d", *tokenCalls)
	}
	if len(svc.markPaidCalls) != 1 || svc.markPaidCalls[0].currency != "COP" || svc.markPaidCalls[0].amount != 243080 {
		t.Errorf("expected MarkPaid with 243080 COP, got %+v", svc.markPaidCalls)
	}
}

func TestHandleVerify_UsesCheckoutEmailAndPaymentLinkPrefix(t *testing.T) {
	cleanup, tokenCalls := setupMockWompiAndClerk(t, wompiTransaction{
		Status:        "APPROVED",
		Reference:     "test_link123_1700000000_abc",
		AmountInCents: 5900,
		Currency:      "USD",
		CustomerEmail: "other@example.com",
	}, "user_buyer")
	defer cleanup()

	svc := &fakeCheckoutService{
		checkoutByID: map[string]*checkoutdomain.Checkout{
			"chk_1": {
				ID:                "chk_1",
				Email:             "payer@example.com",
				Amount:            59,
				Currency:          "USD",
				ProviderReference: "test_link123",
				Status:            checkoutdomain.StatusCreated,
			},
		},
	}
	h := NewCheckoutHandler(svc)
	app := fiber.New()
	app.Post("/public/checkouts/:id/verify", h.HandleVerify)

	// Client attempts to inject a victim email in the request body; must be ignored.
	body := bytes.NewBufferString(`{"transaction_id":"tx_1","email":"victim@example.com","env":"test"}`)
	req := httptest.NewRequest("POST", "/public/checkouts/chk_1/verify", body)
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test failed: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	var payload map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload["email"] != "payer@example.com" {
		t.Errorf("expected checkout email payer@example.com, got %v", payload["email"])
	}
	if payload["sign_in_token"] != "tok_test_123" {
		t.Errorf("expected sign_in_token tok_test_123, got %v", payload["sign_in_token"])
	}
	if *tokenCalls != 1 {
		t.Errorf("expected 1 sign_in_token call, got %d", *tokenCalls)
	}
	if len(svc.markPaidCalls) != 1 {
		t.Fatalf("expected 1 MarkPaid call, got %d", len(svc.markPaidCalls))
	}
	if svc.markPaidCalls[0].amount != 59 || svc.markPaidCalls[0].currency != "USD" {
		t.Errorf("expected verified amount 59 USD, got %+v", svc.markPaidCalls[0])
	}
}

func TestHandleVerify_DoesNotMintTokenForClaimedCheckout(t *testing.T) {
	cleanup, tokenCalls := setupMockWompiAndClerk(t, wompiTransaction{
		Status:        "APPROVED",
		Reference:     "checkout:chk_1",
		AmountInCents: 5900,
		Currency:      "USD",
	}, "user_buyer")
	defer cleanup()

	svc := &fakeCheckoutService{
		checkoutByID: map[string]*checkoutdomain.Checkout{
			"chk_1": {
				ID:       "chk_1",
				Email:    "payer@example.com",
				Amount:   59,
				Currency: "USD",
				Status:   checkoutdomain.StatusClaimed,
				UserID:   "user_buyer",
			},
		},
	}
	h := NewCheckoutHandler(svc)
	app := fiber.New()
	app.Post("/public/checkouts/:id/verify", h.HandleVerify)

	body := bytes.NewBufferString(`{"transaction_id":"tx_1"}`)
	req := httptest.NewRequest("POST", "/public/checkouts/chk_1/verify", body)
	req.Header.Set("Content-Type", "application/json")
	resp, _ := app.Test(req)
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	var payload map[string]any
	_ = json.NewDecoder(resp.Body).Decode(&payload)
	if _, exists := payload["sign_in_token"]; exists {
		t.Errorf("sign_in_token must not be issued for already claimed checkout")
	}
	if *tokenCalls != 0 {
		t.Errorf("expected 0 sign_in_token calls, got %d", *tokenCalls)
	}
}

func TestHandleVerify_RefusesSuperAdminSignInToken(t *testing.T) {
	cleanup, tokenCalls := setupMockWompiAndClerk(t, wompiTransaction{
		Status:        "APPROVED",
		Reference:     "checkout:chk_1",
		AmountInCents: 5900,
		Currency:      "USD",
	}, "user_super_admin")
	defer cleanup()
	t.Setenv("PLATFORM_SUPER_ADMIN_CLERK_ID", "user_super_admin")

	svc := &fakeCheckoutService{
		checkoutByID: map[string]*checkoutdomain.Checkout{
			"chk_1": {
				ID:       "chk_1",
				Email:    "admin@example.com",
				Amount:   59,
				Currency: "USD",
				Status:   checkoutdomain.StatusCreated,
			},
		},
	}
	h := NewCheckoutHandler(svc)
	app := fiber.New()
	app.Post("/public/checkouts/:id/verify", h.HandleVerify)

	body := bytes.NewBufferString(`{"transaction_id":"tx_1"}`)
	req := httptest.NewRequest("POST", "/public/checkouts/chk_1/verify", body)
	req.Header.Set("Content-Type", "application/json")
	resp, _ := app.Test(req)
	if resp.StatusCode != 403 {
		t.Errorf("expected 403 when refusing super admin sign-in token, got %d", resp.StatusCode)
	}
	if *tokenCalls != 0 {
		t.Errorf("expected 0 sign_in_token calls for super admin, got %d", *tokenCalls)
	}
}

func TestWompiTransactionBaseURL_ServerConfigOnly(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("WOMPI_ENV", "production")
	t.Setenv("WOMPI_PUBLIC_KEY", "pub_prod_abc")
	if got := wompiTransactionBaseURL(); got != wompiProdBaseURL {
		t.Errorf("expected prod URL, got %q", got)
	}

	t.Setenv("WOMPI_ENV", "sandbox")
	if got := wompiTransactionBaseURL(); got != wompiSandboxBaseURL {
		t.Errorf("expected sandbox URL when WOMPI_ENV=sandbox, got %q", got)
	}

	t.Setenv("WOMPI_ENV", "production")
	t.Setenv("WOMPI_PUBLIC_KEY", "pub_test_abc")
	if got := wompiTransactionBaseURL(); got != wompiSandboxBaseURL {
		t.Errorf("expected sandbox URL when pub_test_ key, got %q", got)
	}

	t.Setenv("WOMPI_PUBLIC_KEY", "pub_prod_abc")
	t.Setenv("APP_ENV", "qa")
	if got := wompiTransactionBaseURL(); got != wompiSandboxBaseURL {
		t.Errorf("expected sandbox URL when APP_ENV!=production, got %q", got)
	}
}
