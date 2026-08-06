//go:build integration

package coach

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mrtraining/backend/infrastructure/postgres"
	"github.com/stretchr/testify/require"
)

func TestCoachRepository_Integration(t *testing.T) {
	dbURL := getTestDBURL(t)
	ctx := context.Background()

	pool, err := pgxpool.New(ctx, dbURL)
	require.NoError(t, err)
	defer pool.Close()

	repo := postgres.NewCoachRepository(pool)

	t.Run("Save and FindByUserID", func(t *testing.T) {
		userID := uuid.New()
		orgID := uuid.New()

		c := NewCoach(userID, orgID, 5)
		c.UpdateProfile([]string{"running", "strength"}, CertLevelAdvanced, "Experienced coach", "https://coach.com", "@coach", "@coachyt")

		err := repo.Save(ctx, c)
		require.NoError(t, err)

		found, err := repo.FindByUserID(ctx, userID, orgID)
		require.NoError(t, err)
		require.Equal(t, c.ID(), found.ID())
		require.Equal(t, 5, found.ExperienceYears())
		require.Contains(t, found.Specializations(), "running")
		require.Equal(t, CertLevelAdvanced, found.CertLevel())
	})
}

func getTestDBURL(t *testing.T) string {
	return "postgres://postgres:password@localhost:5432/mrtraining_test?sslmode=disable"
}
