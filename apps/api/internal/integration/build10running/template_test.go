package running_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"

	runningapp "github.com/innotechlabs01/mr-training-api/internal/application/running"
	domain "github.com/innotechlabs01/mr-training-api/internal/domain/running"
	runninginfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/running"
)

func TestBuild10_TemplateCreateListCrossCoach(t *testing.T) {
	db := newSuperDB(t)
	repo := runninginfra.NewRepository(db.DB)
	svc := runningapp.NewService(repo, db.DB)

	coachA := "coach-tpl-a-" + uuid.NewString()[:8]
	coachB := "coach-tpl-b-" + uuid.NewString()[:8]

	tplA := &domain.RunningWorkoutTemplate{CoachID: coachA, Name: "A Template", Type: domain.TemplateTypeFreeRun, Version: 1}
	tplB := &domain.RunningWorkoutTemplate{CoachID: coachB, Name: "B Template", Type: domain.TemplateTypeFreeRun, Version: 1}
	require.NoError(t, svc.CreateTemplate(context.Background(), tplA))
	require.NoError(t, svc.CreateTemplate(context.Background(), tplB))

	listA, err := svc.ListTemplatesByCoach(context.Background(), coachA)
	require.NoError(t, err)
	require.Len(t, listA, 1)
	require.Equal(t, coachA, listA[0].CoachID)

	listB, err := svc.ListTemplatesByCoach(context.Background(), coachB)
	require.NoError(t, err)
	require.Len(t, listB, 1)
	require.Equal(t, coachB, listB[0].CoachID)
}
