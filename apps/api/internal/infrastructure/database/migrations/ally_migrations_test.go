package migrations

import (
	"context"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

// allyMigrationsDir returns the absolute path to apps/api/migrations using the
// location of this test file, so the test is independent of the working dir.
func allyMigrationsDir() string {
	_, file, _, _ := runtime.Caller(0)
	// .../internal/infrastructure/database/migrations -> apps/api/migrations
	dir := filepath.Dir(file)          // migrations
	dir = filepath.Dir(dir)            // database
	dir = filepath.Dir(dir)            // infrastructure
	dir = filepath.Dir(dir)            // internal
	dir = filepath.Dir(dir)            // apps/api
	return filepath.Join(dir, "migrations")
}

func newLocalDB(t *testing.T) *database.DB {
	t.Helper()
	path := filepath.Join(t.TempDir(), "test.db")
	db, err := database.Connect("file:"+path, "")
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

func mustExec(t *testing.T, db *database.DB, query string, args ...any) {
	t.Helper()
	if _, err := db.Exec(query, args...); err != nil {
		t.Fatalf("exec %q: %v", query, err)
	}
}

// readPhaseBMigration reads one of the new Phase B migration files from the real
// migrations directory so the test exercises the actual SQL.
func readPhaseBMigration(t *testing.T, name string) string {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(allyMigrationsDir(), name))
	if err != nil {
		t.Fatalf("read migration %s: %v", name, err)
	}
	return string(data)
}

func TestAllyMigrationsApplyAndAreIdempotent(t *testing.T) {
	ctx := context.Background()
	dir := t.TempDir()
	writeMigration(t, dir, "019_allies.sql", readPhaseBMigration(t, "019_allies.sql"))
	writeMigration(t, dir, "020_commissions.sql", readPhaseBMigration(t, "020_commissions.sql"))
	writeMigration(t, dir, "021_financial_audit.sql", readPhaseBMigration(t, "021_financial_audit.sql"))

	db := newLocalDB(t)

	res, err := Apply(ctx, db.DB, dir, io.Discard)
	if err != nil {
		t.Fatalf("apply: %v", err)
	}
	applied := map[string]bool{}
	for _, n := range res.Applied {
		applied[n] = true
	}
	for _, want := range []string{"019_allies.sql", "020_commissions.sql", "021_financial_audit.sql"} {
		if !applied[want] {
			t.Fatalf("expected %s to be applied, got %v", want, res.Applied)
		}
	}

	// Second run is a no-op.
	res, err = Apply(ctx, db.DB, dir, io.Discard)
	if err != nil {
		t.Fatalf("second apply: %v", err)
	}
	if len(res.Applied) != 0 {
		t.Fatalf("expected 0 applied on second run, got %v", res.Applied)
	}
}

func TestAllyMigrationsConstraints(t *testing.T) {
	ctx := context.Background()
	dir := t.TempDir()
	writeMigration(t, dir, "019_allies.sql", readPhaseBMigration(t, "019_allies.sql"))
	writeMigration(t, dir, "020_commissions.sql", readPhaseBMigration(t, "020_commissions.sql"))
	writeMigration(t, dir, "021_financial_audit.sql", readPhaseBMigration(t, "021_financial_audit.sql"))

	db := newLocalDB(t)
	if _, err := Apply(ctx, db.DB, dir, io.Discard); err != nil {
		t.Fatalf("apply: %v", err)
	}

	// Create an ally + relationship to use in the constraint checks.
	mustExec(t, db, `INSERT INTO allies (id, legal_name, commercial_name, category, status) VALUES ('a1','Legal','Comercial','gym','active')`)
	mustExec(t, db, `INSERT INTO coach_ally_relationships (id, coach_id, ally_id, status) VALUES ('r1','coachA','a1','active')`)

	// CHECK: allies.status must be a valid value.
	if err := db.QueryRow(`INSERT INTO allies (id, legal_name, commercial_name, category, status) VALUES ('a2','L','C','gym','bogus')`).Scan(); err == nil {
		t.Fatal("expected CHECK constraint on allies.status to reject invalid status")
	}

	// CHECK: commission rate_bps must be 0..100000.
	if err := db.QueryRow(`INSERT INTO commission_agreements (id, relationship_id, version, rate_bps, valid_from, status) VALUES ('c1','r1',1,200000,'2026-01-01','proposed')`).Scan(); err == nil {
		t.Fatal("expected CHECK on rate_bps to reject out-of-range value")
	}

	// CHECK: interval sanity — valid_to must be >= valid_from when set.
	if err := db.QueryRow(`INSERT INTO commission_agreements (id, relationship_id, version, rate_bps, valid_from, valid_to, status) VALUES ('c2','r1',1,100,'2026-02-01','2026-01-01','proposed')`).Scan(); err == nil {
		t.Fatal("expected CHECK on valid_to>=valid_from to reject inverted interval")
	}

	// uq_agreement_open: only one open agreement per relationship.
	mustExec(t, db, `INSERT INTO commission_agreements (id, relationship_id, version, rate_bps, valid_from, status) VALUES ('c3','r1',1,100,'2026-01-01','proposed')`)
	if err := db.QueryRow(`INSERT INTO commission_agreements (id, relationship_id, version, rate_bps, valid_from, status) VALUES ('c4','r1',2,100,'2026-02-01','proposed')`).Scan(); err == nil {
		t.Fatal("expected uq_agreement_open to reject a second open agreement")
	}
	// Exactly one open row remains.
	var open int
	if err := db.QueryRow(`SELECT COUNT(*) FROM commission_agreements WHERE relationship_id='r1' AND valid_to IS NULL`).Scan(&open); err != nil {
		t.Fatalf("count open: %v", err)
	}
	if open != 1 {
		t.Fatalf("expected exactly 1 open agreement, got %d", open)
	}

	// financial_audit_events is append-only: UPDATE aborts.
	mustExec(t, db, `INSERT INTO financial_audit_events (id, entity, entity_id, action, actor_type, created_at) VALUES ('f1','ally','a1','ally.created','user',datetime('now'))`)
	if err := db.QueryRow(`UPDATE financial_audit_events SET action='tampered' WHERE id='f1'`).Scan(); err == nil {
		t.Fatal("expected trigger to block UPDATE on financial_audit_events")
	}
	// ...and DELETE aborts.
	if err := db.QueryRow(`DELETE FROM financial_audit_events WHERE id='f1'`).Scan(); err == nil {
		t.Fatal("expected trigger to block DELETE on financial_audit_events")
	}
	// Row still there (append-only preserved).
	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM financial_audit_events WHERE id='f1'`).Scan(&n); err != nil {
		t.Fatalf("count audit: %v", err)
	}
	if n != 1 {
		t.Fatalf("expected audit row to survive, got %d", n)
	}
}

func TestSplitStatementsPreservesTriggerBody(t *testing.T) {
	script := `CREATE TRIGGER IF NOT EXISTS trg_x BEFORE UPDATE ON t BEGIN SELECT RAISE(ABORT, 'no'); END;
INSERT INTO t (x) VALUES (1);
`
	got := SplitStatements(script)
	if len(got) != 2 {
		t.Fatalf("expected 2 statements, got %d: %v", len(got), got)
	}
	if !strings.Contains(got[0], "BEGIN") || !strings.Contains(got[0], "END") || !strings.Contains(got[0], "RAISE") {
		t.Fatalf("trigger body was split incorrectly: %q", got[0])
	}
	if !strings.Contains(got[1], "INSERT INTO t") {
		t.Fatalf("second statement mangled: %q", got[1])
	}
}
