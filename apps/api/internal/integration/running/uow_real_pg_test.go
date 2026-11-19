package running_test

import (
	"context"
	"database/sql"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"

	domain "github.com/innotechlabs01/mr-training-api/internal/domain/running"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	runninginfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/running"
)

func TestIntegration_UoW_RealPG_commit_and_rollback(t *testing.T) {
	db := newTestDB(t)

	repo := runninginfra.NewRepository(db.DB)
	sessionID := "uow-test-" + uuid.NewString()
	aggregateID := "uow-probe-" + uuid.NewString()

	sessionsBefore := countRows(t, db, "running_sessions", "id", sessionID)
	outboxBefore := countRows(t, db, "outbox", "aggregate_id", aggregateID)
	require.Equal(t, 0, sessionsBefore)
	require.Equal(t, 0, outboxBefore)

	// ROLLBACK scenario: business write succeeds, Outbox payload fails.
	uow := database.NewUnitOfWork(db.DB)
	require.NoError(t, uow.Begin(context.Background(), "uow-user", "uow-coach", "coach"))
	txRepo := repo.WithExecutor(uow.Tx())
	session := &domain.RunningSession{
		ID:        sessionID,
		UserID:    "uow-user",
		Date:      "2026-01-01",
		Source:    "manual",
		CreatedAt: "2026-01-01T00:00:00Z",
	}
	require.NoError(t, txRepo.SaveSession(context.Background(), session))

	// Controlled failure in SaveOutbox after the business write, still inside the transaction.
	badChan := make(chan int)
	err := txRepo.SaveOutbox(context.Background(), "template.created", "template", aggregateID, "uow-coach", "", map[string]interface{}{"bad": badChan})
	require.Error(t, err)

	// Rollback triggered by us after failure.
	require.NoError(t, uow.Rollback(context.Background()))

	var sessionsAfterRollback, outboxAfterRollback int
	db.DB.QueryRowContext(context.Background(), "SELECT count(*) FROM running_sessions WHERE id = $1", sessionID).Scan(&sessionsAfterRollback)
	db.DB.QueryRowContext(context.Background(), "SELECT count(*) FROM outbox WHERE aggregate_id = $1", aggregateID).Scan(&outboxAfterRollback)
	require.Equal(t, 0, sessionsAfterRollback, "business row must not persist after rollback")
	require.Equal(t, 0, outboxAfterRollback, "outbox row must not persist after rollback")

	// COMMIT scenario (isolated transaction then cleanup).
	uow2 := database.NewUnitOfWork(db.DB)
	require.NoError(t, uow2.Begin(context.Background(), "uow-user", "uow-coach", "coach"))
	txRepo2 := repo.WithExecutor(uow2.Tx())
	require.NoError(t, txRepo2.SaveSession(context.Background(), session))
	require.NoError(t, txRepo2.SaveOutbox(context.Background(), "template.created", "template", aggregateID, "uow-coach", "", map[string]interface{}{"probe": true}))
	require.NoError(t, uow2.Commit(context.Background()))

	var sessionsCommitted, outboxCommitted int
	db.DB.QueryRowContext(context.Background(), "SELECT count(*) FROM running_sessions WHERE id = $1", sessionID).Scan(&sessionsCommitted)
	db.DB.QueryRowContext(context.Background(), "SELECT count(*) FROM outbox WHERE aggregate_id = $1", aggregateID).Scan(&outboxCommitted)
	require.Equal(t, 1, sessionsCommitted, "business row persisted")
	require.Equal(t, 1, outboxCommitted, "outbox row persisted")
	// cleanup only our test rows.
	db.DB.ExecContext(context.Background(), "DELETE FROM running_sessions WHERE id = $1", sessionID)
	db.DB.ExecContext(context.Background(), "DELETE FROM outbox WHERE aggregate_id = $1", aggregateID)

	var finalSessions, finalOutbox int
	db.DB.QueryRowContext(context.Background(), "SELECT count(*) FROM running_sessions WHERE id = $1", sessionID).Scan(&finalSessions)
	db.DB.QueryRowContext(context.Background(), "SELECT count(*) FROM outbox WHERE aggregate_id = $1", aggregateID).Scan(&finalOutbox)
	require.Equal(t, 0, finalSessions)
	require.Equal(t, 0, finalOutbox)
}

func countRows(t *testing.T, db interface{}, table, col, value string) int {
	var n int
	// type assertion supported
	switch d := db.(type) {
	case *database.DB:
		err := d.DB.QueryRowContext(context.Background(), "SELECT count(*) FROM "+table+" WHERE "+col+" = $1", value).Scan(&n)
		if err != nil { t.Fatal(err) }
	case interface{ QueryRowContext(context.Context, string, ...interface{}) *sql.Row }:
		err := d.QueryRowContext(context.Background(), "SELECT count(*) FROM "+table+" WHERE "+col+" = $1", value).Scan(&n)
		if err != nil { t.Fatal(err) }
	}
	return n
}
