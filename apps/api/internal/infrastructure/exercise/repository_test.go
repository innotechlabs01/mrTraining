package exercise

import (
	"context"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
)

// TestGetByIDScansImageUrl verifies the image_url column selected by the
// repository is scanned into ExerciseEntry.ImageURL (read path behind
// GET /exercises/:id and list endpoints).
func TestGetByIDScansImageUrl(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	repo := NewRepository(db)

	expected := "https://img.example/squat.jpg"
	mock.ExpectQuery("SELECT .* FROM exercise_library WHERE id =").
		WithArgs("ex-1").
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "slug", "name", "description", "mode", "body_part",
			"muscle_groups", "secondary_muscles", "equipment", "difficulty",
			"category", "instructions", "default_sec", "video_url",
			"image_url", "is_custom", "coach_id", "created_at", "updated_at",
		}).AddRow(
			"ex-1", "squat", "Squat", "", "reps", "legs",
			"quads", "", "", "beginner", "", "", nil,
			"https://videos.example/squat.mp4", expected, 0, nil,
			"2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z",
		))

	entry, err := repo.GetByID(context.Background(), "ex-1")
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if entry.ImageURL != expected {
		t.Errorf("expected ImageURL %q, got %q", expected, entry.ImageURL)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unmet expectations: %v", err)
	}
}

// TestListExercisesScansImageUrl verifies image_url is scanned for every row
// returned by ListGlobal/ListByCoach (shared listExercises helper).
func TestListExercisesScansImageUrl(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	repo := NewRepository(db)

	mock.ExpectQuery("SELECT .* FROM exercise_library WHERE is_custom = 0").
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "slug", "name", "description", "mode", "body_part",
			"muscle_groups", "secondary_muscles", "equipment", "difficulty",
			"category", "instructions", "default_sec", "video_url",
			"image_url", "is_custom", "coach_id", "created_at", "updated_at",
		}).AddRow(
			"ex-1", "squat", "Squat", "", "reps", "legs",
			"quads", "", "", "beginner", "", "", nil,
			"https://videos.example/squat.mp4", "https://img.example/squat.jpg",
			0, nil, "2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z",
		))

	entries, err := repo.ListGlobal(context.Background())
	if err != nil {
		t.Fatalf("ListGlobal: %v", err)
	}
	if len(entries) != 1 {
		t.Fatalf("expected 1 exercise, got %d", len(entries))
	}
	if entries[0].ImageURL != "https://img.example/squat.jpg" {
		t.Errorf("expected ImageURL on listed exercise, got %q", entries[0].ImageURL)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unmet expectations: %v", err)
	}
}
