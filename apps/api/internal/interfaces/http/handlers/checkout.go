package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	stderrors "errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	checkoutapp "github.com/innotechlabs01/mr-training-api/internal/application/checkout"
	checkoutdomain "github.com/innotechlabs01/mr-training-api/internal/domain/checkout"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/interfaces/http/dto"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
	appresponse "github.com/innotechlabs01/mr-training-api/pkg/response"
)

// checkoutService is the subset of the checkout application service used by
// the handler.
type checkoutService interface {
	Start(ctx context.Context, cmd checkoutapp.StartCommand) (*checkoutapp.StartResult, error)
	Claim(ctx context.Context, cmd checkoutapp.ClaimCommand) (*checkoutapp.ClaimResult, error)
	GetByID(ctx context.Context, checkoutID string) (*checkoutdomain.Checkout, error)
	MarkPaid(ctx context.Context, checkoutID, providerPaymentID string, amount float64, currency string) error
	RecoverPayment(ctx context.Context, userID, checkoutID string) error
}

// CheckoutHandler handles the hybrid checkout endpoints: paying before the
// buyer has an account, and claiming the payment once they register.
type CheckoutHandler struct {
	svc checkoutService
}

// NewCheckoutHandler creates a new checkout handler.
func NewCheckoutHandler(svc checkoutService) *CheckoutHandler {
	return &CheckoutHandler{svc: svc}
}

// RegisterCheckoutRoutes mounts the checkout endpoints.
//
// The start endpoint is PUBLIC (the buyer has no account yet) and lives in
// the /public group; the claim endpoint is authenticated and lives in the
// protected /api/v1 group.
func (h *CheckoutHandler) RegisterCheckoutRoutes(api fiber.Router, pub fiber.Router) {
	pub.Post("/checkouts", middleware.RateLimit(20, 60), h.HandleStart)
	pub.Post("/checkouts/:id/verify", middleware.RateLimit(30, 60), h.HandleVerify)
	api.Post("/checkouts/:id/claim", h.HandleClaim)
	api.Post("/checkouts/:id/recover", h.HandleRecoverPayment)
}

// HandleStart handles POST /public/checkouts.
// //
// It issues the payment link for the chosen plan. The buyer does not need an
// account yet: the payment is recorded on a pending checkout and claimed
// after they register.
func (h *CheckoutHandler) HandleStart(c *fiber.Ctx) error {
	var req dto.StartCheckoutRequest
	if err := c.BodyParser(&req); err != nil {
		return appresponse.Error(c, fiber.StatusBadRequest, "invalid request body")
	}

	result, err := h.svc.Start(middleware.RequestContext(c), checkoutapp.StartCommand{
		PlanID: req.PlanID,
		Email:  req.Email,
	})
	if err != nil {
		return handleCheckoutError(c, err)
	}

	if result.Recovered {
		// The buyer already paid for this plan: send them back to the claim
		// instead of charging them again.
		return appresponse.Success(c, dto.StartCheckoutResponse{
			CheckoutID: result.CheckoutID,
			Recovered:  true,
		})
	}

	return appresponse.Success(c, dto.StartCheckoutResponse{
		CheckoutID:  result.CheckoutID,
		CheckoutURL: result.CheckoutURL,
	})
}

// HandleClaim handles POST /api/v1/checkouts/:id/claim.
//
// It attaches a paid checkout to the authenticated caller: it creates the
// subscription, provisions the coach account and mirrors role + coach code +
// plan into the public metadata.
func (h *CheckoutHandler) HandleClaim(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	checkoutID := c.Params("id")
	if checkoutID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "checkout id is required")
	}

	result, err := h.svc.Claim(middleware.RequestContext(c), checkoutapp.ClaimCommand{
		CheckoutID: checkoutID,
		UserID:     userID,
	})
	if err != nil {
		return handleCheckoutError(c, err)
	}

	return appresponse.Success(c, dto.ClaimCheckoutResponse{
		CheckoutID: result.CheckoutID,
		CoachID:    result.CoachID,
		CoachCode:  result.CoachCode,
		PlanID:     result.PlanID,
		PlanName:   result.PlanName,
	})
}

// HandleRecoverPayment handles POST /api/v1/checkouts/:id/recover.
//
// This endpoint is used for the hybrid payment flow where the buyer paid
// before registering. It manually marks the payment as approved when the
// Wompi webhook did not fire (e.g., because the API was started after the
// payment was completed). Only the authenticated payer of the checkout may
// mark it as paid: ownership is verified by the service before anything is
// changed, so another user cannot flip somebody else's checkout to paid.
//
// After marking the payment approved, it triggers the claim flow to assign
// the coach role and create the subscription.
func (h *CheckoutHandler) HandleRecoverPayment(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == "" {
		return appresponse.Error(c, fiber.StatusUnauthorized, "user not authenticated")
	}

	checkoutID := c.Params("id")
	if checkoutID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "checkout id is required")
	}

	// Mark the payment as approved manually for the hybrid flow. The service
	// verifies that the caller owns the checkout before marking it paid.
	err := h.svc.RecoverPayment(middleware.RequestContext(c), userID, checkoutID)
	if err != nil {
		return handleCheckoutError(c, err)
	}

	// Now execute the claim to assign the coach role and create subscription
	result, err := h.svc.Claim(middleware.RequestContext(c), checkoutapp.ClaimCommand{
		CheckoutID: checkoutID,
		UserID:     userID,
	})
	if err != nil {
		return handleCheckoutError(c, err)
	}

	return appresponse.Success(c, dto.ClaimCheckoutResponse{
		CheckoutID: result.CheckoutID,
		CoachID:    result.CoachID,
		CoachCode:  result.CoachCode,
		PlanID:     result.PlanID,
		PlanName:   result.PlanName,
	})
}

// handleCheckoutError maps application errors to HTTP responses.
func handleCheckoutError(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*errors.AppError); ok {
		return appresponse.Error(c, appErr.Status, appErr.Message)
	}
	// Unexpected failures are logged: the response stays generic but the cause
	// is recoverable from the logs.
	fmt.Printf("checkout error: %v\n", err)
	return appresponse.Error(c, fiber.StatusInternalServerError, "internal server error")
}

var (
	wompiProdBaseURL    = "https://production.wompi.co/v1/transactions/"
	wompiSandboxBaseURL = "https://sandbox.wompi.co/v1/transactions/"
	clerkAPIBaseURL     = "https://api.clerk.com/v1"

	errSuperAdminSignInForbidden = stderrors.New("cannot mint sign-in token for platform super admin")
)

type verifyCheckoutRequest struct {
	TransactionID string `json:"transaction_id"`
}

type wompiTransaction struct {
	Status        string `json:"status"`
	StatusMessage string `json:"status_message"`
	CustomerEmail string `json:"customer_email"`
	Reference     string `json:"reference"`
	AmountInCents int64  `json:"amount_in_cents"`
	Currency      string `json:"currency"`
}

// HandleVerify handles POST /public/checkouts/:id/verify.
// It checks the Wompi transaction status (supporting PENDING polling and
// DECLINED/ERROR rejection), verifies that the transaction matches the pending
// checkout (reference, amount, currency), and when APPROVED, provisions/finds
// the Clerk user and issues a single-use sign-in ticket for unclaimed checkouts.
func (h *CheckoutHandler) HandleVerify(c *fiber.Ctx) error {
	checkoutID := strings.TrimSpace(c.Params("id"))
	if checkoutID == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "checkout id is required")
	}

	var req verifyCheckoutRequest
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.TransactionID) == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "transaction_id is required")
	}

	co, err := h.svc.GetByID(middleware.RequestContext(c), checkoutID)
	if err != nil {
		return handleCheckoutError(c, err)
	}

	txID := strings.TrimSpace(req.TransactionID)
	tx, err := fetchWompiTransaction(c.Context(), txID)
	if err != nil {
		return appresponse.Error(c, fiber.StatusBadGateway, "failed to verify transaction with Wompi")
	}

	if tx.Status == "PENDING" {
		return appresponse.JSON(c, fiber.StatusOK, fiber.Map{
			"status": "PENDING",
		})
	}

	if tx.Status != "APPROVED" {
		msg := tx.StatusMessage
		if msg == "" {
			msg = "La transacción fue rechazada o no pudo completarse."
		}
		return appresponse.JSON(c, fiber.StatusOK, fiber.Map{
			"status":  tx.Status,
			"message": msg,
		})
	}

	// Verify the Wompi transaction belongs to this pending checkout.
	expectedRef := co.Reference()
	matchesRef := strings.EqualFold(tx.Reference, expectedRef)
	matchesLink := co.ProviderReference != "" && strings.HasPrefix(tx.Reference, co.ProviderReference)
	if !matchesRef && !matchesLink {
		return appresponse.Error(c, fiber.StatusConflict, "transaction reference does not match checkout")
	}

	// Verify currency and amount match the pending checkout.
	// In Wompi sandbox, non-COP plans (e.g. USD) are converted to COP via TRM
	// by wompi/adapter.go; accept COP with positive amount in that case, while
	// keeping strict currency + amount equality for production and same-currency checkouts.
	sandboxCOPConversion := isWompiSandbox() &&
		co.Currency != "" &&
		!strings.EqualFold(co.Currency, "COP") &&
		strings.EqualFold(strings.TrimSpace(tx.Currency), "COP")

	if sandboxCOPConversion {
		if tx.AmountInCents <= 0 {
			return appresponse.Error(c, fiber.StatusConflict, "transaction amount does not match checkout")
		}
	} else {
		if co.Currency != "" && !strings.EqualFold(strings.TrimSpace(tx.Currency), co.Currency) {
			return appresponse.Error(c, fiber.StatusConflict, "transaction currency does not match checkout")
		}
		if co.Amount > 0 {
			expectedCents := int64(math.Round(co.Amount * 100))
			if tx.AmountInCents != expectedCents {
				return appresponse.Error(c, fiber.StatusConflict, "transaction amount does not match checkout")
			}
		}
	}

	txAmount := float64(tx.AmountInCents) / 100.0
	txCurrency := strings.ToUpper(strings.TrimSpace(tx.Currency))

	// Mark the pending checkout as paid immediately once Wompi confirms APPROVED
	// so /claim does not fail with 409 if the webhook is delayed or not configured.
	if markErr := h.svc.MarkPaid(middleware.RequestContext(c), checkoutID, txID, txAmount, txCurrency); markErr != nil {
		fmt.Printf("checkout verify mark paid warning (%s): %v\n", checkoutID, markErr)
	}

	// Derive email strictly from the pending checkout (never from client input).
	email := strings.TrimSpace(co.Email)
	if email == "" {
		return appresponse.Error(c, fiber.StatusBadRequest, "email is required to provision account")
	}

	// Only issue a sign-in token for unclaimed checkouts without an attached user.
	if co.Status == checkoutdomain.StatusClaimed || co.UserID != "" {
		return appresponse.JSON(c, fiber.StatusOK, fiber.Map{
			"status": "APPROVED",
			"email":  email,
		})
	}

	token, err := ensureClerkSignInToken(c.Context(), email)
	if err != nil {
		if stderrors.Is(err, errSuperAdminSignInForbidden) {
			return appresponse.Error(c, fiber.StatusForbidden, "sign-in token not permitted for this account")
		}
		fmt.Printf("clerk sign-in token error: %v\n", err)
		return appresponse.Error(c, fiber.StatusInternalServerError, "could not provision session")
	}

	return appresponse.JSON(c, fiber.StatusOK, fiber.Map{
		"status":        "APPROVED",
		"sign_in_token": token,
		"email":         email,
	})
}

func isWompiSandbox() bool {
	return strings.EqualFold(strings.TrimSpace(os.Getenv("WOMPI_ENV")), "sandbox") ||
		strings.HasPrefix(os.Getenv("WOMPI_PUBLIC_KEY"), "pub_test_") ||
		!strings.EqualFold(strings.TrimSpace(os.Getenv("APP_ENV")), "production")
}

func wompiTransactionBaseURL() string {
	if isWompiSandbox() {
		return wompiSandboxBaseURL
	}
	return wompiProdBaseURL
}

func fetchWompiTransaction(ctx context.Context, txID string) (*wompiTransaction, error) {
	baseURL := wompiTransactionBaseURL()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, baseURL+url.PathEscape(txID), nil)
	if err != nil {
		return nil, err
	}
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("wompi returned status %d", resp.StatusCode)
	}

	var parsed struct {
		Data wompiTransaction `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil, err
	}
	return &parsed.Data, nil
}

func isPlatformSuperAdminID(userID string) bool {
	if userID == "" {
		return false
	}
	raw := strings.TrimSpace(os.Getenv("PLATFORM_SUPER_ADMIN_CLERK_ID"))
	if raw == "" {
		return false
	}
	for _, id := range strings.Split(raw, ",") {
		if strings.TrimSpace(id) == userID {
			return true
		}
	}
	return false
}

func ensureClerkSignInToken(ctx context.Context, email string) (string, error) {
	secret := strings.TrimSpace(os.Getenv("CLERK_SECRET_KEY"))
	if secret == "" {
		return "", fmt.Errorf("CLERK_SECRET_KEY not configured")
	}
	client := &http.Client{Timeout: 10 * time.Second}

	// 1. Lookup existing user by email
	lookupURL := clerkAPIBaseURL + "/users?email_address=" + url.QueryEscape(email)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, lookupURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+secret)
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var users []struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&users); err != nil {
		return "", err
	}

	var userID string
	if len(users) > 0 {
		userID = users[0].ID
	} else {
		// 2. Create user transparently
		createBody, _ := json.Marshal(map[string]any{
			"email_address":             []string{email},
			"skip_password_requirement": true,
		})
		cReq, err := http.NewRequestWithContext(ctx, http.MethodPost, clerkAPIBaseURL+"/users", bytes.NewReader(createBody))
		if err != nil {
			return "", err
		}
		cReq.Header.Set("Authorization", "Bearer "+secret)
		cReq.Header.Set("Content-Type", "application/json")
		cResp, err := client.Do(cReq)
		if err != nil {
			return "", err
		}
		defer cResp.Body.Close()
		if cResp.StatusCode >= 400 {
			b, _ := io.ReadAll(cResp.Body)
			return "", fmt.Errorf("clerk create user failed (%d): %s", cResp.StatusCode, string(b))
		}
		var created struct {
			ID string `json:"id"`
		}
		if err := json.NewDecoder(cResp.Body).Decode(&created); err != nil {
			return "", err
		}
		userID = created.ID
	}

	// Never mint a sign-in token for a platform super admin account.
	if isPlatformSuperAdminID(userID) {
		return "", errSuperAdminSignInForbidden
	}

	// 3. Issue single-use sign-in token
	tokBody, _ := json.Marshal(map[string]any{
		"user_id":            userID,
		"expires_in_seconds": 300,
	})
	tReq, err := http.NewRequestWithContext(ctx, http.MethodPost, clerkAPIBaseURL+"/sign_in_tokens", bytes.NewReader(tokBody))
	if err != nil {
		return "", err
	}
	tReq.Header.Set("Authorization", "Bearer "+secret)
	tReq.Header.Set("Content-Type", "application/json")
	tResp, err := client.Do(tReq)
	if err != nil {
		return "", err
	}
	defer tResp.Body.Close()
	if tResp.StatusCode >= 400 {
		b, _ := io.ReadAll(tResp.Body)
		return "", fmt.Errorf("clerk sign_in_tokens failed (%d): %s", tResp.StatusCode, string(b))
	}
	var tok struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(tResp.Body).Decode(&tok); err != nil {
		return "", err
	}
	return tok.Token, nil
}
