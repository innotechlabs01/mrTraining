// Package checkout provides the hybrid checkout use cases: start a payment
// before the buyer has an account, and claim it once they register.
package checkout

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/innotechlabs01/mr-training-api/internal/config"
	plandomain "github.com/innotechlabs01/mr-training-api/internal/domain/plan"
	subscriptionapp "github.com/innotechlabs01/mr-training-api/internal/application/subscription"
	userapp "github.com/innotechlabs01/mr-training-api/internal/application/user"
	checkoutdomain "github.com/innotechlabs01/mr-training-api/internal/domain/checkout"
	subscriptiondomain "github.com/innotechlabs01/mr-training-api/internal/domain/subscription"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// CoachProvisioner provisions the coach account of a claimed checkout.
type CoachProvisioner interface {
	ActivateCoach(ctx context.Context, cmd userapp.ActivateCommand) (*userapp.ActivateResult, error)
}

// SubscriptionAttacher attaches a paid checkout to a user as a subscription.
type SubscriptionAttacher interface {
	AttachPaidCheckout(ctx context.Context, cmd subscriptionapp.AttachPaidCheckoutCommand) (*subscriptiondomain.Subscription, error)
}

// Service orchestrates the hybrid checkout.
type Service struct {
	cfg         *config.Config
	repo        checkoutdomain.Repository
	provider    subscriptiondomain.PaymentProvider
	planRepo    plandomain.Repository
	coaches     CoachProvisioner
	subscriptions SubscriptionAttacher
}

// NewService creates a checkout service.
func NewService(cfg *config.Config, repo checkoutdomain.Repository, provider subscriptiondomain.PaymentProvider, planRepo plandomain.Repository, coaches CoachProvisioner, subscriptions SubscriptionAttacher) *Service {
	return &Service{cfg: cfg, repo: repo, provider: provider, planRepo: planRepo, coaches: coaches, subscriptions: subscriptions}
}

// StartCommand is the input to start a checkout.
type StartCommand struct {
	PlanID string
	Email  string
}

// StartResult is the outcome of starting a checkout.
type StartResult struct {
	CheckoutID  string
	CheckoutURL string
	// Recovered is true when an existing paid checkout was found for the email,
	// so the buyer does not pay twice.
	Recovered bool
}

// Start issues a payment link for the chosen plan.
//
// A buyer who already paid for the plan and never registered gets their
// checkout back instead of being charged again.
func (s *Service) Start(ctx context.Context, cmd StartCommand) (*StartResult, error) {
	planID := strings.TrimSpace(cmd.PlanID)
	email := strings.ToLower(strings.TrimSpace(cmd.Email))
	if planID == "" {
		return nil, errors.BadRequest("plan_id is required")
	}
	if email == "" {
		return nil, errors.BadRequest("email is required")
	}

	// Recover a checkout that was already paid for this email.
	if existing, err := s.repo.GetLatestByEmail(ctx, email); err == nil && existing != nil {
		if existing.IsPaid() && existing.PlanID == planID {
			return &StartResult{CheckoutID: existing.ID, Recovered: true}, nil
		}
	}

	plan, err := s.planRepo.GetByID(ctx, planID)
	if err != nil {
		return nil, errors.NotFound("Plan", planID)
	}
	if !plan.IsActive {
		return nil, errors.BadRequest("plan is not active")
	}

	co := &checkoutdomain.Checkout{
		ID:       newCheckoutID(),
		Email:    email,
		PlanID:   plan.ID,
		PlanName: plan.Name,
		Amount:   plan.Price,
		Currency: plan.Currency,
		Status:   checkoutdomain.StatusCreated,
	}
	if err := s.repo.Create(ctx, co); err != nil {
		return nil, fmt.Errorf("create pending checkout: %w", err)
	}

	checkout, err := s.provider.CreateCheckout(ctx, subscriptiondomain.CheckoutRequest{
		ExternalReference: co.Reference(),
		Description:       "Suscripción " + plan.Name + " (" + plan.BillingPeriod + ")",
		Amount:            plan.Price,
		Currency:          plan.Currency,
		TRM:               plan.TRM,
		SuccessURL:        s.cfg.WebAppURL + "/payment/success?checkout=" + co.ID + "&email=" + co.Email,
		FailureURL:        s.cfg.WebAppURL + "/payment/failed?checkout=" + co.ID + "&email=" + co.Email,
		PendingURL:        s.cfg.WebAppURL + "/payment/pending?checkout=" + co.ID + "&email=" + co.Email,
		NotificationURL:   s.wompiWebhookURL(),
	})
	if err != nil {
		return nil, errors.Internal("no se pudo crear el checkout de pago: " + err.Error())
	}

	co.ProviderReference = checkout.Reference
	if err := s.repo.Save(ctx, co); err != nil {
		return nil, fmt.Errorf("save pending checkout: %w", err)
	}

	return &StartResult{CheckoutID: co.ID, CheckoutURL: checkout.CheckoutURL}, nil
}

// ClaimCommand is the input to claim a paid checkout.
type ClaimCommand struct {
	CheckoutID string
	UserID     string
	Email      string
}

// ClaimResult is the outcome of claiming a checkout.
type ClaimResult struct {
	CheckoutID string
	CoachID    string
	CoachCode  string
	PlanID     string
	PlanName   string
}

// Claim attaches a paid checkout to the user that just registered.
//
// It creates the subscription, provisions the coach account and mirrors
// role + coach code + plan into the public metadata. It is idempotent:
// claiming twice returns the same coach code.
func (s *Service) Claim(ctx context.Context, cmd ClaimCommand) (*ClaimResult, error) {
	if strings.TrimSpace(cmd.CheckoutID) == "" {
		return nil, errors.BadRequest("checkout_id is required")
	}
	if cmd.UserID == "" {
		return nil, errors.Unauthorized("user not authenticated")
	}

	co, err := s.repo.GetByID(ctx, cmd.CheckoutID)
	if err != nil {
		return nil, fmt.Errorf("get pending checkout: %w", err)
	}
	if co == nil {
		return nil, errors.NotFound("PendingCheckout", cmd.CheckoutID)
	}

	// Already claimed: return the same result.
	if co.Status == checkoutdomain.StatusClaimed {
		return &ClaimResult{
			CheckoutID: co.ID,
			CoachID:    co.UserID,
			CoachCode:  co.CoachCode,
			PlanID:     co.PlanID,
			PlanName:   co.PlanName,
		}, nil
	}
	if !co.IsPaid() {
		return nil, errors.Conflict("the payment has not been confirmed yet")
	}

	// Provision the coach: users + coaches rows, coach code and the role in
	// the public metadata.
	activation, err := s.coaches.ActivateCoach(ctx, userapp.ActivateCommand{
		UserID: cmd.UserID,
		Email:  cmd.Email,
	})
	if err != nil {
		return nil, err
	}

	// Create the subscription and attach the payment that was already made.
	_, err = s.subscriptions.AttachPaidCheckout(ctx, subscriptionapp.AttachPaidCheckoutCommand{
		UserID:    cmd.UserID,
		CoachID:   activation.CoachID,
		PlanID:    co.PlanID,
		PaymentID: co.ProviderPaymentID,
		Amount:    co.Amount,
		Currency:  co.Currency,
	})
	if err != nil {
		return nil, err
	}

	if err := co.MarkClaimed(cmd.UserID, activation.CoachCode); err != nil {
		return nil, errors.Conflict(err.Error())
	}
	if err := s.repo.Save(ctx, co); err != nil {
		return nil, fmt.Errorf("save pending checkout: %w", err)
	}

	return &ClaimResult{
		CheckoutID: co.ID,
		CoachID:    activation.CoachID,
		CoachCode:  activation.CoachCode,
		PlanID:     co.PlanID,
		PlanName:   co.PlanName,
	}, nil
}

// MarkPaid records a confirmed payment for a pending checkout. It is called
// by the webhook when the provider confirms a "checkout:<id>" payment.
func (s *Service) MarkPaid(ctx context.Context, checkoutID, providerPaymentID string, amount float64, currency string) error {
	co, err := s.repo.GetByID(ctx, checkoutID)
	if err != nil {
		return fmt.Errorf("get pending checkout: %w", err)
	}
	if co == nil {
		return errors.NotFound("PendingCheckout", checkoutID)
	}
	if co.Status == checkoutdomain.StatusClaimed {
		return nil
	}
	if err := co.MarkPaid(providerPaymentID, amount, currency); err != nil {
		return errors.BadRequest(err.Error())
	}
	if err := s.repo.Save(ctx, co); err != nil {
		return fmt.Errorf("save pending checkout: %w", err)
	}
	return nil
}

// wompiWebhookURL returns the provider webhook that confirms the payments.
func (s *Service) wompiWebhookURL() string {
	if s.cfg.WompiWebhookURL != "" {
		return s.cfg.WompiWebhookURL
	}
	return s.cfg.MercadoPagoWebhookURL
}

// newCheckoutID returns a unique checkout id.
//
// The provider reference is "checkout:<id>" and the provider caps the sku at
// 36 characters, so the id must stay under 27 characters.
func newCheckoutID() string {
	var b [10]byte
	if _, err := rand.Read(b[:]); err != nil {
		return fmt.Sprintf("chk_%d", time.Now().UTC().UnixNano()%1e18)
	}
	return "chk_" + hex.EncodeToString(b[:])
}
