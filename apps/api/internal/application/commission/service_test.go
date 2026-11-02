package commission

import (
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	migrationpkg "github.com/innotechlabs01/mr-training-api/internal/infrastructure/database/migrations"
	commissiondomain "github.com/innotechlabs01/mr-training-api/internal/domain/commission"
	commissioninfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/commission"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

// phaseBMigrationsDir returns the absolute path to apps/api/migrations by
// walking up from this test file until the migration folder is found.
func phaseBMigrationsDir(t *testing.T) string {
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
	data, err := os.ReadFile(filepath.Join(phaseBMigrationsDir(t), name))
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

func newCommissionTestDB(t *testing.T) (*database.DB, *Service) {
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

	// Apply the three Phase B migrations so the tables exist.
	if err := applyMigrations(t, db); err != nil {
		t.Fatalf("apply migrations: %v", err)
	}

	// Base rows: ally + coach-ally relationship owned by coachA.
	mustExec(t, db, `INSERT INTO allies (id, legal_name, commercial_name, category, status) VALUES ('a1','Legal','Comercial','gym','active')`)
	mustExec(t, db, `INSERT INTO coach_ally_relationships (id, coach_id, ally_id, status) VALUES ('r1','coachA','a1','active')`)
	mustExec(t, db, `INSERT INTO coach_ally_relationships (id, coach_id, ally_id, status) VALUES ('r2','coachB','a1','active')`)

	repo := commissioninfra.NewRepository(db.DB)
	return db, NewService(repo)
}

func mustExec(t *testing.T, db *database.DB, query string, args ...any) {
	t.Helper()
	if _, err := db.Exec(query, args...); err != nil {
		t.Fatalf("exec %q: %v", query, err)
	}
}

func TestCreateAgreementVersionHappyPath(t *testing.T) {
	db, svc := newCommissionTestDB(t)
	ctx := context.Background()

	a, err := svc.CreateAgreementVersion(ctx, commissiondomain.CreateAgreementInput{
		RelationshipID:   "r1",
		CoachID:          "coachA",
		RateBps:          1000,
		FixedAmountCents: 50000,
		Currency:         "COP",
		ValidFrom:        "2026-01-01 00:00:00",
	}, "coachA")
	if err != nil {
		t.Fatalf("create v1: %v", err)
	}
	if a.Version != 1 || a.ValidTo != nil || a.Status != "proposed" {
		t.Fatalf("unexpected v1: %+v", a)
	}

	// Closing v1 opens v2 at a later date.
	b, err := svc.CreateAgreementVersion(ctx, commissiondomain.CreateAgreementInput{
		RelationshipID:   "r1",
		CoachID:          "coachA",
		RateBps:          1500,
		FixedAmountCents: 0,
		Currency:         "COP",
		ValidFrom:        "2026-02-01 00:00:00",
	}, "coachA")
	if err != nil {
		t.Fatalf("create v2: %v", err)
	}
	if b.Version != 2 || b.Status != "proposed" {
		t.Fatalf("unexpected v2: %+v", b)
	}

	// v1 must now be closed at v2's valid_from.
	var closedTo string
	if err := db.QueryRow(`SELECT valid_to FROM commission_agreements WHERE version=1 AND relationship_id='r1'`).Scan(&closedTo); err != nil {
		t.Fatalf("scan v1 valid_to: %v", err)
	}
	if closedTo != "2026-02-01 00:00:00" {
		t.Fatalf("expected v1 closed at 2026-02-01, got %q", closedTo)
	}

	// Only one open row.
	var open int
	if err := db.QueryRow(`SELECT COUNT(*) FROM commission_agreements WHERE relationship_id='r1' AND valid_to IS NULL`).Scan(&open); err != nil {
		t.Fatalf("count open: %v", err)
	}
	if open != 1 {
		t.Fatalf("expected exactly 1 open agreement, got %d", open)
	}
}

func TestCreateAgreementVersionRejectsOverlap(t *testing.T) {
	_, svc := newCommissionTestDB(t)
	ctx := context.Background()

	if _, err := svc.CreateAgreementVersion(ctx, commissiondomain.CreateAgreementInput{
		RelationshipID: "r1", CoachID: "coachA", RateBps: 1000, ValidFrom: "2026-01-01 00:00:00",
	}, "coachA"); err != nil {
		t.Fatalf("create v1: %v", err)
	}

	// Opening a new version AFTER the current open starts is legal: the open is
	// closed at the new valid_from and the new version begins there (no overlap).
	if _, err := svc.CreateAgreementVersion(ctx, commissiondomain.CreateAgreementInput{
		RelationshipID: "r1", CoachID: "coachA", RateBps: 1000, ValidFrom: "2026-01-15 00:00:00",
	}, "coachA"); err != nil {
		t.Fatalf("create v2 (after open starts): %v", err)
	}

	// Now v2 is open from 2026-01-15. Anything starting at or before that overlaps.
	if _, err := svc.CreateAgreementVersion(ctx, commissiondomain.CreateAgreementInput{
		RelationshipID: "r1", CoachID: "coachA", RateBps: 1000, ValidFrom: "2026-01-10 00:00:00",
	}, "coachA"); err == nil {
		t.Fatal("expected overlap error for interval starting before the open")
	} else if !errors.Is(err, commissiondomain.ErrOverlap) {
		t.Fatalf("expected ErrOverlap, got %v", err)
	}
	if _, err := svc.CreateAgreementVersion(ctx, commissiondomain.CreateAgreementInput{
		RelationshipID: "r1", CoachID: "coachA", RateBps: 1000, ValidFrom: "2026-01-15 00:00:00",
	}, "coachA"); err == nil {
		t.Fatal("expected overlap error for interval starting exactly at the open")
	} else if !errors.Is(err, commissiondomain.ErrOverlap) {
		t.Fatalf("expected ErrOverlap at open boundary, got %v", err)
	}

	// Historical overlap too: close at 2026-06-01, then try an interval ending after it starts.
	if _, err := svc.CreateAgreementVersion(ctx, commissiondomain.CreateAgreementInput{
		RelationshipID: "r1", CoachID: "coachA", RateBps: 1000, ValidFrom: "2026-06-01 00:00:00",
	}, "coachA"); err != nil {
		t.Fatalf("create v3: %v", err)
	}
	if _, err := svc.CreateAgreementVersion(ctx, commissiondomain.CreateAgreementInput{
		RelationshipID: "r1", CoachID: "coachA", RateBps: 1000, ValidFrom: "2026-05-01 00:00:00",
	}, "coachA"); err == nil {
		t.Fatal("expected overlap error vs historical interval")
	} else if !errors.Is(err, commissiondomain.ErrOverlap) {
		t.Fatalf("expected ErrOverlap vs historical, got %v", err)
	}
}

func TestCreateAgreementVersionEnforcesOwnership(t *testing.T) {
	_, svc := newCommissionTestDB(t)
	ctx := context.Background()

	// coachB is NOT the owner of r1 (coachA is).
	if _, err := svc.CreateAgreementVersion(ctx, commissiondomain.CreateAgreementInput{
		RelationshipID: "r1", CoachID: "coachB", RateBps: 1000, ValidFrom: "2026-01-01 00:00:00",
	}, "coachB"); err == nil {
		t.Fatal("expected not-found for a foreign relationship")
	} else if !errors.Is(err, commissiondomain.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}

	// But coachB can create on its own relationship r2.
	if _, err := svc.CreateAgreementVersion(ctx, commissiondomain.CreateAgreementInput{
		RelationshipID: "r2", CoachID: "coachB", RateBps: 1000, ValidFrom: "2026-01-01 00:00:00",
	}, "coachB"); err != nil {
		t.Fatalf("coachB on own relationship: %v", err)
	}
}
