package user

import (
	"context"
	"os"
	"strings"
	"testing"

	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

func setupTestDB(t *testing.T) *database.DB {
	t.Helper()
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		t.Skip("skipping: DATABASE_URL not set")
	}

	db, err := database.Connect(url)
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

// TestRepository_GetCoach_BackfillsCoachCode proves the self-heal: a legacy
// coach row with an empty coach_code gets a unique code generated and persisted
// on the first read (e.g. the coach's first sign-in).
// Runs against a local file: SQLite database — no remote services needed.
func TestRepository_GetCoach_BackfillsCoachCode(t *testing.T) {
	// Runs against PostgreSQL via DATABASE_URL — no remote services needed.
	ctx := context.Background()
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		t.Skip("skipping: DATABASE_URL not set")
	}

	db, err := database.Connect(url)
	if err != nil {
		t.Fatalf("open local db failed: %v", err)
	}
	defer db.Close()
	sqlDB := db.DB

	// Minimal coaches schema matching the production columns used below.
	if _, err := sqlDB.Exec(`CREATE TABLE coaches (
		id TEXT PRIMARY KEY, email TEXT, name TEXT, avatar_url TEXT,
		coach_code TEXT, specializations TEXT, certifications TEXT, bio TEXT DEFAULT '',
		experience_years INTEGER NOT NULL DEFAULT 0, max_athletes INTEGER NOT NULL DEFAULT 0,
		is_accepting_athletes INTEGER NOT NULL DEFAULT 0, is_active INTEGER DEFAULT 1, created_at TEXT, updated_at TEXT
	)`); err != nil {
		t.Fatalf("create coaches table failed: %v", err)
	}

	repo := NewRepository(sqlDB)

	id := "test-coach-backfill-1"
	if err := repo.EnsureCoach(ctx, id, id+"@example.com", "Backfill Coach"); err != nil {
		t.Fatalf("EnsureCoach failed: %v", err)
	}
	if _, err := sqlDB.Exec(`UPDATE coaches SET coach_code = '' WHERE id = ?`, id); err != nil {
		t.Fatalf("clearing coach_code failed: %v", err)
	}

	coach, err := repo.GetCoach(ctx, id)
	if err != nil {
		t.Fatalf("GetCoach failed: %v", err)
	}
	if coach.CoachCode == "" {
		t.Fatal("expected GetCoach to backfill an empty coach_code")
	}
	if !strings.HasPrefix(coach.CoachCode, "MR-") {
		t.Fatalf("expected MR- prefixed code, got %q", coach.CoachCode)
	}

	// The generated code must be persisted: a second read returns the SAME code.
	coach2, err := repo.GetCoach(ctx, id)
	if err != nil {
		t.Fatalf("second GetCoach failed: %v", err)
	}
	if coach2.CoachCode != coach.CoachCode {
		t.Fatalf("coach_code not stable: first %q, second %q", coach.CoachCode, coach2.CoachCode)
	}
}
