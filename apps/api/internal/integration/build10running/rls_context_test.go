package running_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"

	runningapp "github.com/innotechlabs01/mr-training-api/internal/application/running"
	domain "github.com/innotechlabs01/mr-training-api/internal/domain/running"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	runninginfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/running"
)

func TestBuild10_RLS_OwnCrossAppRole(t *testing.T) {
	superDB := newSuperDB(t)
	appDB := newAppDB(t)

	coachA := "coach-rls-a-" + uuid.NewString()[:8]
	coachB := "coach-rls-b-" + uuid.NewString()[:8]

	// Create templates through app-role service (writes set RLS context).
	svcA := runningapp.NewService(runninginfra.NewRepository(appDB.DB), appDB.DB)
	svcB := runningapp.NewService(runninginfra.NewRepository(appDB.DB), appDB.DB)
	tplA := &domain.RunningWorkoutTemplate{CoachID: coachA, Name: "A", Type: domain.TemplateTypeFreeRun, Version: 1}
	tplB := &domain.RunningWorkoutTemplate{CoachID: coachB, Name: "B", Type: domain.TemplateTypeFreeRun, Version: 1}
	require.NoError(t, svcA.CreateTemplate(context.Background(), tplA))
	require.NoError(t, svcB.CreateTemplate(context.Background(), tplB))

	// Coach A via UoW sees only own template.
	err := runAs(t, appDB, coachA, coachA, "coach", func(repo *runninginfra.Repository) error {
		ts, err := repo.ListTemplatesByCoach(context.Background(), coachA)
		require.NoError(t, err)
		require.Len(t, ts, 1)
		require.Equal(t, coachA, ts[0].CoachID)
		for _, x := range ts {
			require.NotEqual(t, coachB, x.CoachID)
		}
		return nil
	})
	require.NoError(t, err)

	// Coach B isolated.
	err = runAs(t, appDB, coachB, coachB, "coach", func(repo *runninginfra.Repository) error {
		ts, err := repo.ListTemplatesByCoach(context.Background(), coachB)
		require.NoError(t, err)
		require.Len(t, ts, 1)
		require.Equal(t, coachB, ts[0].CoachID)
		return nil
	})
	require.NoError(t, err)

	_ = superDB
}

func TestBuild10_ContextAbsence(t *testing.T) {
	superDB := newSuperDB(t)
	appDB := newAppDB(t)

	coachID := "coach-ctx-" + uuid.NewString()[:8]
	id := uuid.NewString()
	insertMinimalTemplate(t, superDB, id, coachID)

	repo := runninginfra.NewRepository(appDB.DB)
	// No context (pool connection): should not expose row.
	_, err := repo.GetTemplate(context.Background(), id)
	require.Error(t, err)

	// With tenant context: should expose row.
	uow := database.NewUnitOfWork(appDB.DB)
	require.NoError(t, uow.Begin(context.Background(), coachID, coachID, "coach"))
	txRepo := repo.WithExecutor(uow.Tx()).(*runninginfra.Repository)
	got, err := txRepo.GetTemplate(context.Background(), id)
	require.NoError(t, err)
	require.Equal(t, id, got.ID)
	require.NoError(t, uow.Rollback(context.Background()))
}

func TestBuild10_FKAppropriationDenied(t *testing.T) {
	db := newSuperDB(t)
	repo := runninginfra.NewRepository(db.DB)
	asg := &domain.RunningWorkoutAssignment{
		ID:            uuid.NewString(),
		TemplateID:    "nonexistent-template-" + uuid.NewString(),
		AthleteID:     "ath-fk-" + uuid.NewString()[:8],
		CoachID:       "coach-fk-" + uuid.NewString()[:8],
		ScheduledDate: time.Now().Add(time.Hour),
		Status:        domain.AssignmentStatusAssigned,
	}
	err := repo.SaveAssignment(context.Background(), asg)
	require.Error(t, err)
}
