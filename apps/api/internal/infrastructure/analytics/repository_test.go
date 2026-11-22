package analytics

import (
	"context"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/require"
)

func TestRepository_GetAthleteTrainingSummary(t *testing.T) {
	t.Run("aggregates completed sessions sets volume and recent workouts", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		repo := NewRepository(db)

		mock.ExpectQuery(`SELECT COUNT\(DISTINCT wsl\.id\).*FROM workout_session_logs wsl`).
			WithArgs("athlete-1", sqlmock.AnyArg()).
			WillReturnRows(sqlmock.NewRows([]string{"sessions", "total_sets", "total_volume"}).
				AddRow(4, 32, 2450.56))

		mock.ExpectQuery(`SELECT LEFT\(wsl\.started_at, 10\) AS session_date.*FROM workout_session_logs wsl`).
			WithArgs("athlete-1").
			WillReturnRows(sqlmock.NewRows([]string{"session_date", "workout_name", "exercises"}).
				AddRow("2026-03-01", "Upper Strength", 5).
				AddRow("2026-02-27", "Lower Power", 4))

		summary, err := repo.GetAthleteTrainingSummary(context.Background(), "athlete-1", 14)
		require.NoError(t, err)
		require.Equal(t, "athlete-1", summary.AthleteID)
		require.Equal(t, 14, summary.WindowDays)
		require.Equal(t, 4, summary.Sessions)
		require.Equal(t, 2.0, summary.AvgSessionsPerWeek)
		require.Equal(t, 32, summary.TotalSets)
		require.Equal(t, 2450.56, summary.TotalVolumeKg)
		require.Len(t, summary.RecentSessions, 2)
		require.Equal(t, "Upper Strength", summary.RecentSessions[0].WorkoutName)
		require.Equal(t, 5, summary.RecentSessions[0].Exercises)
		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("clamps non-positive and oversized day windows", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		repo := NewRepository(db)

		for _, tc := range []struct {
			inputDays int
			wantDays  int
		}{
			{inputDays: 0, wantDays: 28},
			{inputDays: -7, wantDays: 28},
			{inputDays: 999, wantDays: 365},
		} {
			expectedCutoff := time.Now().UTC().AddDate(0, 0, -tc.wantDays).Format("2006-01-02")
			mock.ExpectQuery(`SELECT COUNT\(DISTINCT wsl\.id\)`).
				WithArgs("athlete-1", expectedCutoff).
				WillReturnRows(sqlmock.NewRows([]string{"sessions", "total_sets", "total_volume"}).AddRow(0, 0, 0.0))
			mock.ExpectQuery(`SELECT LEFT\(wsl\.started_at, 10\) AS session_date`).
				WithArgs("athlete-1").
				WillReturnRows(sqlmock.NewRows([]string{"session_date", "workout_name", "exercises"}))

			summary, err := repo.GetAthleteTrainingSummary(context.Background(), "athlete-1", tc.inputDays)
			require.NoError(t, err)
			require.Equal(t, tc.wantDays, summary.WindowDays)
			require.NotNil(t, summary.RecentSessions)
			require.Empty(t, summary.RecentSessions)
		}
		require.NoError(t, mock.ExpectationsWereMet())
	})
}

func TestRepository_GetAthleteVideoAnalytics(t *testing.T) {
	t.Run("aggregates video views per exercise and formats lastViewedAt", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		repo := NewRepository(db)
		viewedAt := time.Date(2026, 3, 1, 14, 30, 0, 0, time.UTC)

		mock.ExpectQuery(`FROM video_views vv\s+LEFT JOIN exercise_library el ON el\.id = vv\.exercise_id\s+WHERE vv\.athlete_id = \$1`).
			WithArgs("athlete-1").
			WillReturnRows(sqlmock.NewRows([]string{
				"exercise_id", "exercise_name", "total_views", "completed_views", "avg_position_pct", "last_viewed_at",
			}).
				AddRow("ex-1", "Back Squat", 4, 3, 87.5, viewedAt).
				AddRow("ex-2", "ex-2", 2, 0, nil, nil))

		rows, err := repo.GetAthleteVideoAnalytics(context.Background(), "athlete-1")
		require.NoError(t, err)
		require.Len(t, rows, 2)

		require.Equal(t, "ex-1", rows[0].ExerciseID)
		require.Equal(t, "Back Squat", rows[0].ExerciseName)
		require.Equal(t, 4, rows[0].TotalViews)
		require.Equal(t, 3, rows[0].CompletedViews)
		require.NotNil(t, rows[0].CompletionRate)
		require.Equal(t, 75, *rows[0].CompletionRate)
		require.NotNil(t, rows[0].AvgPositionPct)
		require.Equal(t, 87.5, *rows[0].AvgPositionPct)
		require.NotNil(t, rows[0].LastViewedAt)
		require.Equal(t, "2026-03-01T14:30:00Z", *rows[0].LastViewedAt)

		require.Equal(t, "ex-2", rows[1].ExerciseID)
		require.NotNil(t, rows[1].CompletionRate)
		require.Equal(t, 0, *rows[1].CompletionRate)
		require.Nil(t, rows[1].AvgPositionPct)
		require.Nil(t, rows[1].LastViewedAt)
		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("returns empty slice when athlete has no video views", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		repo := NewRepository(db)
		mock.ExpectQuery(`FROM video_views vv`).
			WithArgs("athlete-empty").
			WillReturnRows(sqlmock.NewRows([]string{
				"exercise_id", "exercise_name", "total_views", "completed_views", "avg_position_pct", "last_viewed_at",
			}))

		rows, err := repo.GetAthleteVideoAnalytics(context.Background(), "athlete-empty")
		require.NoError(t, err)
		require.NotNil(t, rows)
		require.Empty(t, rows)
		require.NoError(t, mock.ExpectationsWereMet())
	})
}
