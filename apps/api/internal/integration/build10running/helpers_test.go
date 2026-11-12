package running_test

import (
	"context"
	"database/sql"
	"os"
	"testing"

	"github.com/google/uuid"

	"github.com/innotechlabs01/mr-training-api/internal/application/running"
	runningapp "github.com/innotechlabs01/mr-training-api/internal/application/running"
	domain "github.com/innotechlabs01/mr-training-api/internal/domain/running"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	runninginfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/running"
)

const appRoleURL = "postgresql://mr_training_app:MrTrainingApp_LocalOnly_!2026@127.0.0.1:5435/mr_training_migration?sslmode=disable"
const superRoleURL = "postgresql://postgres:1e6819bd685e31fa529ed353f65bc6b6eb4d47f9f3e76c43@127.0.0.1:5435/mr_training_migration?sslmode=disable"

func resolveSuperDBURL() string {
	if v := os.Getenv("SUPER_DATABASE_URL"); v != "" {
		return v
	}
	if v := os.Getenv("POSTGRES_DATABASE_URL"); v != "" {
		return v
	}
	return superRoleURL
}

func verifySuperRole(t *testing.T, db *database.DB) {
	t.Helper()
	var current, session string
	var isSuper, bypass bool
	if err := db.QueryRow("SELECT current_user, session_user").Scan(&current, &session); err != nil {
		t.Fatalf("verify role: %v", err)
	}
	if err := db.QueryRow("SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user").Scan(&isSuper, &bypass); err != nil {
		t.Fatalf("verify role attrs: %v", err)
	}
	if !isSuper || !bypass {
		t.Fatalf("expected super role with bypassrls, got current_user=%s session_user=%s rolsuper=%v rolbypassrls=%v", current, session, isSuper, bypass)
	}
}

func newSuperDB(t *testing.T) *database.DB {
	t.Helper()
	url := resolveSuperDBURL()
	db, err := database.Connect(url)
	if err != nil {
		t.Skipf("skipping: cannot connect to PostgreSQL: %v", err)
	}
	verifySuperRole(t, db)
	t.Cleanup(func() { db.Close() })
	return db
}

func verifyAppRole(t *testing.T, db *database.DB) {
	t.Helper()
	var current, session string
	var isSuper, bypass bool
	if err := db.QueryRow("SELECT current_user, session_user").Scan(&current, &session); err != nil {
		t.Fatalf("verify app role: %v", err)
	}
	if err := db.QueryRow("SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user").Scan(&isSuper, &bypass); err != nil {
		t.Fatalf("verify app role attrs: %v", err)
	}
	if current != "mr_training_app" || session != "mr_training_app" || isSuper || bypass {
		t.Fatalf("expected mr_training_app without super/bypass, got current_user=%s session_user=%s rolsuper=%v rolbypassrls=%v", current, session, isSuper, bypass)
	}
}

func newAppDB(t *testing.T) *database.DB {
	t.Helper()
	db, err := database.Connect(appRoleURL)
	if err != nil {
		t.Skipf("skipping: cannot connect to app PostgreSQL: %v", err)
	}
	verifyAppRole(t, db)
	t.Cleanup(func() { db.Close() })
	return db
}

func insertMinimalTemplate(t *testing.T, db *database.DB, id, coachID string) {
	t.Helper()
	_, err := db.DB.ExecContext(context.Background(), `
		INSERT INTO running_workout_templates
			(id, coach_id, name, type, segments, created_at, updated_at, version)
		VALUES ($1, $2, $3, 'free_run', '[]'::json, NOW(), NOW(), 1)
		ON CONFLICT (id) DO NOTHING`, id, coachID, "seed")
	if err != nil {
		t.Fatalf("seed template: %v", err)
	}
}

func runAs(t *testing.T, db *database.DB, userID, coachID, role string, fn func(repo *runninginfra.Repository) error) error {
	t.Helper()
	uow := database.NewUnitOfWork(db.DB)
	if err := uow.Begin(context.Background(), userID, coachID, role); err != nil {
		return err
	}
	defer uow.Rollback(context.Background())
	repo := runninginfra.NewRepository(db.DB)
	txRepo := repo.WithExecutor(uow.Tx()).(*runninginfra.Repository)
	err := fn(txRepo)
	if err != nil {
		return err
	}
	return uow.Commit(context.Background())
}

// avoid unused
var _ = running.NewService
var _ = sql.Open
var _ = uuid.NewString
var _ = domain.RunningWorkoutTemplate{}
var _ = runningapp.NewService
var _ domain.Repository
