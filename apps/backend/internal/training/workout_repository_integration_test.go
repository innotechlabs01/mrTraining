//go:build integration

package training

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mrtraining/backend/infrastructure/postgres"
	"github.com/stretchr/testify/require"
)

func TestWorkoutRepository_Integration(t *testing.T) {
	dbURL := getTestDBURL(t)
	ctx := context.Background()

	pool, err := pgxpool.New(ctx, dbURL)
	require.NoError(t, err)
	defer pool.Close()

	repo := postgres.NewWorkoutRepository(pool)

	t.Run("Save and FindByID", func(t *testing.T) {
		orgID := uuid.New()
		athleteID := uuid.New()
		coachID := uuid.New()

		w := NewWorkout("Test Workout", "Description", "running", time.Now().AddDate(0, 0, 1), athleteID, orgID, &coachID)
		w.AddExercise(uuid.New(), "main", 1, "notes", 60, "3-0-1")
		w.AddSet(0, 1, "normal", intPtr(10), floatPtr(50.0), floatPtr(7.0))
		w.AddSet(0, 2, "normal", intPtr(10), floatPtr(50.0), floatPtr(7.5))

		err := repo.Save(ctx, w)
		require.NoError(t, err)

		found, err := repo.FindByID(ctx, w.ID(), orgID)
		require.NoError(t, err)
		require.Equal(t, w.ID(), found.ID())
		require.Equal(t, "Test Workout", found.Name())
		require.Len(t, found.Exercises(), 1)
		require.Len(t, found.Exercises()[0].Sets(), 2)
	})

	t.Run("FindByAthlete", func(t *testing.T) {
		orgID := uuid.New()
		athleteID := uuid.New()

		for i := 0; i < 3; i++ {
			w := NewWorkout("Workout "+string(rune('A'+i)), "Desc", "running", time.Now().AddDate(0, 0, i), athleteID, orgID, nil)
			err := repo.Save(ctx, w)
			require.NoError(t, err)
		}

		workouts, err := repo.FindByAthlete(ctx, athleteID, DateRangeFilter{
			Start: time.Now().AddDate(0, 0, -1),
			End:   time.Now().AddDate(0, 0, 5),
		})
		require.NoError(t, err)
		require.Len(t, workouts, 3)
	})

	t.Run("FindScheduledForDate", func(t *testing.T) {
		orgID := uuid.New()
		athleteID := uuid.New()
		targetDate := time.Now().AddDate(0, 0, 2)

		w := NewWorkout("Scheduled Workout", "Desc", "running", targetDate, athleteID, orgID, nil)
		err := repo.Save(ctx, w)
		require.NoError(t, err)

		workouts, err := repo.FindScheduledForDate(ctx, athleteID, targetDate)
		require.NoError(t, err)
		require.Len(t, workouts, 1)
		require.Equal(t, "Scheduled Workout", workouts[0].Name())
	})
}

func getTestDBURL(t *testing.T) string {
	url := "postgres://postgres:password@localhost:5432/mrtraining_test?sslmode=disable"
	return url
}

func intPtr(i int) *int     { return &i }
func floatPtr(f float64) *float64 { return &f }
