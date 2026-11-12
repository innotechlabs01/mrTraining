package subscription

import (
	"context"
	"testing"
	"time"

	"github.com/innotechlabs01/mr-training-api/internal/config"
	plandomain "github.com/innotechlabs01/mr-training-api/internal/domain/plan"
	subscriptiondomain "github.com/innotechlabs01/mr-training-api/internal/domain/subscription"
	apperrors "github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- fakes ---

type fakePlanRepo struct {
	plan *plandomain.Plan
	err  error
}

func (f *fakePlanRepo) GetByID(ctx context.Context, id string) (*plandomain.Plan, error) {
	return f.plan, f.err
}
func (f *fakePlanRepo) ListByCoach(ctx context.Context, coachID string, activeOnly bool) ([]*plandomain.Plan, error) {
	return nil, nil
}
func (f *fakePlanRepo) ListAllActive(ctx context.Context) ([]*plandomain.Plan, error) {
	return nil, nil
}
func (f *fakePlanRepo) ListVersionsByPlan(ctx context.Context, planID string) ([]*plandomain.Version, error) {
	return nil, nil
}
func (f *fakePlanRepo) Create(ctx context.Context, p *plandomain.Plan) error { return nil }
func (f *fakePlanRepo) Update(ctx context.Context, p *plandomain.Plan) error { return nil }
func (f *fakePlanRepo) Delete(ctx context.Context, id string) error          { return nil }

type fakeSubRepo struct {
	byID          *subscriptiondomain.Subscription
	byAthlete     *subscriptiondomain.Subscription
	byCoach       []*subscriptiondomain.Subscription
	err           error
	recorded      []*subscriptiondomain.Payment
	saved         []*subscriptiondomain.Subscription
	getPayment    *subscriptiondomain.Payment
	getPaymentErr error
	// hasApprovedPayment drives the payment status reported by the service.
	hasApprovedPayment bool
}

func (f *fakeSubRepo) Save(ctx context.Context, s *subscriptiondomain.Subscription) error {
	if f.err != nil {
		return f.err
	}
	f.saved = append(f.saved, s)
	return nil
}
func (f *fakeSubRepo) FindByID(ctx context.Context, id string) (*subscriptiondomain.Subscription, error) {
	if f.err != nil {
		return nil, f.err
	}
	if f.byID == nil {
		return nil, apperrors.NotFound("Subscription", id)
	}
	return f.byID, nil
}
func (f *fakeSubRepo) FindByAthlete(ctx context.Context, athleteID string) (*subscriptiondomain.Subscription, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.byAthlete, nil
}
func (f *fakeSubRepo) FindByCoach(ctx context.Context, coachID string) ([]*subscriptiondomain.Subscription, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.byCoach, nil
}
func (f *fakeSubRepo) RecordPayment(ctx context.Context, p *subscriptiondomain.Payment) error {
	f.recorded = append(f.recorded, p)
	return nil
}
func (f *fakeSubRepo) GetPaymentByProviderID(ctx context.Context, providerPaymentID string) (*subscriptiondomain.Payment, error) {
	if f.getPaymentErr != nil {
		return nil, f.getPaymentErr
	}
	return f.getPayment, nil
}

func (f *fakeSubRepo) HasApprovedPayment(ctx context.Context, subscriptionID string) (bool, error) {
	return f.hasApprovedPayment, nil
}

// fakeMetadataWriter records the entitlement patches mirrored to Clerk.
type fakeMetadataWriter struct {
	patches []map[string]interface{}
	userIDs []string
}

func (f *fakeMetadataWriter) MergePublicMetadata(ctx context.Context, userID string, patch map[string]interface{}) error {
	f.userIDs = append(f.userIDs, userID)
	f.patches = append(f.patches, patch)
	return nil
}

// The selected plan must reach the Clerk public metadata, otherwise the
// frontend cannot know what the user may see and do.
func TestSubscribe_MirrorsThePlanIntoThePublicMetadata(t *testing.T) {
	repo := &fakeSubRepo{}
	writer := &fakeMetadataWriter{}
	provider := &fakeProvider{
		checkout: &subscriptiondomain.CheckoutResponse{CheckoutURL: "https://wompi.co/l/1", Reference: "ref_1"},
	}
	svc := NewService(&config.Config{}, repo, provider, &fakePlanRepo{plan: newPlan()}, nil, nil).
		WithMetadataWriter(writer)

	_, err := svc.Subscribe(context.Background(), SubscribeCommand{
		AthleteID: "coach_1",
		CoachID:   "coach_1",
		PlanID:    "plan_1",
	})
	require.NoError(t, err)

	require.Len(t, writer.patches, 1)
	assert.Equal(t, "coach_1", writer.userIDs[0])
	assert.Equal(t, "plan_1", writer.patches[0]["plan"])
	assert.Equal(t, "pending", writer.patches[0]["planStatus"])
}

func TestFulfillWebhook_MirrorsThePlanAsActive(t *testing.T) {
	ctx := context.Background()
	sub := &subscriptiondomain.Subscription{
		ID:            "sub_1",
		AthleteID:     "athlete_1",
		CoachID:       "coach_1",
		PlanID:        "plan_1",
		PlanName:      "Plan Pro",
		BillingPeriod: "monthly",
		Status:        subscriptiondomain.StatusPastDue,
	}
	subRepo := &fakeSubRepo{byID: sub, byAthlete: sub}
	approved := time.Now().UTC()
	provider := &fakeProvider{
		payment: &subscriptiondomain.ProviderPayment{
			ID:                "pay_1",
			Status:            "approved",
			ExternalReference: "subscription:sub_1",
			TransactionAmount: 49900,
			Currency:          "COP",
			DateApproved:      &approved,
		},
	}
	writer := &fakeMetadataWriter{}
	svc := NewService(&config.Config{}, subRepo, provider, &fakePlanRepo{plan: newPlan()}, nil, nil).
		WithMetadataWriter(writer)

	require.NoError(t, svc.FulfillWebhook(ctx, subscriptiondomain.WebhookRequest{
		Body:            []byte(`{"type":"payment","data":{"id":"pay_1"}}`),
		SignatureHeader: "ts=1,v1=abc",
	}))

	require.Len(t, writer.patches, 1)
	assert.Equal(t, "athlete_1", writer.userIDs[0])
	assert.Equal(t, "plan_1", writer.patches[0]["plan"])
	assert.Equal(t, "Plan Pro", writer.patches[0]["planName"])
	assert.Equal(t, "active", writer.patches[0]["planStatus"])
}

func TestGetPaymentStatus(t *testing.T) {
	sub := &subscriptiondomain.Subscription{
		ID:      "sub_1",
		PlanID:  "plan-seed-pro",
		PlanName: "Plan Pro",
	}

	t.Run("no subscription", func(t *testing.T) {
		svc := NewService(&config.Config{}, &fakeSubRepo{}, &fakeProvider{}, &fakePlanRepo{}, nil, nil)
		status, got, err := svc.GetPaymentStatus(context.Background(), "coach_1")
		if err != nil {
			t.Fatalf("GetPaymentStatus failed: %v", err)
		}
		if status != PaymentStatusNone {
			t.Errorf("expected status %q, got %q", PaymentStatusNone, status)
		}
		if got != nil {
			t.Errorf("expected no subscription, got %v", got)
		}
	})

	t.Run("subscription without approved payment is pending", func(t *testing.T) {
		repo := &fakeSubRepo{byAthlete: sub}
		svc := NewService(&config.Config{}, repo, &fakeProvider{}, &fakePlanRepo{}, nil, nil)
		status, got, err := svc.GetPaymentStatus(context.Background(), "coach_1")
		if err != nil {
			t.Fatalf("GetPaymentStatus failed: %v", err)
		}
		if status != PaymentStatusPending {
			t.Errorf("expected status %q, got %q", PaymentStatusPending, status)
		}
		if got == nil || got.PlanID != "plan-seed-pro" {
			t.Errorf("expected the subscription to be returned, got %v", got)
		}
	})

	t.Run("approved payment is approved", func(t *testing.T) {
		repo := &fakeSubRepo{byAthlete: sub, hasApprovedPayment: true}
		svc := NewService(&config.Config{}, repo, &fakeProvider{}, &fakePlanRepo{}, nil, nil)
		status, _, err := svc.GetPaymentStatus(context.Background(), "coach_1")
		if err != nil {
			t.Fatalf("GetPaymentStatus failed: %v", err)
		}
		if status != PaymentStatusApproved {
			t.Errorf("expected status %q, got %q", PaymentStatusApproved, status)
		}
	})
}

type fakeProvider struct {
	checkout    *subscriptiondomain.CheckoutResponse
	checkoutErr error
	payment     *subscriptiondomain.ProviderPayment
	paymentErr  error
	verifyErr   error
}

func (f *fakeProvider) CreateCheckout(ctx context.Context, req subscriptiondomain.CheckoutRequest) (*subscriptiondomain.CheckoutResponse, error) {
	if f.checkoutErr != nil {
		return nil, f.checkoutErr
	}
	return f.checkout, nil
}
func (f *fakeProvider) VerifySignature(body []byte, signatureHeader string) error {
	return f.verifyErr
}
func (f *fakeProvider) FetchPayment(ctx context.Context, paymentID string) (*subscriptiondomain.ProviderPayment, error) {
	if f.paymentErr != nil {
		return nil, f.paymentErr
	}
	return f.payment, nil
}
func (f *fakeProvider) Refund(ctx context.Context, paymentID string) error { return nil }

func newPlan() *plandomain.Plan {
	return &plandomain.Plan{
		ID:            "plan_1",
		Name:          "Plan Mensual",
		Price:         49900,
		Currency:      "COP",
		BillingPeriod: "monthly",
		IsActive:      true,
	}
}

func TestServiceSubscribe(t *testing.T) {
	ctx := context.Background()
	plan := newPlan()
	planRepo := &fakePlanRepo{plan: plan}
	subRepo := &fakeSubRepo{}
	provider := &fakeProvider{
		checkout: &subscriptiondomain.CheckoutResponse{CheckoutURL: "https://mp.com/checkout/pref_1", Reference: "pref_1"},
	}
	svc := NewService(&config.Config{
		AppURL:                "https://app.test",
		MercadoPagoWebhookURL: "https://app.test/webhooks/mercadopago",
	}, subRepo, provider, planRepo, nil, nil)

	result, err := svc.Subscribe(ctx, SubscribeCommand{
		AthleteID: "athlete_1",
		CoachID:   "coach_1",
		PlanID:    "plan_1",
	})
	require.NoError(t, err)
	require.NotNil(t, result.Subscription)
	assert.Equal(t, "athlete_1", result.Subscription.AthleteID)
	assert.Equal(t, "coach_1", result.Subscription.CoachID)
	assert.Equal(t, "plan_1", result.Subscription.PlanID)
	assert.Equal(t, subscriptiondomain.StatusActive, result.Subscription.Status)
	assert.Equal(t, "https://mp.com/checkout/pref_1", result.CheckoutURL)
	assert.Equal(t, "pref_1", result.Reference)
	assert.Len(t, subRepo.saved, 1)
	assert.Len(t, result.Subscription.DomainEvents(), 0) // cleared after publish
}

func TestServiceSubscribePlanNotFound(t *testing.T) {
	ctx := context.Background()
	planRepo := &fakePlanRepo{err: apperrors.NotFound("Plan", "plan_1")}
	subRepo := &fakeSubRepo{}
	provider := &fakeProvider{}
	svc := NewService(&config.Config{}, subRepo, provider, planRepo, nil, nil)

	_, err := svc.Subscribe(ctx, SubscribeCommand{AthleteID: "a", CoachID: "c", PlanID: "plan_1"})
	require.Error(t, err)
}

func TestServiceSubscribeInactivePlan(t *testing.T) {
	ctx := context.Background()
	plan := newPlan()
	plan.IsActive = false
	planRepo := &fakePlanRepo{plan: plan}
	subRepo := &fakeSubRepo{}
	provider := &fakeProvider{}
	svc := NewService(&config.Config{}, subRepo, provider, planRepo, nil, nil)

	_, err := svc.Subscribe(ctx, SubscribeCommand{AthleteID: "a", CoachID: "c", PlanID: "plan_1"})
	require.Error(t, err)
}

func TestServiceSubscribeValidation(t *testing.T) {
	ctx := context.Background()
	svc := NewService(&config.Config{}, &fakeSubRepo{}, &fakeProvider{}, &fakePlanRepo{plan: newPlan()}, nil, nil)

	_, err := svc.Subscribe(ctx, SubscribeCommand{})
	require.Error(t, err)

	_, err = svc.Subscribe(ctx, SubscribeCommand{AthleteID: "a"})
	require.Error(t, err)

	_, err = svc.Subscribe(ctx, SubscribeCommand{AthleteID: "a", CoachID: "c"})
	require.Error(t, err)
}

func TestServiceCancel(t *testing.T) {
	ctx := context.Background()
	sub := &subscriptiondomain.Subscription{ID: "sub_1", CoachID: "coach_1", Status: subscriptiondomain.StatusActive, BillingPeriod: "monthly"}
	subRepo := &fakeSubRepo{byID: sub}
	svc := NewService(&config.Config{}, subRepo, &fakeProvider{}, &fakePlanRepo{plan: newPlan()}, nil, nil)

	require.NoError(t, svc.Cancel(ctx, CancelCommand{SubscriptionID: "sub_1", CoachID: "coach_1"}))
	assert.True(t, sub.CancelAtPeriodEnd)
	assert.NotNil(t, sub.CanceledAt)
	assert.Len(t, subRepo.saved, 1)
}

func TestServiceCancelNotFound(t *testing.T) {
	ctx := context.Background()
	subRepo := &fakeSubRepo{} // byID nil -> not found
	svc := NewService(&config.Config{}, subRepo, &fakeProvider{}, &fakePlanRepo{plan: newPlan()}, nil, nil)

	err := svc.Cancel(ctx, CancelCommand{SubscriptionID: "missing", CoachID: "coach_1"})
	require.Error(t, err)
}

func TestServiceCancelUnauthorized(t *testing.T) {
	ctx := context.Background()
	sub := &subscriptiondomain.Subscription{ID: "sub_1", CoachID: "coach_1", Status: subscriptiondomain.StatusActive}
	subRepo := &fakeSubRepo{byID: sub}
	svc := NewService(&config.Config{}, subRepo, &fakeProvider{}, &fakePlanRepo{plan: newPlan()}, nil, nil)

	err := svc.Cancel(ctx, CancelCommand{SubscriptionID: "sub_1", CoachID: "coach_2"})
	require.Error(t, err)
	assert.IsType(t, &apperrors.AppError{}, err)
}

func TestServiceFulfillWebhookApproved(t *testing.T) {
	ctx := context.Background()
	sub := &subscriptiondomain.Subscription{
		ID:               "sub_1",
		CoachID:          "coach_1",
		Status:           subscriptiondomain.StatusPastDue,
		BillingPeriod:    "monthly",
		CurrentPeriodEnd: time.Now().UTC().AddDate(0, 0, -5),
	}
	subRepo := &fakeSubRepo{byID: sub}
	approved := time.Now().UTC()
	provider := &fakeProvider{
		verifyErr: nil,
		payment: &subscriptiondomain.ProviderPayment{
			ID:                "pay_1",
			Status:            "approved",
			ExternalReference: "subscription:sub_1",
			TransactionAmount: 49900,
			Currency:          "COP",
			DateApproved:      &approved,
		},
	}
	svc := NewService(&config.Config{}, subRepo, provider, &fakePlanRepo{plan: newPlan()}, nil, nil)

	require.NoError(t, svc.FulfillWebhook(ctx, subscriptiondomain.WebhookRequest{Body: []byte(`{"type":"payment","data":{"id":"pay_1"}}`), SignatureHeader: "ts=1,v1=abc"}))
	assert.Equal(t, subscriptiondomain.StatusActive, sub.Status)
	assert.False(t, sub.CancelAtPeriodEnd)
	assert.Len(t, subRepo.recorded, 1)
	assert.Equal(t, "pay_1", subRepo.recorded[0].ProviderPaymentID)
	assert.Len(t, subRepo.saved, 1)
}

// The payment status the frontend polls must flip to "approved" only AFTER
// the provider webhook recorded the payment — that is the whole point of the
// status endpoint.
func TestGetPaymentStatus_FlipsToApprovedAfterTheWebhook(t *testing.T) {
	ctx := context.Background()
	sub := &subscriptiondomain.Subscription{
		ID:            "sub_1",
		AthleteID:     "coach_1",
		CoachID:       "coach_1",
		BillingPeriod: "monthly",
		Status:        subscriptiondomain.StatusActive,
	}
	subRepo := &fakeSubRepo{byID: sub, byAthlete: sub}
	approved := time.Now().UTC()
	provider := &fakeProvider{
		payment: &subscriptiondomain.ProviderPayment{
			ID:                "pay_1",
			Status:            "approved",
			ExternalReference: "subscription:sub_1",
			TransactionAmount: 49900,
			Currency:          "COP",
			DateApproved:      &approved,
		},
	}
	svc := NewService(&config.Config{}, subRepo, provider, &fakePlanRepo{plan: newPlan()}, nil, nil)

	status, _, err := svc.GetPaymentStatus(ctx, "coach_1")
	require.NoError(t, err)
	assert.Equal(t, PaymentStatusPending, status)

	require.NoError(t, svc.FulfillWebhook(ctx, subscriptiondomain.WebhookRequest{
		Body:            []byte(`{"type":"payment","data":{"id":"pay_1"}}`),
		SignatureHeader: "ts=1,v1=abc",
	}))

	subRepo.hasApprovedPayment = true
	status, _, err = svc.GetPaymentStatus(ctx, "coach_1")
	require.NoError(t, err)
	assert.Equal(t, PaymentStatusApproved, status)
}

// fakeCheckoutRecorder records the payments confirmed for a pending checkout.
type fakeCheckoutRecorder struct {
	checkoutID string
	paymentID  string
	amount     float64
	currency   string
	calls      int
}

func (f *fakeCheckoutRecorder) MarkPaid(ctx context.Context, checkoutID, providerPaymentID string, amount float64, currency string) error {
	f.checkoutID = checkoutID
	f.paymentID = providerPaymentID
	f.amount = amount
	f.currency = currency
	f.calls++
	return nil
}

// A checkout paid BEFORE the buyer registered must not fail the webhook: the
// payment is recorded on the pending checkout and claimed later.
func TestFulfillWebhook_CheckoutReferenceIsRecordedOnThePendingCheckout(t *testing.T) {
	ctx := context.Background()
	approved := time.Now().UTC()
	provider := &fakeProvider{
		payment: &subscriptiondomain.ProviderPayment{
			ID:                "pay_checkout_1",
			Status:            "approved",
			ExternalReference: "checkout:chk_123",
			TransactionAmount: 59,
			Currency:          "COP",
			DateApproved:      &approved,
		},
	}
	recorder := &fakeCheckoutRecorder{}
	svc := NewService(&config.Config{}, &fakeSubRepo{}, provider, &fakePlanRepo{plan: newPlan()}, nil, nil).
		WithCheckoutRecorder(recorder)

	require.NoError(t, svc.FulfillWebhook(ctx, subscriptiondomain.WebhookRequest{
		Body:            []byte(`{"type":"payment","data":{"id":"pay_checkout_1"}}`),
		SignatureHeader: "ts=1,v1=abc",
	}))

	require.Equal(t, 1, recorder.calls)
	assert.Equal(t, "chk_123", recorder.checkoutID)
	assert.Equal(t, "pay_checkout_1", recorder.paymentID)
	assert.Equal(t, 59.0, recorder.amount)
}

func TestServiceFulfillWebhookInvalidSignature(t *testing.T) {	ctx := context.Background()
	svc := NewService(&config.Config{}, &fakeSubRepo{}, &fakeProvider{verifyErr: subscriptiondomain.ErrInvalidSignature}, &fakePlanRepo{plan: newPlan()}, nil, nil)

	err := svc.FulfillWebhook(ctx, subscriptiondomain.WebhookRequest{Body: []byte("{}"), SignatureHeader: "bad"})
	assert.ErrorIs(t, err, subscriptiondomain.ErrInvalidSignature)
}

func TestServiceFulfillWebhookNotApproved(t *testing.T) {
	ctx := context.Background()
	sub := &subscriptiondomain.Subscription{ID: "sub_1", CoachID: "coach_1", Status: subscriptiondomain.StatusActive}
	subRepo := &fakeSubRepo{byID: sub}
	provider := &fakeProvider{
		verifyErr: nil,
		payment: &subscriptiondomain.ProviderPayment{
			ID:                "pay_1",
			Status:            "rejected",
			ExternalReference: "subscription:sub_1",
			TransactionAmount: 49900,
		},
	}
	svc := NewService(&config.Config{}, subRepo, provider, &fakePlanRepo{plan: newPlan()}, nil, nil)

	require.NoError(t, svc.FulfillWebhook(ctx, subscriptiondomain.WebhookRequest{Body: []byte(`{"type":"payment","data":{"id":"pay_1"}}`), SignatureHeader: "ts=1,v1=abc"}))
	// Rejected payment: subscription untouched, nothing recorded
	assert.Equal(t, subscriptiondomain.StatusActive, sub.Status)
	assert.Len(t, subRepo.recorded, 0)
	assert.Len(t, subRepo.saved, 0)
}

func TestServiceFulfillWebhookIdempotent(t *testing.T) {
	ctx := context.Background()
	sub := &subscriptiondomain.Subscription{ID: "sub_1", CoachID: "coach_1", Status: subscriptiondomain.StatusActive}
	subRepo := &fakeSubRepo{
		byID:       sub,
		getPayment: &subscriptiondomain.Payment{ProviderPaymentID: "pay_1"},
	}
	provider := &fakeProvider{
		verifyErr: nil,
		payment: &subscriptiondomain.ProviderPayment{
			ID:                "pay_1",
			Status:            "approved",
			ExternalReference: "subscription:sub_1",
		},
	}
	svc := NewService(&config.Config{}, subRepo, provider, &fakePlanRepo{plan: newPlan()}, nil, nil)

	require.NoError(t, svc.FulfillWebhook(ctx, subscriptiondomain.WebhookRequest{Body: []byte(`{"type":"payment","data":{"id":"pay_1"}}`), SignatureHeader: "ts=1,v1=abc"}))
	// Already recorded: no-op, subscription untouched
	assert.Len(t, subRepo.recorded, 0)
	assert.Len(t, subRepo.saved, 0)
}
