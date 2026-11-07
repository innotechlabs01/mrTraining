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

func assignmentPolicyPresent(t *testing.T, db *database.DB) bool {
	t.Helper()
	var exists bool
	err := db.DB.QueryRowContext(context.Background(),
		`SELECT EXISTS (SELECT 1 FROM pg_policies
		 WHERE schemaname='public' AND tablename='running_workout_assignments'
		   AND policyname='running_workout_assignments_sel_coach_or_athlete')`).Scan(&exists)
	if err != nil {
		return false
	}
	return exists
}

// coach own / athlete own / cross denied under app role are only meaningful once
// the Build10.4-B either-or SELECT policy is applied. The policy is delivered as
// a proposal (410_*.sql) and is NOT applied here, so these cases skip when absent.
func TestBuild10_Blocker_RLS_AssignmentOwnMixed(t *testing.T) {
	appDB := newAppDB(t)
	if !assignmentPolicyPresent(t, appDB) {
		t.Skip("assignment either-or SELECT policy not present (migration authorization pending)")
	}
	superDB := newSuperDB(t)

	coachID := "coach-blk-" + uuid.NewString()[:8]
	athleteID := "ath-blk-" + uuid.NewString()[:8]
	otherAthleteID := "ath-blk2-" + uuid.NewString()[:8]

	superDB.DB.ExecContext(context.Background(), "INSERT INTO coaches (id,email,name) VALUES ($1,$2,$3)", coachID, coachID+"@x.com", "Coach")
	superDB.DB.ExecContext(context.Background(), "INSERT INTO athlete_profiles (id,email,name) VALUES ($1,$2,$3)", athleteID, athleteID+"@x.com", "Ath")
	superDB.DB.ExecContext(context.Background(), "INSERT INTO athlete_profiles (id,email,name) VALUES ($1,$2,$3)", otherAthleteID, otherAthleteID+"@x.com", "Other")
	superDB.DB.ExecContext(context.Background(), "INSERT INTO coach_athlete_links (coach_id,athlete_id,status) VALUES ($1,$2,'active')", coachID, athleteID)

	tplID := uuid.NewString()
	insertMinimalTemplate(t, superDB, tplID, coachID)

	asgID := uuid.NewString()
	scheduled := "2026-01-01T00:00:00Z"
	_, err := superDB.DB.ExecContext(context.Background(), `
		INSERT INTO running_workout_assignments (id, template_id, athlete_id, coach_id, scheduled_date, status)
		VALUES ($1,$2,$3,$4,$5::timestamptz,'assigned')`, asgID, tplID, athleteID, coachID, scheduled)
	require.NoError(t, err)

	// coach own read.
	err = runAs(t, appDB, coachID, coachID, "coach", func(repo *runninginfra.Repository) error {
		got, err := repo.GetAssignment(context.Background(), asgID)
		require.NoError(t, err)
		require.Equal(t, asgID, got.ID)
		return nil
	})
	require.NoError(t, err)

	// athlete own read (active relationship).
	err = runAs(t, appDB, athleteID, coachID, "athlete", func(repo *runninginfra.Repository) error {
		got, err := repo.GetAssignment(context.Background(), asgID)
		require.NoError(t, err)
		require.Equal(t, asgID, got.ID)
		return nil
	})
	require.NoError(t, err)

	// cross denied.
	err = runAs(t, appDB, otherAthleteID, otherAthleteID, "athlete", func(repo *runninginfra.Repository) error {
		_, err := repo.GetAssignment(context.Background(), asgID)
		if err == nil {
			t.Fatal("expected denial for unrelated athlete")
		}
		return nil
	})
	require.NoError(t, err)
}

func TestBuild10_Blocker_AssignmentContextAbsent(t *testing.T) {
	superDB := newSuperDB(t)
	appDB := newAppDB(t)

	coachID := "coach-ctx2-" + uuid.NewString()[:8]
	athleteID := "ath-ctx2-" + uuid.NewString()[:8]
	tplID := uuid.NewString()
	insertMinimalTemplate(t, superDB, tplID, coachID)

	asgID := uuid.NewString()
	_, err := superDB.DB.ExecContext(context.Background(), `
		INSERT INTO running_workout_assignments (id, template_id, athlete_id, coach_id, scheduled_date, status)
		VALUES ($1,$2,$3,$4,NOW(),'assigned')`, asgID, tplID, athleteID, coachID)
	require.NoError(t, err)

	repo := runninginfra.NewRepository(appDB.DB)
	_, err = repo.GetAssignment(context.Background(), asgID)
	require.Error(t, err, "pool without tenant context must not expose assignment")
}

func TestBuild10_Blocker_MixedAssignmentFKDenied(t *testing.T) {
	db := newSuperDB(t)
	repo := runninginfra.NewRepository(db.DB)
	svc := runningapp.NewService(repo, db.DB)

	coachA := "coach-mfk-a-" + uuid.NewString()[:8]
	coachB := "coach-mfk-b-" + uuid.NewString()[:8]
	athleteID := "ath-mfk-" + uuid.NewString()[:8]

	tplA := &domain.RunningWorkoutTemplate{CoachID: coachA, Name: "A", Type: domain.TemplateTypeFreeRun, Version: 1}
	require.NoError(t, svc.CreateTemplate(context.Background(), tplA))

	asg := &domain.RunningWorkoutAssignment{
		TemplateID:    tplA.ID,
		AthleteID:     athleteID,
		CoachID:       coachB,
		ScheduledDate: time.Now().Add(time.Hour),
		Status:        domain.AssignmentStatusAssigned,
	}
	err := svc.CreateAssignment(context.Background(), asg)
	require.Error(t, err, "assignment must not appropriate another coach template")
}

func TestBuild10_Blocker_SaveGpsPointsExternalTxReuse(t *testing.T) {
	db := newSuperDB(t)
	repo := runninginfra.NewRepository(db.DB)

	athleteID := "ath-gps-" + uuid.NewString()[:8]
	sessionID := uuid.NewString()
	_, err := db.DB.ExecContext(context.Background(), `
		INSERT INTO running_sessions (id, user_id, date, distance, duration, source, created_at)
		VALUES ($1,$2,NOW(),1,1,'manual',NOW())`, sessionID, athleteID)
	require.NoError(t, err)

	points := []*domain.GpsPoint{
		{ID: uuid.NewString(), SessionID: sessionID, Lat: 1.1, Lng: 2.2, Timestamp: "2026-01-01T00:00:00Z", Accuracy: 5},
		{ID: uuid.NewString(), SessionID: sessionID, Lat: 1.2, Lng: 2.3, Timestamp: "2026-01-01T00:00:01Z", Accuracy: 6},
	}

	// Rolled-back external transaction: no rows persist.
	uow := database.NewUnitOfWork(db.DB)
	require.NoError(t, uow.Begin(context.Background(), athleteID, athleteID, "athlete"))
	txRepo := repo.WithExecutor(uow.Tx()).(*runninginfra.Repository)
	require.NoError(t, txRepo.SaveGpsPoints(context.Background(), points))
	require.NoError(t, uow.Rollback(context.Background()))

	var n int
	require.NoError(t, db.DB.QueryRowContext(context.Background(), "SELECT COUNT(*) FROM running_gps_points WHERE session_id=$1", sessionID).Scan(&n))
	require.Equal(t, 0, n)

	// Reuse semantics: multiple SaveGpsPoints calls in one committed tx persist all.
	uow2 := database.NewUnitOfWork(db.DB)
	require.NoError(t, uow2.Begin(context.Background(), athleteID, athleteID, "athlete"))
	txRepo2 := repo.WithExecutor(uow2.Tx()).(*runninginfra.Repository)
	require.NoError(t, txRepo2.SaveGpsPoints(context.Background(), points[:1]))
	require.NoError(t, txRepo2.SaveGpsPoints(context.Background(), points[1:]))
	require.NoError(t, uow2.Commit(context.Background()))

	require.NoError(t, db.DB.QueryRowContext(context.Background(), "SELECT COUNT(*) FROM running_gps_points WHERE session_id=$1", sessionID).Scan(&n))
	require.Equal(t, len(points), n)
}
