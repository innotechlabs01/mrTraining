package running_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"

	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

func TestSecurity_CrossCoach_TenantIsolation(t *testing.T) {
	db := newAppDB(t)
	if db == nil {
		t.Skip("skipping integration test: database not reachable")
	}

	coachA := "coach-iso-a-" + uuid.NewString()[:8]
	coachB := "coach-iso-b-" + uuid.NewString()[:8]

	// 1. Transaction under Coach A context
	uowA := database.NewUnitOfWork(db.DB)
	err := uowA.Begin(context.Background(), coachA, coachA, "coach")
	if err != nil {
		t.Skipf("cannot begin UoW with app role: %v", err)
	}

	// Insert row under Coach A context
	templateID := "tpl-iso-" + uuid.NewString()[:8]
	_, err = uowA.Tx().ExecContext(context.Background(), `
		INSERT INTO running_workout_templates (id, coach_id, name, modality, target_distance_meters, target_duration_seconds)
		VALUES ($1, $2, 'Coach A 5K', 'running', 5000, 1800)
	`, templateID, coachA)
	if err != nil {
		_ = uowA.Rollback(context.Background())
		t.Skipf("skipping: table or role not ready for direct DDL: %v", err)
		return
	}
	require.NoError(t, uowA.Commit(context.Background()))

	// Cleanup at the end
	t.Cleanup(func() {
		_, _ = db.DB.ExecContext(context.Background(), "DELETE FROM running_workout_templates WHERE id = $1", templateID)
	})

	// 2. Query under Coach B context - MUST return 0 rows
	uowB := database.NewUnitOfWork(db.DB)
	require.NoError(t, uowB.Begin(context.Background(), coachB, coachB, "coach"))
	defer uowB.Rollback(context.Background())

	var count int
	err = uowB.Tx().QueryRowContext(context.Background(), `
		SELECT count(*) FROM running_workout_templates WHERE id = $1
	`, templateID).Scan(&count)
	require.NoError(t, err)
	require.Equal(t, 0, count, "Coach B must NOT see Coach A templates under RLS")
}
