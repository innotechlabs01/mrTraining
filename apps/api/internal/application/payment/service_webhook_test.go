package payment

import (
	"context"
	"fmt"
	"net/http"
	"testing"

	"github.com/innotechlabs01/mr-training-api/internal/config"
	"github.com/innotechlabs01/mr-training-api/internal/domain/membership"
	"github.com/innotechlabs01/mr-training-api/internal/domain/store"
	"github.com/innotechlabs01/mr-training-api/internal/domain/subscription"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
	"github.com/stretchr/testify/require"
)

type fakeProviderWH struct {
	verifyErr   error
	payment     *subscription.ProviderPayment
	paymentErr  error
	checkout    *subscription.CheckoutResponse
	checkoutErr error
}

func (f *fakeProviderWH) CreateCheckout(ctx context.Context, req subscription.CheckoutRequest) (*subscription.CheckoutResponse, error) {
	if f.checkoutErr != nil {
		return nil, f.checkoutErr
	}
	return f.checkout, nil
}
func (f *fakeProviderWH) VerifySignature(body []byte, signatureHeader string) error {
	return f.verifyErr
}
func (f *fakeProviderWH) FetchPayment(ctx context.Context, paymentID string) (*subscription.ProviderPayment, error) {
	if f.paymentErr != nil {
		return nil, f.paymentErr
	}
	return f.payment, nil
}

type fakeMembershipReaderWH struct {
	m           *membership.Membership
	getErr      error
	activateErr error
	recorded    map[string]bool
	activateN   int
	lastAmount  float64
	lastPayID   string
}

func (f *fakeMembershipReaderWH) GetMembership(ctx context.Context, athleteID string) (*membership.Membership, error) {
	if f.getErr != nil {
		return nil, f.getErr
	}
	return f.m, nil
}
func (f *fakeMembershipReaderWH) ActivateAfterPayment(ctx context.Context, membershipID, paymentID string, amount float64) error {
	if membershipID == "" || paymentID == "" {
		return errors.BadRequest("membership id and payment id are required")
	}
	if f.recorded == nil {
		f.recorded = map[string]bool{}
	}
	if f.recorded[paymentID] {
		return nil
	}
	if f.activateErr != nil {
		return f.activateErr
	}
	f.recorded[paymentID] = true
	f.activateN++
	f.lastAmount = amount
	f.lastPayID = paymentID
	return nil
}

type fakeStoreRepoWH struct {
	products    map[string]*store.Product
	orders      map[string]*store.Order
	createErr   error
	fulfillErr  error
	fulfillN    int
	lastOrder   string
	lastExtRef  string
}

func (f *fakeStoreRepoWH) ListProducts(ctx context.Context) ([]*store.Product, error) { return nil, nil }
func (f *fakeStoreRepoWH) GetProduct(ctx context.Context, id string) (*store.Product, error) {
	p, ok := f.products[id]
	if !ok {
		return nil, fmt.Errorf("not found")
	}
	return p, nil
}
func (f *fakeStoreRepoWH) CreatePurchase(ctx context.Context, purchase *store.Purchase) error { return nil }
func (f *fakeStoreRepoWH) ListPurchasesByAthlete(ctx context.Context, athleteID string) ([]*store.Purchase, error) {
	return nil, nil
}
func (f *fakeStoreRepoWH) ListPurchases(ctx context.Context) ([]*store.Purchase, error) { return nil, nil }
func (f *fakeStoreRepoWH) CreateOrderWithItems(ctx context.Context, order *store.Order, items []*store.OrderItem) error {
	if f.createErr != nil {
		return f.createErr
	}
	if f.orders == nil {
		f.orders = map[string]*store.Order{}
	}
	o := *order
	f.orders[order.ID] = &o
	return nil
}
func (f *fakeStoreRepoWH) GetOrder(ctx context.Context, orderID string) (*store.Order, error) {
	o, ok := f.orders[orderID]
	if !ok {
		return nil, fmt.Errorf("order not found")
	}
	cp := *o
	return &cp, nil
}
func (f *fakeStoreRepoWH) GetOrderItems(ctx context.Context, orderID string) ([]*store.OrderItem, error) {
	return nil, nil
}
func (f *fakeStoreRepoWH) FulfillOrder(ctx context.Context, orderID, externalRef string) (*store.Order, error) {
	if _, ok := f.orders[orderID]; !ok {
		return nil, fmt.Errorf("order not found")
	}
	if f.fulfillErr != nil {
		return nil, f.fulfillErr
	}
	if f.orders[orderID].Status == "paid" {
		f.lastOrder = orderID
		f.lastExtRef = externalRef
		return f.orders[orderID], nil
	}
	f.orders[orderID].Status = "paid"
	f.orders[orderID].ExternalRef = externalRef
	f.fulfillN++
	f.lastOrder = orderID
	f.lastExtRef = externalRef
	return f.orders[orderID], nil
}

func TestProcessWebhook_ValidSignature_ApprovedMembership(t *testing.T) {
	provider := &fakeProviderWH{
		payment: &subscription.ProviderPayment{
			ID:                "pay_1",
			Status:            "approved",
			ExternalReference: "membership:mem_1",
			TransactionAmount: 5000,
			Currency:          "COP",
		},
	}
	mem := &fakeMembershipReaderWH{}
	svc := NewService(&config.Config{}, nil, mem, provider)

	err := svc.ProcessWebhook(context.Background(), []byte(`{"type":"transaction.updated","data":{"id":"pay_1","transaction":{"id":"pay_1"}}}`), "sig")
	require.NoError(t, err)
	require.Equal(t, 1, mem.activateN)
	require.Equal(t, "pay_1", mem.lastPayID)
	require.InDelta(t, 5000.0, mem.lastAmount, 0.001)
}

func TestProcessWebhook_InvalidSignature(t *testing.T) {
	provider := &fakeProviderWH{verifyErr: subscription.ErrInvalidSignature}
	svc := NewService(&config.Config{}, nil, &fakeMembershipReaderWH{}, provider)

	err := svc.ProcessWebhook(context.Background(), []byte(`{}`), "bad")
	require.Error(t, err)
	appErr, ok := err.(*errors.AppError)
	require.True(t, ok)
	require.Equal(t, http.StatusUnauthorized, appErr.Status)
}

func TestProcessWebhook_MalformedEvent(t *testing.T) {
	provider := &fakeProviderWH{} // verify ok
	svc := NewService(&config.Config{}, nil, &fakeMembershipReaderWH{}, provider)

	err := svc.ProcessWebhook(context.Background(), []byte(`{not-json`), "sig")
	require.Error(t, err)
	appErr, ok := err.(*errors.AppError)
	require.True(t, ok)
	require.Equal(t, http.StatusBadRequest, appErr.Status)
}

func TestProcessWebhook_PendingTransaction(t *testing.T) {
	provider := &fakeProviderWH{
		payment: &subscription.ProviderPayment{
			ID: "pay_2", Status: "pending", ExternalReference: "membership:mem_1",
		},
	}
	mem := &fakeMembershipReaderWH{}
	svc := NewService(&config.Config{}, nil, mem, provider)

	err := svc.ProcessWebhook(context.Background(), []byte(`{"type":"transaction.updated","data":{"id":"pay_2"}}`), "sig")
	require.NoError(t, err)
	require.Equal(t, 0, mem.activateN)
}

func TestProcessWebhook_RejectedTransaction(t *testing.T) {
	provider := &fakeProviderWH{
		payment: &subscription.ProviderPayment{
			ID: "pay_3", Status: "rejected", ExternalReference: "membership:mem_1",
		},
	}
	mem := &fakeMembershipReaderWH{}
	svc := NewService(&config.Config{}, nil, mem, provider)

	err := svc.ProcessWebhook(context.Background(), []byte(`{"type":"transaction.updated","data":{"id":"pay_3"}}`), "sig")
	require.NoError(t, err)
	require.Equal(t, 0, mem.activateN)
}

func TestProcessWebhook_IDReferenceMismatch(t *testing.T) {
	// Approved payment, but external reference is not a valid membership/cart
	// reference: fulfillment should fail (no silent absorption).
	mem := &fakeMembershipReaderWH{}
	storeRepo := &fakeStoreRepoWH{}
	provider := &fakeProviderWH{
		payment: &subscription.ProviderPayment{
			ID: "pay_4", Status: "approved", ExternalReference: "invalid-reference",
		},
	}
	svc := NewService(&config.Config{}, storeRepo, mem, provider)

	err := svc.ProcessWebhook(context.Background(), []byte(`{"type":"transaction.updated","data":{"id":"pay_4"}}`), "sig")
	require.Error(t, err)
}

func TestProcessWebhook_MembershipIDMissing(t *testing.T) {
	mem := &fakeMembershipReaderWH{}
	provider := &fakeProviderWH{
		payment: &subscription.ProviderPayment{
			ID: "pay_5", Status: "approved", ExternalReference: "membership:",
		},
	}
	svc := NewService(&config.Config{}, nil, mem, provider)

	err := svc.ProcessWebhook(context.Background(), []byte(`{"type":"transaction.updated","data":{"id":"pay_5"}}`), "sig")
	require.Error(t, err)
}

func TestProcessWebhook_DuplicateIdempotencyMembership(t *testing.T) {
	provider := &fakeProviderWH{
		payment: &subscription.ProviderPayment{
			ID: "pay_6", Status: "approved", ExternalReference: "membership:mem_1",
			TransactionAmount: 5000, Currency: "COP",
		},
	}
	mem := &fakeMembershipReaderWH{}
	svc := NewService(&config.Config{}, nil, mem, provider)

	body := []byte(`{"type":"transaction.updated","data":{"id":"pay_6"}}`)
	require.NoError(t, svc.ProcessWebhook(context.Background(), body, "sig"))
	require.NoError(t, svc.ProcessWebhook(context.Background(), body, "sig"))
	require.Equal(t, 1, mem.activateN)
}

func TestProcessWebhook_DuplicateIdempotencyStore(t *testing.T) {
	storeRepo := &fakeStoreRepoWH{orders: map[string]*store.Order{"ord_dup": {ID: "ord_dup", Status: "pending", Total: 100, Currency: "COP"}}}
	provider := &fakeProviderWH{
		payment: &subscription.ProviderPayment{
			ID: "pay_dup", Status: "approved", ExternalReference: "ord_dup",
			TransactionAmount: 100, Currency: "COP",
		},
	}
	mem := &fakeMembershipReaderWH{}
	svc := NewService(&config.Config{}, storeRepo, mem, provider)

	body := []byte(`{"type":"transaction.updated","data":{"id":"pay_dup"}}`)
	require.NoError(t, svc.ProcessWebhook(context.Background(), body, "sig"))
	require.NoError(t, svc.ProcessWebhook(context.Background(), body, "sig"))
	require.Equal(t, 1, storeRepo.fulfillN) // second is idempotent
}

func TestProcessWebhook_OutOfOrderDelayed(t *testing.T) {
	// First a pending (older) notification, then the approved one: only the
	// approved call activates.
	mem := &fakeMembershipReaderWH{}
	provider := &fakeProviderWH{
		payment: &subscription.ProviderPayment{
			ID: "pay_oo", Status: "pending", ExternalReference: "membership:mem_1",
		},
	}
	svc := NewService(&config.Config{}, nil, mem, provider)

	body := []byte(`{"type":"transaction.updated","data":{"id":"pay_oo"}}`)
	require.NoError(t, svc.ProcessWebhook(context.Background(), body, "sig"))
	require.Equal(t, 0, mem.activateN)

	provider.payment = &subscription.ProviderPayment{
		ID: "pay_oo", Status: "approved", ExternalReference: "membership:mem_1",
		TransactionAmount: 5000, Currency: "COP",
	}
	require.NoError(t, svc.ProcessWebhook(context.Background(), body, "sig"))
	require.Equal(t, 1, mem.activateN)
}

func TestProcessWebhook_AmountCurrencyPropagation(t *testing.T) {
	provider := &fakeProviderWH{
		payment: &subscription.ProviderPayment{
			ID:                "pay_amt",
			Status:            "approved",
			ExternalReference: "membership:mem_1",
			TransactionAmount: 123.45,
			Currency:          "USD",
		},
	}
	mem := &fakeMembershipReaderWH{}
	svc := NewService(&config.Config{}, nil, mem, provider)

	body := []byte(`{"type":"transaction.updated","data":{"id":"pay_amt"}}`)
	require.NoError(t, svc.ProcessWebhook(context.Background(), body, "sig"))
	require.InDelta(t, 123.45, mem.lastAmount, 0.001)
}

func TestCreateCartPreference_InvalidLinksAndErrors(t *testing.T) {
	repo := &fakeStoreRepoWH{products: map[string]*store.Product{
		"p1": {ID: "p1", Name: "Prod", Price: 10, Stock: 5},
	}}
	provider := &fakeProviderWH{checkout: &subscription.CheckoutResponse{CheckoutURL: ""}}
	svc := NewService(&config.Config{AppURL: "https://app"}, repo, &fakeMembershipReaderWH{}, provider)

	_, err := svc.CreateCartPreference(context.Background(), "ath_1", []CartPreferenceItem{{ProductID: "p1", Quantity: 1}})
	require.Error(t, err)
	appErr, ok := err.(*errors.AppError)
	require.True(t, ok)
	require.Equal(t, http.StatusInternalServerError, appErr.Status)
}

func TestCreateCartPreference_EmptyAndDuplicateAndUnknown(t *testing.T) {
	repo := &fakeStoreRepoWH{products: map[string]*store.Product{}}
	svc := NewService(&config.Config{}, repo, &fakeMembershipReaderWH{}, &fakeProviderWH{})

	_, err := svc.CreateCartPreference(context.Background(), "ath_1", nil)
	require.Error(t, err)
	_, err = svc.CreateCartPreference(context.Background(), "ath_1", []CartPreferenceItem{{ProductID: "x", Quantity: 1}})
	require.Error(t, err)
	_, err = svc.CreateCartPreference(context.Background(), "", []CartPreferenceItem{{ProductID: "x", Quantity: 1}})
	require.Error(t, err)
}

func TestCreateMembershipPreference_InvalidLink(t *testing.T) {
	mem := &fakeMembershipReaderWH{m: &membership.Membership{ID: "mem_1", PlanName: "Plan", PlanPrice: 100}}
	provider := &fakeProviderWH{checkout: &subscription.CheckoutResponse{CheckoutURL: ""}}
	svc := NewService(&config.Config{AppURL: "https://app"}, nil, mem, provider)

	_, err := svc.CreateMembershipPreference(context.Background(), "ath_1")
	require.Error(t, err)
	appErr, ok := err.(*errors.AppError)
	require.True(t, ok)
	require.Equal(t, http.StatusInternalServerError, appErr.Status)
}

func TestCreateMembershipPreference_ZeroPriceAndNotFound_AlreadyCovered(t *testing.T) {
	mem := &fakeMembershipReaderWH{getErr: errors.NotFound("Membership", "ath_1")}
	svc := NewService(&config.Config{}, nil, mem, &fakeProviderWH{})
	_, err := svc.CreateMembershipPreference(context.Background(), "ath_1")
	require.Error(t, err)
}

func TestGetOrder_InvalidEmpty(t *testing.T) {
	repo := &fakeStoreRepoWH{orders: map[string]*store.Order{}}
	svc := NewService(&config.Config{}, repo, &fakeMembershipReaderWH{}, &fakeProviderWH{})
	_, err := svc.GetOrder(context.Background(), "missing")
	require.Error(t, err)
}
