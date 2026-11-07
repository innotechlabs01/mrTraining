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

func TestBuild10_StartCompleteSessionAtomic(t *testing.T) {
	db := newSuperDB(t)
	repo := runninginfra.NewRepository(db.DB)
	svc := runningapp.NewService(repo, db.DB)

	coachID := "coach-sess-" + uuid.NewString()[:8]
	athleteID := "ath-sess-" + uuid.NewString()[:8]

	tpl := &domain.RunningWorkoutTemplate{CoachID: coachID, Name: "Guided", Type: domain.TemplateTypeIntervals, Version: 1}
	require.NoError(t, svc.CreateTemplate(context.Background(), tpl))

	asg := &domain.RunningWorkoutAssignment{
		TemplateID:    tpl.ID,
		AthleteID:     athleteID,
		CoachID:       coachID,
		ScheduledDate: time.Now().Add(time.Hour),
		Status:        domain.AssignmentStatusAssigned,
	}
	require.NoError(t, svc.CreateAssignment(context.Background(), asg))

	session, err := svc.StartSession(context.Background(), asg.ID, athleteID)
	require.NoError(t, err)
	require.NotEmpty(t, session.ID)

	snap, err := repo.GetSnapshotBySession(context.Background(), session.ID)
	require.NoError(t, err)
	require.Equal(t, asg.ID, snap.AssignmentID)

	updatedAsg, err := repo.GetAssignment(context.Background(), asg.ID)
	require.NoError(t, err)
	require.Equal(t, domain.AssignmentStatusStarted, updatedAsg.Status)

	err = svc.CompleteSession(context.Background(), session.ID, athleteID, &domain.RunningSession{
		Distance: 5.0, Duration: 1800, Calories: 300,
	})
	require.NoError(t, err)

	finalAsg, err := repo.GetAssignment(context.Background(), asg.ID)
	require.NoError(t, err)
	require.Equal(t, domain.AssignmentStatusCompleted, finalAsg.Status)

	sn2, err := repo.GetSnapshotBySession(context.Background(), session.ID)
	require.NoError(t, err)
	require.NotNil(t, sn2)
}
