package training

import (
	"context"
	"errors"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"

	"github.com/innotechlabs01/mr-training-api/internal/domain/training"
	apperrors "github.com/innotechlabs01/mr-training-api/internal/errors"
)

// TestUpdateExerciseNotFound verifies that Update fails loud (NotFound) when the
// UPDATE matches no row, instead of silently reporting success. This is the
// write path behind PUT /exercises/:id (T-009.2 / AC-4).
func TestUpdateExerciseNotFound(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	repo := NewExerciseRepository(db)
	entry := &training.ExerciseEntry{ID: "ex-6", Name: "Orphan"}

	mock.ExpectExec("UPDATE exercise_library").
		WillReturnResult(sqlmock.NewResult(0, 0))

	err = repo.Update(context.Background(), entry)
	if err == nil {
		t.Fatal("expected NotFound error, got nil")
	}

	var appErr *apperrors.AppError
	if !errors.As(err, &appErr) {
		t.Fatalf("expected *AppError, got %T: %v", err, err)
	}
	if appErr.Status != 404 {
		t.Errorf("expected HTTP 404, got %d", appErr.Status)
	}
	if appErr.Code != "NOT_FOUND" {
		t.Errorf("expected code NOT_FOUND, got %q", appErr.Code)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unmet expectations: %v", err)
	}
}

// TestUpdateExerciseSuccess verifies a real update (1 row affected) returns nil.
func TestUpdateExerciseSuccess(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	repo := NewExerciseRepository(db)
	entry := &training.ExerciseEntry{ID: "ex-1", Name: "Bench Press"}

	mock.ExpectExec("UPDATE exercise_library").
		WillReturnResult(sqlmock.NewResult(0, 1))

	if err := repo.Update(context.Background(), entry); err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unmet expectations: %v", err)
	}
}
