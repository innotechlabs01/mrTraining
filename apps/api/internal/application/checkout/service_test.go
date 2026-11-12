package checkout

import (
	"context"
	"errors"
	"testing"

	"github.com/innotechlabs01/mr-training-api/internal/config"
	subscriptionapp "github.com/innotechlabs01/mr-training-api/internal/application/subscription"
	apperrors "github.com/innotechlabs01/mr-training-api/internal/errors"
	checkoutdomain "github.com/innotechlabs01/mr-training-api/internal/domain/checkout"
	plandomain "github.com/innotechlabs01/mr-training-api/internal/domain/plan"
	subscriptiondomain "github.com/innotechlabs01/mr-training-api/internal/domain/subscription"
	userapp "github.com/innotechlabs01/mr-training-api/internal/application/user"
)

// fakeCheckoutRepo is an in-memory checkout repository.
type fakeCheckoutRepo struct {
	byID    map[string]*checkoutdomain.Checkout
	byEmail map[string]*checkoutdomain.Checkout
}

func newFakeCheckoutRepo() *fakeCheckoutRepo {
	return &fakeCheckoutRepo{byID: map[string]*checkoutdomain.Checkout{}, byEmail: map[string]*checkoutdomain.Checkout{}}
}

func (f *fakeCheckoutRepo) Create(ctx context.Context, c *checkoutdomain.Checkout) error {
	f.byID[c.ID] = c
	f.byEmail[c.Email] = c
	return nil
}

func (f *fakeCheckoutRepo) GetByID(ctx context.Context, id string) (*checkoutdomain.Checkout, error) {
	c, ok := f.byID[id]
	if !ok {
		return nil, nil
	}
	return c, nil
}

func (f *fakeCheckoutRepo) GetLatestByEmail(ctx context.Context, email string) (*checkoutdomain.Checkout, error) {
	c, ok := f.byEmail[email]
	if !ok {
		return nil, nil
	}
	return c, nil
}

func (f *fakeCheckoutRepo) Save(ctx context.Context, c *checkoutdomain.Checkout) error {
	f.byID[c.ID] = c
	f.byEmail[c.Email] = c
	return nil
}

// fakeProvider is a payment provider that returns a fixed checkout.
type fakeProvider struct {
	checkout *subscriptiondomain.CheckoutResponse
	request  subscriptiondomain.CheckoutRequest
	payment  *subscriptiondomain.ProviderPayment
}

func (f *fakeProvider) CreateCheckout(ctx context.Context, req subscriptiondomain.CheckoutRequest) (*subscriptiondomain.CheckoutResponse, error) {
	f.request = req
	if f.checkout == nil {
		f.checkout = &subscriptiondomain.CheckoutResponse{CheckoutURL: "https://wompi.co/l/1", Reference: "ref_1"}
	}
	return f.checkout, nil
}

func (f *fakeProvider) VerifySignature(body []byte, signatureHeader string) error { return nil }
func (f *fakeProvider) FetchPayment(ctx context.Context, paymentID string) (*subscriptiondomain.ProviderPayment, error) {
	if f.payment == nil {
		return nil, errors.New("not implemented")
	}
	return f.payment, nil
}
func (f *fakeProvider) Refund(ctx context.Context, paymentID string) error { return nil }

// fakeIdentity resolves the verified identity of a user.
type fakeIdentity struct {
	email    string
	verified bool
	err      error
}

func (f *fakeIdentity) GetVerifiedIdentity(ctx context.Context, userID string) (string, bool, error) {
	if f.err != nil {
		return "", false, f.err
	}
	return f.email, f.verified, nil
}

// fakePlanRepo returns a fixed plan.
type fakePlanRepo struct {
	plan *plandomain.Plan
}

func (f *fakePlanRepo) GetByID(ctx context.Context, id string) (*plandomain.Plan, error) {
	if f.plan == nil {
		return nil, errors.New("not found")
	}
	return f.plan, nil
}
func (f *fakePlanRepo) ListByCoach(ctx context.Context, coachID string, activeOnly bool) ([]*plandomain.Plan, error) {
	return nil, nil
}
func (f *fakePlanRepo) ListAllActive(ctx context.Context) ([]*plandomain.Plan, error) { return nil, nil }
func (f *fakePlanRepo) Create(ctx context.Context, p *plandomain.Plan) error   { return nil }
func (f *fakePlanRepo) Update(ctx context.Context, p *plandomain.Plan) error   { return nil }
func (f *fakePlanRepo) Delete(ctx context.Context, id string) error            { return nil }
func (f *fakePlanRepo) ListVersionsByPlan(ctx context.Context, planID string) ([]*plandomain.Version, error) {
	return nil, nil
}

// fakeCoaches records the coach provisioning.
type fakeCoaches struct {
	calls []userapp.ActivateCommand
}

func (f *fakeCoaches) ActivateCoach(ctx context.Context, cmd userapp.ActivateCommand) (*userapp.ActivateResult, error) {
	f.calls = append(f.calls, cmd)
	return &userapp.ActivateResult{CoachID: cmd.UserID, CoachCode: "MR-TEST"}, nil
}

// fakeSubscriptions records the attached subscription.
type fakeSubscriptions struct {
	calls []subscriptionapp.AttachPaidCheckoutCommand
}

func (f *fakeSubscriptions) AttachPaidCheckout(ctx context.Context, cmd subscriptionapp.AttachPaidCheckoutCommand) (*subscriptiondomain.Subscription, error) {
	f.calls = append(f.calls, cmd)
	return &subscriptiondomain.Subscription{ID: "sub_1", PlanID: cmd.PlanID}, nil
}

func testConfig() *config.Config {
	return &config.Config{WebAppURL: "http://localhost:3000"}
}

func newPlan() *plandomain.Plan {
	return &plandomain.Plan{
		ID:            "plan_1",
		Name:          "Plan Pro",
		Price:         59,
		Currency:      "USD",
		BillingPeriod: "monthly",
		TRM:           4120,
		IsActive:      true,
	}
}

func TestStart_CreatesTheCheckoutAndThePaymentLink(t *testing.T) {
	repo := newFakeCheckoutRepo()
	provider := &fakeProvider{}
	svc := NewService(testConfig(), repo, provider, &fakePlanRepo{plan: newPlan()}, &fakeCoaches{}, &fakeSubscriptions{})

	result, err := svc.Start(context.Background(), StartCommand{PlanID: "plan_1", Email: "Coach@Example.com"})
	if err != nil {
		t.Fatalf("Start failed: %v", err)
	}
	if result.CheckoutID == "" {
		t.Error("expected a checkout id")
	}
	if result.CheckoutURL == "" {
		t.Error("expected a checkout url")
	}
	if result.Recovered {
		t.Error("a new checkout must not be reported as recovered")
	}

	// The provider reference must identify the checkout, not a subscription:
	// the buyer has no account yet.
	if provider.request.ExternalReference != "checkout:"+result.CheckoutID {
		t.Errorf("unexpected external reference: %q", provider.request.ExternalReference)
	}
	if provider.request.SuccessURL == "" {
		t.Error("expected a success url")
	}

	// The email is normalized.
	stored := repo.byID[result.CheckoutID]
	if stored.Email != "coach@example.com" {
		t.Errorf("expected a normalized email, got %q", stored.Email)
	}
	if stored.Status != checkoutdomain.StatusCreated {
		t.Errorf("expected status %q, got %q", checkoutdomain.StatusCreated, stored.Status)
	}
}

func TestStart_RecoversAPaidCheckoutForTheSameEmail(t *testing.T) {
	repo := newFakeCheckoutRepo()
	provider := &fakeProvider{}
	svc := NewService(testConfig(), repo, provider, &fakePlanRepo{plan: newPlan()}, &fakeCoaches{}, &fakeSubscriptions{})

	first, err := svc.Start(context.Background(), StartCommand{PlanID: "plan_1", Email: "coach@example.com"})
	if err != nil {
		t.Fatalf("Start failed: %v", err)
	}
	if err := repo.byID[first.CheckoutID].MarkPaid("pay_1", 59, "USD"); err != nil {
		t.Fatalf("MarkPaid failed: %v", err)
	}

	second, err := svc.Start(context.Background(), StartCommand{PlanID: "plan_1", Email: "coach@example.com"})
	if err != nil {
		t.Fatalf("Start failed: %v", err)
	}
	if !second.Recovered {
		t.Error("expected the paid checkout to be recovered")
	}
	if second.CheckoutID != first.CheckoutID {
		t.Errorf("expected the same checkout, got %q", second.CheckoutID)
	}
	if second.CheckoutURL != "" {
		t.Error("a recovered checkout must not be charged again")
	}
}

func TestClaim_RefusesAnUnpaidCheckout(t *testing.T) {
	repo := newFakeCheckoutRepo()
	coaches := &fakeCoaches{}
	svc := NewService(testConfig(), repo, &fakeProvider{}, &fakePlanRepo{plan: newPlan()}, coaches, &fakeSubscriptions{}).
		WithIdentityReader(&fakeIdentity{email: "coach@example.com", verified: true})

	created, err := svc.Start(context.Background(), StartCommand{PlanID: "plan_1", Email: "coach@example.com"})
	if err != nil {
		t.Fatalf("Start failed: %v", err)
	}

	_, err = svc.Claim(context.Background(), ClaimCommand{CheckoutID: created.CheckoutID, UserID: "user_1"})
	if err == nil {
		t.Fatal("expected an error claiming an unpaid checkout")
	}
	if len(coaches.calls) != 0 {
		t.Error("the coach must not be provisioned for an unpaid checkout")
	}
}

func TestClaim_ProvisionsTheCoachAndAttachesTheSubscription(t *testing.T) {
	repo := newFakeCheckoutRepo()
	coaches := &fakeCoaches{}
	subs := &fakeSubscriptions{}
	provider := &fakeProvider{payment: &subscriptiondomain.ProviderPayment{
		ID:                "pay_1",
		Status:            "approved",
		ExternalReference: "checkout:PLACEHOLDER",
		TransactionAmount: 59,
		Currency:          "USD",
	}}
	svc := NewService(testConfig(), repo, provider, &fakePlanRepo{plan: newPlan()}, coaches, subs).
		WithIdentityReader(&fakeIdentity{email: "coach@example.com", verified: true})

	created, err := svc.Start(context.Background(), StartCommand{PlanID: "plan_1", Email: "coach@example.com"})
	if err != nil {
		t.Fatalf("Start failed: %v", err)
	}
	provider.payment.ExternalReference = "checkout:" + created.CheckoutID
	if err := repo.byID[created.CheckoutID].MarkPaid("pay_1", 59, "USD"); err != nil {
		t.Fatalf("MarkPaid failed: %v", err)
	}

	result, err := svc.Claim(context.Background(), ClaimCommand{CheckoutID: created.CheckoutID, UserID: "user_1"})
	if err != nil {
		t.Fatalf("Claim failed: %v", err)
	}
	if result.CoachCode != "MR-TEST" {
		t.Errorf("expected the coach code, got %q", result.CoachCode)
	}
	if result.PlanID != "plan_1" {
		t.Errorf("expected the plan id, got %q", result.PlanID)
	}
	if len(coaches.calls) != 1 || coaches.calls[0].UserID != "user_1" {
		t.Errorf("expected the coach to be provisioned for the caller, got %v", coaches.calls)
	}
	if len(subs.calls) != 1 || subs.calls[0].PaymentID != "pay_1" {
		t.Errorf("expected the payment to be attached, got %v", subs.calls)
	}
	if repo.byID[created.CheckoutID].Status != checkoutdomain.StatusClaimed {
		t.Errorf("expected the checkout to be claimed, got %q", repo.byID[created.CheckoutID].Status)
	}
}

func TestClaim_IsIdempotent(t *testing.T) {
	repo := newFakeCheckoutRepo()
	coaches := &fakeCoaches{}
	subs := &fakeSubscriptions{}
	provider := &fakeProvider{payment: &subscriptiondomain.ProviderPayment{
		ID:                "pay_1",
		Status:            "approved",
		TransactionAmount: 59,
		Currency:          "USD",
	}}
	svc := NewService(testConfig(), repo, provider, &fakePlanRepo{plan: newPlan()}, coaches, subs).
		WithIdentityReader(&fakeIdentity{email: "coach@example.com", verified: true})

	created, err := svc.Start(context.Background(), StartCommand{PlanID: "plan_1", Email: "coach@example.com"})
	if err != nil {
		t.Fatalf("Start failed: %v", err)
	}
	provider.payment.ExternalReference = "checkout:" + created.CheckoutID
	if err := repo.byID[created.CheckoutID].MarkPaid("pay_1", 59, "USD"); err != nil {
		t.Fatalf("MarkPaid failed: %v", err)
	}

	first, err := svc.Claim(context.Background(), ClaimCommand{CheckoutID: created.CheckoutID, UserID: "user_1"})
	if err != nil {
		t.Fatalf("Claim failed: %v", err)
	}
	second, err := svc.Claim(context.Background(), ClaimCommand{CheckoutID: created.CheckoutID, UserID: "user_1"})
	if err != nil {
		t.Fatalf("second Claim failed: %v", err)
	}
	if second.CoachCode != first.CoachCode {
		t.Errorf("expected the same coach code, got %q and %q", first.CoachCode, second.CoachCode)
	}
	if len(subs.calls) != 1 {
		t.Errorf("the subscription must be attached once, got %d", len(subs.calls))
	}
}

// A paid checkout belongs to the PAYER: another account must not be able to
// claim it and get the plan for free.
func TestClaim_RefusesACheckoutPaidBySomebodyElse(t *testing.T) {
	repo := newFakeCheckoutRepo()
	coaches := &fakeCoaches{}
	subs := &fakeSubscriptions{}
	provider := &fakeProvider{payment: &subscriptiondomain.ProviderPayment{
		ID:                "pay_1",
		Status:            "approved",
		TransactionAmount: 59,
		Currency:          "USD",
	}}
	// The attacker signed up with ANOTHER email.
	svc := NewService(testConfig(), repo, provider, &fakePlanRepo{plan: newPlan()}, coaches, subs).
		WithIdentityReader(&fakeIdentity{email: "attacker@example.com", verified: true})

	created, err := svc.Start(context.Background(), StartCommand{PlanID: "plan_1", Email: "victim@example.com"})
	if err != nil {
		t.Fatalf("Start failed: %v", err)
	}
	provider.payment.ExternalReference = "checkout:" + created.CheckoutID
	if err := repo.byID[created.CheckoutID].MarkPaid("pay_1", 59, "USD"); err != nil {
		t.Fatalf("MarkPaid failed: %v", err)
	}

	_, err = svc.Claim(context.Background(), ClaimCommand{CheckoutID: created.CheckoutID, UserID: "attacker_1"})
	if err == nil {
		t.Fatal("expected the claim of another payer's checkout to be refused")
	}
	appErr, ok := err.(*apperrors.AppError)
	if !ok || appErr.Status != 403 {
		t.Fatalf("expected a 403, got %v", err)
	}
	if len(coaches.calls) != 0 {
		t.Error("the coach must not be provisioned for a checkout paid by somebody else")
	}
	if len(subs.calls) != 0 {
		t.Error("no subscription may be attached to a checkout paid by somebody else")
	}
}

// An account with an UNVERIFIED email cannot claim a payment: otherwise the
// attacker would sign up with the victim's email and take their plan.
func TestClaim_RefusesAnUnverifiedEmail(t *testing.T) {
	repo := newFakeCheckoutRepo()
	coaches := &fakeCoaches{}
	provider := &fakeProvider{payment: &subscriptiondomain.ProviderPayment{
		ID: "pay_1", Status: "approved", TransactionAmount: 59, Currency: "USD",
	}}
	svc := NewService(testConfig(), repo, provider, &fakePlanRepo{plan: newPlan()}, coaches, &fakeSubscriptions{}).
		WithIdentityReader(&fakeIdentity{email: "victim@example.com", verified: false})

	created, err := svc.Start(context.Background(), StartCommand{PlanID: "plan_1", Email: "victim@example.com"})
	if err != nil {
		t.Fatalf("Start failed: %v", err)
	}
	provider.payment.ExternalReference = "checkout:" + created.CheckoutID
	if err := repo.byID[created.CheckoutID].MarkPaid("pay_1", 59, "USD"); err != nil {
		t.Fatalf("MarkPaid failed: %v", err)
	}

	_, err = svc.Claim(context.Background(), ClaimCommand{CheckoutID: created.CheckoutID, UserID: "attacker_1"})
	if err == nil {
		t.Fatal("expected the claim to be refused for an unverified email")
	}
	appErr, ok := err.(*apperrors.AppError)
	if !ok || appErr.Status != 403 {
		t.Fatalf("expected a 403, got %v", err)
	}
}

// The webhook is only a notification: the claim re-checks the payment with
// the provider, so a forged webhook cannot grant a plan.
func TestClaim_RefusesAPaymentTheProviderDoesNotConfirm(t *testing.T) {
	repo := newFakeCheckoutRepo()
	coaches := &fakeCoaches{}
	subs := &fakeSubscriptions{}
	// The provider does not know the transaction (the webhook was forged).
	provider := &fakeProvider{}
	svc := NewService(testConfig(), repo, provider, &fakePlanRepo{plan: newPlan()}, coaches, subs).
		WithIdentityReader(&fakeIdentity{email: "coach@example.com", verified: true})

	created, err := svc.Start(context.Background(), StartCommand{PlanID: "plan_1", Email: "coach@example.com"})
	if err != nil {
		t.Fatalf("Start failed: %v", err)
	}
	if err := repo.byID[created.CheckoutID].MarkPaid("forged_txn", 59, "USD"); err != nil {
		t.Fatalf("MarkPaid failed: %v", err)
	}

	_, err = svc.Claim(context.Background(), ClaimCommand{CheckoutID: created.CheckoutID, UserID: "user_1"})
	if err == nil {
		t.Fatal("expected the claim to be refused when the provider does not confirm the payment")
	}
	if len(subs.calls) != 0 {
		t.Error("no subscription may be attached without a confirmed payment")
	}
}

// The payment must belong to THIS checkout: a payment confirmed for another
// checkout cannot be reused.
func TestClaim_RefusesAPaymentOfAnotherCheckout(t *testing.T) {
	repo := newFakeCheckoutRepo()
	coaches := &fakeCoaches{}
	provider := &fakeProvider{payment: &subscriptiondomain.ProviderPayment{
		ID: "pay_1", Status: "approved", ExternalReference: "checkout:someone_else",
		TransactionAmount: 59, Currency: "USD",
	}}
	svc := NewService(testConfig(), repo, provider, &fakePlanRepo{plan: newPlan()}, coaches, &fakeSubscriptions{}).
		WithIdentityReader(&fakeIdentity{email: "coach@example.com", verified: true})

	created, err := svc.Start(context.Background(), StartCommand{PlanID: "plan_1", Email: "coach@example.com"})
	if err != nil {
		t.Fatalf("Start failed: %v", err)
	}
	if err := repo.byID[created.CheckoutID].MarkPaid("pay_1", 59, "USD"); err != nil {
		t.Fatalf("MarkPaid failed: %v", err)
	}

	_, err = svc.Claim(context.Background(), ClaimCommand{CheckoutID: created.CheckoutID, UserID: "user_1"})
	if err == nil {
		t.Fatal("expected the claim to be refused for a payment of another checkout")
	}
}

// The email is stored and echoed back in the return URLs: it must be a sane
// address.
func TestStart_RejectsAMalformedEmail(t *testing.T) {
	repo := newFakeCheckoutRepo()
	svc := NewService(testConfig(), repo, &fakeProvider{}, &fakePlanRepo{plan: newPlan()}, &fakeCoaches{}, &fakeSubscriptions{})

	for _, email := range []string{"", "not-an-email", "a@b", "a b@example.com", "a@example.com; DROP TABLE users"} {
		if _, err := svc.Start(context.Background(), StartCommand{PlanID: "plan_1", Email: email}); err == nil {
			t.Errorf("expected the email %q to be rejected", email)
		}
	}
}
