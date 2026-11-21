package subscription

import (
	"context"
	"encoding/json"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/require"

	"github.com/innotechlabs01/mr-training-api/internal/config"
	subscriptiondomain "github.com/innotechlabs01/mr-training-api/internal/domain/subscription"
	subinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/subscription"
	"github.com/innotechlabs01/mr-training-api/internal/pkg/eventbus"
)

type stubTxPaymentProvider struct {
	payment *subscriptiondomain.ProviderPayment
}

func (p *stubTxPaymentProvider) CreateCheckout(context.Context, subscriptiondomain.CheckoutRequest) (*subscriptiondomain.CheckoutResponse, error) {
	return &subscriptiondomain.CheckoutResponse{CheckoutURL: "https://pay.test", Reference: "ref-1"}, nil
}
func (p *stubTxPaymentProvider) VerifySignature([]byte, string) error { return nil }
func (p *stubTxPaymentProvider) FetchPayment(context.Context, string) (*subscriptiondomain.ProviderPayment, error) {
	return p.payment, nil
}
func (p *stubTxPaymentProvider) Refund(context.Context, string) error { return nil }

func TestFulfillWebhook_WritesPaymentApprovedAndClerkSyncAtomicallyInTx(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	repo := subinfra.NewRepository(db)
	now := time.Now().UTC()
	provider := &stubTxPaymentProvider{
		payment: &subscriptiondomain.ProviderPayment{
			ID:                "wompi-tx-99",
			Status:            "approved",
			ExternalReference: "subscription:sub-1",
			TransactionAmount: 99.5,
			Currency:          "COP",
			DateApproved:      &now,
		},
	}

	outboxStore := eventbus.NewSQLOutboxStore(db)
	svc := NewService(&config.Config{}, repo, provider, nil, nil, nil).
		WithDB(db).
		WithOutbox(outboxStore)

	payCols := []string{"id", "subscription_id", "provider_payment_id", "external_reference", "amount", "currency", "status", "period_start", "period_end", "paid_at", "created_at"}
	subCols := []string{
		"id", "athlete_id", "coach_id", "plan_id", "plan_name", "plan_price", "currency",
		"billing_period", "status", "cancel_at_period_end", "canceled_at", "current_period_start",
		"current_period_end", "grace_period_days", "payment_due_date", "version", "created_at", "updated_at",
	}

	// Pre-tx idempotency check
	mock.ExpectQuery(regexp.QuoteMeta("FROM subscription_payments WHERE provider_payment_id = $1")).
		WithArgs("wompi-tx-99").
		WillReturnRows(sqlmock.NewRows(payCols))

	// Atomic tx
	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta("SELECT set_config('app.internal_execution_context', 'webhook_worker', true)")).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectQuery(regexp.QuoteMeta("FROM subscription_payments WHERE provider_payment_id = $1")).
		WithArgs("wompi-tx-99").
		WillReturnRows(sqlmock.NewRows(payCols))
	mock.ExpectQuery(regexp.QuoteMeta("FROM subscriptions WHERE id = $1")).
		WithArgs("sub-1").
		WillReturnRows(sqlmock.NewRows(subCols).AddRow(
			"sub-1", "ath-1", "coach-1", "plan-pro", "Pro", 99.5, "COP",
			"monthly", "pending", false, nil, now, now.AddDate(0, 1, 0), 5, now, 1, now, now,
		))
	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO subscription_payments")).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectQuery(regexp.QuoteMeta("FROM subscriptions WHERE id = $1")).
		WithArgs("sub-1").
		WillReturnRows(sqlmock.NewRows(subCols).AddRow(
			"sub-1", "ath-1", "coach-1", "plan-pro", "Pro", 99.5, "COP",
			"monthly", "pending", false, nil, now, now.AddDate(0, 1, 0), 5, now, 1, now, now,
		))
	mock.ExpectExec(regexp.QuoteMeta("UPDATE subscriptions")).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO outbox")).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO outbox")).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	body, _ := json.Marshal(map[string]any{
		"event": "transaction.updated",
		"data": map[string]any{
			"transaction": map[string]any{"id": "wompi-tx-99"},
		},
	})

	err = svc.FulfillWebhook(context.Background(), subscriptiondomain.WebhookRequest{
		Body:            body,
		SignatureHeader: "sig",
	})
	require.NoError(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}
