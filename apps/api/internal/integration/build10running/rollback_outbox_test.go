package running_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"

	runningapp "github.com/innotechlabs01/mr-training-api/internal/application/running"
	domain "github.com/innotechlabs01/mr-training-api/internal/domain/running"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	runninginfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/running"
)

func TestBuild10_RollbackOnIntermediateFailure(t *testing.T) {
	db := newSuperDB(t)
	repo := runninginfra.NewRepository(db.DB)

	sessionID := "rollback-sess-" + uuid.NewString()
	aggregateID := "rollback-agg-" + uuid.NewString()
	coachID := "coach-rb-" + uuid.NewString()[:8]
	athleteID := "ath-rb-" + uuid.NewString()[:8]

	uow := database.NewUnitOfWork(db.DB)
	require.NoError(t, uow.Begin(context.Background(), athleteID, coachID, "athlete"))
	txRepo := repo.WithExecutor(uow.Tx()).(*runninginfra.Repository)

	session := &domain.RunningSession{
		ID:        sessionID,
		UserID:    athleteID,
		Date:      "2026-01-01",
		Source:    "manual",
		CreatedAt: "2026-01-01T00:00:00Z",
	}
	require.NoError(t, txRepo.SaveSession(context.Background(), session))

	badChan := make(chan int)
	err := txRepo.SaveOutbox(context.Background(), "template.created", "template", aggregateID, coachID, athleteID, map[string]interface{}{"bad": badChan})
	require.Error(t, err)

	require.NoError(t, uow.Rollback(context.Background()))

	var n int
	db.DB.QueryRowContext(context.Background(), "SELECT count(*) FROM running_sessions WHERE id = $1", sessionID).Scan(&n)
	require.Equal(t, 0, n)
	db.DB.QueryRowContext(context.Background(), "SELECT count(*) FROM outbox WHERE aggregate_id = $1", aggregateID).Scan(&n)
	require.Equal(t, 0, n)
}

func TestBuild10_OutboxAtomicIfProduced(t *testing.T) {
	db := newSuperDB(t)
	repo := runninginfra.NewRepository(db.DB)
	svc := runningapp.NewService(repo, db.DB)

	coachID := "coach-outbox-" + uuid.NewString()[:8]
	tpl := &domain.RunningWorkoutTemplate{CoachID: coachID, Name: "Outbox Template", Type: domain.TemplateTypeFreeRun, Version: 1}
	require.NoError(t, svc.CreateTemplate(context.Background(), tpl))

	var cnt int
	db.DB.QueryRowContext(context.Background(), "SELECT count(*) FROM outbox WHERE aggregate_id = $1 AND event_type = 'template.created'", tpl.ID).Scan(&cnt)
	require.Equal(t, 1, cnt, "template.created outbox row should be produced atomically")
}
