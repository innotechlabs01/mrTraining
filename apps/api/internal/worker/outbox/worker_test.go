package outbox

import (
	"context"
	"database/sql"
	"errors"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakePublisher captura los eventos publicados para verificar en los tests.
type fakePublisher struct {
	published []Event
	err       error
}

func (f *fakePublisher) Publish(_ context.Context, e Event) error {
	f.published = append(f.published, e)
	return f.err
}

func newTestWorker(t *testing.T) (*sql.DB, sqlmock.Sqlmock, *Worker, *fakePublisher) {
	t.Helper()
	db, mock, err := sqlmock.New()
	require.NoError(t, err)

	pub := &fakePublisher{}
	w := NewWorker(db, "claim-token-1", pub,
		WithPollInterval(time.Millisecond),
		WithMaxAttempts(3),
		WithLeaseTTL(time.Minute),
		WithBaseBackoff(time.Second),
	)
	return db, mock, w, pub
}

func TestClaimNext_PendingEvent(t *testing.T) {
	db, mock, w, _ := newTestWorker(t)
	defer db.Close()

	now := time.Now()
	columns := []string{
		"id", "event_id", "event_type", "aggregate_type", "aggregate_id",
		"coach_id", "athlete_id", "payload", "occurred_at", "status",
		"attempts", "next_retry_at", "last_error",
	}
	mock.ExpectBegin()
	mock.ExpectQuery(regexp.QuoteMeta("FROM outbox")).
		WithArgs("pending", "processing").
		WillReturnRows(sqlmock.NewRows(columns).
			AddRow("outbox-1", "evt-1", "template.created", "template", "tmpl-1",
				"coach-1", "athlete-1", []byte(`{"a":1}`), now, "pending", 0, now, ""))
	mock.ExpectExec(regexp.QuoteMeta("locked_by = $2")).
		WithArgs("processing", "claim-token-1", sqlmock.AnyArg(), "outbox-1", "pending", "processing").
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	event, err := w.claimNext(context.Background())
	require.NoError(t, err)
	require.NotNil(t, event)
	assert.Equal(t, "outbox-1", event.ID)
	assert.Equal(t, "evt-1", event.EventID)
	assert.Equal(t, "template.created", event.EventType)
	assert.Equal(t, "pending", event.Status)

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestClaimNext_NoEvents(t *testing.T) {
	db, mock, w, _ := newTestWorker(t)
	defer db.Close()

	columns := []string{
		"id", "event_id", "event_type", "aggregate_type", "aggregate_id",
		"coach_id", "athlete_id", "payload", "occurred_at", "status",
		"attempts", "next_retry_at", "last_error",
	}
	mock.ExpectBegin()
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT`)).WillReturnRows(sqlmock.NewRows(columns))
	mock.ExpectRollback()

	event, err := w.claimNext(context.Background())
	require.NoError(t, err)
	assert.Nil(t, event)

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestProcess_Success_MarksPublished(t *testing.T) {
	db, mock, w, pub := newTestWorker(t)
	defer db.Close()

	event := Event{ID: "outbox-1", EventID: "evt-1", EventType: "template.created"}

	mock.ExpectExec(regexp.QuoteMeta("published_at = NOW()")).
		WithArgs("published", "outbox-1").
		WillReturnResult(sqlmock.NewResult(1, 1))

	require.NoError(t, w.process(context.Background(), &event))
	assert.Len(t, pub.published, 1)
	assert.Equal(t, "evt-1", pub.published[0].EventID)

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestProcess_Failure_ReschedulesWithBackoff(t *testing.T) {
	db, mock, w, pub := newTestWorker(t)
	defer db.Close()

	pub.err = errors.New("downstream unavailable")
	event := Event{ID: "outbox-1", EventID: "evt-1", EventType: "workout.completed", Attempts: 0}

	mock.ExpectExec(regexp.QuoteMeta("next_retry_at = $3")).
		WithArgs("pending", 1, sqlmock.AnyArg(), "downstream unavailable", "outbox-1").
		WillReturnResult(sqlmock.NewResult(1, 1))

	// process maneja el fallo internamente (reprograma) y no propaga el error.
	require.NoError(t, w.process(context.Background(), &event))
	assert.Len(t, pub.published, 1)

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestProcess_Failure_MarksDeadAfterMaxAttempts(t *testing.T) {
	db, mock, w, pub := newTestWorker(t)
	defer db.Close()

	pub.err = errors.New("permanently down")
	event := Event{ID: "outbox-1", EventID: "evt-1", EventType: "workout.completed", Attempts: 2}

	// maxAttempts=3, attempts+1=3 >= 3 => dead
	mock.ExpectExec(regexp.QuoteMeta("last_error = $3")).
		WithArgs("dead", 3, "permanently down", "outbox-1").
		WillReturnResult(sqlmock.NewResult(1, 1))

	// process maneja el fallo internamente (marca dead) y no propaga el error.
	require.NoError(t, w.process(context.Background(), &event))

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestBackoff_GrowsExponentially(t *testing.T) {
	w := &Worker{baseBackoff: time.Second}
	assert.Equal(t, time.Second, w.backoff(1))   // 1s * 1
	assert.Equal(t, 2*time.Second, w.backoff(2)) // 1s * 2
	assert.Equal(t, 4*time.Second, w.backoff(3)) // 1s * 4
	assert.Equal(t, 8*time.Second, w.backoff(4)) // 1s * 8
}
