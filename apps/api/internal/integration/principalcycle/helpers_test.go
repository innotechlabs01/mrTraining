package principalcycle_test

import (
	"context"
	"database/sql"
	"os"
	"testing"

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

func newSuperDB(t *testing.T) *database.DB {
	t.Helper()
	db, err := database.Connect(resolveSuperDBURL())
	if err != nil {
		t.Skipf("skipping: cannot connect to PostgreSQL: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

func newAppDB(t *testing.T) *database.DB {
	t.Helper()
	db, err := database.Connect(appRoleURL)
	if err != nil {
		t.Skipf("skipping: cannot connect to app PostgreSQL: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

func verifyAppRole(t *testing.T, db *database.DB) {
	t.Helper()
	var current string
	var isSuper, bypass bool
	_ = db.QueryRow("SELECT current_user").Scan(&current)
	if err := db.QueryRow("SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user").Scan(&isSuper, &bypass); err != nil {
		t.Fatalf("verify app role attrs: %v", err)
	}
	if current != "mr_training_app" || isSuper || bypass {
		t.Fatalf("expected app role, got %s super=%v bypass=%v", current, isSuper, bypass)
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
		uow.Rollback(context.Background())
		return err
	}
	return uow.Commit(context.Background())
}

var (
	_ = running.NewService
	_ = runningapp.NewService
	_ = domain.RunningWorkoutTemplate{}
	_ = sql.Open
)
