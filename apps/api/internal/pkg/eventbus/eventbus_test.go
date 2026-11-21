package eventbus

import (
	"context"
	"encoding/json"
	"errors"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/innotechlabs01/mr-training-api/pkg/telemetry"
)

type failingPublisher struct {
	err error
}

func (p *failingPublisher) Publish(context.Context, DomainEvent) error { return p.err }

func TestNewEvent_CapturesCorrelationAndTenant(t *testing.T) {
	ctx := telemetry.WithCorrelationID(context.Background(), "corr-99")
	ev := NewEvent(ctx, SubjectPaymentApproved, "subscription", "sub-1", map[string]interface{}{"amount": 100}).
		WithTenant("coach-1", "ath-1", "org-1")

	require.NotEmpty(t, ev.EventID)
	require.Equal(t, 1, ev.EventVersion)
	require.Equal(t, "corr-99", ev.CorrelationID)
	require.Equal(t, "coach-1", ev.CoachID)
	require.Equal(t, "ath-1", ev.AthleteID)
	require.Equal(t, "org-1", ev.OrganizationID)
}

func TestInMemoryBus_WildcardAndIdempotency(t *testing.T) {
	bus := NewInMemoryBus()
	var received []string

	sub, err := bus.Subscribe(context.Background(), "payment-tracker", "payment.*", func(_ context.Context, ev DomainEvent) error {
		received = append(received, ev.EventID)
		return nil
	})
	require.NoError(t, err)
	defer sub.Unsubscribe()

	ev := NewEvent(context.Background(), SubjectPaymentApproved, "subscription", "sub-1", nil)
	require.NoError(t, bus.Publish(context.Background(), ev))
	// Re-publishing same EventID to same durable subscriber is deduplicated.
	require.NoError(t, bus.Publish(context.Background(), ev))
	// Non-matching subject ignored.
	require.NoError(t, bus.Publish(context.Background(), NewEvent(context.Background(), SubjectErrorReported, "error", "e-1", nil)))

	require.Equal(t, []string{ev.EventID}, received)
}

func TestSQLOutboxStore_InsertAndRelayPublish(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	store := NewSQLOutboxStore(db)
	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta("SELECT set_config('app.internal_execution_context', 'system_worker', true)")).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO outbox")).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	ev := NewEvent(context.Background(), SubjectCheckoutPaid, "checkout", "chk-1", map[string]interface{}{"email": "a@b.co"})
	require.NoError(t, store.Insert(context.Background(), nil, ev))
	require.NoError(t, mock.ExpectationsWereMet())

	bus := NewInMemoryBus()
	var got string
	_, _ = bus.Subscribe(context.Background(), "chk-sub", "checkout.*", func(_ context.Context, e DomainEvent) error {
		got = e.AggregateID
		return nil
	})
	relay := NewRelay(db, bus, zap.NewNop())

	payload, _ := json.Marshal(ev.Payload)
	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta("SELECT set_config('app.internal_execution_context', 'system_worker', true)")).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectQuery(regexp.QuoteMeta("FROM outbox")).
		WithArgs(100).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "event_id", "event_version", "event_type", "aggregate_type", "aggregate_id",
			"coach_id", "athlete_id", "organization_id", "correlation_id", "causation_id",
			"payload", "metadata", "occurred_at", "attempts",
		}).AddRow("row-1", ev.EventID, 1, ev.EventType, "checkout", "chk-1", nil, nil, nil, "corr-1", nil, payload, []byte(`{}`), time.Now().UTC(), 0))
	mock.ExpectExec(regexp.QuoteMeta("UPDATE outbox SET status = 'processing'")).
		WithArgs("outbox-relay", sqlmock.AnyArg(), "row-1").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta("SELECT set_config('app.internal_execution_context', 'system_worker', true)")).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(regexp.QuoteMeta("UPDATE outbox")).
		WithArgs(1, "row-1").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	require.NoError(t, relay.processBatch(context.Background()))
	require.Equal(t, "chk-1", got)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestRelay_MarksDeadAndWritesDLQOnMaxAttempts(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	relay := NewRelay(db, &failingPublisher{err: errors.New("nats down")}, zap.NewNop())
	relay.maxAttempts = 2

	payload := []byte(`{"id":"1"}`)
	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta("SELECT set_config('app.internal_execution_context', 'system_worker', true)")).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectQuery(regexp.QuoteMeta("FROM outbox")).
		WithArgs(100).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "event_id", "event_version", "event_type", "aggregate_type", "aggregate_id",
			"coach_id", "athlete_id", "organization_id", "correlation_id", "causation_id",
			"payload", "metadata", "occurred_at", "attempts",
		}).AddRow("row-9", "evt-9", 1, SubjectErrorReported, "error", "err-1", nil, nil, nil, "c9", nil, payload, []byte(`{}`), time.Now().UTC(), 1))
	mock.ExpectExec(regexp.QuoteMeta("UPDATE outbox SET status = 'processing'")).
		WithArgs("outbox-relay", sqlmock.AnyArg(), "row-9").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta("SELECT set_config('app.internal_execution_context', 'system_worker', true)")).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(regexp.QuoteMeta("SET status = 'dead'")).
		WithArgs(2, "nats down", "row-9").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta("SELECT set_config('app.internal_execution_context', 'system_worker', true)")).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO dead_letter_events")).
		WithArgs("OUTBOX", SubjectErrorReported, "outbox-relay", "evt-9", SubjectErrorReported, "c9", string(payload), "nats down", 2).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	require.NoError(t, relay.processBatch(context.Background()))
	require.NoError(t, mock.ExpectationsWereMet())
}
