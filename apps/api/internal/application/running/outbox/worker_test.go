package outbox

import (
	"context"
	"encoding/json"
	"errors"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	runningapp "github.com/innotechlabs01/mr-training-api/internal/application/running"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestWorker_ProcessBatch_MarksPublishedInsideTxWithSystemWorkerContext(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	w := NewWorker(db, zap.NewNop())

	ch := runningapp.DefaultHub.Subscribe("coach-1")
	defer runningapp.DefaultHub.Unsubscribe("coach-1", ch)

	payload, _ := json.Marshal(map[string]any{"session_id": "s-1"})

	// Batch claim tx
	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta("SELECT set_config('app.internal_execution_context', 'system_worker', true)")).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectQuery(regexp.QuoteMeta("FROM outbox")).
		WithArgs(50).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "event_id", "event_type", "aggregate_type", "aggregate_id", "coach_id", "athlete_id", "payload", "attempts",
		}).AddRow("out-1", "evt-1", "workout.started", "running_session", "s-1", "coach-1", "ath-1", payload, 0))
	mock.ExpectExec(regexp.QuoteMeta("UPDATE outbox SET status = 'processing'")).
		WithArgs("outbox-worker", sqlmock.AnyArg(), "out-1").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	// Publish update tx
	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta("SELECT set_config('app.internal_execution_context', 'system_worker', true)")).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(regexp.QuoteMeta("UPDATE outbox SET status = 'published'")).
		WithArgs(1, "out-1").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	require.NoError(t, w.processBatch(context.Background()))
	require.NoError(t, mock.ExpectationsWereMet())

	select {
	case ev := <-ch:
		require.Equal(t, "workout.started", ev.Type)
	case <-time.After(time.Second):
		t.Fatal("expected running DefaultHub event")
	}
}

func TestWorker_ProcessBatch_RequeuesWithTimeTimestampOnPublishUpdateFailure(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	w := NewWorker(db, zap.NewNop())
	payload, _ := json.Marshal(map[string]any{"session_id": "s-2"})

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta("SELECT set_config('app.internal_execution_context', 'system_worker', true)")).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectQuery(regexp.QuoteMeta("FROM outbox")).
		WithArgs(50).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "event_id", "event_type", "aggregate_type", "aggregate_id", "coach_id", "athlete_id", "payload", "attempts",
		}).AddRow("out-2", "evt-2", "workout.progress", "running_session", "s-2", nil, nil, payload, 0))
	mock.ExpectExec(regexp.QuoteMeta("UPDATE outbox SET status = 'processing'")).
		WithArgs("outbox-worker", sqlmock.AnyArg(), "out-2").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	// Simulate failure marking published
	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta("SELECT set_config('app.internal_execution_context', 'system_worker', true)")).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(regexp.QuoteMeta("UPDATE outbox SET status = 'published'")).
		WithArgs(1, "out-2").
		WillReturnError(errors.New("transient update error"))
	mock.ExpectRollback()

	// Requeue with computed time.Time next_retry_at
	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta("SELECT set_config('app.internal_execution_context', 'system_worker', true)")).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(regexp.QuoteMeta("next_retry_at = $2")).
		WithArgs(1, sqlmock.AnyArg(), "transient update error", "out-2").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	require.NoError(t, w.processBatch(context.Background()))
	require.NoError(t, mock.ExpectationsWereMet())
}
