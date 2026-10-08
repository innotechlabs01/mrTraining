package payment

import (
	"context"
	"testing"

	"github.com/innotechlabs01/mr-training-api/internal/application/payment/service"
	"github.com/innotechlabs01/mr-training-api/internal/config"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/store"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

// mockStoreRepository es un mock del repositorio de store para los tests.
type mockStoreRepository struct {
	ctrl     *gomock.Controller
	recorder *gomock.Recorder
}

func (m *mockStoreRepository) EXPECT() *gomock.Expectations {
	return m.ctrl.EXPECT()
}

func (m *mockStoreRepository) GetProduct(ctx context.Context, id string) (*product.Product, error) {
	m.ctrl.T()
	return nil, nil
}

func (m *mockStoreRepository) CreatePurchase(ctx context.Context, tx *store.Tx, purchase *store.Purchase) error {
	m.ctrl.T()
	return nil
}

func (m *mockStoreRepository) UpdateStock(ctx context.Context, tx *store.Tx, productID string, delta int) error {
	m.ctrl.T()
	return nil
}

func (m *mockStoreRepository) BeginTx(ctx context.Context) (*store.Tx, error) {
	m.ctrl.T()
	return nil, nil
}

func (m *mockStoreRepository) CommitTx(ctx context.Context) error {
	m.ctrl.T()
	return nil
}

func (m *mockStoreRepository) RollbackTx(ctx context.Context) error {
	m.ctrl.T()
	return nil
}

func TestService_CreateProductPreference(t *testing.T) {
	cfg, err := config.Load()
	require.NoError(t, err)
	require.NotNil(t, cfg)

	storeRepo := &mockStoreRepository{ctrl: gomock.NewController(t)}
	svc := service.NewService(cfg, storeRepo)

	// Test con type "product"
	req := &service.PreferenceRequest{
		PriceID:  "prod_123",
		AthleteID: "ath_456",
		Type:     "product",
		Quantity: 1,
	}

	_, err = svc.CreatePreference(context.Background(), req)
	// Debería fallar al obtener el producto (mock devuelve nil), pero no por error de config
	require.Error(t, err)
}

func TestService_CreateMembershipPreference(t *testing.T) {
	cfg, err := config.Load()
	require.NoError(t, err)
	require.NotNil(t, cfg)

	storeRepo := &mockStoreRepository{ctrl: gomock.NewController(t)}
	svc := service.NewService(cfg, storeRepo)

	// Test con type "membership"
	req := &service.PreferenceRequest{
		PriceID:  "mem_789",
		AthleteID: "ath_456",
		Type:     "membership",
		Quantity: 1,
	}

	_, err = svc.CreatePreference(context.Background(), req)
	require.Error(t, err)
}

func TestService_VerifyWebhookSignature(t *testing.T) {
	cfg, err := config.Load()
	require.NoError(t, err)
	require.NotNil(t, cfg)

	storeRepo := &mockStoreRepository{ctrl: gomock.NewController(t)}
	svc := service.NewService(cfg, storeRepo)

	// Test con firma vacía
	valid, err := svc.VerifyWebhookSignature([]byte{}, "")
	require.False(t, valid)
	require.Error(t, err)

	// Test con body inválido
	valid, err = svc.VerifyWebhookSignature([]byte("invalid"), "sig")
	require.False(t, valid)
	require.Error(t, err)

	// Test con tipo payment
	body := `{"id":"wp1","created_at":"2024-01-01","type":"payment","data":{"id":"pay1","amount":10000,"status":"approved","currency":"COP"}}`
	valid, err = svc.VerifyWebhookSignature([]byte(body), "sig")
	require.True(t, valid)
	require.NoError(t, err)
}

func TestService_ProcessWebhook_Approved(t *testing.T) {
	cfg, err := config.Load()
	require.NoError(t, err)
	require.NotNil(t, cfg)

	storeRepo := &mockStoreRepository{ctrl: gomock.NewController(t)}
	svc := service.NewService(cfg, storeRepo)

	// Body de webhook aprobado
	body := `{"id":"wp1","created_at":"2024-01-01","type":"payment","data":{"id":"pay1","amount":10000,"status":"approved","currency":"COP"}}`
	signature := ""

	resp, err := svc.ProcessWebhook([]byte(body), signature)
	require.NotNil(t, resp)
	require.Error(t, err) // firma vacía debería fallar
	require.Nil(t, resp)
}

func TestService_ProcessWebhook_Valid(t *testing.T) {
	cfg, err := config.Load()
	require.NoError(t, err)
	require.NotNil(t, cfg)

	storeRepo := &mockStoreRepository{ctrl: gomock.NewController(t)}
	svc := service.NewService(cfg, storeRepo)

	// Body de webhook aprobado con firma simulada
	body := `{"id":"wp1","created_at":"2024-01-01","type":"payment","data":{"id":"pay1","amount":10000,"status":"approved","currency":"COP"}}`
	signature := "mock_sig"

	resp, err := svc.ProcessWebhook([]byte(body), signature)
	require.NotNil(t, resp)
	require.NoError(t, err)
	require.NotNil(t, resp)
	require.Equal(t, "succeeded", resp.Status)
	require.Equal(t, "COP", resp.Currency)
}

func TestService_GetPaymentStatus(t *testing.T) {
	cfg, err := config.Load()
	require.NoError(t, err)
	require.NotNil(t, cfg)

	storeRepo := &mockStoreRepository{ctrl: gomock.NewController(t)}
	svc := service.NewService(cfg, storeRepo)

	// Test con ID válido
	status, err := svc.GetPaymentStatus("pay_123")
	require.NoError(t, err)
	require.Equal(t, "approved", status)

	// Test con ID vacío
	status, err = svc.GetPaymentStatus("")
	require.NoError(t, err)
	require.Equal(t, "pending", status)
}