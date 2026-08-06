//go:build integration

package athlete

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mrtraining/backend/infrastructure/postgres"
	"github.com/stretchr/testify/require"
)

func TestAthleteRepository_Integration(t *testing.T) {
	dbURL := getTestDBURL(t)
	ctx := context.Background()

	pool, err := pgxpool.New(ctx, dbURL)
	require.NoError(t, err)
	defer pool.Close()

	repo := postgres.NewAthleteRepository(pool)

	t.Run("Save and FindByUserID", func(t *testing.T) {
		userID := uuid.New()
		orgID := uuid.New()

		a := NewAthlete(userID, orgID, "running", "intermediate")
		a.UpdateMetrics(floatPtr(180.0), floatPtr(75.0), floatPtr(15.0), InjuryStatusHealthy)
		a.AddGoal("Marathon sub-3h")

		err := repo.Save(ctx, a)
		require.NoError(t, err)

		found, err := repo.FindByUserID(ctx, userID, orgID)
		require.NoError(t, err)
		require.Equal(t, a.ID(), found.ID())
		require.Equal(t, "running", found.PrimarySport())
		require.Equal(t, "intermediate", found.ExperienceLevel())
		require.Len(t, found.Goals(), 1)
	})
}

func getTestDBURL(t *testing.T) string {
	return "postgres://postgres:password@localhost:5432/mrtraining_test?sslmode=disable"
}

func floatPtr(f float64) *float64 { return &f }
