package training

import (
	"context"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/innotechlabs01/mr-training-api/internal/domain/training"
	"github.com/innotechlabs01/mr-training-api/internal/errors"
)

// assignedWorkoutExerciseCols mirrors the SELECT column order returned by
// getAssignedWorkoutExercises including the LEFT JOINed image_url/video_url,
// gps_route, intervals, actual_gps_route and actual_intervals.
var assignedWorkoutExerciseCols = []string{
	"id", "workout_id", "name", "sets", "reps", "weight_kg", "rest_seconds", "sort_order",
	"notes", "mode", "phase", "superset_group", "body_part", "muscle_groups",
	"library_exercise_id", "image_url", "video_url", "gps_route", "intervals",
	"actual_gps_route", "actual_intervals",
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
				"https://img.example/bench.jpg", "https://cdn.example/bench.mp4", "_gx{pF_gsaVdW`CvyK",
				nil, nil, nil))

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
				"ex1", "w1", "Squat", 4, 8, 100.0, 120, 1, nil, "reps", "work", nil, nil, nil, "lib-2", nil, nil, nil,
				nil, nil, nil))

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

func TestLogWorkoutSet_SetsRFC3339LoggedAt(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()
	repo := NewWorkoutRepository(db)

	mock.ExpectBegin()
	mock.ExpectQuery("FROM workout_session_logs").WithArgs("w1", "a1").
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow("sess-1"))
	mock.ExpectExec("INSERT INTO workout_set_logs").
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectQuery("SELECT COALESCE\\(SUM\\(sets\\), 0\\) FROM workout_exercises").WithArgs("w1").
		WillReturnRows(sqlmock.NewRows([]string{"sum"}).AddRow(4))
	mock.ExpectQuery("SELECT COUNT\\(\\*\\) FROM workout_set_logs").WithArgs("sess-1").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))
	mock.ExpectQuery("SELECT COALESCE\\(sort_order, 0\\) FROM workout_exercises").WithArgs("ex-1").
		WillReturnRows(sqlmock.NewRows([]string{"sort_order"}).AddRow(0))
	mock.ExpectExec("UPDATE workout_session_logs SET current_exercise_index").WithArgs(0, "sess-1").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec("UPDATE assigned_workouts SET progress").WithArgs(0.25, "w1").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	set, err := repo.LogWorkoutSet(context.Background(), &training.WorkoutSet{
		ExerciseID: "ex-1",
		SetIndex:   1,
		WeightKg:   80,
		Reps:       8,
		Completed:  true,
	}, "w1", "a1")
	if err != nil {
		t.Fatalf("LogWorkoutSet error: %v", err)
	}
	if set.LoggedAt == "" || set.LoggedAt == "NOW()" {
		t.Fatalf("expected RFC3339 LoggedAt, got %q", set.LoggedAt)
	}
	if _, err := time.Parse(time.RFC3339, set.LoggedAt); err != nil {
		t.Fatalf("expected valid RFC3339 LoggedAt, got %q: %v", set.LoggedAt, err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unmet expectations: %v", err)
	}
}

func TestDeleteTemplate_UsesInjectedExecutorForRLS(t *testing.T) {
	t.Run("executes via injected tx without starting nested tx", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		if err != nil {
			t.Fatalf("sqlmock: %v", err)
		}
		defer db.Close()

		mock.ExpectBegin()
		tx, err := db.Begin()
		if err != nil {
			t.Fatalf("begin tx: %v", err)
		}

		mock.ExpectExec(`DELETE FROM workout_template_exercises WHERE template_id = \$1`).
			WithArgs("tpl-1").
			WillReturnResult(sqlmock.NewResult(0, 2))
		mock.ExpectExec(`DELETE FROM workout_templates WHERE id = \$1`).
			WithArgs("tpl-1").
			WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectCommit()

		repo := NewWorkoutRepository(db).WithExecutor(tx)
		if err := repo.DeleteTemplate(context.Background(), "tpl-1"); err != nil {
			t.Fatalf("DeleteTemplate error: %v", err)
		}
		if err := tx.Commit(); err != nil {
			t.Fatalf("commit tx: %v", err)
		}
		if err := mock.ExpectationsWereMet(); err != nil {
			t.Errorf("unmet expectations: %v", err)
		}
	})

	t.Run("returns NotFound when 0 rows affected", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		if err != nil {
			t.Fatalf("sqlmock: %v", err)
		}
		defer db.Close()

		mock.ExpectBegin()
		tx, err := db.Begin()
		if err != nil {
			t.Fatalf("begin tx: %v", err)
		}

		mock.ExpectExec(`DELETE FROM workout_template_exercises WHERE template_id = \$1`).
			WithArgs("missing-tpl").
			WillReturnResult(sqlmock.NewResult(0, 0))
		mock.ExpectExec(`DELETE FROM workout_templates WHERE id = \$1`).
			WithArgs("missing-tpl").
			WillReturnResult(sqlmock.NewResult(0, 0))

		repo := NewWorkoutRepository(db).WithExecutor(tx)
		err = repo.DeleteTemplate(context.Background(), "missing-tpl")
		appErr, ok := err.(*errors.AppError)
		if !ok || appErr.Status != 404 {
			t.Fatalf("expected 404 NotFound, got %v", err)
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
		"https://img.example/bench.jpg", "https://cdn.example/bench.mp4", "_gx{pF_gsaVdW`CvyK",
		nil, nil, nil)
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
