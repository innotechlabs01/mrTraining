package ally

import (
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	migrationpkg "github.com/innotechlabs01/mr-training-api/internal/infrastructure/database/migrations"
	allydomain "github.com/innotechlabs01/mr-training-api/internal/domain/ally"
	allyinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/ally"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
	auditinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/audit"
)

// allyMigrationsDir returns the absolute path to apps/api/migrations by
// walking up from this test file until the migration folder is found.
func allyMigrationsDir(t *testing.T) string {
	_, file, _, _ := runtime.Caller(0)
	dir := filepath.Dir(file)
	for i := 0; i < 10; i++ {
		candidate := filepath.Join(dir, "migrations")
		if _, err := os.Stat(filepath.Join(candidate, "019_allies.sql")); err == nil {
			return candidate
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	t.Fatalf("could not locate apps/api/migrations from %s", file)
	return ""
}

func writePhaseBMigration(t *testing.T, dir, name string) {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(allyMigrationsDir(t), name))
	if err != nil {
		t.Fatalf("read migration %s: %v", name, err)
	}
	if err := os.WriteFile(filepath.Join(dir, name), data, 0o644); err != nil {
		t.Fatalf("write migration %s: %v", name, err)
	}
}

func applyMigrations(t *testing.T, db *database.DB) error {
	t.Helper()
	tmp := t.TempDir()
	writePhaseBMigration(t, tmp, "019_allies.sql")
	writePhaseBMigration(t, tmp, "020_commissions.sql")
	writePhaseBMigration(t, tmp, "021_financial_audit.sql")
	_, err := migrationpkg.Apply(context.Background(), db.DB, tmp, io.Discard)
	return err
}

func newAllyTestDB(t *testing.T) (*database.DB, *Service) {
	t.Helper()
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		t.Skip("skipping: DATABASE_URL not set")
	}
	db, err := database.Connect(url)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	if err := applyMigrations(t, db); err != nil {
		t.Fatalf("apply migrations: %v", err)
	}

	repo := allyinfra.NewRepository(db.DB)
	ar := auditinfra.NewRepository(db.DB)
	_ = ar
	return db, NewService(repo)
}

func mustExec(t *testing.T, db *database.DB, query string, args ...any) {
	t.Helper()
	if _, err := db.Exec(query, args...); err != nil {
		t.Fatalf("exec %q: %v", query, err)
	}
}

func TestCreateAllyAndListAreScopedToCoach(t *testing.T) {
	_, svc := newAllyTestDB(t)
	ctx := context.Background()

	ally, rel, err := svc.CreateAlly(ctx, allydomain.CreateInput{
		CoachID:        "coachA",
		LegalName:      "Gym Legal",
		CommercialName: "Gym Comercial",
		Category:       "gym",
		OwnerUserID:    "allyUser1",
	}, "coachA")
	if err != nil {
		t.Fatalf("create ally: %v", err)
	}
	if ally.Status != "pending" || rel.Status != "invited" {
		t.Fatalf("unexpected initial state: ally=%s rel=%s", ally.Status, rel.Status)
	}

	// coachA sees it; coachB does not.
	a, err := svc.ListByCoach(ctx, "coachA")
	if err != nil {
		t.Fatalf("list coachA: %v", err)
	}
	if len(a) != 1 || a[0].AllyID != ally.ID || a[0].RelationshipID != rel.ID {
		t.Fatalf("unexpected coachA list: %+v", a)
	}

	b, err := svc.ListByCoach(ctx, "coachB")
	if err != nil {
		t.Fatalf("list coachB: %v", err)
	}
	if len(b) != 0 {
		t.Fatalf("expected coachB to see no allies, got %+v", b)
	}
}

func TestGetByIDForCoachBlocksForeignRelationship(t *testing.T) {
	_, svc := newAllyTestDB(t)
	ctx := context.Background()

	_, rel, err := svc.CreateAlly(ctx, allydomain.CreateInput{
		CoachID:        "coachA",
		LegalName:      "Gym Legal",
		CommercialName: "Gym Comercial",
		Category:       "gym",
		OwnerUserID:    "allyUser1",
	}, "coachA")
	if err != nil {
		t.Fatalf("create ally: %v", err)
	}

	// Owner coach can read it.
	if _, err := svc.GetByIDForCoach(ctx, rel.ID, "coachA"); err != nil {
		t.Fatalf("owner read: %v", err)
	}

	// Another coach gets not-found (never leaks existence).
	if _, err := svc.GetByIDForCoach(ctx, rel.ID, "coachB"); err == nil {
		t.Fatal("expected not-found for a foreign relationship")
	} else if !errors.Is(err, allydomain.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}

	// A made-up id is also not-found.
	if _, err := svc.GetByIDForCoach(ctx, "does-not-exist", "coachA"); err == nil {
		t.Fatal("expected not-found for unknown id")
	} else if !errors.Is(err, allydomain.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestListByAllyUserScopesToOwner(t *testing.T) {
	_, svc := newAllyTestDB(t)
	ctx := context.Background()

	if _, _, err := svc.CreateAlly(ctx, allydomain.CreateInput{
		CoachID:        "coachA",
		LegalName:      "Gym Legal",
		CommercialName: "Gym Comercial",
		Category:       "gym",
		OwnerUserID:    "allyUser1",
	}, "coachA"); err != nil {
		t.Fatalf("create ally: %v", err)
	}

	owner, err := svc.ListByAllyUser(ctx, "allyUser1")
	if err != nil {
		t.Fatalf("list owner: %v", err)
	}
	if len(owner) != 1 {
		t.Fatalf("expected owner to see 1 ally, got %d", len(owner))
	}

	other, err := svc.ListByAllyUser(ctx, "nobody")
	if err != nil {
		t.Fatalf("list nobody: %v", err)
	}
	if len(other) != 0 {
		t.Fatalf("expected nobody to see 0 allies, got %d", len(other))
	}
}
