package running_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"

	runningapp "github.com/innotechlabs01/mr-training-api/internal/application/running"
	domain "github.com/innotechlabs01/mr-training-api/internal/domain/running"
	runninginfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/running"
)

func TestBuild10_AssignmentCreateList(t *testing.T) {
	db := newSuperDB(t)
	repo := runninginfra.NewRepository(db.DB)
	svc := runningapp.NewService(repo, db.DB)

	coachID := "coach-asg-" + uuid.NewString()[:8]
	athleteID := "ath-asg-" + uuid.NewString()[:8]

	tpl := &domain.RunningWorkoutTemplate{CoachID: coachID, Name: "Tpl", Type: domain.TemplateTypeFreeRun, Version: 1}
	require.NoError(t, svc.CreateTemplate(context.Background(), tpl))

	asg := &domain.RunningWorkoutAssignment{
		TemplateID:    tpl.ID,
		AthleteID:     athleteID,
		CoachID:       coachID,
		ScheduledDate: time.Now().Add(time.Hour),
		Status:        domain.AssignmentStatusAssigned,
	}
	require.NoError(t, svc.CreateAssignment(context.Background(), asg))

	got, err := svc.GetAssignment(context.Background(), asg.ID)
	require.NoError(t, err)
	require.Equal(t, athleteID, got.AthleteID)
	require.Equal(t, coachID, got.CoachID)

	listCoach, err := svc.ListAssignmentsByCoach(context.Background(), coachID)
	require.NoError(t, err)
	require.NotEmpty(t, listCoach)

	listAthlete, err := svc.ListAssignmentsByAthlete(context.Background(), athleteID, "")
	require.NoError(t, err)
	require.NotEmpty(t, listAthlete)
}

func TestBuild10_AssignmentCrossCoachDenied(t *testing.T) {
	db := newSuperDB(t)
	repo := runninginfra.NewRepository(db.DB)
	svc := runningapp.NewService(repo, db.DB)

	coachA := "coach-asg-a-" + uuid.NewString()[:8]
	coachB := "coach-asg-b-" + uuid.NewString()[:8]
	athleteID := "ath-asg-x-" + uuid.NewString()[:8]

	tplA := &domain.RunningWorkoutTemplate{CoachID: coachA, Name: "A", Type: domain.TemplateTypeFreeRun, Version: 1}
	require.NoError(t, svc.CreateTemplate(context.Background(), tplA))

	// Coach B attempts to assign Coach A's template.
	asg := &domain.RunningWorkoutAssignment{
		TemplateID:    tplA.ID,
		AthleteID:     athleteID,
		CoachID:       coachB,
		ScheduledDate: time.Now().Add(time.Hour),
		Status:        domain.AssignmentStatusAssigned,
	}
	err := svc.CreateAssignment(context.Background(), asg)
	require.Error(t, err)
}
