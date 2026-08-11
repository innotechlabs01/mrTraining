//go:build integration

package coach_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mrtraining/backend/infrastructure/postgres"
	"github.com/mrtraining/backend/internal/coach"
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
		seedOrganization(t, pool, orgID)
		seedUser(t, pool, userID, orgID)

		c := coach.NewCoach(userID, orgID, 5)
		c.UpdateProfile([]string{"running", "strength"}, coach.CertLevelAdvanced, "Experienced coach", "https://coach.com", "@coach", "@coachyt")

		err := repo.Save(ctx, c)
		require.NoError(t, err)

		found, err := repo.FindByUserID(ctx, userID, orgID)
		require.NoError(t, err)
		require.Equal(t, c.ID(), found.ID())
		require.Equal(t, 5, found.ExperienceYears())
		require.Contains(t, found.Specializations(), "running")
		require.Equal(t, coach.CertLevelAdvanced, found.CertLevel())
	})
}

func getTestDBURL(t *testing.T) string {
	return "postgres://postgres:password@localhost:5432/mrtraining_test?sslmode=disable"
}

func seedOrganization(t *testing.T, pool *pgxpool.Pool, orgID uuid.UUID) {
	t.Helper()
	_, err := pool.Exec(context.Background(),
		`INSERT INTO organizations (id, name) VALUES ($1, $2)`, orgID, "Test Org")
	require.NoError(t, err)
}

func seedUser(t *testing.T, pool *pgxpool.Pool, userID, orgID uuid.UUID) {
	t.Helper()
	_, err := pool.Exec(context.Background(),
		`INSERT INTO users (id, organization_id, clerk_user_id, email)
		 VALUES ($1, $2, $3, $3)`, userID, orgID, userID.String())
	require.NoError(t, err)
}
