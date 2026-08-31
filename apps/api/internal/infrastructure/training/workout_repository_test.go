package training

import (
	"context"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
)

// assignedWorkoutExerciseCols mirrors the SELECT column order returned by
// getAssignedWorkoutExercises including the LEFT JOINed image_url.
var assignedWorkoutExerciseCols = []string{
	"id", "workout_id", "name", "sets", "reps", "weight_kg", "rest_seconds", "sort_order",
	"notes", "mode", "phase", "superset_group", "body_part", "muscle_groups",
	"library_exercise_id", "image_url",
}

// TestGetPrescriptionLeftJoinImageURL verifies the prescription query LEFT JOINs
// exercise_library so image_url propagates (and NULL degrades to empty).
func TestGetPrescriptionLeftJoinImageURL(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()
	repo := NewWorkoutRepository(db)

	t.Run("propagates image_url from join", func(t *testing.T) {
		mock.ExpectQuery("FROM workout_exercises").WithArgs("w1").WillReturnRows(
			sqlmock.NewRows(assignedWorkoutExerciseCols).AddRow(
				"ex1", "w1", "Bench", 3, 10, 80.0, 90, 1, nil, "reps", "work", nil, nil, nil, "lib-1",
				"https://img.example/bench.jpg"))

		exs, err := repo.GetPrescription(context.Background(), "w1")
		if err != nil {
			t.Fatalf("GetPrescription error: %v", err)
		}
		if len(exs) != 1 {
			t.Fatalf("expected 1 exercise, got %d", len(exs))
		}
		if exs[0].ImageURL != "https://img.example/bench.jpg" {
			t.Errorf("expected ImageURL from join, got %q", exs[0].ImageURL)
		}
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("unmet expectations: %v", err)
		}
	})

	t.Run("null image_url yields empty ImageURL", func(t *testing.T) {
		mock.ExpectQuery("FROM workout_exercises").WithArgs("w1").WillReturnRows(
			sqlmock.NewRows(assignedWorkoutExerciseCols).AddRow(
				"ex1", "w1", "Squat", 4, 8, 100.0, 120, 1, nil, "reps", "work", nil, nil, nil, "lib-2", nil))

		exs, err := repo.GetPrescription(context.Background(), "w1")
		if err != nil {
			t.Fatalf("GetPrescription error: %v", err)
		}
		if len(exs) != 1 {
			t.Fatalf("expected 1 exercise, got %d", len(exs))
		}
		if exs[0].ImageURL != "" {
			t.Errorf("expected empty ImageURL when source NULL, got %q", exs[0].ImageURL)
		}
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("unmet expectations: %v", err)
		}
	})
}

// workoutRow returns a populated assigned_workouts row builder (workout id w1).
func workoutRow() *sqlmock.Rows {
	return sqlmock.NewRows([]string{"id", "athlete_id", "athlete_name", "content_id", "content_type",
		"content_name", "modality", "start_date", "end_date", "days_of_week", "status", "progress",
		"coach_id", "created_at", "updated_at"}).
		AddRow("w1", "a1", nil, "t1", "workout", "Split", "online", "2026-01-01", "2026-01-31",
			`[1,3,5]`, "active", 0.4, "c1", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z")
}

func exerciseRows() *sqlmock.Rows {
	return sqlmock.NewRows(assignedWorkoutExerciseCols).AddRow(
		"ex1", "w1", "Bench", 3, 10, 80.0, 90, 1, nil, "reps", "work", nil, nil, nil, "lib-1",
		"https://img.example/bench.jpg")
}

func sessionCols() []string {
	return []string{"id", "workout_id", "athlete_id", "started_at", "completed", "completed_at",
		"current_exercise_index", "duration_seconds"}
}

// TestGetAssignedWorkoutDetailReturnsEnvelope verifies detail returns the
// {workout, exercises, session} carrier with joined imageUrl.
func TestGetAssignedWorkoutDetailReturnsEnvelope(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()
	repo := NewWorkoutRepository(db)

	t.Run("with resume session", func(t *testing.T) {
		mock.ExpectQuery("FROM assigned_workouts WHERE id").WithArgs("w1").WillReturnRows(workoutRow())
		mock.ExpectQuery("FROM workout_exercises").WithArgs("w1").WillReturnRows(exerciseRows())
		mock.ExpectQuery("FROM workout_session_logs").WithArgs("w1").WillReturnRows(
			sqlmock.NewRows(sessionCols()).AddRow(
				"s1", "w1", "a1", "2026-01-02T10:00:00Z", false, nil, 2, 300))

		detail, err := repo.GetAssignedWorkoutDetail(context.Background(), "w1")
		if err != nil {
			t.Fatalf("GetAssignedWorkoutDetail error: %v", err)
		}
		if detail.Workout == nil || detail.Workout.ContentName != "Split" {
			t.Fatalf("expected workout contentName 'Split', got %#v", detail.Workout)
		}
		if len(detail.Exercises) != 1 || detail.Exercises[0].ImageURL != "https://img.example/bench.jpg" {
			t.Fatalf("expected 1 joined exercise with imageUrl, got %#v", detail.Exercises)
		}
		if detail.Session == nil || detail.Session.CurrentExerciseIndex != 2 {
			t.Fatalf("expected resume session index 2, got %#v", detail.Session)
		}
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("unmet expectations: %v", err)
		}
	})

	t.Run("no session and no exercises returns empty and nil session", func(t *testing.T) {
		mock.ExpectQuery("FROM assigned_workouts WHERE id").WithArgs("w1").WillReturnRows(workoutRow())
		mock.ExpectQuery("FROM workout_exercises").WithArgs("w1").WillReturnRows(
			sqlmock.NewRows(assignedWorkoutExerciseCols))
		mock.ExpectQuery("FROM workout_session_logs").WithArgs("w1").WillReturnRows(
			sqlmock.NewRows(sessionCols()))

		detail, err := repo.GetAssignedWorkoutDetail(context.Background(), "w1")
		if err != nil {
			t.Fatalf("GetAssignedWorkoutDetail error: %v", err)
		}
		if detail.Exercises == nil || len(detail.Exercises) != 0 {
			t.Fatalf("expected empty (non-nil) exercises list, got %#v", detail.Exercises)
		}
		if detail.Session != nil {
			t.Fatalf("expected nil session when none in progress, got %#v", detail.Session)
		}
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("unmet expectations: %v", err)
		}
	})
}