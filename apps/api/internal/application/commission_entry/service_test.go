package commission_entry

import (
	"context"
	"errors"
	"strings"
	"testing"

	_ "modernc.org/sqlite"

	commissionentrydomain "github.com/innotechlabs01/mr-training-api/internal/domain/commission_entry"
	commissionentryinfra "github.com/innotechlabs01/mr-training-api/internal/infrastructure/commission_entry"
	"github.com/innotechlabs01/mr-training-api/internal/infrastructure/database"
)

func newCommissionEntryTestDB(t *testing.T) (*database.DB, *Service) {
	t.Helper()
	path := t.TempDir() + "/test.db"
	db, err := database.Connect("file:"+path, "")
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	if _, err := db.Exec(`PRAGMA foreign_keys = ON`); err != nil {
		t.Fatalf("pragma foreign_keys: %v", err)
	}

	ddl := `
CREATE TABLE IF NOT EXISTS allies (
  id TEXT PRIMARY KEY, owner_user_id TEXT, legal_name TEXT NOT NULL, commercial_name TEXT NOT NULL,
  category TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
  CHECK (status IN ('pending','active','suspended')),
  CHECK (category IN ('gym','nutrition','physio','supplements','recovery','other'))
);
CREATE TABLE IF NOT EXISTS coach_ally_relationships (
  id TEXT PRIMARY KEY, coach_id TEXT NOT NULL, ally_id TEXT NOT NULL REFERENCES allies(id),
  status TEXT NOT NULL DEFAULT 'invited',
  UNIQUE (coach_id, ally_id),
  CHECK (status IN ('invited','active','declined','suspended'))
);
CREATE TABLE IF NOT EXISTS ally_operations (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL,
  relationship_id TEXT NOT NULL REFERENCES coach_ally_relationships(id),
  ally_id TEXT NOT NULL REFERENCES allies(id),
  athlete_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (kind IN ('order','reservation')),
  CHECK (status IN ('created','confirmed','fulfilled','attended','no_show','cancelled'))
);
CREATE TABLE IF NOT EXISTS ally_operation_items (
  id TEXT PRIMARY KEY, operation_id TEXT NOT NULL REFERENCES ally_operations(id),
  offer_kind TEXT NOT NULL, offer_id TEXT NOT NULL, name TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL DEFAULT 0, quantity INTEGER NOT NULL DEFAULT 1,
  CHECK (offer_kind IN ('product','service')),
  CHECK (unit_price_cents >= 0),
  CHECK (quantity >= 1)
);
CREATE TABLE IF NOT EXISTS commission_agreements (
  id TEXT PRIMARY KEY, relationship_id TEXT NOT NULL REFERENCES coach_ally_relationships(id),
  version INTEGER NOT NULL, rate_bps INTEGER NOT NULL DEFAULT 0,
  fixed_amount_cents INTEGER NOT NULL DEFAULT 0, eligible_base_rule TEXT NOT NULL DEFAULT 'gross_minus_discount_minus_tax',
  rounding TEXT NOT NULL DEFAULT 'half_up', currency TEXT NOT NULL DEFAULT 'COP',
  valid_from TEXT NOT NULL, valid_to TEXT, status TEXT NOT NULL DEFAULT 'proposed',
  UNIQUE (relationship_id, version),
  CHECK (rate_bps >= 0 AND rate_bps <= 100000),
  CHECK (fixed_amount_cents >= 0),
  CHECK (status IN ('proposed','accepted','superseded','ended'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_agreement_open ON commission_agreements(relationship_id) WHERE valid_to IS NULL;
CREATE TABLE IF NOT EXISTS ally_payment_declarations (
  id TEXT PRIMARY KEY, operation_id TEXT NOT NULL REFERENCES ally_operations(id),
  version INTEGER NOT NULL DEFAULT 1, supersedes_id TEXT REFERENCES ally_payment_declarations(id),
  amount_cents INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'COP',
  method TEXT, declared_at TEXT NOT NULL, reference TEXT, evidence_ref TEXT,
  status TEXT NOT NULL DEFAULT 'declared',
  reviewed_by TEXT, reviewed_at TEXT, review_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (operation_id, version),
  CHECK (amount_cents >= 0),
  CHECK (currency IN ('COP')),
  CHECK (status IN ('declared','under_review','confirmed','rejected','reversed'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_decl_active ON ally_payment_declarations(operation_id)
  WHERE status IN ('declared','under_review','confirmed');
CREATE TABLE IF NOT EXISTS commission_entries (
  id TEXT PRIMARY KEY, operation_id TEXT NOT NULL REFERENCES ally_operations(id),
  relationship_id TEXT NOT NULL, coach_id TEXT NOT NULL,
  agreement_id TEXT NOT NULL REFERENCES commission_agreements(id),
  agreement_version INTEGER NOT NULL, base_cents INTEGER NOT NULL,
  rate_bps INTEGER NOT NULL, fixed_amount_cents INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'COP',
  status TEXT NOT NULL DEFAULT 'accrued', computed_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (operation_id),
  CHECK (base_cents >= 0),
  CHECK (rate_bps >= 0 AND rate_bps <= 100000),
  CHECK (fixed_amount_cents >= 0),
  CHECK (amount_cents >= 0),
  CHECK (currency IN ('COP')),
  CHECK (status IN ('accrued','reversed'))
);
CREATE TABLE IF NOT EXISTS financial_adjustments (
  id TEXT PRIMARY KEY, entry_id TEXT REFERENCES commission_entries(id),
  settlement_id TEXT, kind TEXT NOT NULL, amount_cents INTEGER NOT NULL,
  reason TEXT NOT NULL, created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (kind IN ('refund','chargeback','correction'))
);
CREATE TABLE IF NOT EXISTS financial_audit_events (
  id TEXT PRIMARY KEY, entity TEXT NOT NULL, entity_id TEXT NOT NULL, action TEXT NOT NULL,
  actor_id TEXT, actor_type TEXT NOT NULL DEFAULT 'user', payload TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (actor_type IN ('user','system'))
);
CREATE INDEX IF NOT EXISTS idx_financial_audit_entity ON financial_audit_events(entity, entity_id);
`
	if _, err := db.Exec(ddl); err != nil {
		t.Fatalf("apply ddl: %v", err)
	}

	mustExec(t, db, `INSERT INTO allies (id, owner_user_id, legal_name, commercial_name, category, status) VALUES ('allyA','userA','Legal A','Comercial A','gym','active')`)
	mustExec(t, db, `INSERT INTO allies (id, owner_user_id, legal_name, commercial_name, category, status) VALUES ('allyB','userB','Legal B','Comercial B','nutrition','active')`)
	mustExec(t, db, `INSERT INTO coach_ally_relationships (id, coach_id, ally_id, status) VALUES ('r1','coachA','allyA','active')`)
	mustExec(t, db, `INSERT INTO coach_ally_relationships (id, coach_id, ally_id, status) VALUES ('r2','coachB','allyB','active')`)
	mustExec(t, db, `INSERT INTO commission_agreements (id, relationship_id, version, rate_bps, fixed_amount_cents, eligible_base_rule, rounding, currency, valid_from, status) VALUES ('ag1','r1',1,1000,0,'gross_minus_discount_minus_tax','half_up','COP','2026-01-01 00:00:00','accepted')`)
	mustExec(t, db, `INSERT INTO ally_operations (id, kind, relationship_id, ally_id, athlete_id, status) VALUES ('o1','order','r1','allyA','athlete1','fulfilled')`)
	mustExec(t, db, `INSERT INTO ally_operation_items (id, operation_id, offer_kind, offer_id, name, unit_price_cents, quantity) VALUES ('i1','o1','product','p1','Producto',200000,2)`)
	mustExec(t, db, `INSERT INTO ally_operations (id, kind, relationship_id, ally_id, athlete_id, status) VALUES ('o2','order','r2','allyB','athlete2','fulfilled')`)
	mustExec(t, db, `INSERT INTO ally_payment_declarations (id, operation_id, version, amount_cents, currency, declared_at, status) VALUES ('pd1','o1',1,50000,'COP','2026-10-16 00:00:00','declared')`)

	repo := commissionentryinfra.NewRepository(db.DB)
	return db, NewService(repo)
}

func mustExec(t *testing.T, db *database.DB, query string, args ...any) {
	t.Helper()
	if _, err := db.Exec(query, args...); err != nil {
		t.Fatalf("exec %q: %v", query, err)
	}
}

func TestCreateCommissionEntryHappyPath(t *testing.T) {
	_, svc := newCommissionEntryTestDB(t)
	ctx := context.Background()

	// o1: 2 items * 200000 = 400000 gross, rate_bps=1000 (10%), fixed=0
	// amount = roundHalfUp(400000 * 1000 / 10000) + 0 = roundHalfUp(40000) + 0 = 40000
	entry, err := svc.CreateCommissionEntry(ctx, "coachA", "o1")
	if err != nil {
		t.Fatalf("create commission entry: %v", err)
	}
	if entry.AmountCents != 40000 {
		t.Fatalf("expected amount 40000, got %d", entry.AmountCents)
	}
	if entry.BaseCents != 400000 {
		t.Fatalf("expected base 400000, got %d", entry.BaseCents)
	}
	if entry.Status != "accrued" {
		t.Fatalf("expected status accrued, got %s", entry.Status)
	}
}

func TestCreateCommissionEntryRejectsIneligibleOperation(t *testing.T) {
	_, svc := newCommissionEntryTestDB(t)
	ctx := context.Background()

	// o2 has no declaration → not eligible
	if _, err := svc.CreateCommissionEntry(ctx, "coachB", "o2"); err == nil {
		t.Fatal("expected error for operation without declaration")
	} else if !strings.Contains(err.Error(), "not eligible") {
		t.Fatalf("expected not eligible error, got %v", err)
	}
}

func TestCreateCommissionEntryRejectsUnfulfilledOperation(t *testing.T) {
	db, svc := newCommissionEntryTestDB(t)
	ctx := context.Background()

	// Create an operation that is not fulfilled
	mustExec(t, db, `INSERT INTO ally_operations (id, kind, relationship_id, ally_id, athlete_id, status) VALUES ('o3','order','r1','allyA','athlete1','created')`)
	mustExec(t, db, `INSERT INTO ally_payment_declarations (id, operation_id, version, amount_cents, currency, declared_at, status) VALUES ('pd3','o3',1,10000,'COP','2026-10-16 00:00:00','declared')`)

	if _, err := svc.CreateCommissionEntry(ctx, "coachA", "o3"); err == nil {
		t.Fatal("expected error for unfulfilled operation")
	} else if !strings.Contains(err.Error(), "not eligible") {
		t.Fatalf("expected not eligible error, got %v", err)
	}
}

func TestCreateCommissionEntryNoDuplicate(t *testing.T) {
	_, svc := newCommissionEntryTestDB(t)
	ctx := context.Background()

	if _, err := svc.CreateCommissionEntry(ctx, "coachA", "o1"); err != nil {
		t.Fatalf("first create: %v", err)
	}

	if _, err := svc.CreateCommissionEntry(ctx, "coachA", "o1"); err == nil {
		t.Fatal("expected error for duplicate commission entry")
	} else if !strings.Contains(err.Error(), "already exists") {
		t.Fatalf("expected duplicate error, got %v", err)
	}
}

func TestReverseCommissionEntry(t *testing.T) {
	_, svc := newCommissionEntryTestDB(t)
	ctx := context.Background()

	entry, err := svc.CreateCommissionEntry(ctx, "coachA", "o1")
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	reversed, adjustment, err := svc.ReverseCommissionEntry(ctx, entry.ID, "coachA", "correction")
	if err != nil {
		t.Fatalf("reverse: %v", err)
	}
	if reversed.Status != "reversed" {
		t.Fatalf("expected status reversed, got %s", reversed.Status)
	}
	if adjustment.Kind != "correction" || adjustment.AmountCents != -entry.AmountCents {
		t.Fatalf("unexpected adjustment: %+v", adjustment)
	}

	// Trying to reverse again should fail
	if _, _, err := svc.ReverseCommissionEntry(ctx, entry.ID, "coachA", "again"); err == nil {
		t.Fatal("expected error reversing already reversed entry")
	}
}

func TestGetCommissionEntryIDOR(t *testing.T) {
	_, svc := newCommissionEntryTestDB(t)
	ctx := context.Background()

	entry, err := svc.CreateCommissionEntry(ctx, "coachA", "o1")
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	// coachB can't see coachA's entry
	if _, err := svc.GetCommissionEntry(ctx, entry.ID, "coachB"); err == nil {
		t.Fatal("expected error for foreign entry")
	} else if !errors.Is(err, commissionentrydomain.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestListCommissionEntriesByCoach(t *testing.T) {
	_, svc := newCommissionEntryTestDB(t)
	ctx := context.Background()

	if _, err := svc.CreateCommissionEntry(ctx, "coachA", "o1"); err != nil {
		t.Fatalf("create: %v", err)
	}

	list, err := svc.ListCommissionEntriesByCoach(ctx, "coachA")
	if err != nil {
		t.Fatalf("list coachA: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 entry for coachA, got %d", len(list))
	}

	listB, err := svc.ListCommissionEntriesByCoach(ctx, "coachB")
	if err != nil {
		t.Fatalf("list coachB: %v", err)
	}
	if len(listB) != 0 {
		t.Fatalf("expected 0 entries for coachB, got %d", len(listB))
	}
}

func dbPtr(t *testing.T) *database.DB {
	t.Helper()
	path := t.TempDir() + "/direct.db"
	db, err := database.Connect("file:"+path, "")
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	if _, err := db.Exec(`PRAGMA foreign_keys = ON`); err != nil {
		t.Fatalf("pragma foreign_keys: %v", err)
	}
	return db
}
