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
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		t.Skip("skipping: DATABASE_URL not set")
	}
	db, err := database.Connect(url)
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

func TestAllyCatalogMigration(t *testing.T) {
	ctx := context.Background()
	dir := t.TempDir()
	writeMigration(t, dir, "019_allies.sql", readPhaseBMigration(t, "019_allies.sql"))
	writeMigration(t, dir, "022_ally_catalog.sql", readPhaseBMigration(t, "022_ally_catalog.sql"))

	db := newLocalDB(t)
	// Enable foreign key enforcement in SQLite for constraint tests.
	if _, err := db.Exec(`PRAGMA foreign_keys = ON`); err != nil {
		t.Fatalf("pragma foreign_keys: %v", err)
	}
	res, err := Apply(ctx, db.DB, dir, io.Discard)
	if err != nil {
		t.Fatalf("apply: %v", err)
	}
	applied := map[string]bool{}
	for _, n := range res.Applied {
		applied[n] = true
	}
	if !applied["022_ally_catalog.sql"] {
		t.Fatalf("expected 022_ally_catalog.sql applied, got %v", res.Applied)
	}

	// Tables exist.
	for _, table := range []string{"ally_products", "ally_services"} {
		var c int
		if err := db.QueryRow(`SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?`, table).Scan(&c); err != nil {
			t.Fatalf("check table %s: %v", table, err)
		}
		if c != 1 {
			t.Fatalf("expected table %s to exist", table)
		}
	}

	// CHECK: price_cents >= 0 rejects negative.
	if err := db.QueryRow(`INSERT INTO ally_products (id, ally_id, name, price_cents) VALUES ('p1','a1','x',-1)`).Scan(); err == nil {
		t.Fatal("expected CHECK price_cents>=0 to reject negative price")
	}

	// CHECK: currency IN ('COP') rejects other.
	if err := db.QueryRow(`INSERT INTO ally_products (id, ally_id, name, price_cents, currency) VALUES ('p2','a1','x',0,'USD')`).Scan(); err == nil {
		t.Fatal("expected CHECK currency to reject non-COP")
	}

	// FK: ally_id must exist in allies.
	if err := db.QueryRow(`INSERT INTO ally_products (id, ally_id, name, price_cents) VALUES ('p3','nope','x',0)`).Scan(); err == nil {
		t.Fatal("expected FK ally_id to reject unknown ally")
	}

	// Idempotent second run.
	res, err = Apply(ctx, db.DB, dir, io.Discard)
	if err != nil {
		t.Fatalf("second apply: %v", err)
	}
	if len(res.Applied) != 0 {
		t.Fatalf("expected 0 applied on second run, got %v", res.Applied)
	}
}

func TestPaymentDeclarationsMigration(t *testing.T) {
	ctx := context.Background()
	dir := t.TempDir()
	writeMigration(t, dir, "019_allies.sql", readPhaseBMigration(t, "019_allies.sql"))
	writeMigration(t, dir, "023_ally_commerce.sql", readPhaseBMigration(t, "023_ally_commerce.sql"))
	writeMigration(t, dir, "024_ally_payment_declarations.sql", readPhaseBMigration(t, "024_ally_payment_declarations.sql"))

	db := newLocalDB(t)
	if _, err := db.Exec(`PRAGMA foreign_keys = ON`); err != nil {
		t.Fatalf("pragma foreign_keys: %v", err)
	}
	res, err := Apply(ctx, db.DB, dir, io.Discard)
	if err != nil {
		t.Fatalf("apply: %v", err)
	}
	applied := map[string]bool{}
	for _, n := range res.Applied {
		applied[n] = true
	}
	if !applied["024_ally_payment_declarations.sql"] {
		t.Fatalf("expected 024_ally_payment_declarations.sql applied, got %v", res.Applied)
	}

	var c int
	if err := db.QueryRow(`SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='ally_payment_declarations'`).Scan(&c); err != nil {
		t.Fatalf("check table: %v", err)
	}
	if c != 1 {
		t.Fatal("expected table ally_payment_declarations to exist")
	}

	mustExec(t, db, `INSERT INTO allies (id, legal_name, commercial_name, category, status) VALUES ('a1','Legal','Comercial','gym','active')`)
	mustExec(t, db, `INSERT INTO coach_ally_relationships (id, coach_id, ally_id, status) VALUES ('r1','coachA','a1','active')`)
	mustExec(t, db, `INSERT INTO ally_operations (id, kind, relationship_id, ally_id, athlete_id, status) VALUES ('o1','order','r1','a1','ath1','fulfilled')`)

	if _, err := db.Exec(`INSERT INTO ally_payment_declarations (id, operation_id, version, amount_cents, declared_at, status) VALUES ('pd1','o1',1,-100,'2026-10-16 00:00:00','declared')`); err == nil {
		t.Fatal("expected CHECK amount_cents>=0 to reject negative")
	}

	if _, err := db.Exec(`INSERT INTO ally_payment_declarations (id, operation_id, version, amount_cents, currency, declared_at, status) VALUES ('pd2','o1',1,100,'USD','2026-10-16 00:00:00','declared')`); err == nil {
		t.Fatal("expected CHECK currency to reject non-COP")
	}

	if _, err := db.Exec(`INSERT INTO ally_payment_declarations (id, operation_id, version, amount_cents, declared_at, status) VALUES ('pd3','nope',1,100,'2026-10-16 00:00:00','declared')`); err == nil {
		t.Fatal("expected FK operation_id to reject unknown operation")
	}

	mustExec(t, db, `INSERT INTO ally_payment_declarations (id, operation_id, version, amount_cents, currency, declared_at, status) VALUES ('pd4','o1',1,50000,'COP','2026-10-16 00:00:00','declared')`)

	if _, err := db.Exec(`INSERT INTO ally_payment_declarations (id, operation_id, version, amount_cents, currency, declared_at, status) VALUES ('pd5','o1',2,60000,'COP','2026-10-16 01:00:00','declared')`); err == nil {
		t.Fatal("expected uq_payment_decl_active to reject second active declaration")
	}

	mustExec(t, db, `INSERT INTO ally_payment_declarations (id, operation_id, version, amount_cents, currency, declared_at, status) VALUES ('pd6','o1',3,70000,'COP','2026-10-16 02:00:00','rejected')`)

	res, err = Apply(ctx, db.DB, dir, io.Discard)
	if err != nil {
		t.Fatalf("second apply: %v", err)
	}
	if len(res.Applied) != 0 {
		t.Fatalf("expected 0 applied on second run, got %v", res.Applied)
	}
}

func TestCommissionEntriesMigration(t *testing.T) {
	ctx := context.Background()
	dir := t.TempDir()
	writeMigration(t, dir, "019_allies.sql", readPhaseBMigration(t, "019_allies.sql"))
	writeMigration(t, dir, "020_commissions.sql", readPhaseBMigration(t, "020_commissions.sql"))
	writeMigration(t, dir, "023_ally_commerce.sql", readPhaseBMigration(t, "023_ally_commerce.sql"))
	writeMigration(t, dir, "024_ally_payment_declarations.sql", readPhaseBMigration(t, "024_ally_payment_declarations.sql"))
	writeMigration(t, dir, "025_commission_entries.sql", readPhaseBMigration(t, "025_commission_entries.sql"))

	db := newLocalDB(t)
	if _, err := db.Exec(`PRAGMA foreign_keys = ON`); err != nil {
		t.Fatalf("pragma foreign_keys: %v", err)
	}
	res, err := Apply(ctx, db.DB, dir, io.Discard)
	if err != nil {
		t.Fatalf("apply: %v", err)
	}
	applied := map[string]bool{}
	for _, n := range res.Applied {
		applied[n] = true
	}
	if !applied["025_commission_entries.sql"] {
		t.Fatalf("expected 025_commission_entries.sql applied, got %v", res.Applied)
	}

	for _, table := range []string{"commission_entries", "financial_adjustments"} {
		var c int
		if err := db.QueryRow(`SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?`, table).Scan(&c); err != nil {
			t.Fatalf("check table %s: %v", table, err)
		}
		if c != 1 {
			t.Fatalf("expected table %s to exist", table)
		}
	}

	mustExec(t, db, `INSERT INTO allies (id, legal_name, commercial_name, category, status) VALUES ('a1','Legal','Comercial','gym','active')`)
	mustExec(t, db, `INSERT INTO coach_ally_relationships (id, coach_id, ally_id, status) VALUES ('r1','coachA','a1','active')`)
	mustExec(t, db, `INSERT INTO commission_agreements (id, relationship_id, version, rate_bps, fixed_amount_cents, eligible_base_rule, rounding, currency, valid_from, status) VALUES ('ag1','r1',1,1000,0,'gross_minus_discount_minus_tax','half_up','COP','2026-01-01 00:00:00','accepted')`)
	mustExec(t, db, `INSERT INTO ally_operations (id, kind, relationship_id, ally_id, athlete_id, status) VALUES ('o1','order','r1','a1','ath1','fulfilled')`)

	if _, err := db.Exec(`INSERT INTO commission_entries (id, operation_id, relationship_id, coach_id, agreement_id, agreement_version, base_cents, rate_bps, fixed_amount_cents, amount_cents, currency, status, computed_at) VALUES ('ce1','o1','r1','coachA','ag1',1,-100,1000,0,0,'COP','accrued','2026-10-16 00:00:00')`); err == nil {
		t.Fatal("expected CHECK base_cents>=0 to reject negative")
	}

	if _, err := db.Exec(`INSERT INTO commission_entries (id, operation_id, relationship_id, coach_id, agreement_id, agreement_version, base_cents, rate_bps, fixed_amount_cents, amount_cents, currency, status, computed_at) VALUES ('ce2','o1','r1','coachA','ag1',1,100,200000,0,0,'COP','accrued','2026-10-16 00:00:00')`); err == nil {
		t.Fatal("expected CHECK rate_bps range to reject out-of-range")
	}

	if _, err := db.Exec(`INSERT INTO commission_entries (id, operation_id, relationship_id, coach_id, agreement_id, agreement_version, base_cents, rate_bps, fixed_amount_cents, amount_cents, currency, status, computed_at) VALUES ('ce3','o1','r1','coachA','ag1',1,100,1000,0,-50,'COP','accrued','2026-10-16 00:00:00')`); err == nil {
		t.Fatal("expected CHECK amount_cents>=0 to reject negative")
	}

	mustExec(t, db, `INSERT INTO commission_entries (id, operation_id, relationship_id, coach_id, agreement_id, agreement_version, base_cents, rate_bps, fixed_amount_cents, amount_cents, currency, status, computed_at) VALUES ('ce4','o1','r1','coachA','ag1',1,10000,1000,0,1000,'COP','accrued','2026-10-16 00:00:00')`)

	if _, err := db.Exec(`INSERT INTO commission_entries (id, operation_id, relationship_id, coach_id, agreement_id, agreement_version, base_cents, rate_bps, fixed_amount_cents, amount_cents, currency, status, computed_at) VALUES ('ce5','o1','r1','coachA','ag1',1,10000,1000,0,1000,'COP','accrued','2026-10-16 00:00:00')`); err == nil {
		t.Fatal("expected UNIQUE(operation_id) to reject second commission entry")
	}

	res, err = Apply(ctx, db.DB, dir, io.Discard)
	if err != nil {
		t.Fatalf("second apply: %v", err)
	}
	if len(res.Applied) != 0 {
		t.Fatalf("expected 0 applied on second run, got %v", res.Applied)
	}
}

func TestAllyCommerceMigration(t *testing.T) {
	ctx := context.Background()
	dir := t.TempDir()
	writeMigration(t, dir, "019_allies.sql", readPhaseBMigration(t, "019_allies.sql"))
	writeMigration(t, dir, "020_commissions.sql", readPhaseBMigration(t, "020_commissions.sql"))
	writeMigration(t, dir, "023_ally_commerce.sql", readPhaseBMigration(t, "023_ally_commerce.sql"))

	db := newLocalDB(t)
	// Enable foreign key enforcement in SQLite for constraint tests.
	if _, err := db.Exec(`PRAGMA foreign_keys = ON`); err != nil {
		t.Fatalf("pragma foreign_keys: %v", err)
	}
	res, err := Apply(ctx, db.DB, dir, io.Discard)
	if err != nil {
		t.Fatalf("apply: %v", err)
	}
	applied := map[string]bool{}
	for _, n := range res.Applied {
		applied[n] = true
	}
	if !applied["023_ally_commerce.sql"] {
		t.Fatalf("expected 023_ally_commerce.sql applied, got %v", res.Applied)
	}

	// Tables exist.
	for _, table := range []string{"ally_operations", "ally_operation_items", "ally_redemptions"} {
		var c int
		if err := db.QueryRow(`SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?`, table).Scan(&c); err != nil {
			t.Fatalf("check table %s: %v", table, err)
		}
		if c != 1 {
			t.Fatalf("expected table %s to exist", table)
		}
	}

	// Seed a relationship for FK tests.
	mustExec(t, db, `INSERT INTO allies (id, legal_name, commercial_name, category, status) VALUES ('a1','Legal','Comercial','gym','active')`)
	mustExec(t, db, `INSERT INTO coach_ally_relationships (id, coach_id, ally_id, status) VALUES ('r1','coachA','a1','active')`)

	// CHECK: kind must be order|reservation.
	if _, err := db.Exec(`INSERT INTO ally_operations (id, kind, relationship_id, ally_id, athlete_id, status) VALUES ('o1','bogus','r1','a1','ath1','created')`); err == nil {
		t.Fatal("expected CHECK kind to reject invalid value")
	}

	// CHECK: status must be valid.
	if _, err := db.Exec(`INSERT INTO ally_operations (id, kind, relationship_id, ally_id, athlete_id, status) VALUES ('o2','order','r1','a1','ath1','bogus')`); err == nil {
		t.Fatal("expected CHECK status to reject invalid value")
	}

	// FK: relationship_id must exist.
	if _, err := db.Exec(`INSERT INTO ally_operations (id, kind, relationship_id, ally_id, athlete_id, status) VALUES ('o3','order','nope','a1','ath1','created')`); err == nil {
		t.Fatal("expected FK relationship_id to reject unknown relationship")
	}

	// CHECK: offer_kind must be product|service.
	if _, err := db.Exec(`INSERT INTO ally_operation_items (id, operation_id, offer_kind, offer_id, name, unit_price_cents, quantity) VALUES ('i1','o1','bogus','p1','x',0,1)`); err == nil {
		t.Fatal("expected CHECK offer_kind to reject invalid value")
	}

	// Seed op o4 for unit_price_cents and quantity tests.
	if _, err := db.Exec(`INSERT INTO ally_operations (id, kind, relationship_id, ally_id, athlete_id, status) VALUES ('o4','order','r1','a1','ath1','created')`); err != nil {
		t.Fatalf("seed op: %v", err)
	}
	// CHECK: unit_price_cents >= 0.
	if _, err := db.Exec(`INSERT INTO ally_operation_items (id, operation_id, offer_kind, offer_id, name, unit_price_cents, quantity) VALUES ('i2','o4','product','p1','x',-5,1)`); err == nil {
		t.Fatal("expected CHECK unit_price_cents>=0 to reject negative price")
	}

	// CHECK: quantity >= 1.
	if _, err := db.Exec(`INSERT INTO ally_operation_items (id, operation_id, offer_kind, offer_id, name, unit_price_cents, quantity) VALUES ('i3','o4','product','p1','x',0,0)`); err == nil {
		t.Fatal("expected CHECK quantity>=1 to reject zero quantity")
	}

	// UNIQUE(token_hash) on redemptions.
	mustExec(t, db, `INSERT INTO ally_redemptions (id, operation_id, token_hash, expires_at, status) VALUES ('red1','o4','hash1','2026-12-31 23:59:59','issued')`)
	if _, err := db.Exec(`INSERT INTO ally_redemptions (id, operation_id, token_hash, expires_at, status) VALUES ('red2','o4','hash1','2026-12-31 23:59:59','issued')`); err == nil {
		t.Fatal("expected UNIQUE(token_hash) to reject duplicate token")
	}

	// CHECK: redemption status must be valid.
	if _, err := db.Exec(`INSERT INTO ally_redemptions (id, operation_id, token_hash, expires_at, status) VALUES ('red3','o4','hash3','2026-12-31 23:59:59','bogus')`); err == nil {
		t.Fatal("expected CHECK redemption status to reject invalid value")
	}

	// Idempotent second run.
	res, err = Apply(ctx, db.DB, dir, io.Discard)
	if err != nil {
		t.Fatalf("second apply: %v", err)
	}
	if len(res.Applied) != 0 {
		t.Fatalf("expected 0 applied on second run, got %v", res.Applied)
	}
}

// TestSettlementsMigration tests migration 026 (coach_settlements, settlement_items, settlement_documents, coach_payment_records).
func TestSettlementsMigration(t *testing.T) {
	ctx := context.Background()
	dir := t.TempDir()
	writeMigration(t, dir, "019_allies.sql", readPhaseBMigration(t, "019_allies.sql"))
	writeMigration(t, dir, "020_commissions.sql", readPhaseBMigration(t, "020_commissions.sql"))
	writeMigration(t, dir, "023_ally_commerce.sql", readPhaseBMigration(t, "023_ally_commerce.sql"))
	writeMigration(t, dir, "024_ally_payment_declarations.sql", readPhaseBMigration(t, "024_ally_payment_declarations.sql"))
	writeMigration(t, dir, "025_commission_entries.sql", readPhaseBMigration(t, "025_commission_entries.sql"))
	writeMigration(t, dir, "026_settlements.sql", readPhaseBMigration(t, "026_settlements.sql"))

	db := newLocalDB(t)
	if _, err := db.Exec(`PRAGMA foreign_keys = ON`); err != nil {
		t.Fatalf("pragma foreign_keys: %v", err)
	}
	res, err := Apply(ctx, db.DB, dir, io.Discard)
	if err != nil {
		t.Fatalf("apply: %v", err)
	}
	applied := map[string]bool{}
	for _, n := range res.Applied {
		applied[n] = true
	}
	if !applied["026_settlements.sql"] {
		t.Fatalf("expected 026_settlements.sql applied, got %v", res.Applied)
	}

	// Tables exist.
	for _, table := range []string{"coach_settlements", "settlement_items", "settlement_documents", "coach_payment_records"} {
		var c int
		if err := db.QueryRow(`SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?`, table).Scan(&c); err != nil {
			t.Fatalf("check table %s: %v", table, err)
		}
		if c != 1 {
			t.Fatalf("expected table %s to exist", table)
		}
	}

	// Seed: coach, ally, relationship, operation, entry.
	mustExec(t, db, `INSERT INTO allies (id, legal_name, commercial_name, category, status) VALUES ('a1','Legal','Comercial','gym','active')`)
	mustExec(t, db, `INSERT INTO coach_ally_relationships (id, coach_id, ally_id, status) VALUES ('r1','coachA','a1','active')`)
	mustExec(t, db, `INSERT INTO commission_agreements (id, relationship_id, version, rate_bps, fixed_amount_cents, eligible_base_rule, rounding, currency, valid_from, status) VALUES ('ag1','r1',1,1000,0,'gross_minus_discount_minus_tax','half_up','COP','2026-01-01 00:00:00','accepted')`)
	mustExec(t, db, `INSERT INTO ally_operations (id, kind, relationship_id, ally_id, athlete_id, status) VALUES ('o1','order','r1','a1','ath1','fulfilled')`)
	mustExec(t, db, `INSERT INTO ally_operation_items (id, operation_id, offer_kind, offer_id, name, unit_price_cents, quantity) VALUES ('i1','o1','product','p1','Producto',200000,2)`)
	mustExec(t, db, `INSERT INTO ally_payment_declarations (id, operation_id, version, amount_cents, currency, declared_at, status) VALUES ('pd1','o1',1,50000,'COP','2026-10-16 00:00:00','declared')`)
	mustExec(t, db, `INSERT INTO commission_entries (id, operation_id, relationship_id, coach_id, agreement_id, agreement_version, base_cents, rate_bps, fixed_amount_cents, amount_cents, currency, status, computed_at) VALUES ('ce1','o1','r1','coachA','ag1',1,400000,1000,0,40000,'COP','accrued','2026-10-16 00:00:00')`)

	// CHECK: currency must be COP.
	if _, err := db.Exec(`INSERT INTO coach_settlements (id, coach_id, ally_id, period_start, period_end, period_key, currency, status) VALUES ('s1','coachA','a1','2026-10-01','2026-10-31','2026-10','USD','draft')`); err == nil {
		t.Fatal("expected CHECK currency='COP' to reject non-COP")
	}

	// CHECK: status must be valid.
	if _, err := db.Exec(`INSERT INTO coach_settlements (id, coach_id, ally_id, period_start, period_end, period_key, currency, status) VALUES ('s2','coachA','a1','2026-10-01','2026-10-31','2026-10','COP','bogus')`); err == nil {
		t.Fatal("expected CHECK status to reject invalid value")
	}

	// Valid settlement insert.
	mustExec(t, db, `INSERT INTO coach_settlements (id, coach_id, ally_id, period_start, period_end, period_key, currency, status, operations_count, base_total_cents, commission_gross_cents, adjustments_cents, commission_net_cents) VALUES ('s1','coachA','a1','2026-10-01','2026-10-31','2026-10','COP','draft',1,400000,40000,0,40000)`)

	// UNIQUE(coach_id, ally_id, period_key, currency): duplicate settlement.
	if _, err := db.Exec(`INSERT INTO coach_settlements (id, coach_id, ally_id, period_start, period_end, period_key, currency, status) VALUES ('s2','coachA','a1','2026-10-01','2026-10-31','2026-10','COP','draft')`); err == nil {
		t.Fatal("expected UNIQUE(coach_id, ally_id, period_key, currency) to reject duplicate settlement")
	}

	// Valid settlement item insert.
	mustExec(t, db, `INSERT INTO settlement_items (id, settlement_id, entry_id, base_cents, rate_bps, amount_cents) VALUES ('si1','s1','ce1',400000,1000,40000)`)

	// UNIQUE(settlement_id, entry_id): duplicate item.
	if _, err := db.Exec(`INSERT INTO settlement_items (id, settlement_id, entry_id, base_cents, rate_bps, amount_cents) VALUES ('si2','s1','ce1',400000,1000,40000)`); err == nil {
		t.Fatal("expected UNIQUE(settlement_id, entry_id) to reject duplicate item")
	}

	// CHECK: amount_cents >= 0.
	if _, err := db.Exec(`INSERT INTO settlement_items (id, settlement_id, entry_id, base_cents, rate_bps, amount_cents) VALUES ('si3','s1','ce1',400000,1000,-5000)`); err == nil {
		t.Fatal("expected CHECK amount_cents>=0 to reject negative amount")
	}

	// Valid payment record insert.
	mustExec(t, db, `INSERT INTO coach_payment_records (id, settlement_id, coach_id, payer_ally_id, amount_cents, currency, actor_id, actor_type, reference, declared_at, status) VALUES ('cpr1','s1','coachA','a1',40000,'COP','coachA','user','ref-1','2026-10-31 00:00:00','declared')`)

	// CHECK: payment record status must be valid.
	if _, err := db.Exec(`INSERT INTO coach_payment_records (id, settlement_id, coach_id, payer_ally_id, amount_cents, currency, actor_id, actor_type, reference, declared_at, status) VALUES ('cpr2','s1','coachA','a1',40000,'COP','coachA','user','ref-2','2026-10-31 00:00:00','bogus')`); err == nil {
		t.Fatal("expected CHECK payment record status to reject invalid value")
	}

	// Idempotent second run.
	res, err = Apply(ctx, db.DB, dir, io.Discard)
	if err != nil {
		t.Fatalf("second apply: %v", err)
	}
	if len(res.Applied) != 0 {
		t.Fatalf("expected 0 applied on second run, got %v", res.Applied)
	}
}
