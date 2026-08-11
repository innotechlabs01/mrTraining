//go:build integration

package athlete_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mrtraining/backend/infrastructure/postgres"
	"github.com/mrtraining/backend/internal/athlete"
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
		seedOrganization(t, pool, orgID)
		seedUser(t, pool, userID, orgID)

		a := athlete.NewAthlete(userID, orgID, "running", "intermediate")
		a.UpdateMetrics(floatPtr(180.0), floatPtr(75.0), floatPtr(15.0), athlete.InjuryStatusHealthy)
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
