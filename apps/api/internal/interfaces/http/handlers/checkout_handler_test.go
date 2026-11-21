package handlers

import (
	"context"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	checkoutapp "github.com/innotechlabs01/mr-training-api/internal/application/checkout"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/innotechlabs01/mr-training-api/internal/middleware"
)

// fakeCheckoutService is a test double for the checkout application service.
type fakeCheckoutService struct {
	recoverErr error
	claimErr   error
	claimResult *checkoutapp.ClaimResult
	recoverCalls []struct{ userID, checkoutID string }
	claimCalls   []struct{ checkoutID, userID string }
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
