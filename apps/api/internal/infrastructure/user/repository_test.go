package user

import (
	"context"
	"os"
	"testing"

	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

func setupTestDB(t *testing.T) *database.DB {
	t.Helper()
	url := os.Getenv("DATABASE_URL")
	token := os.Getenv("TURSO_AUTH_TOKEN")
	if url == "" || token == "" {
		t.Skip("skipping: DATABASE_URL and TURSO_AUTH_TOKEN not set")
	}

	db, err := database.Connect(url, token)
	if err != nil {
		t.Fatalf("failed to connect to database: %v", err)
	}
	return db
}

func TestRepository_GetByID_NotFound(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewRepository(db.DB)
	_, err := repo.GetByID(context.Background(), "nonexistent-id")
	if err == nil {
		t.Fatal("expected error for nonexistent user")
	}
}

func TestRepository_GetByEmail_NotFound(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewRepository(db.DB)
	_, err := repo.GetByEmail(context.Background(), "nonexistent@example.com")
	if err == nil {
		t.Fatal("expected error for nonexistent user")
	}
}

func TestRepository_GetCoach_NotFound(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewRepository(db.DB)
	_, err := repo.GetCoach(context.Background(), "nonexistent-id")
	if err == nil {
		t.Fatal("expected error for nonexistent coach")
	}
}

func TestRepository_GetAthleteProfile_NotFound(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewRepository(db.DB)
	_, err := repo.GetAthleteProfile(context.Background(), "nonexistent-id")
	if err == nil {
		t.Fatal("expected error for nonexistent athlete profile")
	}
}

func TestRepository_ListCoaches_Empty(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewRepository(db.DB)
	coaches, err := repo.ListCoaches(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// ListCoaches should return empty slice, not nil
	if coaches == nil {
		t.Fatal("expected empty slice, got nil")
	}
}

func TestRepository_ListAthletesByCoach_Empty(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewRepository(db.DB)
	athletes, err := repo.ListAthletesByCoach(context.Background(), "nonexistent-coach")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if athletes == nil {
		t.Fatal("expected empty slice, got nil")
	}
}
